from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.patients.models import Patient
from apps.users.models import User

from .models import Appointment


ACTIVE_STATUSES = (Appointment.Status.SCHEDULED, Appointment.Status.CONFIRMED)
STATUS_TRANSITIONS = {
    Appointment.Status.SCHEDULED: {
        Appointment.Status.CONFIRMED,
        Appointment.Status.CANCELLED,
    },
    Appointment.Status.CONFIRMED: {
        Appointment.Status.COMPLETED,
        Appointment.Status.CANCELLED,
        Appointment.Status.NO_SHOW,
    },
}


def display_name(user):
    return user.get_full_name().strip() or user.email


def appointment_end_minutes(start_time, duration_minutes):
    return start_time.hour * 60 + start_time.minute + duration_minutes


def has_overlap(*, date, start_time, duration_minutes, dentist=None, patient=None, exclude_id=None):
    new_start = start_time.hour * 60 + start_time.minute
    new_end = appointment_end_minutes(start_time, duration_minutes)
    queryset = Appointment.objects.filter(date=date).exclude(status=Appointment.Status.CANCELLED)
    if dentist is not None:
        queryset = queryset.filter(dentist=dentist)
    if patient is not None:
        queryset = queryset.filter(patient=patient)
    if exclude_id is not None:
        queryset = queryset.exclude(pk=exclude_id)
    for appointment in queryset.only("start_time", "duration_minutes"):
        current_start = appointment.start_time.hour * 60 + appointment.start_time.minute
        current_end = current_start + appointment.duration_minutes
        if current_start < new_end and current_end > new_start:
            return True
    return False


class AppointmentSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    dentist = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.all())
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    patient_code = serializers.CharField(source="patient.code", read_only=True)
    dentist_name = serializers.SerializerMethodField()
    end_time = serializers.TimeField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id", "patient", "patient_name", "patient_code", "dentist", "dentist_name",
            "date", "start_time", "end_time", "duration_minutes", "reason", "notes",
            "status", "status_display", "cancellation_reason", "created_by",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "patient_name", "patient_code", "dentist_name", "end_time",
            "status_display", "created_by", "created_at", "updated_at",
        )

    def get_dentist_name(self, appointment):
        return display_name(appointment.dentist)

    def validate_patient(self, patient):
        if not patient.is_active:
            raise serializers.ValidationError("Selecciona un paciente activo.")
        return patient

    def validate_dentist(self, dentist):
        if not dentist.is_active or dentist.role != User.Role.ODONTOLOGO:
            raise serializers.ValidationError("Selecciona un odontólogo activo.")
        return dentist

    def validate_reason(self, reason):
        reason = reason.strip()
        if not reason:
            raise serializers.ValidationError("Indica el motivo de la cita.")
        return reason

    def validate(self, attrs):
        instance = self.instance
        if instance and instance.status not in STATUS_TRANSITIONS and attrs:
            raise serializers.ValidationError("La cita está en un estado final y no puede modificarse.")

        next_status = attrs.get("status", instance.status if instance else Appointment.Status.SCHEDULED)
        if instance and next_status != instance.status:
            allowed = STATUS_TRANSITIONS.get(instance.status, set())
            if next_status not in allowed:
                raise serializers.ValidationError("La transición de estado seleccionada no está permitida.")
        if not instance and next_status != Appointment.Status.SCHEDULED:
            raise serializers.ValidationError("Las citas nuevas deben iniciar como programadas.")

        patient = attrs.get("patient", instance.patient if instance else None)
        dentist = attrs.get("dentist", instance.dentist if instance else None)
        appointment_date = attrs.get("date", instance.date if instance else None)
        start_time = attrs.get("start_time", instance.start_time if instance else None)
        duration = attrs.get("duration_minutes", instance.duration_minutes if instance else None)
        if appointment_end_minutes(start_time, duration) > 24 * 60:
            raise serializers.ValidationError("La cita debe finalizar el mismo día.")

        if next_status != Appointment.Status.CANCELLED:
            overlap_args = {
                "date": appointment_date,
                "start_time": start_time,
                "duration_minutes": duration,
                "exclude_id": instance.pk if instance else None,
            }
            if has_overlap(**overlap_args, dentist=dentist):
                raise serializers.ValidationError("El odontólogo ya tiene una cita en ese horario.")
            if has_overlap(**overlap_args, patient=patient):
                raise serializers.ValidationError("El paciente ya tiene una cita en ese horario.")
        if next_status != Appointment.Status.CANCELLED:
            attrs["cancellation_reason"] = ""
        return attrs


class DentistAvailabilityQuerySerializer(serializers.Serializer):
    date = serializers.DateField()
    start_time = serializers.TimeField()
    duration_minutes = serializers.ChoiceField(choices=Appointment.Duration.values)
    exclude_id = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs):
        if appointment_end_minutes(attrs["start_time"], attrs["duration_minutes"]) > 24 * 60:
            raise serializers.ValidationError("La cita debe finalizar el mismo día.")
        return attrs


class DentistOptionSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ("id", "full_name", "email")

    def get_full_name(self, user):
        return display_name(user)
