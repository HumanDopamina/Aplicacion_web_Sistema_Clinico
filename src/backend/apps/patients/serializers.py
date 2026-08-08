from datetime import date

from django.db import transaction
from rest_framework import serializers

from .models import ClinicalRecord, Patient


class ClinicalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalRecord
        exclude = ("patient",)
        read_only_fields = ("id", "created_at", "updated_at")


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    clinical_record = ClinicalRecordSerializer(required=False)

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
            "origin",
            "religion",
            "education",
            "profession",
            "address",
            "father_name",
            "mother_name",
            "information_source",
            "information_reliability",
            "national_id",
            "phone",
            "email",
            "emergency_contact_name",
            "emergency_relationship",
            "emergency_phone",
            "gender",
            "date_of_birth",
            "is_active",
            "clinical_record",
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

    @transaction.atomic
    def create(self, validated_data):
        record_data = validated_data.pop("clinical_record", {})
        patient = super().create(validated_data)
        ClinicalRecord.objects.create(patient=patient, **record_data)
        return patient

    @transaction.atomic
    def update(self, instance, validated_data):
        record_data = validated_data.pop("clinical_record", None)
        patient = super().update(instance, validated_data)
        if record_data is not None:
            record, _ = ClinicalRecord.objects.get_or_create(patient=patient)
            for field, value in record_data.items():
                setattr(record, field, value)
            record.save()
        return patient
