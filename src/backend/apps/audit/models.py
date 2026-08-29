from django.core.exceptions import ValidationError
from django.db import models


class ImmutableAuditQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError("Los eventos de auditoría no pueden modificarse.")

    def delete(self):
        raise ValidationError("Los eventos de auditoría no pueden eliminarse.")


class AuditEvent(models.Model):
    class Outcome(models.TextChoices):
        SUCCESS = "SUCCESS", "Exitoso"
        FAILURE = "FAILURE", "Fallido"
        DENIED = "DENIED", "Denegado"
        BLOCKED = "BLOCKED", "Bloqueado"

    occurred_at = models.DateTimeField(auto_now_add=True, db_index=True)
    request_id = models.CharField(max_length=64, db_index=True)
    actor_id = models.PositiveBigIntegerField(null=True, blank=True, db_index=True)
    actor_role = models.CharField(max_length=20, blank=True)
    action = models.CharField(max_length=80, db_index=True)
    outcome = models.CharField(max_length=10, choices=Outcome.choices)
    resource_type = models.CharField(max_length=80, blank=True)
    resource_id = models.CharField(max_length=80, blank=True)
    patient_id = models.PositiveBigIntegerField(null=True, blank=True, db_index=True)
    changed_fields = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)

    objects = ImmutableAuditQuerySet.as_manager()

    class Meta:
        ordering = ("-occurred_at", "-id")
        indexes = [
            models.Index(fields=("action", "occurred_at"), name="audit_action_date_idx"),
            models.Index(fields=("actor_id", "occurred_at"), name="audit_actor_date_idx"),
            models.Index(fields=("patient_id", "occurred_at"), name="audit_patient_date_idx"),
            models.Index(
                fields=("resource_type", "resource_id", "occurred_at"),
                name="audit_resource_date_idx",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise ValidationError("Los eventos de auditoría no pueden modificarse.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Los eventos de auditoría no pueden eliminarse.")
