from django.db import migrations, models


HISTORICAL_ALLERGY_NOTE = "Alergia registrada previamente; completar detalle"


def backfill_historical_allergies(apps, schema_editor):
    clinical_record_model = apps.get_model("patients", "ClinicalRecord")
    records = clinical_record_model.objects.only(
        "id",
        "allergies",
        "hereditary_diseases",
    )
    for record in records.iterator(chunk_size=500):
        historical = record.hereditary_diseases
        has_historical_signal = (
            isinstance(historical, dict)
            and historical.get("allergies") is True
        )
        if has_historical_signal and not record.allergies:
            record.allergies = HISTORICAL_ALLERGY_NOTE
            record.save(update_fields=("allergies",))


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0008_consultation_dashboard_index"),
    ]

    operations = [
        migrations.AddField(
            model_name="clinicalrecord",
            name="allergies",
            field=models.TextField(blank=True, default="", max_length=2000),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="clinicalrecord",
            name="current_medications",
            field=models.TextField(blank=True, default="", max_length=2000),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="clinicalrecord",
            name="other_clinical_alerts",
            field=models.TextField(blank=True, default="", max_length=2000),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="clinicalrecord",
            name="relevant_conditions",
            field=models.TextField(blank=True, default="", max_length=2000),
            preserve_default=False,
        ),
        migrations.RunPython(
            backfill_historical_allergies,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
