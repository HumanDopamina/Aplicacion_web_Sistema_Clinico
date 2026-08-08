# Generated manually for HU-10.
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Patient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(blank=True, editable=False, max_length=16, null=True, unique=True)),
                ("first_name", models.CharField(max_length=150)),
                ("last_name", models.CharField(max_length=100)),
                ("second_last_name", models.CharField(blank=True, max_length=100)),
                ("birth_place", models.CharField(max_length=150)),
                ("address", models.TextField(blank=True)),
                ("national_id", models.CharField(max_length=32, unique=True)),
                ("phone", models.CharField(blank=True, max_length=32)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("emergency_contact_name", models.CharField(blank=True, max_length=150)),
                ("emergency_relationship", models.CharField(blank=True, max_length=80)),
                ("emergency_phone", models.CharField(blank=True, max_length=32)),
                ("gender", models.CharField(choices=[("FEMENINO", "Femenino"), ("MASCULINO", "Masculino"), ("OTRO", "Otro")], max_length=16)),
                ("date_of_birth", models.DateField()),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("registered_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="registered_patients", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ("-created_at",)},
        ),
    ]
