from django.core.exceptions import FieldDoesNotExist
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor

from apps.common.test_utils import MigrationTestCase

from apps.users.models import User


class PatientFlexibleIdentificationMigrationTests(MigrationTestCase):
    migrate_from = ("patients", "0013_treatmentitem_odontogram_result")
    migrate_to = ("patients", "0015_contract_legacy_national_id")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_from])
        self.old_apps = self.executor.loader.project_state([self.migrate_from]).apps
        self.user = User.objects.create(
            email="hu53-migration-admin@example.test",
            password="!",
            role="ADMINISTRADOR",
        )
        self.legacy_identifiers = {
            self._create_legacy_patient(
                national_id=" 001-160498-0001a ",
                national_id_key="0011604980001A",
                email="hu53-legacy-one@example.test",
            ).pk: " 001-160498-0001a ",
            self._create_legacy_patient(
                national_id="PA 00-17-Z",
                national_id_key="PA0017Z",
                email="hu53-legacy-two@example.test",
            ).pk: "PA 00-17-Z",
            self._create_legacy_patient(
                national_id="000-010101-0000A",
                national_id_key="0000101010000A",
                email="hu53-legacy-three@example.test",
            ).pk: "000-010101-0000A",
        }

        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_to])
        self.apps = self.executor.loader.project_state([self.migrate_to]).apps
        self.patient_model = self.apps.get_model("patients", "Patient")
        self.new_patient_index = 0

    def _create_legacy_patient(self, *, national_id, national_id_key, email):
        patient_model = self.old_apps.get_model("patients", "Patient")
        return patient_model.objects.create(
            first_name="Paciente",
            last_name="Histórico",
            birth_place="Managua",
            national_id=national_id,
            national_id_key=national_id_key,
            email=email,
            gender="OTRO",
            date_of_birth="1990-01-01",
            registered_by_id=self.user.pk,
        )

    def _create_new_patient(self, **overrides):
        self.new_patient_index += 1
        values = {
            "first_name": "Paciente",
            "last_name": f"Flexible {self.new_patient_index}",
            "birth_place": "Managua",
            "identification_type": None,
            "identification_number": None,
            "email": f"hu53-flexible-{self.new_patient_index}@example.test",
            "gender": "OTRO",
            "date_of_birth": "1990-01-01",
            "registered_by_id": self.user.pk,
        }
        values.update(overrides)
        return self.patient_model.objects.create(**values)

    def test_backfill_preserves_row_count_and_exact_legacy_identifiers(self):
        migrated = {
            patient.pk: patient.identification_number
            for patient in self.patient_model.objects.filter(
                pk__in=self.legacy_identifiers,
            )
        }

        self.assertEqual(self.patient_model.objects.count(), 3)
        self.assertEqual(migrated, self.legacy_identifiers)

    def test_backfill_classifies_every_legacy_identifier_as_cedula(self):
        migrated = self.patient_model.objects.filter(pk__in=self.legacy_identifiers)

        self.assertEqual(migrated.exclude(identification_type="CEDULA").count(), 0)

    def test_expansion_leaves_guardian_fields_null_for_historical_patients(self):
        migrated = self.patient_model.objects.filter(pk__in=self.legacy_identifiers)

        for patient in migrated:
            with self.subTest(patient_id=patient.pk):
                self.assertIsNone(patient.guardian_name)
                self.assertIsNone(patient.guardian_relationship)
                self.assertIsNone(patient.guardian_phone)

    def test_contraction_removes_legacy_fields_from_state_and_database(self):
        with self.assertRaises(FieldDoesNotExist):
            self.patient_model._meta.get_field("national_id")
        with self.assertRaises(FieldDoesNotExist):
            self.patient_model._meta.get_field("national_id_key")

        table_name = self.patient_model._meta.db_table
        with connection.cursor() as cursor:
            columns = {
                column.name
                for column in connection.introspection.get_table_description(
                    cursor,
                    table_name,
                )
            }

        self.assertNotIn("national_id", columns)
        self.assertNotIn("national_id_key", columns)
        self.assertIn("identification_type", columns)
        self.assertIn("identification_number", columns)

    def test_final_schema_allows_multiple_patients_without_identification(self):
        first = self._create_new_patient()
        second = self._create_new_patient()

        self.assertIsNone(first.identification_type)
        self.assertIsNone(first.identification_number)
        self.assertIsNone(second.identification_type)
        self.assertIsNone(second.identification_number)

    def test_unique_constraint_rejects_case_and_outer_space_variants_per_type(self):
        self._create_new_patient(
            identification_type="PASAPORTE",
            identification_number=" pa-00 17-z ",
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self._create_new_patient(
                    identification_type="PASAPORTE",
                    identification_number="PA-00 17-Z",
                )

    def test_unique_constraint_is_type_aware(self):
        first = self._create_new_patient(
            identification_type="CEDULA",
            identification_number=" ID-0007 ",
        )
        second = self._create_new_patient(
            identification_type="PASAPORTE",
            identification_number="id-0007",
        )

        self.assertEqual(first.identification_number, " ID-0007 ")
        self.assertEqual(second.identification_number, "id-0007")

    def test_unique_constraint_preserves_internal_characters_as_significant(self):
        values = ("PA-001", "PA001", "PA 001", "00PA-001")

        for value in values:
            self._create_new_patient(
                identification_type="OTRO",
                identification_number=value,
            )

        self.assertEqual(
            self.patient_model.objects.filter(
                identification_type="OTRO",
                identification_number__in=values,
            ).count(),
            4,
        )

    def test_pair_constraint_rejects_number_without_type(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self._create_new_patient(
                    identification_type=None,
                    identification_number="SIN-TIPO-01",
                )

    def test_pair_constraint_rejects_type_without_nonblank_number(self):
        for value in (None, ""):
            with self.subTest(identification_number=value):
                with self.assertRaises(IntegrityError):
                    with transaction.atomic():
                        self._create_new_patient(
                            identification_type="CEDULA",
                            identification_number=value,
                        )
