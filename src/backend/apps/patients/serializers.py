from datetime import date

from django.db import IntegrityError, transaction
from rest_framework import serializers

from .identifiers import normalize_national_id
from .models import ClinicalRecord, Consultation, Patient


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
        matching_patients = Patient.objects.filter(
            national_id_key=normalize_national_id(normalized)
        )
        if self.instance:
            matching_patients = matching_patients.exclude(pk=self.instance.pk)
        if matching_patients.exists():
            raise serializers.ValidationError("Ya existe un paciente con esta cédula.")
        return normalized

    def validate_email(self, value):
        return value.strip().lower()

    def create(self, validated_data):
        record_data = validated_data.pop("clinical_record", {})
        national_id = validated_data["national_id"]
        try:
            with transaction.atomic():
                patient = super().create(validated_data)
                ClinicalRecord.objects.create(patient=patient, **record_data)
                return patient
        except IntegrityError:
            if Patient.objects.filter(
                national_id_key=normalize_national_id(national_id)
            ).exists():
                raise serializers.ValidationError(
                    {"national_id": ["Ya existe un paciente con esta cédula."]}
                )
            raise

    def update(self, instance, validated_data):
        record_data = validated_data.pop("clinical_record", None)
        national_id = validated_data.get("national_id")
        try:
            with transaction.atomic():
                patient = super().update(instance, validated_data)
                if record_data is not None:
                    record, _ = ClinicalRecord.objects.get_or_create(patient=patient)
                    for field, value in record_data.items():
                        setattr(record, field, value)
                    record.save()
                return patient
        except IntegrityError:
            if national_id and Patient.objects.filter(
                national_id_key=normalize_national_id(national_id)
            ).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError(
                    {"national_id": ["Ya existe un paciente con esta cédula."]}
                )
            raise


class ConsultationSerializer(serializers.ModelSerializer):
    consultation_type_display = serializers.CharField(
        source="get_consultation_type_display",
        read_only=True,
    )
    professional_name = serializers.CharField(
        source="professional_name_snapshot",
        read_only=True,
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Consultation
        fields = (
            "id", "patient", "professional", "professional_name", "date", "time",
            "consultation_type", "consultation_type_display", "summary", "status",
            "status_display", "examiner_national_id", "inss_number", "cema_number",
            "dental_service", "chief_complaint", "present_illness_history", "respiratory",
            "cardiovascular", "hepatic_renal", "gastrointestinal", "neurological",
            "blood_system", "reproductive_organs", "heart_rate", "respiratory_rate",
            "blood_pressure", "temperature", "weight", "height", "body_surface_area",
            "bmi", "general_appearance", "skin_and_mucosa", "thorax", "rib_cage",
            "breasts", "lung_fields", "cardiac", "abdomen_pelvis", "rectal_exam",
            "musculoskeletal", "upper_extremities", "lower_extremities", "genitourinary",
            "gynecological_exam", "neurological_exam", "observations_analysis",
            "dental_diagnoses", "treatment_plan", "budget", "treatment_performed",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "patient", "professional", "professional_name",
            "consultation_type_display", "status_display", "created_at", "updated_at",
        )
        extra_kwargs = {
            "date": {"required": True},
            "time": {"required": True, "allow_null": False},
            "consultation_type": {"required": True},
            "summary": {"required": True, "allow_blank": False},
            "status": {"required": True},
        }
