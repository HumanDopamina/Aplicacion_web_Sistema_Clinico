from datetime import date

from rest_framework import serializers

from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Patient
        fields = (
            "id",
            "code",
            "first_name",
            "last_name",
            "second_last_name",
            "full_name",
            "birth_place",
            "address",
            "national_id",
            "phone",
            "email",
            "emergency_contact_name",
            "emergency_relationship",
            "emergency_phone",
            "gender",
            "date_of_birth",
            "is_active",
            "registered_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "code", "full_name", "registered_by", "created_at", "updated_at")
        extra_kwargs = {
            "national_id": {"validators": []},
        }

    def validate_date_of_birth(self, value):
        if value > date.today():
            raise serializers.ValidationError("La fecha de nacimiento no puede ser futura.")
        return value

    def validate_national_id(self, value):
        normalized = value.strip().upper()
        matching_patients = Patient.objects.filter(national_id__iexact=normalized)
        if self.instance:
            matching_patients = matching_patients.exclude(pk=self.instance.pk)
        if matching_patients.exists():
            raise serializers.ValidationError("Ya existe un paciente con esta cédula.")
        return normalized

    def validate_email(self, value):
        return value.strip().lower()
