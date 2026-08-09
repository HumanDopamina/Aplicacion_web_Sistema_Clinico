import re

from django.db import migrations, models


def normalize_national_id(value):
    return re.sub(r"[\s-]+", "", value).upper()


def backfill_national_id_keys(apps, schema_editor):
    patient_model = apps.get_model("patients", "Patient")
    patients = list(patient_model.objects.only("id", "national_id"))
    patients_by_key = {}

    for patient in patients:
        key = normalize_national_id(patient.national_id)
        patients_by_key.setdefault(key, []).append(patient)

    collisions = {
        key: [patient.pk for patient in matches]
        for key, matches in patients_by_key.items()
        if len(matches) > 1
    }
    if collisions:
        details = ", ".join(
            f"{key}: {patient_ids}" for key, patient_ids in sorted(collisions.items())
        )
        raise RuntimeError(
            "No se puede crear national_id_key porque existen cédulas duplicadas: "
            f"{details}"
        )

    for key, matches in patients_by_key.items():
        patient_model.objects.filter(pk=matches[0].pk).update(national_id_key=key)


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0004_consultation_abdomen_pelvis_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="national_id_key",
            field=models.CharField(editable=False, max_length=32, null=True),
        ),
        migrations.RunPython(backfill_national_id_keys, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="patient",
            name="national_id",
            field=models.CharField(max_length=32),
        ),
        migrations.AlterField(
            model_name="patient",
            name="national_id_key",
            field=models.CharField(editable=False, max_length=32, unique=True),
        ),
    ]
