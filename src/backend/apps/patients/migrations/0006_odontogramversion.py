import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def suggested_dentition(date_of_birth, reference_date):
    years = reference_date.year - date_of_birth.year
    if (reference_date.month, reference_date.day) < (
        date_of_birth.month,
        date_of_birth.day,
    ):
        years -= 1
    if years < 6:
        return "PRIMARY"
    if years < 13:
        return "MIXED"
    return "PERMANENT"


def create_versions_for_existing_consultations(apps, schema_editor):
    consultation_model = apps.get_model("patients", "Consultation")
    version_model = apps.get_model("patients", "OdontogramVersion")
    previous_by_patient = {}
    consultations = consultation_model.objects.select_related("patient").order_by(
        "patient_id",
        "created_at",
        "id",
    )
    for consultation in consultations:
        previous = previous_by_patient.get(consultation.patient_id)
        version = version_model.objects.create(
            patient_id=consultation.patient_id,
            consultation_id=consultation.pk,
            version_number=(previous.version_number + 1) if previous else 1,
            dentition=(
                previous.dentition
                if previous
                else suggested_dentition(
                    consultation.patient.date_of_birth,
                    consultation.date,
                )
            ),
            teeth=previous.teeth if previous else {},
            changed_teeth=[],
            based_on_id=previous.pk if previous else None,
            created_by_id=consultation.professional_id,
        )
        previous_by_patient[consultation.patient_id] = version


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0005_patient_national_id_key"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="OdontogramVersion",
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
                ("version_number", models.PositiveIntegerField()),
                (
                    "schema_version",
                    models.PositiveSmallIntegerField(default=1, editable=False),
                ),
                (
                    "dentition",
                    models.CharField(
                        choices=[
                            ("PRIMARY", "Temporal"),
                            ("MIXED", "Mixta"),
                            ("PERMANENT", "Permanente"),
                        ],
                        max_length=16,
                    ),
                ),
                ("teeth", models.JSONField(default=dict)),
                ("changed_teeth", models.JSONField(default=list, editable=False)),
                ("note", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "based_on",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="derived_versions",
                        to="patients.odontogramversion",
                    ),
                ),
                (
                    "consultation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="odontogram_versions",
                        to="patients.consultation",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="created_odontogram_versions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="odontogram_versions",
                        to="patients.patient",
                    ),
                ),
            ],
            options={"ordering": ("-version_number",)},
        ),
        migrations.AddConstraint(
            model_name="odontogramversion",
            constraint=models.UniqueConstraint(
                fields=("patient", "version_number"),
                name="unique_patient_odontogram_version",
            ),
        ),
        migrations.RunPython(
            create_versions_for_existing_consultations,
            migrations.RunPython.noop,
        ),
    ]
