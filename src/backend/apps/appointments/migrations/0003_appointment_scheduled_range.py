from datetime import datetime, timedelta

from django.conf import settings
from django.db import migrations
from django.db.backends.postgresql.psycopg_any import DateTimeTZRange
from django.utils import timezone

import apps.appointments.fields


BLOCKING_STATUSES = (
    "PROGRAMADA",
    "CONFIRMADA",
    "COMPLETADA",
    "NO_ASISTIO",
)


def appointment_range(appointment):
    start = datetime.combine(appointment.date, appointment.start_time)
    if settings.USE_TZ and timezone.is_naive(start):
        start = timezone.make_aware(start, timezone.get_default_timezone())
    return DateTimeTZRange(
        start,
        start + timedelta(minutes=appointment.duration_minutes),
        bounds="[)",
    )


def validate_and_backfill_ranges(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    Appointment = apps.get_model("appointments", "Appointment")
    appointments = list(Appointment.objects.order_by("date", "start_time", "pk"))
    invalid_ids = [
        appointment.pk
        for appointment in appointments
        if not 15 <= appointment.duration_minutes <= 240
        or appointment.duration_minutes % 15
        or appointment_range(appointment).upper.date() != appointment.date
    ]
    if invalid_ids:
        raise RuntimeError(
            "No se puede calcular scheduled_range para las citas con ID: "
            + ", ".join(map(str, invalid_ids))
        )

    conflicts = []
    blocking = [item for item in appointments if item.status in BLOCKING_STATUSES]
    for position, left in enumerate(blocking):
        left_range = appointment_range(left)
        for right in blocking[position + 1:]:
            if left.date != right.date:
                continue
            right_range = appointment_range(right)
            if left_range.lower >= right_range.upper or right_range.lower >= left_range.upper:
                continue
            if left.dentist_id == right.dentist_id:
                conflicts.append(f"odontólogo:{left.pk}/{right.pk}")
            if left.patient_id == right.patient_id:
                conflicts.append(f"paciente:{left.pk}/{right.pk}")

    if conflicts:
        raise RuntimeError(
            "No se pueden crear las restricciones de agenda; existen solapamientos: "
            + ", ".join(conflicts)
        )

    for appointment in appointments:
        Appointment.objects.filter(pk=appointment.pk).update(
            scheduled_range=appointment_range(appointment),
        )


def set_range_not_null(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        table = schema_editor.quote_name("appointments_appointment")
        column = schema_editor.quote_name("scheduled_range")
        schema_editor.execute(f"ALTER TABLE {table} ALTER COLUMN {column} SET NOT NULL")


def drop_range_not_null(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        table = schema_editor.quote_name("appointments_appointment")
        column = schema_editor.quote_name("scheduled_range")
        schema_editor.execute(f"ALTER TABLE {table} ALTER COLUMN {column} DROP NOT NULL")


class Migration(migrations.Migration):
    dependencies = [
        ("appointments", "0002_appointment_service_and_flexible_duration"),
    ]

    operations = [
        migrations.AddField(
            model_name="appointment",
            name="scheduled_range",
            field=apps.appointments.fields.PostgresDateTimeRangeField(
                editable=False,
                null=True,
            ),
        ),
        migrations.RunPython(validate_and_backfill_ranges, migrations.RunPython.noop),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(set_range_not_null, drop_range_not_null),
            ],
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
    ]
