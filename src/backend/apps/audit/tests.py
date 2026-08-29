from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework.test import APITestCase
from unittest.mock import patch

from apps.patients.models import Patient
from apps.users.models import User

from .models import AuditEvent


class AuditEventImmutabilityTests(APITestCase):
    def setUp(self):
        self.event = AuditEvent.objects.create(
            request_id="request-original",
            action="PATIENT_READ",
            outcome=AuditEvent.Outcome.SUCCESS,
            resource_type="patient",
            resource_id="12",
        )

    def test_existing_event_cannot_be_saved_updated_or_deleted(self):
        self.event.action = "TAMPERED"
        with self.assertRaises(ValidationError):
            self.event.save()
        with self.assertRaises(ValidationError):
            AuditEvent.objects.filter(pk=self.event.pk).update(action="TAMPERED")
        with self.assertRaises(ValidationError):
            AuditEvent.objects.filter(pk=self.event.pk).delete()
        with self.assertRaises(ValidationError):
            self.event.delete()


class AuditEventApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="audit-admin@example.test",
            password="ContraseñaSegura123!",
            role=User.Role.ADMINISTRADOR,
        )
        self.receptionist = User.objects.create_user(
            email="audit-reception@example.test",
            password="ContraseñaSegura123!",
            role=User.Role.RECEPCIONISTA,
        )
        AuditEvent.objects.create(
            request_id="request-filter",
            actor_id=self.admin.pk,
            actor_role=self.admin.role,
            action="PATIENT_READ",
            outcome=AuditEvent.Outcome.SUCCESS,
            resource_type="patient",
            resource_id="21",
            patient_id=21,
        )

    def test_only_administration_can_list_and_filter_events(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(
            reverse("audit:event-list"),
            {"action": "PATIENT_READ", "patient_id": 21},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["request_id"], "request-filter")

        self.client.force_authenticate(self.receptionist)
        self.assertEqual(self.client.get(reverse("audit:event-list")).status_code, 403)

    def test_audit_endpoint_is_read_only(self):
        self.client.force_authenticate(self.admin)
        url = reverse("audit:event-list")
        self.assertEqual(self.client.post(url, {}).status_code, 405)
        self.assertEqual(self.client.patch(url, {}).status_code, 405)
        self.assertEqual(self.client.delete(url).status_code, 405)

    def test_api_request_receives_request_id_and_creates_one_event(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(
            reverse("users:current-user"),
            HTTP_X_REQUEST_ID="qa-request-123",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["X-Request-ID"], "qa-request-123")
        event = AuditEvent.objects.get(request_id="qa-request-123")
        self.assertEqual(event.actor_id, self.admin.pk)
        self.assertEqual(event.outcome, AuditEvent.Outcome.SUCCESS)
        self.assertEqual(event.action, "PROFILE_READ")

    def test_failed_login_is_redacted_in_audit_metadata(self):
        response = self.client.post(
            reverse("users:login"),
            {"email": "known@example.test", "password": "secret-value"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        event = AuditEvent.objects.get(request_id=response["X-Request-ID"])
        serialized = str(event.metadata)
        self.assertNotIn("known@example.test", serialized)
        self.assertNotIn("secret-value", serialized)
        self.assertEqual(event.action, "AUTH_LOGIN")
        self.assertEqual(event.outcome, AuditEvent.Outcome.FAILURE)

    def test_failed_audit_rolls_back_a_clinical_mutation(self):
        self.client.force_authenticate(self.admin)
        payload = {
            "first_name": "Paciente",
            "last_name": "Transaccional",
            "birth_place": "Managua",
            "address": "Dirección sintética QA",
            "national_id": "001-010190-0001A",
            "phone": "+505 8888 0000",
            "email": "atomic-patient@example.test",
            "emergency_contact_name": "Contacto QA",
            "emergency_relationship": "Familiar",
            "emergency_phone": "+505 8888 0001",
            "gender": "FEMENINO",
            "date_of_birth": "1990-01-01",
            "is_active": True,
        }

        with patch.object(AuditEvent.objects, "create", side_effect=RuntimeError("audit unavailable")):
            with self.assertRaises(RuntimeError):
                self.client.post("/api/patients/", payload, format="json")

        self.assertFalse(Patient.objects.filter(email=payload["email"]).exists())
