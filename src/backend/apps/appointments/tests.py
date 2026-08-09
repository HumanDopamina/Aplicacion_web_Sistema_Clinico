from datetime import date, time

from rest_framework.test import APITestCase

from apps.patients.models import Patient
from apps.users.models import RolePermissionPreset, User

from .models import Appointment


class AppointmentApiTests(APITestCase):
    list_url = "/api/appointments/"

    def setUp(self):
        self.receptionist = User.objects.create_user(
            email="recepcion-citas@dentalclinic.com",
            password="ContraseñaRecepcion123!",
            role=User.Role.RECEPCIONISTA,
            first_name="Rosa",
            last_name="López",
        )
        self.dentist = User.objects.create_user(
            email="odontologa@dentalclinic.com",
            password="ContraseñaOdontologa123!",
            role=User.Role.ODONTOLOGO,
            first_name="Elena",
            last_name="Vargas",
        )
        self.other_dentist = User.objects.create_user(
            email="odontologo2@dentalclinic.com",
            password="ContraseñaOdontologo123!",
            role=User.Role.ODONTOLOGO,
            first_name="Mario",
            last_name="Ruiz",
        )
        self.admin = User.objects.create_user(
            email="admin-citas@dentalclinic.com",
            password="ContraseñaAdmin123!",
            role=User.Role.ADMINISTRADOR,
        )
        self.patient = self.create_patient("001-010190-0001A", "Ana")
        self.other_patient = self.create_patient("001-020290-0002B", "Luis")

    def create_patient(self, national_id, first_name, **overrides):
        values = {
            "first_name": first_name,
            "last_name": "Pérez",
            "birth_place": "Managua",
            "national_id": national_id,
            "gender": Patient.Gender.FEMENINO,
            "date_of_birth": date(1990, 1, 1),
            "registered_by": self.receptionist,
        }
        values.update(overrides)
        return Patient.objects.create(**values)

    def payload(self, **overrides):
        values = {
            "patient": self.patient.pk,
            "dentist": self.dentist.pk,
            "date": "2026-08-12",
            "start_time": "09:00",
            "duration_minutes": 60,
            "reason": "Valoración para tratamiento de ortodoncia",
            "notes": "Paciente refiere sensibilidad.",
        }
        values.update(overrides)
        return values

    def create_appointment(self, **overrides):
        values = {
            "patient": self.patient,
            "dentist": self.dentist,
            "date": date(2026, 8, 12),
            "start_time": time(9, 0),
            "duration_minutes": 60,
            "reason": "Valoración para tratamiento de ortodoncia",
            "created_by": self.receptionist,
        }
        values.update(overrides)
        return Appointment.objects.create(**values)

    def test_receptionist_creates_a_scheduled_appointment(self):
        self.client.force_authenticate(self.receptionist)

        response = self.client.post(self.list_url, self.payload(), format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], Appointment.Status.SCHEDULED)
        self.assertEqual(response.data["patient_name"], "Ana Pérez")
        self.assertEqual(response.data["dentist_name"], "Elena Vargas")
        self.assertEqual(response.data["end_time"], "10:00:00")
        self.assertEqual(response.data["created_by"], self.receptionist.pk)

    def test_create_requires_capability_and_administrator_keeps_implicit_access(self):
        self.client.force_authenticate(self.dentist)
        self.assertEqual(self.client.post(self.list_url, self.payload(), format="json").status_code, 403)

        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(self.list_url, self.payload(), format="json").status_code, 201)

    def test_create_rejects_inactive_patient_or_invalid_dentist(self):
        inactive_patient = self.create_patient(
            "001-030390-0003C", "Marta", is_active=False,
        )
        inactive_dentist = User.objects.create_user(
            email="inactiva@dentalclinic.com",
            password="ContraseñaInactiva123!",
            role=User.Role.ODONTOLOGO,
            is_active=False,
        )
        self.client.force_authenticate(self.receptionist)

        patient_response = self.client.post(
            self.list_url, self.payload(patient=inactive_patient.pk), format="json",
        )
        dentist_response = self.client.post(
            self.list_url, self.payload(dentist=inactive_dentist.pk), format="json",
        )
        receptionist_response = self.client.post(
            self.list_url, self.payload(dentist=self.receptionist.pk), format="json",
        )

        self.assertEqual(patient_response.status_code, 400)
        self.assertIn("patient", patient_response.data)
        self.assertEqual(dentist_response.status_code, 400)
        self.assertIn("dentist", dentist_response.data)
        self.assertEqual(receptionist_response.status_code, 400)

    def test_rejects_overlaps_for_dentist_and_patient_but_allows_adjacent_slots(self):
        self.create_appointment()
        self.client.force_authenticate(self.receptionist)

        dentist_overlap = self.client.post(
            self.list_url,
            self.payload(patient=self.other_patient.pk, start_time="09:30", duration_minutes=30),
            format="json",
        )
        patient_overlap = self.client.post(
            self.list_url,
            self.payload(dentist=self.other_dentist.pk, start_time="08:30", duration_minutes=60),
            format="json",
        )
        adjacent = self.client.post(
            self.list_url,
            self.payload(patient=self.other_patient.pk, start_time="10:00", duration_minutes=30),
            format="json",
        )

        self.assertEqual(dentist_overlap.status_code, 400)
        self.assertIn("El odontólogo ya tiene", str(dentist_overlap.data))
        self.assertEqual(patient_overlap.status_code, 400)
        self.assertIn("El paciente ya tiene", str(patient_overlap.data))
        self.assertEqual(adjacent.status_code, 201)

    def test_cancelled_appointments_do_not_block_availability(self):
        self.create_appointment(status=Appointment.Status.CANCELLED)
        self.client.force_authenticate(self.receptionist)

        response = self.client.post(self.list_url, self.payload(), format="json")

        self.assertEqual(response.status_code, 201)

    def test_list_filters_by_day_dentist_and_status(self):
        expected = self.create_appointment(status=Appointment.Status.CONFIRMED)
        self.create_appointment(
            patient=self.other_patient,
            dentist=self.other_dentist,
            date=date(2026, 8, 13),
        )
        self.client.force_authenticate(self.dentist)

        response = self.client.get(
            f"{self.list_url}?date=2026-08-12&dentist={self.dentist.pk}&status=CONFIRMADA",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [expected.pk])

    def test_availability_returns_only_active_non_overlapping_dentists(self):
        self.create_appointment()
        User.objects.create_user(
            email="odontologo-inactivo@dentalclinic.com",
            password="ContraseñaInactivo123!",
            role=User.Role.ODONTOLOGO,
            is_active=False,
        )
        self.client.force_authenticate(self.receptionist)

        response = self.client.get(
            f"{self.list_url}dentists/availability/"
            "?date=2026-08-12&start_time=09:30&duration_minutes=30",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [self.other_dentist.pk])
        self.assertEqual(response.data[0]["full_name"], "Mario Ruiz")

    def test_patch_excludes_current_appointment_from_conflicts(self):
        appointment = self.create_appointment()
        self.client.force_authenticate(self.receptionist)

        response = self.client.patch(
            f"{self.list_url}{appointment.pk}/",
            {"start_time": "09:15", "duration_minutes": 45},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["end_time"], "10:00:00")

    def test_status_transitions_follow_the_appointment_lifecycle(self):
        appointment = self.create_appointment()
        self.client.force_authenticate(self.receptionist)
        detail_url = f"{self.list_url}{appointment.pk}/"

        confirmed = self.client.patch(detail_url, {"status": "CONFIRMADA"}, format="json")
        completed = self.client.patch(detail_url, {"status": "COMPLETADA"}, format="json")
        terminal_edit = self.client.patch(detail_url, {"reason": "Cambio tardío"}, format="json")

        self.assertEqual(confirmed.status_code, 200)
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(terminal_edit.status_code, 400)
        self.assertIn("estado final", str(terminal_edit.data))

    def test_invalid_transition_is_rejected_and_cancellation_reason_is_optional(self):
        scheduled = self.create_appointment()
        other = self.create_appointment(
            patient=self.other_patient,
            dentist=self.other_dentist,
            start_time=time(11, 0),
        )
        self.client.force_authenticate(self.receptionist)

        invalid = self.client.patch(
            f"{self.list_url}{scheduled.pk}/", {"status": "COMPLETADA"}, format="json",
        )
        cancelled = self.client.patch(
            f"{self.list_url}{other.pk}/", {"status": "CANCELADA"}, format="json",
        )

        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.data["cancellation_reason"], "")

    def test_edit_requires_edit_capability_and_delete_is_not_exposed(self):
        appointment = self.create_appointment()
        detail_url = f"{self.list_url}{appointment.pk}/"
        self.client.force_authenticate(self.dentist)

        self.assertEqual(
            self.client.patch(detail_url, {"reason": "Sin permiso"}, format="json").status_code,
            403,
        )
        self.client.force_authenticate(self.receptionist)
        self.assertEqual(self.client.delete(detail_url).status_code, 405)

        preset = RolePermissionPreset.objects.get(role=User.Role.RECEPCIONISTA)
        preset.permissions = [code for code in preset.permissions if code != "appointments.edit"]
        preset.save(update_fields=["permissions"])
        self.client.force_authenticate(self.receptionist)
        self.assertEqual(
            self.client.patch(detail_url, {"reason": "Sin permiso"}, format="json").status_code,
            403,
        )
