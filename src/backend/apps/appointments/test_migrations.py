from datetime import UTC, datetime
from unittest import skipUnless

from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor

from apps.common.test_utils import MigrationTestCase

from .models import appointment_scheduled_range


POSTGRES_ONLY = skipUnless(
    connection.vendor == "postgresql",
    "Requiere PostgreSQL real.",
)


@POSTGRES_ONLY
class AppointmentRangeMigrationTests(MigrationTestCase):
    migrate_from = ("appointments", "0002_appointment_service_and_flexible_duration")
    migrate_to = ("appointments", "0004_appointment_overlap_constraints")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        historical_targets = [
            self.migrate_from,
            *(
                node
                for node in self.executor.loader.graph.leaf_nodes()
                if node[0] != self.migrate_from[0]
            ),
        ]
        self.executor.migrate(historical_targets)
        self.old_apps = self.executor.loader.project_state(historical_targets).apps
        UserModel = self.old_apps.get_model("users", "User")
        self.admin = UserModel.objects.create(
            email="appointment-migration-admin@example.test",
            password="!",
            role="ADMINISTRADOR",
        )
        self.dentist = UserModel.objects.create(
            email="appointment-migration-dentist@example.test",
            password="!",
            role="ODONTOLOGO",
        )
        self.patient = self.create_patient("001-010190-9201A", "Primero")

    def create_patient(self, national_id, first_name):
        PatientModel = self.old_apps.get_model("patients", "Patient")
        return PatientModel.objects.create(
            first_name=first_name,
            last_name="Migración",
            birth_place="Managua",
            identification_type="CEDULA",
            identification_number=national_id,
            gender="OTRO",
            date_of_birth="1990-01-01",
            registered_by_id=self.admin.pk,
        )

    def create_old_appointment(self, **overrides):
        values = {
            "patient_id": self.patient.pk,
            "dentist_id": self.dentist.pk,
            "date": "2027-01-11",
            "start_time": "09:00:00",
            "duration_minutes": 60,
            "reason": "Dato histórico sintético",
            "notes": "Debe conservarse",
            "status": "PROGRAMADA",
            "created_by_id": self.admin.pk,
        }
        values.update(overrides)
        model = self.old_apps.get_model("appointments", "Appointment")
        return model.objects.create(**values)

    def test_migration_backfills_range_without_changing_existing_fields(self):
        original = self.create_old_appointment()

        MigrationExecutor(connection).migrate([self.migrate_to])
        apps = MigrationExecutor(connection).loader.project_state([self.migrate_to]).apps
        migrated = apps.get_model("appointments", "Appointment").objects.get(pk=original.pk)

        self.assertEqual(migrated.patient_id, self.patient.pk)
        self.assertEqual(migrated.dentist_id, self.dentist.pk)
        self.assertEqual(migrated.reason, "Dato histórico sintético")
        self.assertEqual(migrated.notes, "Debe conservarse")
        self.assertEqual(migrated.status, "PROGRAMADA")
        self.assertEqual(
            migrated.scheduled_range.lower,
            datetime(2027, 1, 11, 9, 0, tzinfo=UTC),
        )
        self.assertEqual(
            migrated.scheduled_range.upper,
            datetime(2027, 1, 11, 10, 0, tzinfo=UTC),
        )
        self.assertEqual(migrated.scheduled_range.bounds, "[)")

    def test_migration_stops_with_ids_when_historical_rows_overlap(self):
        first = self.create_old_appointment()
        second_patient = self.create_patient("001-020290-9202B", "Segundo")
        second = self.create_old_appointment(
            patient_id=second_patient.pk,
            start_time="09:30:00",
        )

        with self.assertRaisesRegex(
            RuntimeError,
            rf"odontólogo:{first.pk}/{second.pk}",
        ):
            MigrationExecutor(connection).migrate([
                ("appointments", "0003_appointment_scheduled_range"),
            ])

        old_model = self.old_apps.get_model("appointments", "Appointment")
        old_model.objects.filter(pk=second.pk).delete()


