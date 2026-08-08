from django.conf import settings
from django.db import models


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
    address = models.TextField(blank=True)
    national_id = models.CharField(max_length=32, unique=True)
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
        super().save(*args, **kwargs)
        if is_new and not self.code:
            self.code = f"PAC-{self.pk:05d}"
            type(self).objects.filter(pk=self.pk).update(code=self.code)

    def __str__(self):
        return f"{self.code or 'PAC-pendiente'} · {self.full_name}"
