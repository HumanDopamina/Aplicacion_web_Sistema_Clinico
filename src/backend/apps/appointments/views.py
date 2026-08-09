from django.contrib.auth import get_user_model
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User
from apps.users.permissions import HasCapability

from .models import Appointment
from .serializers import (
    DentistAvailabilityQuerySerializer,
    DentistOptionSerializer,
    AppointmentSerializer,
    has_overlap,
)


class AppointmentListCreateView(generics.ListCreateAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {
        "GET": "appointments.view",
        "POST": "appointments.create",
    }

    def get_queryset(self):
        queryset = Appointment.objects.select_related("patient", "dentist", "created_by")
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

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, status=Appointment.Status.SCHEDULED)


class AppointmentDetailView(generics.RetrieveUpdateAPIView):
    queryset = Appointment.objects.select_related("patient", "dentist", "created_by")
    serializer_class = AppointmentSerializer
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {
        "GET": "appointments.view",
        "PATCH": "appointments.edit",
        "DELETE": "appointments.edit",
    }
    http_method_names = ("get", "patch", "head", "options")


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
