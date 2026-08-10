from datetime import datetime, timedelta

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Appointment(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "PROGRAMADA", "Programada"
        CONFIRMED = "CONFIRMADA", "Confirmada"
        COMPLETED = "COMPLETADA", "Completada"
        CANCELLED = "CANCELADA", "Cancelada"
        NO_SHOW = "NO_ASISTIO", "No asistió"

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="appointments",
    )
    dentist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="dental_appointments",
    )
    service = models.ForeignKey(
        "clinics.ClinicService",
        on_delete=models.PROTECT,
        related_name="appointments",
        null=True,
        blank=True,
    )
    date = models.DateField()
    start_time = models.TimeField()
    duration_minutes = models.PositiveSmallIntegerField(
        validators=(MinValueValidator(15), MaxValueValidator(240)),
    )
    reason = models.CharField(max_length=240)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )
    cancellation_reason = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_appointments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("date", "start_time", "dentist__first_name", "dentist__last_name")
        indexes = (
            models.Index(fields=("date", "start_time")),
            models.Index(fields=("dentist", "date")),
            models.Index(fields=("patient", "date")),
        )

    @property
    def end_time(self):
        start = datetime.combine(self.date, self.start_time)
        return (start + timedelta(minutes=self.duration_minutes)).time()

    def __str__(self):
        return f"{self.patient} · {self.date} {self.start_time:%H:%M}"
