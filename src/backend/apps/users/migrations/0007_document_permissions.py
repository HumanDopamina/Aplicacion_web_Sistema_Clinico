from django.db import migrations


DOCUMENT_DEFAULTS = ("documents.view", "documents.create")


def add_document_permissions(apps, schema_editor):
    preset_model = apps.get_model("users", "RolePermissionPreset")
    for preset in preset_model.objects.filter(role__in=("RECEPCIONISTA", "ODONTOLOGO")):
        permissions = list(preset.permissions)
        for code in DOCUMENT_DEFAULTS:
            if code not in permissions:
                permissions.append(code)
        preset.permissions = permissions
        preset.save(update_fields=("permissions",))


def remove_document_permissions(apps, schema_editor):
    preset_model = apps.get_model("users", "RolePermissionPreset")
    for preset in preset_model.objects.all():
        preset.permissions = [
            code for code in preset.permissions if not code.startswith("documents.")
        ]
        preset.save(update_fields=("permissions",))


class Migration(migrations.Migration):
    dependencies = [("users", "0006_appointment_edit_permission")]
    operations = [migrations.RunPython(add_document_permissions, remove_document_permissions)]
