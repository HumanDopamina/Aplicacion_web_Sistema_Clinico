import re

from django.db import migrations


REVERSE_ERROR = (
    "No se puede revertir la identificación flexible porque existen pacientes "
    "incompatibles con el contrato legado."
)


def restore_legacy_identification(apps, schema_editor):
    patient_model = apps.get_model("patients", "Patient")
    patients = list(
        patient_model.objects.only(
            "id",
            "identification_type",
            "identification_number",
            "national_id",
            "national_id_key",
        ).order_by("id")
    )
    normalized_keys = set()

    for patient in patients:
        identification_type = patient.identification_type
        identification_number = patient.identification_number

        if identification_type != "CEDULA" or not isinstance(
            identification_number,
            str,
        ):
            raise RuntimeError(REVERSE_ERROR)

        national_id_key = re.sub(r"[\s-]+", "", identification_number).upper()
        if (
            len(identification_number) > 32
            or len(national_id_key) > 32
            or national_id_key in normalized_keys
        ):
            raise RuntimeError(REVERSE_ERROR)

        normalized_keys.add(national_id_key)
        patient.national_id = identification_number
        patient.national_id_key = national_id_key

    if patients:
        patient_model.objects.bulk_update(
            patients,
            ["national_id", "national_id_key"],
        )


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0014_expand_flexible_identification"),
    ]

    operations = [
        migrations.RunPython(
            migrations.RunPython.noop,
            restore_legacy_identification,
        ),
        migrations.RemoveField(
            model_name="patient",
            name="national_id_key",
        ),
        migrations.RemoveField(
            model_name="patient",
            name="national_id",
        ),
    ]
