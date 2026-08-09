from django.conf import settings
from django.db import models

from .identifiers import normalize_national_id


class Patient(models.Model):
    class Gender(models.TextChoices):
        FEMENINO = "FEMENINO", "Femenino"
        MASCULINO = "MASCULINO", "Masculino"
        OTRO = "OTRO", "Otro"

    code = models.CharField(max_length=16, unique=True, null=True, blank=True, editable=False)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=100)
    second_last_name = models.CharField(max_length=100, blank=True)
    birth_place = models.CharField(max_length=150)
    origin = models.CharField(max_length=150, blank=True)
    religion = models.CharField(max_length=100, blank=True)
    education = models.CharField(max_length=150, blank=True)
    profession = models.CharField(max_length=150, blank=True)
    address = models.TextField(blank=True)
    father_name = models.CharField(max_length=200, blank=True)
    mother_name = models.CharField(max_length=200, blank=True)
    information_source = models.CharField(max_length=150, blank=True)
    information_reliability = models.CharField(max_length=100, blank=True)
    national_id = models.CharField(max_length=32)
    national_id_key = models.CharField(max_length=32, unique=True, editable=False)
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_relationship = models.CharField(max_length=80, blank=True)
    emergency_phone = models.CharField(max_length=32, blank=True)
    gender = models.CharField(max_length=16, choices=Gender.choices)
    date_of_birth = models.DateField()
    is_active = models.BooleanField(default=True)
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="registered_patients",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    @property
    def full_name(self):
        return " ".join(
            part for part in (self.first_name, self.last_name, self.second_last_name) if part
        )

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        self.national_id_key = normalize_national_id(self.national_id)
        update_fields = kwargs.get("update_fields")
        if update_fields is not None and "national_id" in update_fields:
            kwargs["update_fields"] = set(update_fields) | {"national_id_key"}
        super().save(*args, **kwargs)
        if is_new and not self.code:
            self.code = f"PAC-{self.pk:05d}"
            type(self).objects.filter(pk=self.pk).update(code=self.code)

    def __str__(self):
        return f"{self.code or 'PAC-pendiente'} · {self.full_name}"


class ClinicalRecord(models.Model):
    patient = models.OneToOneField(
        Patient,
        on_delete=models.CASCADE,
        related_name="clinical_record",
    )

    examiner_name = models.CharField(max_length=200, blank=True)
    examiner_national_id = models.CharField(max_length=32, blank=True)
    inss_number = models.CharField(max_length=40, blank=True)
    cema_number = models.CharField(max_length=40, blank=True)
    consultation_date = models.DateField(null=True, blank=True)
    consultation_time = models.TimeField(null=True, blank=True)
    dental_service = models.CharField(max_length=200, blank=True)

    chief_complaint = models.TextField(blank=True)
    present_illness_history = models.TextField(blank=True)
    respiratory = models.TextField(blank=True)
    cardiovascular = models.TextField(blank=True)
    hepatic_renal = models.TextField(blank=True)
    gastrointestinal = models.TextField(blank=True)
    neurological = models.TextField(blank=True)
    blood_system = models.TextField(blank=True)
    reproductive_organs = models.TextField(blank=True)

    family_history = models.TextField(blank=True)
    infectious_diseases = models.JSONField(default=dict, blank=True)
    hereditary_diseases = models.JSONField(default=dict, blank=True)

    heart_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    respiratory_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    blood_pressure = models.CharField(max_length=20, blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    body_surface_area = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    bmi = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    general_appearance = models.TextField(blank=True)
    skin_and_mucosa = models.TextField(blank=True)
    thorax = models.TextField(blank=True)
    rib_cage = models.TextField(blank=True)
    breasts = models.TextField(blank=True)
    lung_fields = models.TextField(blank=True)
    cardiac = models.TextField(blank=True)
    abdomen_pelvis = models.TextField(blank=True)
    rectal_exam = models.TextField(blank=True)
    musculoskeletal = models.TextField(blank=True)
    upper_extremities = models.TextField(blank=True)
    lower_extremities = models.TextField(blank=True)
    genitourinary = models.TextField(blank=True)
    gynecological_exam = models.TextField(blank=True)
    neurological_exam = models.TextField(blank=True)

    observations_analysis = models.TextField(blank=True)
    dental_diagnoses = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)
    budget = models.TextField(blank=True)
    treatment_performed = models.TextField(blank=True)
    radiographic_exams = models.JSONField(default=list, blank=True)
    clinical_photographs = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Expediente · {self.patient}"


class Consultation(models.Model):
    class Type(models.TextChoices):
        INITIAL_ASSESSMENT = "VALORACION_INICIAL", "Valoración inicial"
        GENERAL = "GENERAL", "Consulta general"
        FOLLOW_UP = "SEGUIMIENTO", "Seguimiento"
        EMERGENCY = "URGENCIA", "Urgencia"

    class Status(models.TextChoices):
        COMPLETED = "COMPLETADA", "Completada"
        IN_PROGRESS = "EN_PROGRESO", "En progreso"
        CANCELLED = "CANCELADA", "Cancelada"

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="consultations",
    )
    professional = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="patient_consultations",
    )
    professional_name_snapshot = models.CharField(max_length=200, blank=True)
    date = models.DateField()
    time = models.TimeField(null=True, blank=True)
    consultation_type = models.CharField(max_length=24, choices=Type.choices)
    summary = models.TextField()
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.COMPLETED,
    )
    examiner_national_id = models.CharField(max_length=32, blank=True)
    inss_number = models.CharField(max_length=40, blank=True)
    cema_number = models.CharField(max_length=40, blank=True)
    dental_service = models.CharField(max_length=200, blank=True)
    chief_complaint = models.TextField(blank=True)
    present_illness_history = models.TextField(blank=True)
    respiratory = models.TextField(blank=True)
    cardiovascular = models.TextField(blank=True)
    hepatic_renal = models.TextField(blank=True)
    gastrointestinal = models.TextField(blank=True)
    neurological = models.TextField(blank=True)
    blood_system = models.TextField(blank=True)
    reproductive_organs = models.TextField(blank=True)
    heart_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    respiratory_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    blood_pressure = models.CharField(max_length=20, blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    body_surface_area = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    bmi = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    general_appearance = models.TextField(blank=True)
    skin_and_mucosa = models.TextField(blank=True)
    thorax = models.TextField(blank=True)
    rib_cage = models.TextField(blank=True)
    breasts = models.TextField(blank=True)
    lung_fields = models.TextField(blank=True)
    cardiac = models.TextField(blank=True)
    abdomen_pelvis = models.TextField(blank=True)
    rectal_exam = models.TextField(blank=True)
    musculoskeletal = models.TextField(blank=True)
    upper_extremities = models.TextField(blank=True)
    lower_extremities = models.TextField(blank=True)
    genitourinary = models.TextField(blank=True)
    gynecological_exam = models.TextField(blank=True)
    neurological_exam = models.TextField(blank=True)
    observations_analysis = models.TextField(blank=True)
    dental_diagnoses = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)
    budget = models.TextField(blank=True)
    treatment_performed = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-date", "-created_at")
        indexes = (models.Index(fields=("patient", "-date")),)

    def save(self, *args, **kwargs):
        if not self.professional_name_snapshot and self.professional_id:
            self.professional_name_snapshot = (
                self.professional.get_full_name().strip() or self.professional.email
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_consultation_type_display()} · {self.patient} · {self.date}"
