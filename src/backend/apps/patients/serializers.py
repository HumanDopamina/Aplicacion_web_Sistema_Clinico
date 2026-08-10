from datetime import date

from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework import serializers

from apps.clinics.availability import clinic_today

from .identifiers import normalize_national_id
from .documents import (
    MAX_BATCH_FILES,
    MAX_BATCH_SIZE,
    normalize_category,
    safe_original_name,
    validate_document_file,
)
from .models import ClinicalRecord, Consultation, OdontogramVersion, Patient, PatientDocument
from .odontograms import (
    create_initial_odontogram_version,
    create_odontogram_revision,
    normalize_teeth_snapshot,
)


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

    def create(self, validated_data):
        with transaction.atomic():
            consultation = super().create(validated_data)
            create_initial_odontogram_version(consultation)
            return consultation


class OdontogramVersionSerializer(serializers.ModelSerializer):
    professional_name = serializers.SerializerMethodField()
    consultation_date = serializers.DateField(source="consultation.date", read_only=True)
    consultation_type = serializers.CharField(
        source="consultation.consultation_type",
        read_only=True,
    )
    consultation_type_display = serializers.CharField(
        source="consultation.get_consultation_type_display",
        read_only=True,
    )

    class Meta:
        model = OdontogramVersion
        fields = (
            "id",
            "patient",
            "consultation",
            "consultation_date",
            "consultation_type",
            "consultation_type_display",
            "version_number",
            "schema_version",
            "dentition",
            "teeth",
            "changed_teeth",
            "note",
            "based_on",
            "created_by",
            "professional_name",
            "created_at",
        )
        read_only_fields = fields

    def get_professional_name(self, obj):
        return obj.created_by.get_full_name().strip() or obj.created_by.email


class OdontogramVersionSummarySerializer(OdontogramVersionSerializer):
    class Meta(OdontogramVersionSerializer.Meta):
        fields = tuple(
            field for field in OdontogramVersionSerializer.Meta.fields if field != "teeth"
        )
        read_only_fields = fields


class OdontogramRevisionCreateSerializer(serializers.Serializer):
    base_version_id = serializers.IntegerField(min_value=1)
    dentition = serializers.ChoiceField(choices=OdontogramVersion.Dentition.choices)
    teeth = serializers.JSONField()
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=1000,
    )

    def validate(self, attrs):
        attrs["teeth"] = normalize_teeth_snapshot(
            attrs["teeth"],
            attrs["dentition"],
        )
        return attrs

    def create(self, validated_data):
        return create_odontogram_revision(
            consultation=self.context["consultation"],
            author=self.context["request"].user,
            **validated_data,
        )

    def to_representation(self, instance):
        return OdontogramVersionSerializer(instance, context=self.context).data


class PatientDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    content_url = serializers.SerializerMethodField()

    class Meta:
        model = PatientDocument
        fields = (
            "id",
            "category",
            "document_date",
            "notes",
            "original_name",
            "mime_type",
            "size_bytes",
            "uploaded_by",
            "uploaded_by_name",
            "created_at",
            "content_url",
        )
        read_only_fields = fields

    def get_uploaded_by_name(self, document):
        return document.uploaded_by.get_full_name().strip() or document.uploaded_by.email

    def get_content_url(self, document):
        return reverse(
            "patient-document-content",
            kwargs={"patient_pk": document.patient_id, "pk": document.pk},
        )


class PatientDocumentBatchUploadSerializer(serializers.Serializer):
    files = serializers.ListField(
        child=serializers.FileField(),
        min_length=1,
        max_length=MAX_BATCH_FILES,
    )
    category = serializers.CharField(max_length=80)
    document_date = serializers.DateField(required=False, default=clinic_today)
    notes = serializers.CharField(required=False, allow_blank=True, default="", max_length=2000)

    def validate_category(self, value):
        normalized = normalize_category(value)
        if not normalized:
            raise serializers.ValidationError("Indica una categoría para los documentos.")
        return normalized

    def validate_files(self, files):
        if sum(uploaded_file.size for uploaded_file in files) > MAX_BATCH_SIZE:
            raise serializers.ValidationError("El lote puede pesar como máximo 50 MB.")
        for uploaded_file in files:
            validate_document_file(uploaded_file)
        return files

    def create(self, validated_data):
        files = validated_data.pop("files")
        patient = self.context["patient"]
        uploaded_by = self.context["request"].user
        created = []
        try:
            with transaction.atomic():
                for uploaded_file in files:
                    created.append(PatientDocument.objects.create(
                        patient=patient,
                        uploaded_by=uploaded_by,
                        original_name=safe_original_name(uploaded_file.name),
                        mime_type=uploaded_file.content_type.lower(),
                        size_bytes=uploaded_file.size,
                        file=uploaded_file,
                        **validated_data,
                    ))
        except Exception:
            for document in created:
                if document.file.name:
                    document.file.storage.delete(document.file.name)
            raise
        return created

    def to_representation(self, instance):
        return PatientDocumentSerializer(instance, many=True, context=self.context).data