class AppointmentAttendanceMigrationTests(MigrationTestCase):
    migrate_from = ("appointments", "0004_appointment_overlap_constraints")
    migrate_to = ("appointments", "0006_validate_appointment_consultation")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        historical_targets = [
            self.migrate_from,
            ("patients", "0009_clinical_record_alerts"),
            ("users", "0009_user_profile_fields"),
        ]
        self.executor.migrate(historical_targets)
        self.old_apps = self.executor.loader.project_state(
            historical_targets
        ).apps
        UserModel = self.old_apps.get_model("users", "User")
        self.admin = UserModel.objects.create(
            email="attendance-migration-admin@example.test",
            password="!",
            role="ADMINISTRADOR",
            phone="",
        )
        self.dentist = UserModel.objects.create(
            email="attendance-migration-dentist@example.test",
            password="!",
            role="ODONTOLOGO",
            phone="",
        )
        PatientModel = self.old_apps.get_model("patients", "Patient")
        self.patient = PatientModel.objects.create(
            first_name="Paciente",
            last_name="Histórico",
            birth_place="Managua",
            national_id="001-010190-9301A",
            national_id_key="0010101909301A",
            gender="OTRO",
            date_of_birth="1990-01-01",
            registered_by_id=self.admin.pk,
        )
        ConsultationModel = self.old_apps.get_model("patients", "Consultation")
        self.consultation = ConsultationModel.objects.create(
            patient_id=self.patient.pk,
            professional_id=self.dentist.pk,
            professional_name_snapshot="Odontólogo Histórico",
            date="2027-02-15",
            time="09:00:00",
            consultation_type="GENERAL",
            summary="Consulta manual histórica",
            status="COMPLETADA",
        )
        OdontogramModel = self.old_apps.get_model("patients", "OdontogramVersion")
        self.odontogram = OdontogramModel.objects.create(
            patient_id=self.patient.pk,
            consultation_id=self.consultation.pk,
            version_number=1,
            dentition="PERMANENT",
            teeth={},
            changed_teeth=[],
            created_by_id=self.dentist.pk,
        )
        AppointmentModel = self.old_apps.get_model("appointments", "Appointment")
        values = {
            "patient_id": self.patient.pk,
            "dentist_id": self.dentist.pk,
            "date": "2027-02-15",
            "start_time": "10:00:00",
            "duration_minutes": 60,
            "reason": "Cita histórica sin enlace inferido",
            "notes": "Conservar sin cambios",
            "status": "CONFIRMADA",
            "created_by_id": self.admin.pk,
        }
        if connection.vendor == "postgresql":
            values["scheduled_range"] = appointment_scheduled_range(
                datetime(2027, 2, 15).date(),
                datetime(2027, 2, 15, 10).time(),
                60,
            )
        self.appointment = AppointmentModel.objects.create(**values)

    def test_safe_migration_preserves_counts_ids_and_leaves_historical_links_null(self):
        before_counts = {
            "appointments": self.old_apps.get_model(
                "appointments", "Appointment"
            ).objects.count(),
            "consultations": self.old_apps.get_model(
                "patients", "Consultation"
            ).objects.count(),
            "odontograms": self.old_apps.get_model(
                "patients", "OdontogramVersion"
            ).objects.count(),
        }

        MigrationExecutor(connection).migrate([self.migrate_to])
        apps = MigrationExecutor(connection).loader.project_state([self.migrate_to]).apps
        AppointmentModel = apps.get_model("appointments", "Appointment")
        migrated = AppointmentModel.objects.get(pk=self.appointment.pk)

        self.assertEqual(migrated.reason, "Cita histórica sin enlace inferido")
        self.assertEqual(migrated.notes, "Conservar sin cambios")
        self.assertEqual(migrated.status, "CONFIRMADA")
        self.assertIsNone(migrated.consultation_id)
        self.assertIsNone(migrated.attendance_started_at)
        self.assertEqual(AppointmentModel.objects.count(), before_counts["appointments"])
        self.assertEqual(
            apps.get_model("patients", "Consultation").objects.count(),
            before_counts["consultations"],
        )
        self.assertEqual(
            apps.get_model("patients", "OdontogramVersion").objects.count(),
            before_counts["odontograms"],
        )
        self.assertTrue(
            apps.get_model("patients", "Consultation").objects.filter(
                pk=self.consultation.pk
            ).exists()
        )
        self.assertTrue(
            apps.get_model("patients", "OdontogramVersion").objects.filter(
                pk=self.odontogram.pk
            ).exists()
        )

    def test_activation_enforces_one_appointment_per_consultation(self):
        MigrationExecutor(connection).migrate([self.migrate_to])
        apps = MigrationExecutor(connection).loader.project_state([self.migrate_to]).apps
        AppointmentModel = apps.get_model("appointments", "Appointment")
        AppointmentModel.objects.filter(pk=self.appointment.pk).update(
            consultation_id=self.consultation.pk
        )

        duplicate = AppointmentModel.objects.get(pk=self.appointment.pk)
        duplicate.pk = None
        duplicate.date = datetime(2027, 2, 16).date()
        duplicate.start_time = datetime(2027, 2, 16, 11).time()
        if connection.vendor == "postgresql":
            duplicate.scheduled_range = appointment_scheduled_range(
                duplicate.date,
                duplicate.start_time,
                duplicate.duration_minutes,
            )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                duplicate.save(force_insert=True)


