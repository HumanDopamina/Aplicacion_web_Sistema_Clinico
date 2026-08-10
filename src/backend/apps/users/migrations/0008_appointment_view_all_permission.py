from django.db import migrations


PERMISSION_CODE = "appointments.view_all"


def add_appointment_view_all_permission(apps, schema_editor):
    preset_model = apps.get_model("users", "RolePermissionPreset")
    preset = preset_model.objects.filter(role="RECEPCIONISTA").first()
    if preset and "appointments.view" in preset.permissions:
        permissions = list(preset.permissions)
        if PERMISSION_CODE not in permissions:
            permissions.append(PERMISSION_CODE)
            preset.permissions = permissions
            preset.save(update_fields=("permissions",))


def remove_appointment_view_all_permission(apps, schema_editor):
    preset_model = apps.get_model("users", "RolePermissionPreset")
    for preset in preset_model.objects.all():
        preset.permissions = [
            code for code in preset.permissions if code != PERMISSION_CODE
        ]
        preset.save(update_fields=("permissions",))


class Migration(migrations.Migration):
    dependencies = [("users", "0007_document_permissions")]
    operations = [
        migrations.RunPython(
            add_appointment_view_all_permission,
            remove_appointment_view_all_permission,
        ),
    ]
