from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase

from apps.users.models import User


class PatientNationalIdKeyMigrationTests(TransactionTestCase):
    migrate_from = ("patients", "0004_consultation_abdomen_pelvis_and_more")
    migrate_to = ("patients", "0005_patient_national_id_key")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_from])
        self.old_apps = self.executor.loader.project_state([self.migrate_from]).apps
        self.user = User.objects.create(
            email="migration-admin@example.com",
            password="!",
            role="ADMINISTRADOR",
        )

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate([("patients", "0006_odontogramversion")])
        super().tearDown()

    def create_patient(self, national_id, email):
        patient_model = self.old_apps.get_model("patients", "Patient")
        return patient_model.objects.create(
            first_name="Paciente",
            last_name="Migración",
            birth_place="Managua",
            national_id=national_id,
            email=email,
            gender="OTRO",
            date_of_birth="1990-01-01",
            registered_by_id=self.user.pk,
        )

    def test_hu13_migration_backfills_normalized_keys(self):
        first = self.create_patient("001-160498-0001a", "uno@example.com")
        second = self.create_patient("002 160498 0001B", "dos@example.com")

        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_to])
        new_apps = self.executor.loader.project_state([self.migrate_to]).apps
        patient_model = new_apps.get_model("patients", "Patient")

        self.assertEqual(
            patient_model.objects.get(pk=first.pk).national_id_key,
            "0011604980001A",
        )
        self.assertEqual(
            patient_model.objects.get(pk=second.pk).national_id_key,
            "0021604980001B",
        )

    def test_hu13_migration_stops_before_overwriting_colliding_records(self):
        first = self.create_patient("001-160498-0001A", "uno@example.com")
        second = self.create_patient("0011604980001a", "dos@example.com")

        self.executor = MigrationExecutor(connection)
        with self.assertRaisesMessage(
            RuntimeError,
            "No se puede crear national_id_key porque existen cédulas duplicadas",
        ):
            self.executor.migrate([self.migrate_to])

        old_patient_model = self.old_apps.get_model("patients", "Patient")
        self.assertTrue(old_patient_model.objects.filter(pk=first.pk).exists())
        self.assertTrue(old_patient_model.objects.filter(pk=second.pk).exists())
        old_patient_model.objects.filter(pk=second.pk).delete()


class OdontogramVersionMigrationTests(TransactionTestCase):
    migrate_from = ("patients", "0005_patient_national_id_key")
    migrate_to = ("patients", "0006_odontogramversion")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_from])
        old_apps = self.executor.loader.project_state([self.migrate_from]).apps
        patient_model = old_apps.get_model("patients", "Patient")
        consultation_model = old_apps.get_model("patients", "Consultation")
        user = User.objects.create(
            email="odontogram-migration@example.com",
            password="!",
            role="ODONTOLOGO",
        )
        patient = patient_model.objects.create(
            first_name="Paciente",
            last_name="Histórico",
            birth_place="Managua",
            national_id="001-090890-0001A",
            national_id_key="0010908900001A",
            gender="OTRO",
            date_of_birth="1990-08-09",
            registered_by_id=user.pk,
        )
        self.consultation_ids = [
            consultation_model.objects.create(
                patient_id=patient.pk,
                professional_id=user.pk,
                professional_name_snapshot="Odontólogo migración",
                date=f"2026-08-{day:02d}",
                time="09:00:00",
                consultation_type="GENERAL",
                summary=f"Consulta {day}",
                status="COMPLETADA",
            ).pk
            for day in (8, 9)
        ]

    def tearDown(self):
        MigrationExecutor(connection).migrate([self.migrate_to])
        super().tearDown()

    def test_migration_creates_an_empty_linked_version_for_each_consultation(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_to])
        apps = self.executor.loader.project_state([self.migrate_to]).apps
        version_model = apps.get_model("patients", "OdontogramVersion")
        versions = list(version_model.objects.order_by("version_number"))

        self.assertEqual(len(versions), 2)
        self.assertEqual([item.version_number for item in versions], [1, 2])
        self.assertEqual(
            [item.consultation_id for item in versions],
            self.consultation_ids,
        )
        self.assertEqual(versions[0].dentition, "PERMANENT")
        self.assertEqual(versions[0].teeth, {})
        self.assertIsNone(versions[0].based_on_id)
        self.assertEqual(versions[1].based_on_id, versions[0].pk)
