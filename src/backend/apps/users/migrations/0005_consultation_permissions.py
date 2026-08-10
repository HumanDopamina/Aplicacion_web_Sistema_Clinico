from django.db import migrations


ROLE_DEFAULTS = {
    "RECEPCIONISTA": ["consultations.view"],
    "ODONTOLOGO": [
        "consultations.view",
        "consultations.create",
        "consultations.edit",
    ],
}


def add_consultation_permissions(apps, schema_editor):
    preset_model = apps.get_model("users", "RolePermissionPreset")
    for role, defaults in ROLE_DEFAULTS.items():
        preset, _ = preset_model.objects.get_or_create(role=role)
        existing = list(preset.permissions)
        preset.permissions = existing + [code for code in defaults if code not in existing]
        preset.save(update_fields=["permissions"])


def remove_consultation_permissions(apps, schema_editor):
    preset_model = apps.get_model("users", "RolePermissionPreset")
    consultation_codes = {
        "consultations.view",
        "consultations.create",
        "consultations.edit",
    }
    for preset in preset_model.objects.all():
        preset.permissions = [
            code for code in preset.permissions if code not in consultation_codes
        ]
        preset.save(update_fields=["permissions"])


class Migration(migrations.Migration):
    dependencies = [("users", "0004_rolepermissionpreset")]

    operations = [
        migrations.RunPython(add_consultation_permissions, remove_consultation_permissions),
    ]
