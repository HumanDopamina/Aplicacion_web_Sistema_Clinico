import django.db.models.deletion
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import RangeOperators
from django.db import migrations, models
from django.db.models import Q

import apps.appointments.fields


BLOCKING_STATUSES = (
    "PROGRAMADA",
    "CONFIRMADA",
    "EN_ATENCION",
    "COMPLETADA",
    "NO_ASISTIO",
)


class RemovePostgresConstraint(migrations.RemoveConstraint):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        if schema_editor.connection.vendor == "postgresql":
            super().database_forwards(app_label, schema_editor, from_state, to_state)

    def database_backwards(self, app_label, schema_editor, from_state, to_state):
        if schema_editor.connection.vendor == "postgresql":
            super().database_backwards(app_label, schema_editor, from_state, to_state)


class AddPostgresConstraint(migrations.AddConstraint):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        if schema_editor.connection.vendor == "postgresql":
            super().database_forwards(app_label, schema_editor, from_state, to_state)

    def database_backwards(self, app_label, schema_editor, from_state, to_state):
        if schema_editor.connection.vendor == "postgresql":
            super().database_backwards(app_label, schema_editor, from_state, to_state)


class Migration(migrations.Migration):
    dependencies = [
        ("appointments", "0004_appointment_overlap_constraints"),
        ("patients", "0009_clinical_record_alerts"),
    ]

    operations = [
        RemovePostgresConstraint(
            model_name="appointment",
            name="appointment_dentist_schedule_excl",
        ),
        RemovePostgresConstraint(
            model_name="appointment",
            name="appointment_patient_schedule_excl",
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
        migrations.AddField(
            model_name="appointment",
            name="attendance_started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="appointment",
            name="consultation",
            field=models.ForeignKey(
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
                    name="status",
                    field=models.CharField(
                        choices=[
                            ("PROGRAMADA", "Programada"),
                            ("CONFIRMADA", "Confirmada"),
                            ("EN_ATENCION", "En atención"),
                            ("COMPLETADA", "Completada"),
                            ("CANCELADA", "Cancelada"),
                            ("NO_ASISTIO", "No asistió"),
                        ],
                        default="PROGRAMADA",
                        max_length=16,
                    ),
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
                    ),
                ),
            ],
        ),
        AddPostgresConstraint(
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
        AddPostgresConstraint(
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
    ]
