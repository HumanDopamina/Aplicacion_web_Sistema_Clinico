from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


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
    token_version = models.PositiveIntegerField(default=0, editable=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["role"]
    objects = UserManager()

    def __str__(self):
        return self.email
