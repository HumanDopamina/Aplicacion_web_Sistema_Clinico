import django.db.models.deletion
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import RangeOperators
from django.db import migrations, models
from django.db.models import Count, Q

import apps.appointments.fields


BLOCKING_STATUSES = (
    "PROGRAMADA",
    "CONFIRMADA",
    "EN_ATENCION",
    "COMPLETADA",
    "NO_ASISTIO",
)


def validate_consultation_links(apps, schema_editor):
    Appointment = apps.get_model("appointments", "Appointment")
    duplicates = list(
        Appointment.objects.exclude(consultation_id=None)
        .values("consultation_id")
        .annotate(total=Count("id"))
        .filter(total__gt=1)
        .values_list("consultation_id", flat=True)
    )
    if duplicates:
        raise RuntimeError(
            "No se puede activar la relación uno-a-uno; consultas duplicadas: "
            + ", ".join(map(str, duplicates))
        )


class Migration(migrations.Migration):
    dependencies = [
        ("appointments", "0005_expand_appointment_attendance"),
    ]

    operations = [
        migrations.RunPython(validate_consultation_links, migrations.RunPython.noop),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveConstraint(
                    model_name="appointment",
                    name="appointment_dentist_schedule_excl",
                ),
                migrations.RemoveConstraint(
                    model_name="appointment",
                    name="appointment_patient_schedule_excl",
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="appointment",
                    name="scheduled_range",
                    field=apps.appointments.fields.PostgresDateTimeRangeField(
                        editable=False,
                        null=True,
                    ),
                ),
            ],
        ),
        migrations.AlterField(
            model_name="appointment",
            name="consultation",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="appointment",
                to="patients.consultation",
            ),
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="appointment",
                    name="scheduled_range",
                    field=apps.appointments.fields.PostgresDateTimeRangeField(
                        editable=False,
                    ),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddConstraint(
                    model_name="appointment",
                    constraint=ExclusionConstraint(
                        name="appointment_dentist_schedule_excl",
                        expressions=(
                            ("dentist", RangeOperators.EQUAL),
                            ("scheduled_range", RangeOperators.OVERLAPS),
                        ),
                        condition=Q(status__in=BLOCKING_STATUSES),
                    ),
                ),
                migrations.AddConstraint(
                    model_name="appointment",
                    constraint=ExclusionConstraint(
                        name="appointment_patient_schedule_excl",
                        expressions=(
                            ("patient", RangeOperators.EQUAL),
                            ("scheduled_range", RangeOperators.OVERLAPS),
                        ),
                        condition=Q(status__in=BLOCKING_STATUSES),
                    ),
                ),
            ],
        ),
    ]
