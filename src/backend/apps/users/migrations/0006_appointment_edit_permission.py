from django.db import migrations


def add_appointment_edit_permission(apps, schema_editor):
    preset_model = apps.get_model("users", "RolePermissionPreset")
    preset = preset_model.objects.filter(role="RECEPCIONISTA").first()
    if preset and "appointments.create" in preset.permissions:
        permissions = list(preset.permissions)
        if "appointments.edit" not in permissions:
            permissions.append("appointments.edit")
            preset.permissions = permissions
            preset.save(update_fields=["permissions"])


def remove_appointment_edit_permission(apps, schema_editor):
    preset_model = apps.get_model("users", "RolePermissionPreset")
    for preset in preset_model.objects.all():
        preset.permissions = [
            code for code in preset.permissions if code != "appointments.edit"
        ]
        preset.save(update_fields=["permissions"])


class Migration(migrations.Migration):
    dependencies = [("users", "0005_consultation_permissions")]

    operations = [
        migrations.RunPython(
            add_appointment_edit_permission,
            remove_appointment_edit_permission,
        ),
    ]