class AppointmentCheckInAndRescheduleMigrationTests(MigrationTestCase):
    migrate_from = ("appointments", "0006_validate_appointment_consultation")
    migrate_to = ("appointments", "0007_appointmentrescheduleevent_and_more")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        historical_targets = [
            self.migrate_from,
            ("patients", "0015_contract_legacy_national_id"),
            ("users", "0009_user_profile_fields"),
            ("clinics", "0001_initial"),
        ]
        self.executor.migrate(historical_targets)
        self.old_apps = self.executor.loader.project_state(historical_targets).apps
        UserModel = self.old_apps.get_model("users", "User")
        self.admin = UserModel.objects.create(
            email="reschedule-migration-admin@example.test",
            password="!",
            role="ADMINISTRADOR",
            phone="",
        )
        self.dentist = UserModel.objects.create(
            email="reschedule-migration-dentist@example.test",
            password="!",
            role="ODONTOLOGO",
            phone="",
        )
        PatientModel = self.old_apps.get_model("patients", "Patient")
        self.patient = PatientModel.objects.create(
            first_name="Paciente",
            last_name="Agenda histórica",
            birth_place="Managua",
            phone="8888-5858",
            gender="OTRO",
            date_of_birth="1990-01-01",
            registered_by_id=self.admin.pk,
        )
        AppointmentModel = self.old_apps.get_model("appointments", "Appointment")
        values = {
            "patient_id": self.patient.pk,
            "dentist_id": self.dentist.pk,
            "date": "2027-03-01",
            "start_time": "09:00:00",
            "duration_minutes": 60,
            "reason": "Cita previa a HU-58",
            "notes": "Debe permanecer sin historia inventada",
            "status": "CONFIRMADA",
            "created_by_id": self.admin.pk,
        }
        if connection.vendor == "postgresql":
            values["scheduled_range"] = appointment_scheduled_range(
                datetime(2027, 3, 1).date(),
                datetime(2027, 3, 1, 9).time(),
                60,
            )
        self.appointment = AppointmentModel.objects.create(**values)

    def test_migration_preserves_appointments_and_starts_with_empty_history(self):
        before_count = self.old_apps.get_model(
            "appointments", "Appointment"
        ).objects.count()

        MigrationExecutor(connection).migrate([self.migrate_to])
        apps = MigrationExecutor(connection).loader.project_state([self.migrate_to]).apps
        AppointmentModel = apps.get_model("appointments", "Appointment")
        EventModel = apps.get_model("appointments", "AppointmentRescheduleEvent")
        migrated = AppointmentModel.objects.get(pk=self.appointment.pk)

        self.assertEqual(AppointmentModel.objects.count(), before_count)
        self.assertEqual(migrated.status, "CONFIRMADA")
        self.assertEqual(migrated.reason, "Cita previa a HU-58")
        self.assertEqual(migrated.notes, "Debe permanecer sin historia inventada")
        self.assertFalse(EventModel.objects.exists())
