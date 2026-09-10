from unittest import skipUnless

from django.db import IntegrityError, connection, transaction
from django.test import TransactionTestCase

from apps.users.models import User

from .models import Patient


POSTGRES_ONLY = skipUnless(
    connection.vendor == "postgresql",
    "Requiere PostgreSQL real.",
)


@POSTGRES_ONLY
class PostgresPatientIdentificationConstraintTests(TransactionTestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email="hu53-postgres-admin@example.test",
            password="SyntheticOnly123!",
            role=User.Role.ADMINISTRADOR,
        )
        self.patient_index = 0

    def _patient(self, *, identification_type=None, identification_number=None):
        self.patient_index += 1
        return Patient(
            first_name="Paciente",
            last_name=f"PostgreSQL {self.patient_index}",
            birth_place="Managua",
            identification_type=identification_type,
            identification_number=identification_number,
            email=f"hu53-postgres-{self.patient_index}@example.test",
            gender=Patient.Gender.OTRO,
            date_of_birth="1990-01-01",
            registered_by=self.user,
        )

    def test_database_rejects_normalized_duplicate_without_model_save(self):
        Patient.objects.bulk_create([
            self._patient(
                identification_type="PASAPORTE",
                identification_number=" pg-00A ",
            )
        ])

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Patient.objects.bulk_create([
                    self._patient(
                        identification_type="PASAPORTE",
                        identification_number="PG-00A",
                    )
                ])

    def test_database_allows_same_normalized_number_for_different_types(self):
        Patient.objects.bulk_create([
            self._patient(
                identification_type="CEDULA",
                identification_number=" TIPO-77 ",
            ),
            self._patient(
                identification_type="OTRO",
                identification_number="tipo-77",
            ),
        ])

        self.assertEqual(
            Patient.objects.filter(identification_number__icontains="TIPO-77").count(),
            2,
        )

    def test_database_allows_multiple_null_identifications(self):
        Patient.objects.bulk_create([self._patient(), self._patient()])

        self.assertEqual(
            Patient.objects.filter(
                identification_type__isnull=True,
                identification_number__isnull=True,
            ).count(),
            2,
        )
