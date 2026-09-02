from django.db import migrations, models
from django.db.models.functions import Replace, Trim, Upper


def backfill_flexible_identification(apps, schema_editor):
    patient_model = apps.get_model("patients", "Patient")
    legacy_count = (
        patient_model.objects.filter(national_id__isnull=False)
        .exclude(national_id="")
        .count()
    )
    updated_count = (
        patient_model.objects.filter(national_id__isnull=False)
        .exclude(national_id="")
        .update(
            identification_type="CEDULA",
            identification_number=models.F("national_id"),
        )
    )
    if updated_count != legacy_count:
        raise RuntimeError(
            "No se pudo validar el backfill completo de identificación flexible."
        )


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0013_treatmentitem_odontogram_result"),
    ]

    operations = [
        migrations.AlterField(
            model_name="patient",
            name="national_id",
            field=models.CharField(blank=True, max_length=32, null=True),
        ),
        migrations.AlterField(
            model_name="patient",
            name="national_id_key",
            field=models.CharField(
                blank=True,
                editable=False,
                max_length=32,
                null=True,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="identification_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("CEDULA", "Cédula"),
                    ("PASAPORTE", "Pasaporte"),
                    ("OTRO", "Otro"),
                ],
                max_length=16,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="identification_number",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="guardian_name",
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="guardian_relationship",
            field=models.CharField(blank=True, max_length=80, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="guardian_phone",
            field=models.CharField(blank=True, max_length=32, null=True),
        ),
        migrations.RunPython(
            backfill_flexible_identification,
            migrations.RunPython.noop,
        ),
        migrations.AddConstraint(
            model_name="patient",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(
                        identification_type__isnull=True,
                        identification_number__isnull=True,
                    )
                    | (
                        models.Q(
                            identification_type__in=("CEDULA", "PASAPORTE", "OTRO"),
                            identification_type__isnull=False,
                            identification_number__isnull=False,
                        )
                        & ~models.Q(identification_number="")
                    )
                ),
                name="patient_ident_pair_valid",
            ),
        ),
        migrations.AddConstraint(
            model_name="patient",
            constraint=models.UniqueConstraint(
                models.F("identification_type"),
                Upper(
                    models.Case(
                        models.When(
                            identification_type="CEDULA",
                            then=Replace(
                                Replace(
                                    Trim("identification_number"),
                                    models.Value(" "),
                                    models.Value(""),
                                ),
                                models.Value("-"),
                                models.Value(""),
                            ),
                        ),
                        default=Trim("identification_number"),
                        output_field=models.CharField(max_length=64),
                    )
                ),
                condition=(
                    models.Q(identification_number__isnull=False)
                    & ~models.Q(identification_number="")
                ),
                name="patient_ident_type_num_uniq",
            ),
        ),
    ]
