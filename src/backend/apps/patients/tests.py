from unittest.mock import patch

from django.apps import apps
from django.db import IntegrityError, transaction
from rest_framework.test import APITestCase

from apps.users.models import RolePermissionPreset, User

from .models import Patient


class PatientApiTests(APITestCase):
    list_url = "/api/patients/"

    def setUp(self):
        self.receptionist = User.objects.create_user(
            email="recepcion-patients@dentalclinic.com",
            password="ContraseñaRecepcion123!",
            role=User.Role.RECEPCIONISTA,
        )
        self.dentist = User.objects.create_user(
            email="dentist-patients@dentalclinic.com",
            password="ContraseñaDentist123!",
            role=User.Role.ODONTOLOGO,
        )
        self.admin = User.objects.create_user(
            email="admin-patients@dentalclinic.com",
            password="ContraseñaAdmin123!",
            role=User.Role.ADMINISTRADOR,
        )

    def payload(self, **overrides):
        data = {
            "first_name": "María Fernanda",
            "last_name": "García",
            "second_last_name": "López",
            "birth_place": "Managua",
            "address": "Colonia Roma Norte",
            "national_id": "001-160498-0001A",
            "phone": "+505 8888 1111",
            "email": "maria@example.com",
            "emergency_contact_name": "Carlos García",
            "emergency_relationship": "Hermano",
            "emergency_phone": "+505 8888 2222",
            "gender": "FEMENINO",
            "date_of_birth": "1998-04-16",
            "is_active": True,
        }
        data.update(overrides)
        return data

    def complete_record_payload(self):
        return self.payload(
            origin="Chinandega",
            religion="Católica",
            education="Universitaria",
            profession="Docente",
            father_name="José García",
            mother_name="Ana López",
            information_source="Paciente",
            information_reliability="Confiable",
            clinical_record={
                "examiner_name": "Dra. Elena Ruiz",
                "examiner_national_id": "001-010180-0003C",
                "inss_number": "INSS-9081",
                "cema_number": "CEMA-4402",
                "consultation_date": "2026-08-08",
                "consultation_time": "09:30:00",
                "dental_service": "Valoración odontológica",
                "chief_complaint": "Dolor en molar inferior derecho.",
                "present_illness_history": "Dolor pulsátil de tres días de evolución.",
                "respiratory": "Sin disnea.",
                "cardiovascular": "Sin dolor precordial.",
                "hepatic_renal": "Sin alteraciones referidas.",
                "gastrointestinal": "Apetito conservado.",
                "neurological": "Sin cefalea.",
                "blood_system": "Sin sangrado anormal.",
                "reproductive_organs": "Sin alteraciones referidas.",
                "family_history": "Madre con hipertensión arterial.",
                "infectious_diseases": {"hepatitis": False, "varicella": True, "other": ""},
                "hereditary_diseases": {"diabetes_mellitus": True, "allergies": False, "other": ""},
                "heart_rate": 72,
                "respiratory_rate": 16,
                "blood_pressure": "118/76",
                "temperature": "36.6",
                "weight": "68.40",
                "height": "1.65",
                "body_surface_area": "1.76",
                "bmi": "25.12",
                "general_appearance": "Consciente y orientada.",
                "skin_and_mucosa": "Normocoloreadas.",
                "thorax": "Simétrico.",
                "rib_cage": "Sin deformidades.",
                "breasts": "Sin hallazgos.",
                "lung_fields": "Ventilados.",
                "cardiac": "Rítmico.",
                "abdomen_pelvis": "Blando, depresible.",
                "rectal_exam": "No aplica.",
                "musculoskeletal": "Movilidad conservada.",
                "upper_extremities": "Sin edema.",
                "lower_extremities": "Sin edema.",
                "genitourinary": "Sin hallazgos.",
                "gynecological_exam": "No aplica.",
                "neurological_exam": "Sin déficit focal.",
                "observations_analysis": "Paciente apta para tratamiento.",
                "dental_diagnoses": "Pulpitis irreversible en pieza 46.",
                "treatment_plan": "Tratamiento endodóntico y corona.",
                "budget": "Endodoncia: C$ 4,500; corona: C$ 6,000.",
                "treatment_performed": "Radiografía periapical diagnóstica.",
                "radiographic_exams": ["periapical-46.pdf"],
                "clinical_photographs": ["pieza-46-frontal.jpg"],
            },
        )

    def test_hu10_registers_complete_clinical_record(self):
        self.client.force_authenticate(self.receptionist)

        response = self.client.post(self.list_url, self.complete_record_payload(), format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["origin"], "Chinandega")
        self.assertEqual(response.data["information_reliability"], "Confiable")
        record = response.data["clinical_record"]
        self.assertEqual(record["examiner_name"], "Dra. Elena Ruiz")
        self.assertEqual(record["chief_complaint"], "Dolor en molar inferior derecho.")
        self.assertEqual(record["cardiovascular"], "Sin dolor precordial.")
        self.assertTrue(record["infectious_diseases"]["varicella"])
        self.assertTrue(record["hereditary_diseases"]["diabetes_mellitus"])
        self.assertEqual(record["blood_pressure"], "118/76")
        self.assertEqual(record["general_appearance"], "Consciente y orientada.")
        self.assertEqual(record["dental_diagnoses"], "Pulpitis irreversible en pieza 46.")
        self.assertEqual(record["clinical_photographs"], ["pieza-46-frontal.jpg"])

        detail = self.client.get(f"{self.list_url}{response.data['id']}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["clinical_record"]["treatment_plan"], "Tratamiento endodóntico y corona.")

    def test_hu10_receptionist_registers_patient_and_can_open_created_record(self):
        self.client.force_authenticate(self.receptionist)

        response = self.client.post(self.list_url, self.payload(), format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["code"], "PAC-00001")
        self.assertEqual(response.data["full_name"], "María Fernanda García López")
        self.assertEqual(response.data["registered_by"], self.receptionist.pk)
        detail = self.client.get(f"{self.list_url}{response.data['id']}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["national_id"], "001-160498-0001A")
        self.assertEqual(detail.data["emergency_contact_name"], "Carlos García")

    def test_hu10_a_user_without_create_permission_cannot_register_patients(self):
        self.client.force_authenticate(self.dentist)

        response = self.client.post(self.list_url, self.payload(), format="json")

        self.assertEqual(response.status_code, 403)

    def test_hu10_removing_role_permission_blocks_every_receptionist(self):
        preset = RolePermissionPreset.objects.get(role=User.Role.RECEPCIONISTA)
        preset.permissions = ["patients.view"]
        preset.save(update_fields=["permissions"])
        self.client.force_authenticate(self.receptionist)

        response = self.client.post(self.list_url, self.payload(), format="json")

        self.assertEqual(response.status_code, 403)

    def test_hu10_administrator_keeps_implicit_patient_registration_access(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(self.list_url, self.payload(), format="json")

        self.assertEqual(response.status_code, 201)

    def test_hu10_rejects_future_birth_date_and_duplicate_national_id(self):
        self.client.force_authenticate(self.receptionist)

        future = self.client.post(
            self.list_url,
            self.payload(date_of_birth="2999-01-01"),
            format="json",
        )
        created = self.client.post(self.list_url, self.payload(), format="json")
        duplicate = self.client.post(
            self.list_url,
            self.payload(national_id="001-160498-0001a", email="otra@example.com"),
            format="json",
        )

        self.assertEqual(future.status_code, 400)
        self.assertIn("date_of_birth", future.data)
        self.assertEqual(created.status_code, 201)
        self.assertEqual(duplicate.status_code, 400)
        self.assertIn("national_id", duplicate.data)

    def test_hu13_rejects_duplicate_national_id_with_different_separators(self):
        self.client.force_authenticate(self.receptionist)
        created = self.client.post(self.list_url, self.payload(), format="json")

        duplicate = self.client.post(
            self.list_url,
            self.payload(
                national_id=" 001 160498 0001a ",
                email="duplicado@example.com",
            ),
            format="json",
        )

        self.assertEqual(created.status_code, 201)
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(
            duplicate.data,
            {"national_id": ["Ya existe un paciente con esta cédula."]},
        )
        self.assertEqual(Patient.objects.count(), 1)

    def test_hu13_allows_reformatting_the_same_patients_national_id(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(self.list_url, self.payload(), format="json")

        response = self.client.patch(
            f"{self.list_url}{created.data['id']}/",
            {"national_id": " 001 160498 0001a "},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["national_id"], "001 160498 0001A")
        self.assertNotIn("national_id_key", response.data)
        patient = Patient.objects.get(pk=created.data["id"])
        self.assertEqual(patient.national_id_key, "0011604980001A")

    def test_hu13_allows_a_genuinely_distinct_national_id(self):
        self.client.force_authenticate(self.receptionist)
        first = self.client.post(self.list_url, self.payload(), format="json")
        second = self.client.post(
            self.list_url,
            self.payload(
                national_id="001-160498-0002A",
                email="distinto@example.com",
            ),
            format="json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(Patient.objects.count(), 2)

    def test_hu13_model_enforces_the_normalized_key_for_direct_saves(self):
        Patient.objects.create(
            registered_by=self.admin,
            **self.payload(),
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            Patient.objects.create(
                registered_by=self.admin,
                **self.payload(
                    national_id="0011604980001a",
                    email="directo@example.com",
                ),
            )

        self.assertEqual(Patient.objects.count(), 1)

    def test_hu13_translates_a_concurrent_duplicate_conflict(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.list_url, self.payload(), format="json")

        with patch(
            "django.db.models.query.QuerySet.exists",
            side_effect=[False, True],
        ):
            response = self.client.post(
                self.list_url,
                self.payload(
                    national_id="0011604980001a",
                    email="concurrente@example.com",
                ),
                format="json",
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data,
            {"national_id": ["Ya existe un paciente con esta cédula."]},
        )
        self.assertEqual(Patient.objects.count(), 1)

    def test_hu10_read_only_fields_cannot_be_impersonated(self):
        self.client.force_authenticate(self.receptionist)

        response = self.client.post(
            self.list_url,
            self.payload(code="PAC-99999", registered_by=self.dentist.pk),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["code"], "PAC-00001")
        self.assertEqual(response.data["registered_by"], self.receptionist.pk)

    def test_hu10_authorized_user_lists_and_searches_patient_records(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.list_url, self.payload(), format="json")
        self.client.post(
            self.list_url,
            self.payload(
                first_name="Juan",
                last_name="Pérez",
                second_last_name="",
                national_id="001-010190-0002B",
                phone="555-1234",
                email="juan@example.com",
            ),
            format="json",
        )
        self.client.force_authenticate(self.dentist)

        response = self.client.get(f"{self.list_url}?search=Juan")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["full_name"], "Juan Pérez")

    def test_hu10_role_with_edit_permission_updates_patient_and_preserves_audit_fields(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(self.list_url, self.payload(), format="json")
        patient_url = f"{self.list_url}{created.data['id']}/"
        preset = RolePermissionPreset.objects.get(role=User.Role.RECEPCIONISTA)
        preset.permissions = ["patients.view", "patients.edit"]
        preset.save(update_fields=["permissions"])
        self.client.force_authenticate(self.receptionist)

        response = self.client.patch(
            patient_url,
            {
                "address": "Residencial Las Colinas",
                "emergency_phone": "+505 7777 3333",
                "national_id": "001-160498-0001a",
                "code": "PAC-99999",
                "registered_by": self.receptionist.pk,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["address"], "Residencial Las Colinas")
        self.assertEqual(response.data["emergency_phone"], "+505 7777 3333")
        self.assertEqual(response.data["national_id"], "001-160498-0001A")
        self.assertEqual(response.data["code"], "PAC-00001")
        self.assertEqual(response.data["registered_by"], self.admin.pk)

    def test_hu10_user_without_edit_permission_cannot_modify_patient(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(self.list_url, self.payload(), format="json")
        self.client.force_authenticate(self.dentist)

        response = self.client.patch(
            f"{self.list_url}{created.data['id']}/",
            {"address": "Cambio no autorizado"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.client.force_authenticate(self.admin)
        detail = self.client.get(f"{self.list_url}{created.data['id']}/")
        self.assertEqual(detail.data["address"], "Colonia Roma Norte")

    def test_patient_consultations_returns_an_empty_history_for_an_authorized_user(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(self.list_url, self.payload(), format="json")
        self.client.force_authenticate(self.dentist)

        response = self.client.get(
            f"{self.list_url}{created.data['id']}/consultations/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_patient_consultations_requires_consultation_view_permission(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(self.list_url, self.payload(), format="json")
        preset = RolePermissionPreset.objects.get(role=User.Role.RECEPCIONISTA)
        preset.permissions = ["patients.create"]
        preset.save(update_fields=["permissions"])
        self.client.force_authenticate(self.receptionist)

        response = self.client.get(
            f"{self.list_url}{created.data['id']}/consultations/"
        )

        self.assertEqual(response.status_code, 403)

    def test_patient_consultations_returns_persisted_rows_newest_first(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(self.list_url, self.payload(), format="json")
        patient = apps.get_model("patients", "Patient").objects.get(
            pk=created.data["id"]
        )
        try:
            consultation_model = apps.get_model("patients", "Consultation")
        except LookupError:
            self.fail("The persisted Consultation model is missing.")
        self.dentist.first_name = "Elena"
        self.dentist.last_name = "Rivera"
        self.dentist.save(update_fields=["first_name", "last_name"])
        consultation_model.objects.create(
            patient=patient,
            professional=self.dentist,
            date="2026-08-01",
            consultation_type="GENERAL",
            summary="Revisión de signos vitales.",
            status="COMPLETADA",
        )
        consultation_model.objects.create(
            patient=patient,
            professional=self.dentist,
            date="2026-08-08",
            consultation_type="SEGUIMIENTO",
            summary="Paciente estable y continúa el tratamiento.",
            status="COMPLETADA",
        )

        response = self.client.get(
            f"{self.list_url}{created.data['id']}/consultations/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["date"], "2026-08-08")
        self.assertEqual(response.data[0]["consultation_type"], "SEGUIMIENTO")
        self.assertEqual(response.data[0]["consultation_type_display"], "Seguimiento")
        self.assertEqual(response.data[0]["professional_name"], "Elena Rivera")
        self.assertEqual(response.data[0]["status_display"], "Completada")
        self.assertEqual(response.data[1]["date"], "2026-08-01")


class ConsultationApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin-consultations@dentalclinic.com",
            password="ContraseñaAdmin123!",
            role=User.Role.ADMINISTRADOR,
        )
        self.dentist = User.objects.create_user(
            email="dentist-consultations@dentalclinic.com",
            password="ContraseñaDentist123!",
            role=User.Role.ODONTOLOGO,
            first_name="Elena",
            last_name="Rivera",
        )
        self.receptionist = User.objects.create_user(
            email="reception-consultations@dentalclinic.com",
            password="ContraseñaRecepcion123!",
            role=User.Role.RECEPCIONISTA,
        )
        patient_model = apps.get_model("patients", "Patient")
        self.patient = patient_model.objects.create(
            first_name="María",
            last_name="García",
            birth_place="Managua",
            national_id="001-160498-0001A",
            gender="FEMENINO",
            date_of_birth="1998-04-16",
            registered_by=self.admin,
        )
        self.other_patient = patient_model.objects.create(
            first_name="Juan",
            last_name="Pérez",
            birth_place="León",
            national_id="001-010190-0002B",
            gender="MASCULINO",
            date_of_birth="1990-01-01",
            registered_by=self.admin,
        )
        self.list_url = f"/api/patients/{self.patient.pk}/consultations/"

    def payload(self, **overrides):
        data = {
            "date": "2026-08-08",
            "time": "09:30:00",
            "consultation_type": "GENERAL",
            "summary": "Valoración clínica integral.",
            "status": "EN_PROGRESO",
            "examiner_national_id": "001-010180-0003C",
            "inss_number": "INSS-9081",
            "cema_number": "CEMA-4402",
            "dental_service": "Valoración odontológica",
            "chief_complaint": "Dolor en molar inferior derecho.",
            "present_illness_history": "Dolor pulsátil de tres días.",
            "respiratory": "Sin disnea.",
            "cardiovascular": "Sin dolor precordial.",
            "hepatic_renal": "Sin alteraciones referidas.",
            "gastrointestinal": "Apetito conservado.",
            "neurological": "Sin cefalea.",
            "blood_system": "Sin sangrado anormal.",
            "reproductive_organs": "Sin alteraciones referidas.",
            "heart_rate": 72,
            "respiratory_rate": 16,
            "blood_pressure": "118/76",
            "temperature": "36.6",
            "weight": "68.40",
            "height": "1.65",
            "body_surface_area": "1.76",
            "bmi": "25.12",
            "general_appearance": "Consciente y orientada.",
            "skin_and_mucosa": "Normocoloreadas.",
            "thorax": "Simétrico.",
            "rib_cage": "Sin deformidades.",
            "breasts": "Sin hallazgos.",
            "lung_fields": "Ventilados.",
            "cardiac": "Rítmico.",
            "abdomen_pelvis": "Blando, depresible.",
            "rectal_exam": "No aplica.",
            "musculoskeletal": "Movilidad conservada.",
            "upper_extremities": "Sin edema.",
            "lower_extremities": "Sin edema.",
            "genitourinary": "Sin hallazgos.",
            "gynecological_exam": "No aplica.",
            "neurological_exam": "Sin déficit focal.",
            "observations_analysis": "Paciente apta para tratamiento.",
            "dental_diagnoses": "Pulpitis irreversible en pieza 46.",
            "treatment_plan": "Tratamiento endodóntico y corona.",
            "budget": "C$ 10,500.",
            "treatment_performed": "Radiografía periapical diagnóstica.",
        }
        data.update(overrides)
        return data

    def create_consultation(self, **overrides):
        self.client.force_authenticate(self.dentist)
        return self.client.post(self.list_url, self.payload(**overrides), format="json")

    def test_creates_complete_consultation_and_assigns_authenticated_professional(self):
        response = self.create_consultation(
            professional=self.admin.pk,
            patient=self.other_patient.pk,
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["patient"], self.patient.pk)
        self.assertEqual(response.data["professional"], self.dentist.pk)
        self.assertEqual(response.data["professional_name"], "Elena Rivera")
        self.assertEqual(response.data["time"], "09:30:00")
        self.assertEqual(response.data["chief_complaint"], "Dolor en molar inferior derecho.")
        self.assertEqual(response.data["cardiovascular"], "Sin dolor precordial.")
        self.assertEqual(response.data["heart_rate"], 72)
        self.assertEqual(response.data["blood_pressure"], "118/76")
        self.assertEqual(response.data["neurological_exam"], "Sin déficit focal.")
        self.assertEqual(response.data["treatment_plan"], "Tratamiento endodóntico y corona.")

    def test_rejects_each_required_consultation_metadata_field(self):
        self.client.force_authenticate(self.dentist)

        for field in ("date", "time", "consultation_type", "summary", "status"):
            with self.subTest(field=field):
                payload = self.payload()
                payload.pop(field)
                response = self.client.post(self.list_url, payload, format="json")
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)

    def test_retrieves_and_updates_completed_consultation_with_edit_permission(self):
        created = self.create_consultation(status="COMPLETADA")
        detail_url = f"{self.list_url}{created.data['id']}/"

        response = self.client.patch(
            detail_url,
            {
                "summary": "Control completado y actualizado.",
                "observations_analysis": "Evolución favorable.",
                "professional": self.admin.pk,
                "patient": self.other_patient.pk,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"], "Control completado y actualizado.")
        self.assertEqual(response.data["observations_analysis"], "Evolución favorable.")
        self.assertEqual(response.data["professional"], self.dentist.pk)
        self.assertEqual(response.data["patient"], self.patient.pk)

    def test_detail_is_scoped_to_patient_and_delete_is_not_allowed(self):
        created = self.create_consultation()
        wrong_patient_url = (
            f"/api/patients/{self.other_patient.pk}/consultations/{created.data['id']}/"
        )
        own_detail_url = f"{self.list_url}{created.data['id']}/"

        self.assertEqual(self.client.get(wrong_patient_url).status_code, 404)
        self.assertEqual(self.client.patch(wrong_patient_url, {"summary": "No"}).status_code, 404)
        self.assertEqual(self.client.delete(own_detail_url).status_code, 405)

    def test_consultation_capabilities_are_independent(self):
        receptionist_preset = RolePermissionPreset.objects.get(
            role=User.Role.RECEPCIONISTA
        )
        receptionist_preset.permissions = ["consultations.view"]
        receptionist_preset.save(update_fields=["permissions"])
        self.client.force_authenticate(self.receptionist)

        self.assertEqual(self.client.get(self.list_url).status_code, 200)
        self.assertEqual(
            self.client.post(self.list_url, self.payload(), format="json").status_code,
            403,
        )

        created = self.create_consultation()
        dentist_preset = RolePermissionPreset.objects.get(role=User.Role.ODONTOLOGO)
        dentist_preset.permissions = ["consultations.view"]
        dentist_preset.save(update_fields=["permissions"])
        detail_url = f"{self.list_url}{created.data['id']}/"
        self.assertEqual(self.client.get(detail_url).status_code, 200)
        self.assertEqual(
            self.client.patch(detail_url, {"summary": "Sin permiso"}, format="json").status_code,
            403,
        )
