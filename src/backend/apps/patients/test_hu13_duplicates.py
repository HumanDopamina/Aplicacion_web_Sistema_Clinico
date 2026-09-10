from datetime import date

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APITestCase

from apps.users.models import RolePermissionPreset, User

from .duplicates import find_possible_patient_duplicates
from .models import Patient


class PatientDuplicateServiceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.actor = User.objects.create_user(
            email="duplicate-service@example.test",
            password="SyntheticOnly123!",
            role=User.Role.ADMINISTRADOR,
        )

    def create_patient(self, index, **overrides):
        values = {
            "first_name": f"Paciente {index}",
            "last_name": "Prueba",
            "birth_place": "Managua",
            "phone": f"+505 8800 {index:04d}",
            "gender": Patient.Gender.OTRO,
            "date_of_birth": date(1990, 1, 1),
            "registered_by": self.actor,
        }
        values.update(overrides)
        return Patient.objects.create(**values)

    def test_phone_match_normalizes_common_formatting(self):
        patient = self.create_patient(1, phone="+505 (8888)-1111")

        matches = find_possible_patient_duplicates(phone="505 8888.1111")

        self.assertEqual([match.patient.pk for match in matches], [patient.pk])
        self.assertEqual(matches[0].matched_on, ("phone",))

    def test_different_phone_does_not_match(self):
        self.create_patient(1, phone="8888-1111")

        matches = find_possible_patient_duplicates(phone="8888-2222")

        self.assertEqual(matches, [])

    def test_name_and_birth_match_normalizes_case_and_spaces(self):
        patient = self.create_patient(
            1,
            first_name="  Ana   Maria ",
            last_name=" LOPEZ  ",
            date_of_birth=date(1990, 5, 10),
        )

        matches = find_possible_patient_duplicates(
            first_name="ana maria",
            first_last_name="  lopez ",
            date_of_birth=date(1990, 5, 10),
        )

        self.assertEqual([match.patient.pk for match in matches], [patient.pk])
        self.assertEqual(matches[0].matched_on, ("name_and_date_of_birth",))

    def test_name_without_same_birth_date_does_not_match(self):
        self.create_patient(
            1,
            first_name="Ana",
            last_name="López",
            date_of_birth=date(1990, 5, 10),
        )

        matches = find_possible_patient_duplicates(
            first_name="Ana",
            first_last_name="López",
            date_of_birth=date(1991, 5, 10),
        )

        self.assertEqual(matches, [])

    def test_one_patient_matching_both_rules_is_returned_once(self):
        patient = self.create_patient(
            1,
            first_name="Ana",
            last_name="López",
            date_of_birth=date(1990, 5, 10),
            phone="8888-1111",
        )

        matches = find_possible_patient_duplicates(
            first_name=" ANA ",
            first_last_name="López",
            date_of_birth=date(1990, 5, 10),
            phone="88881111",
        )

        self.assertEqual([match.patient.pk for match in matches], [patient.pk])
        self.assertEqual(
            matches[0].matched_on,
            ("phone", "name_and_date_of_birth"),
        )

    def test_inactive_patient_is_included(self):
        patient = self.create_patient(1, phone="8888-1111", is_active=False)

        matches = find_possible_patient_duplicates(phone="88881111")

        self.assertEqual([match.patient.pk for match in matches], [patient.pk])
        self.assertFalse(matches[0].patient.is_active)

    def test_update_excludes_the_current_patient(self):
        current = self.create_patient(1, phone="8888-1111")
        other = self.create_patient(2, phone="8888 1111")

        matches = find_possible_patient_duplicates(
            phone="88881111",
            exclude_patient_id=current.pk,
        )

        self.assertEqual([match.patient.pk for match in matches], [other.pk])

    def test_results_are_stable_and_limited_to_ten(self):
        patients = [
            self.create_patient(index, phone="8888-1111")
            for index in range(1, 13)
        ]

        matches = find_possible_patient_duplicates(phone="88881111")

        self.assertEqual(
            [match.patient.pk for match in matches],
            [patient.pk for patient in patients[:10]],
        )

    def test_query_is_bounded_and_does_not_load_clinical_records(self):
        self.create_patient(1, phone="8888-1111")

        with CaptureQueriesContext(connection) as queries:
            matches = find_possible_patient_duplicates(phone="88881111")

        self.assertEqual(len(matches), 1)
        self.assertEqual(len(queries), 1)
        self.assertNotIn("patients_clinicalrecord", queries[0]["sql"].lower())


