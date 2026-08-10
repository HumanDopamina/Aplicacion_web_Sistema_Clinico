from django.db import migrations, models


def create_default_presets(apps, schema_editor):
    preset_model = apps.get_model("users", "RolePermissionPreset")
    preset_model.objects.bulk_create([
        preset_model(
            role="RECEPCIONISTA",
            permissions=[
                "patients.view",
                "patients.create",
                "appointments.view",
                "appointments.create",
            ],
        ),
        preset_model(
            role="ODONTOLOGO",
            permissions=["patients.view", "appointments.view"],
        ),
    ])


def delete_default_presets(apps, schema_editor):
    preset_model = apps.get_model("users", "RolePermissionPreset")
    preset_model.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [("users", "0003_user_token_version")]

    operations = [
        migrations.CreateModel(
            name="RolePermissionPreset",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("RECEPCIONISTA", "Recepcionista"),
                            ("ODONTOLOGO", "Odontólogo"),
                        ],
                        max_length=20,
                        unique=True,
                    ),
                ),
                ("permissions", models.JSONField(default=list)),
            ],
            options={"ordering": ("role",)},
        ),
        migrations.RunPython(create_default_presets, delete_default_presets),
    ]
