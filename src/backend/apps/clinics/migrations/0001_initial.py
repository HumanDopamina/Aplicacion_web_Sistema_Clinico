from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


def seed_clinic(apps, schema_editor):
    profile_model = apps.get_model("clinics", "ClinicProfile")
    hours_model = apps.get_model("clinics", "BusinessHour")
    profile_model.objects.get_or_create(
        pk=1,
        defaults={
            "name": "DentalClinic",
            "currency": "NIO",
            "timezone": "America/Managua",
            "schedule_configured": False,
        },
    )
    for weekday in range(7):
        hours_model.objects.get_or_create(weekday=weekday)


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="BusinessHour",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("weekday", models.PositiveSmallIntegerField(choices=[(0, "Lunes"), (1, "Martes"), (2, "Miércoles"), (3, "Jueves"), (4, "Viernes"), (5, "Sábado"), (6, "Domingo")], unique=True)),
                ("is_open", models.BooleanField(default=False)),
                ("opens_at", models.TimeField(blank=True, null=True)),
                ("closes_at", models.TimeField(blank=True, null=True)),
            ],
            options={"ordering": ("weekday",)},
        ),
        migrations.CreateModel(
            name="ClinicProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(default="DentalClinic", max_length=150)),
                ("tagline", models.CharField(blank=True, max_length=200)),
                ("phone", models.CharField(blank=True, max_length=30)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("address", models.TextField(blank=True)),
                ("logo", models.ImageField(blank=True, upload_to="clinics/logos/")),
                ("currency", models.CharField(choices=[("NIO", "Córdoba nicaragüense (C$)"), ("USD", "Dólar estadounidense ($)")], default="NIO", max_length=3)),
                ("timezone", models.CharField(default="America/Managua", max_length=64)),
                ("schedule_configured", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="HolidayClosure",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("date", models.DateField()),
                ("repeats_annually", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ("date", "name")},
        ),
        migrations.CreateModel(
            name="ServiceCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("position", models.PositiveSmallIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ("position", "name")},
        ),
        migrations.CreateModel(
            name="BusinessBreak",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("starts_at", models.TimeField()),
                ("ends_at", models.TimeField()),
                ("business_hour", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="breaks", to="clinics.businesshour")),
            ],
            options={"ordering": ("starts_at",)},
        ),
        migrations.CreateModel(
            name="ClinicService",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("duration_minutes", models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(15), django.core.validators.MaxValueValidator(240)])),
                ("price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("position", models.PositiveSmallIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="services", to="clinics.servicecategory")),
            ],
            options={"ordering": ("category__position", "position", "name")},
        ),
        migrations.RunPython(seed_clinic, migrations.RunPython.noop),
    ]