class PatientDuplicateCheckApiTests(APITestCase):
    url = "/api/patients/duplicate-check/"

    def setUp(self):
        self.admin = User.objects.create_user(
            email="duplicate-api-admin@example.test",
            password="SyntheticOnly123!",
            role=User.Role.ADMINISTRADOR,
        )
        self.receptionist = User.objects.create_user(
            email="duplicate-api-reception@example.test",
            password="SyntheticOnly123!",
            role=User.Role.RECEPCIONISTA,
        )
        self.dentist = User.objects.create_user(
            email="duplicate-api-dentist@example.test",
            password="SyntheticOnly123!",
            role=User.Role.ODONTOLOGO,
        )

    def create_patient(self, index, **overrides):
        values = {
            "first_name": f"Paciente {index}",
            "last_name": "Prueba",
            "birth_place": "Managua",
            "phone": f"+505 8800 {index:04d}",
            "gender": Patient.Gender.OTRO,
            "date_of_birth": date(1990, 1, 1),
            "registered_by": self.admin,
        }
        values.update(overrides)
        return Patient.objects.create(**values)

    def test_response_consolidates_rules_and_exposes_only_minimal_fields(self):
        both = self.create_patient(
            1,
            first_name="Ana",
            last_name="López",
            date_of_birth=date(1990, 5, 10),
            phone="+505 8888-1111",
        )
        inactive = self.create_patient(
            2,
            first_name="Otra",
            last_name="Persona",
            phone="50588881111",
            is_active=False,
        )
        self.client.force_authenticate(self.receptionist)

        response = self.client.post(
            self.url,
            {
                "first_name": " ANA ",
                "first_last_name": "López",
                "date_of_birth": "1990-05-10",
                "phone": "505 8888 1111",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["has_matches"])
        self.assertEqual(
            [match["id"] for match in response.data["matches"]],
            [both.pk, inactive.pk],
        )
        self.assertEqual(
            response.data["matches"][0]["matched_on"],
            ["phone", "name_and_date_of_birth"],
        )
        self.assertEqual(response.data["matches"][1]["matched_on"], ["phone"])
        self.assertFalse(response.data["matches"][1]["is_active"])
        self.assertEqual(
            set(response.data["matches"][0]),
            {
                "id",
                "code",
                "full_name",
                "date_of_birth",
                "phone",
                "is_active",
                "matched_on",
            },
        )
        forbidden = {
            "clinical_record",
            "guardian_name",
            "identification_number",
            "documents",
            "consultations",
            "odontogram",
        }
        self.assertTrue(forbidden.isdisjoint(response.data["matches"][0]))

    def test_no_match_returns_explicit_false_and_empty_list(self):
        self.create_patient(1, phone="8888-1111")
        self.client.force_authenticate(self.receptionist)

        response = self.client.post(
            self.url,
            {"phone": "7777-2222"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"has_matches": False, "matches": []})

    def test_endpoint_never_returns_more_than_ten_matches(self):
        for index in range(1, 13):
            self.create_patient(index, phone="8888-1111")
        self.client.force_authenticate(self.receptionist)

        response = self.client.post(self.url, {"phone": "88881111"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["matches"]), 10)

    def test_creation_check_requires_create_permission(self):
        preset = RolePermissionPreset.objects.get(role=User.Role.ODONTOLOGO)
        preset.permissions = ["patients.edit"]
        preset.save(update_fields=["permissions"])
        self.client.force_authenticate(self.dentist)

        response = self.client.post(self.url, {"phone": "88881111"}, format="json")

        self.assertEqual(response.status_code, 403)

    def test_update_check_requires_edit_permission_and_excludes_self(self):
        patient = self.create_patient(1, phone="8888-1111")
        preset = RolePermissionPreset.objects.get(role=User.Role.ODONTOLOGO)
        preset.permissions = ["patients.create"]
        preset.save(update_fields=["permissions"])
        self.client.force_authenticate(self.dentist)

        denied = self.client.post(
            self.url,
            {"phone": "88881111", "exclude_patient_id": patient.pk},
            format="json",
        )
        preset.permissions = ["patients.edit"]
        preset.save(update_fields=["permissions"])
        allowed = self.client.post(
            self.url,
            {"phone": "88881111", "exclude_patient_id": patient.pk},
            format="json",
        )

        self.assertEqual(denied.status_code, 403)
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(allowed.data, {"has_matches": False, "matches": []})

    def test_endpoint_requires_authentication_and_valid_exclusion_id(self):
        unauthenticated = self.client.post(self.url, {"phone": "88881111"}, format="json")
        self.client.force_authenticate(self.admin)
        invalid = self.client.post(
            self.url,
            {"phone": "88881111", "exclude_patient_id": "not-an-id"},
            format="json",
        )

        self.assertEqual(unauthenticated.status_code, 401)
        self.assertEqual(invalid.status_code, 400)
        self.assertIn("exclude_patient_id", invalid.data)
