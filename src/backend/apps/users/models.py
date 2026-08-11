from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

from .storage import private_avatar_storage, user_avatar_path


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("El correo electrónico es obligatorio.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMINISTRADOR)
        if not extra_fields.get("is_staff") or not extra_fields.get("is_superuser"):
            raise ValueError("El superusuario debe tener permisos de administración.")
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Usuario del sistema autenticado por correo electrónico."""

    class Role(models.TextChoices):
        ADMINISTRADOR = "ADMINISTRADOR", "Administrador"
        RECEPCIONISTA = "RECEPCIONISTA", "Recepcionista"
        ODONTOLOGO = "ODONTOLOGO", "Odontólogo"

    username = None
    email = models.EmailField("correo electrónico", unique=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    phone = models.CharField("teléfono", max_length=30, blank=True)
    avatar = models.ImageField(
        upload_to=user_avatar_path,
        storage=private_avatar_storage,
        blank=True,
    )
    token_version = models.PositiveIntegerField(default=0, editable=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["role"]
    objects = UserManager()

    def __str__(self):
        return self.email


class RolePermissionPreset(models.Model):
    """Global permissions inherited by every user assigned to a role."""

    role = models.CharField(
        max_length=20,
        unique=True,
        choices=(
            (User.Role.RECEPCIONISTA, "Recepcionista"),
            (User.Role.ODONTOLOGO, "Odontólogo"),
        ),
    )
    permissions = models.JSONField(default=list)

    class Meta:
        ordering = ("role",)

    def __str__(self):
        return self.get_role_display()
