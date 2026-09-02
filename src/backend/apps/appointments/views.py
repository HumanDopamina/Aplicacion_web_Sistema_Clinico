from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework import generics
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User
from apps.users.permissions import HasCapability, user_has_permission
from apps.common.pagination import StandardPageNumberPagination
from apps.patients.serializers import ConsultationSerializer

from .models import Appointment, AppointmentRescheduleEvent
from .services import (
    AppointmentAttendanceError,
    AppointmentCheckInError,
    check_in_appointment,
    start_attendance,
    update_appointment_with_history,
)
from .serializers import (
    DentistAvailabilityQuerySerializer,
    DentistOptionSerializer,
    AppointmentSerializer,
    AppointmentRescheduleEventSerializer,
    has_overlap,
)


APPOINTMENT_CONFLICTS = {
    "appointment_dentist_schedule_excl": {
        "code": "appointment_overlap",
        "conflict": "dentist",
        "detail": "El odontólogo ya tiene una cita en ese horario.",
    },
    "appointment_patient_schedule_excl": {
        "code": "appointment_overlap",
        "conflict": "patient",
        "detail": "El paciente ya tiene una cita en ese horario.",
    },
}


def appointment_integrity_conflict(error):
    cause = error.__cause__
    diagnostic = getattr(cause, "diag", None)
    constraint_name = getattr(diagnostic, "constraint_name", None)
    payload = APPOINTMENT_CONFLICTS.get(constraint_name)
    if payload is None:
        raise error
    return Response(payload, status=status.HTTP_409_CONFLICT)


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
        try:
            with transaction.atomic():
                return super().create(request, *args, **kwargs)
        except IntegrityError as error:
            return appointment_integrity_conflict(error)

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
        try:
            with transaction.atomic():
                instance = get_object_or_404(
                    self.get_queryset().select_for_update(of=("self",)),
                    pk=kwargs["pk"],
                )
                self.check_object_permissions(request, instance)
                enforce_dentist_assignment_scope(request)
                serializer = self.get_serializer(
                    instance,
                    data=request.data,
                    partial=kwargs.pop("partial", False),
                )
                serializer.is_valid(raise_exception=True)
                changes = dict(serializer.validated_data)
                reschedule_reason = changes.pop("reschedule_reason", "")
                result = update_appointment_with_history(
                    appointment=instance,
                    changes=changes,
                    actor=request.user,
                    reason=reschedule_reason,
                )
                if result.reschedule_event is not None:
                    request._request.audit_action = "APPOINTMENT_RESCHEDULE"
                    request.audit_metadata.update({"appointment_id": instance.pk})
                return Response(
                    self.get_serializer(result.appointment).data,
                )
        except IntegrityError as error:
            return appointment_integrity_conflict(error)


class AppointmentRescheduleHistoryView(generics.ListAPIView):
    serializer_class = AppointmentRescheduleEventSerializer
    pagination_class = StandardPageNumberPagination
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {"GET": "appointments.view"}

    def get_appointment(self):
        if not hasattr(self, "_appointment"):
            self._appointment = get_object_or_404(
                scope_appointments_for_user(Appointment.objects.all(), self.request.user),
                pk=self.kwargs["pk"],
            )
            self.request._request.audit_patient_id = self._appointment.patient_id
        return self._appointment

    def get_queryset(self):
        appointment = self.get_appointment()
        return AppointmentRescheduleEvent.objects.select_related("changed_by").filter(
            appointment=appointment,
        )


class AppointmentStartAttendanceView(APIView):
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {"POST": "consultations.create"}

    def post(self, request, pk):
        appointment = get_object_or_404(
            scope_appointments_for_user(Appointment.objects.all(), request.user),
            pk=pk,
        )
        request._request.audit_patient_id = appointment.patient_id
        try:
            result = start_attendance(appointment_id=appointment.pk, actor=request.user)
        except AppointmentAttendanceError as error:
            payload = {"code": error.code, "detail": error.detail}
            if error.missing_fields:
                payload["missing_fields"] = list(error.missing_fields)
            return Response(
                payload,
                status=status.HTTP_409_CONFLICT,
            )

        request.audit_metadata.update({
            "appointment_id": result.appointment.pk,
            "consultation_id": result.consultation.pk,
        })
        payload = {
            "appointment": AppointmentSerializer(result.appointment).data,
            "consultation": ConsultationSerializer(result.consultation).data,
            "created": result.created,
        }
        response_status = status.HTTP_201_CREATED if result.created else status.HTTP_200_OK
        return Response(payload, status=response_status)


class AppointmentCheckInView(APIView):
    permission_classes = (IsAuthenticated, HasCapability)
    required_permissions = {"POST": "appointments.edit"}

    def post(self, request, pk):
        appointment = get_object_or_404(
            scope_appointments_for_user(Appointment.objects.all(), request.user),
            pk=pk,
        )
        request._request.audit_patient_id = appointment.patient_id
        try:
            result = check_in_appointment(
                appointment_id=appointment.pk,
                actor=request.user,
            )
        except AppointmentCheckInError as error:
            return Response(
                {"code": error.code, "detail": error.detail},
                status=status.HTTP_409_CONFLICT,
            )

        request.audit_metadata.update({"appointment_id": result.appointment.pk})
        return Response(
            {
                "appointment": AppointmentSerializer(result.appointment).data,
                "changed": result.changed,
            },
            status=(
                status.HTTP_201_CREATED
                if result.changed
                else status.HTTP_200_OK
            ),
        )


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
