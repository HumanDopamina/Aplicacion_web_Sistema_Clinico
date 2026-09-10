from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import RangeOperators
from django.contrib.postgres.operations import BtreeGistExtension
from django.db import migrations
from django.db.models import Q


BLOCKING_STATUSES = (
    "PROGRAMADA",
    "CONFIRMADA",
    "COMPLETADA",
    "NO_ASISTIO",
)


class PostgresBtreeGistExtension(BtreeGistExtension):
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
        ("appointments", "0003_appointment_scheduled_range"),
    ]

    operations = [
        PostgresBtreeGistExtension(),
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
