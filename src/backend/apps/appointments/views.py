from django.contrib.auth import get_user_model
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User
from apps.users.permissions import HasCapability, user_has_permission
from apps.common.pagination import StandardPageNumberPagination

from .models import Appointment
from .serializers import (
    DentistAvailabilityQuerySerializer,
    DentistOptionSerializer,
    AppointmentSerializer,
    has_overlap,
)


def can_view_all_appointments(user):
    return user_has_permission(user, "appointments.view_all")


def scope_appointments_for_user(queryset, user):
    if can_view_all_appointments(user):
        return queryset
    return queryset.filter(dentist=user)


def enforce_dentist_assignment_scope(request):
    if can_view_all_appointments(request.user):
        return
    if request.user.role != User.Role.ODONTOLOGO:
        raise PermissionDenied("Sólo puedes gestionar citas asignadas a tu usuario.")
    dentist_id = request.data.get("dentist")
    if dentist_id is not None and str(dentist_id) != str(request.user.pk):
        raise PermissionDenied("Sólo puedes gestionar citas asignadas a tu usuario.")


class AppointmentListCreateView(generics.ListCreateAPIView):
    serializer_class = AppointmentSerializer
    pagination_class = StandardPageNumberPagination
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {
        "GET": "appointments.view",
        "POST": "appointments.create",
    }

    def get_queryset(self):
        queryset = Appointment.objects.select_related("patient", "dentist", "created_by", "service")
        queryset = scope_appointments_for_user(queryset, self.request.user)
        appointment_date = self.request.query_params.get("date")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        dentist = self.request.query_params.get("dentist")
        appointment_status = self.request.query_params.get("status")
        if appointment_date:
            queryset = queryset.filter(date=appointment_date)
        else:
            if date_from:
                queryset = queryset.filter(date__gte=date_from)
            if date_to:
                queryset = queryset.filter(date__lte=date_to)
        if dentist:
            queryset = queryset.filter(dentist_id=dentist)
        if appointment_status:
            queryset = queryset.filter(status=appointment_status)
        return queryset

    def create(self, request, *args, **kwargs):
        enforce_dentist_assignment_scope(request)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, status=Appointment.Status.SCHEDULED)


class AppointmentDetailView(generics.RetrieveUpdateAPIView):
    queryset = Appointment.objects.select_related("patient", "dentist", "created_by", "service")
    serializer_class = AppointmentSerializer
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {
        "GET": "appointments.view",
        "PATCH": "appointments.edit",
        "DELETE": "appointments.edit",
    }
    http_method_names = ("get", "patch", "head", "options")

    def get_queryset(self):
        return scope_appointments_for_user(super().get_queryset(), self.request.user)

    def update(self, request, *args, **kwargs):
        self.get_object()
        enforce_dentist_assignment_scope(request)
        return super().update(request, *args, **kwargs)


class DentistAvailabilityView(APIView):
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {"GET": "appointments.view"}

    def get(self, request):
        query = DentistAvailabilityQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        values = query.validated_data
        dentists = get_user_model().objects.filter(
            role=User.Role.ODONTOLOGO,
            is_active=True,
        ).order_by("first_name", "last_name", "email")
        if not can_view_all_appointments(request.user):
            if request.user.role == User.Role.ODONTOLOGO:
                dentists = dentists.filter(pk=request.user.pk)
            else:
                dentists = dentists.none()
        available = [
            dentist
            for dentist in dentists
            if not has_overlap(
                date=values["date"],
                start_time=values["start_time"],
                duration_minutes=values["duration_minutes"],
                dentist=dentist,
                exclude_id=values.get("exclude_id"),
            )
        ]
        return Response(DentistOptionSerializer(available, many=True).data)
