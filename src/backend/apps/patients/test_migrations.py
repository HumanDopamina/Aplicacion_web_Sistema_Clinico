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


class ClinicalAlertMigrationTests(TransactionTestCase):
    migrate_from = ("patients", "0008_consultation_dashboard_index")
    migrate_to = ("patients", "0009_clinical_record_alerts")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_from])
        self.old_apps = self.executor.loader.project_state([self.migrate_from]).apps
        user = User.objects.create(
            email="clinical-alert-migration@example.test",
            password="!",
            role="ADMINISTRADOR",
        )
        patient_model = self.old_apps.get_model("patients", "Patient")
        record_model = self.old_apps.get_model("patients", "ClinicalRecord")
        self.record_ids = {}
        signals = {
            "true": {"allergies": True, "diabetes_mellitus": True},
            "false": {"allergies": False, "hypertension": True},
            "string": {"allergies": "true"},
            "absent": {"kidney_diseases": True},
        }
        for index, (name, hereditary_diseases) in enumerate(signals.items(), start=1):
            patient = patient_model.objects.create(
                first_name=f"Paciente {name}",
                last_name="Migración",
                birth_place="Managua",
                national_id=f"001-010190-{index:04d}A",
                national_id_key=f"001010190{index:04d}A",
                gender="OTRO",
                date_of_birth="1990-01-01",
                registered_by_id=user.pk,
            )
            record = record_model.objects.create(
                patient_id=patient.pk,
                family_history=f"Antecedente conservado {name}",
                hereditary_diseases=hereditary_diseases,
            )
            self.record_ids[name] = record.pk

    def tearDown(self):
        MigrationExecutor(connection).migrate([self.migrate_to])
        super().tearDown()

    def test_hu28_backfills_only_exact_historical_allergy_signal(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_to])
        apps = self.executor.loader.project_state([self.migrate_to]).apps
        record_model = apps.get_model("patients", "ClinicalRecord")

        true_record = record_model.objects.get(pk=self.record_ids["true"])
        self.assertEqual(
            true_record.allergies,
            "Alergia registrada previamente; completar detalle",
        )
        self.assertEqual(
            true_record.hereditary_diseases,
            {"allergies": True, "diabetes_mellitus": True},
        )
        self.assertEqual(true_record.family_history, "Antecedente conservado true")

        for name in ("false", "string", "absent"):
            with self.subTest(name=name):
                record = record_model.objects.get(pk=self.record_ids[name])
                self.assertEqual(record.allergies, "")
                self.assertEqual(record.family_history, f"Antecedente conservado {name}")


class ConsultationCompletionMigrationTests(TransactionTestCase):
    migrate_from = ("patients", "0009_clinical_record_alerts")
    migrate_to = ("patients", "0010_consultation_completion")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_from])
        old_apps = self.executor.loader.project_state([self.migrate_from]).apps
        patient_model = old_apps.get_model("patients", "Patient")
        consultation_model = old_apps.get_model("patients", "Consultation")
        user = User.objects.create(
            email="completion-migration@example.test",
            password="!",
            role="ODONTOLOGO",
        )
        patient = patient_model.objects.create(
            first_name="Paciente",
            last_name="Cierre histórico",
            birth_place="Managua",
            national_id="001-010190-9010A",
            national_id_key="0010101909010A",
            gender="OTRO",
            date_of_birth="1990-01-01",
            registered_by_id=user.pk,
        )
        self.original = {}
        for index, status in enumerate(("EN_PROGRESO", "COMPLETADA", "CANCELADA"), start=1):
            consultation = consultation_model.objects.create(
                patient_id=patient.pk,
                professional_id=user.pk,
                professional_name_snapshot="Histórico",
                date=f"2026-08-{index:02d}",
                time="09:00:00",
                consultation_type="GENERAL",
                summary=f"Contenido histórico {status}",
                status=status,
            )
            self.original[consultation.pk] = (status, consultation.summary)

    def tearDown(self):
        MigrationExecutor(connection).migrate([self.migrate_to])
        super().tearDown()

    def test_expansion_preserves_historical_consultations_without_guessing_closure(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_to])
        new_apps = self.executor.loader.project_state([self.migrate_to]).apps
        consultation_model = new_apps.get_model("patients", "Consultation")

        self.assertEqual(consultation_model.objects.count(), 3)
        for consultation_id, (status, summary) in self.original.items():
            with self.subTest(status=status):
                consultation = consultation_model.objects.get(pk=consultation_id)
                self.assertEqual(consultation.status, status)
                self.assertEqual(consultation.summary, summary)
                self.assertIsNone(consultation.completed_at)
                self.assertIsNone(consultation.completed_by_id)


class TreatmentItemMigrationTests(TransactionTestCase):
    migrate_from = ("patients", "0010_consultation_completion")
    migrate_to = ("patients", "0011_treatmentitem")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_from])
        old_apps = self.executor.loader.project_state([
            self.migrate_from,
            ("clinics", "0001_initial"),
        ]).apps
        patient_model = old_apps.get_model("patients", "Patient")
        consultation_model = old_apps.get_model("patients", "Consultation")
        odontogram_model = old_apps.get_model("patients", "OdontogramVersion")
        category_model = old_apps.get_model("clinics", "ServiceCategory")
        service_model = old_apps.get_model("clinics", "ClinicService")
        user = User.objects.create(
            email="treatment-item-migration@example.test",
            password="!",
            role="ODONTOLOGO",
        )
        patient = patient_model.objects.create(
            first_name="Paciente",
            last_name="Plan histórico",
            birth_place="Managua",
            national_id="001-010190-9011A",
            national_id_key="0010101909011A",
            gender="OTRO",
            date_of_birth="1990-01-01",
            registered_by_id=user.pk,
        )
        consultation = consultation_model.objects.create(
            patient_id=patient.pk,
            professional_id=user.pk,
            professional_name_snapshot="Histórico",
            date="2026-08-31",
            time="09:00:00",
            consultation_type="GENERAL",
            summary="Consulta histórica intacta",
            status="COMPLETADA",
            dental_service="Servicio textual histórico",
            treatment_plan="Endodoncia y corona inferidas sólo como texto",
            treatment_performed="Radiografía diagnóstica histórica",
        )
        odontogram_model.objects.create(
            patient_id=patient.pk,
            consultation_id=consultation.pk,
            version_number=1,
            dentition="PERMANENT",
            teeth={"16": {"planned": {"whole": ["CROWN"], "surfaces": {}}}},
            changed_teeth=[],
            created_by_id=user.pk,
        )
        category = category_model.objects.create(name="Migración")
        service_model.objects.create(
            category_id=category.pk,
            name="Servicio de catálogo intacto",
            duration_minutes=60,
            price="850.00",
        )
        self.consultation_id = consultation.pk

    def tearDown(self):
        MigrationExecutor(connection).migrate([self.migrate_to])
        super().tearDown()

    def test_schema_expansion_does_not_infer_items_or_change_related_clinical_data(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_to])
        apps = self.executor.loader.project_state([
            self.migrate_to,
            ("clinics", "0001_initial"),
        ]).apps
        consultation_model = apps.get_model("patients", "Consultation")
        treatment_item_model = apps.get_model("patients", "TreatmentItem")
        odontogram_model = apps.get_model("patients", "OdontogramVersion")
        service_model = apps.get_model("clinics", "ClinicService")

        consultation = consultation_model.objects.get(pk=self.consultation_id)
        self.assertEqual(treatment_item_model.objects.count(), 0)
        self.assertEqual(consultation.summary, "Consulta histórica intacta")
        self.assertEqual(
            consultation.treatment_plan,
            "Endodoncia y corona inferidas sólo como texto",
        )
        self.assertEqual(odontogram_model.objects.count(), 1)
        self.assertEqual(service_model.objects.count(), 1)


class TreatmentItemLifecycleMigrationTests(TransactionTestCase):
    migrate_from = ("patients", "0011_treatmentitem")
    migrate_to = ("patients", "0012_treatmentitem_lifecycle")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_from])
        old_apps = self.executor.loader.project_state([self.migrate_from]).apps
        patient_model = old_apps.get_model("patients", "Patient")
        consultation_model = old_apps.get_model("patients", "Consultation")
        treatment_item_model = old_apps.get_model("patients", "TreatmentItem")
        user = User.objects.create(
            email="treatment-lifecycle-migration@example.test",
            password="!",
            role="ODONTOLOGO",
        )
        patient = patient_model.objects.create(
            first_name="Paciente",
            last_name="Ciclo histórico",
            birth_place="Managua",
            national_id="001-010190-9012A",
            national_id_key="0010101909012A",
            gender="OTRO",
            date_of_birth="1990-01-01",
            registered_by_id=user.pk,
        )
        consultation = consultation_model.objects.create(
            patient_id=patient.pk,
            professional_id=user.pk,
            professional_name_snapshot="Histórico",
            date="2026-08-31",
            time="09:00:00",
            consultation_type="GENERAL",
            summary="Consulta histórica intacta",
            status="COMPLETADA",
        )
        self.item_id = treatment_item_model.objects.create(
            proposed_in_id=consultation.pk,
            description="Tratamiento histórico sin inferencias",
            status="ACEPTADO",
            notes="Texto que no es motivo ni ejecución",
        ).pk

    def tearDown(self):
        MigrationExecutor(connection).migrate([self.migrate_to])
        super().tearDown()

    def test_nullable_expansion_preserves_item_without_backfill(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_to])
        apps = self.executor.loader.project_state([self.migrate_to]).apps
        treatment_item_model = apps.get_model("patients", "TreatmentItem")

        item = treatment_item_model.objects.get(pk=self.item_id)

        self.assertEqual(treatment_item_model.objects.count(), 1)
        self.assertEqual(item.status, "ACEPTADO")
        self.assertEqual(item.notes, "Texto que no es motivo ni ejecución")
        self.assertIsNone(item.performed_in_id)
        self.assertIsNone(item.performed_at)
        self.assertEqual(item.status_reason, "")


class TreatmentItemOdontogramResultMigrationTests(TransactionTestCase):
    migrate_from = ("patients", "0012_treatmentitem_lifecycle")
    migrate_to = ("patients", "0013_treatmentitem_odontogram_result")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_from])
        old_apps = self.executor.loader.project_state([self.migrate_from]).apps
        patient_model = old_apps.get_model("patients", "Patient")
        consultation_model = old_apps.get_model("patients", "Consultation")
        odontogram_model = old_apps.get_model("patients", "OdontogramVersion")
        treatment_item_model = old_apps.get_model("patients", "TreatmentItem")
        user = User.objects.create(
            email="treatment-result-migration@example.test",
            password="!",
            role="ODONTOLOGO",
        )
        patient = patient_model.objects.create(
            first_name="Paciente",
            last_name="Resultado histórico",
            birth_place="Managua",
            national_id="001-010190-9013A",
            national_id_key="0010101909013A",
            gender="OTRO",
            date_of_birth="1990-01-01",
            registered_by_id=user.pk,
        )
        consultation = consultation_model.objects.create(
            patient_id=patient.pk,
            professional_id=user.pk,
            professional_name_snapshot="Histórico",
            date="2026-08-31",
            time="09:00:00",
            consultation_type="GENERAL",
            summary="Consulta con plan histórico intacto",
            status="COMPLETADA",
        )
        self.version_id = odontogram_model.objects.create(
            patient_id=patient.pk,
            consultation_id=consultation.pk,
            version_number=1,
            dentition="PERMANENT",
            teeth={"16": {"planned": {"whole": ["CROWN"], "surfaces": {}}}},
            changed_teeth=[],
            created_by_id=user.pk,
        ).pk
        self.item_id = treatment_item_model.objects.create(
            proposed_in_id=consultation.pk,
            description="Corona histórica sin resultado enlazado",
            tooth_code="16",
            planned_finding="CROWN",
            status="ACEPTADO",
        ).pk

    def tearDown(self):
        MigrationExecutor(connection).migrate([self.migrate_to])
        super().tearDown()

    def test_nullable_trace_expansion_preserves_historical_rows_without_backfill(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_to])
        apps = self.executor.loader.project_state([self.migrate_to]).apps
        treatment_item_model = apps.get_model("patients", "TreatmentItem")
        odontogram_model = apps.get_model("patients", "OdontogramVersion")

        item = treatment_item_model.objects.get(pk=self.item_id)
        field = treatment_item_model._meta.get_field("resulting_odontogram_version")

        self.assertEqual(treatment_item_model.objects.count(), 1)
        self.assertEqual(odontogram_model.objects.count(), 1)
        self.assertTrue(odontogram_model.objects.filter(pk=self.version_id).exists())
        self.assertIsNone(item.resulting_odontogram_version_id)
        self.assertTrue(field.null)
        self.assertTrue(field.one_to_one)


class PatientDocumentContextMigrationTests(TransactionTestCase):
    migrate_from = ("patients", "0015_contract_legacy_national_id")
    migrate_to = ("patients", "0016_patientdocument_consultation_and_tooth_code")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_from])
        old_apps = self.executor.loader.project_state([self.migrate_from]).apps
        patient_model = old_apps.get_model("patients", "Patient")
        document_model = old_apps.get_model("patients", "PatientDocument")
        self.user = User.objects.create(
            email="document-context-migration@example.test",
            password="!",
            role="ODONTOLOGO",
        )
        patient = patient_model.objects.create(
            first_name="Paciente",
            last_name="Documental",
            birth_place="Managua",
            identification_type="CEDULA",
            identification_number="001-010190-9056A",
            phone="8888-5656",
            gender="OTRO",
            date_of_birth="1990-01-01",
            registered_by_id=self.user.pk,
        )
        self.document_ids = []
        for index in range(4):
            self.document_ids.append(document_model.objects.create(
                patient_id=patient.pk,
                category="Fotografía clínica" if index == 0 else "Documento histórico",
                document_date=f"2026-08-{20 + index:02d}",
                notes=f"Metadato histórico {index}",
                original_name=f"historico-{index}.png",
                mime_type="image/png",
                size_bytes=100 + index,
                file=f"patients/{patient.pk}/documents/historico-{index}.png",
                uploaded_by_id=self.user.pk,
            ).pk)

    def tearDown(self):
        MigrationExecutor(connection).migrate([self.migrate_to])
        super().tearDown()

    def test_nullable_context_expansion_preserves_four_historical_documents(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_to])
        apps = self.executor.loader.project_state([self.migrate_to]).apps
        document_model = apps.get_model("patients", "PatientDocument")

        documents = list(document_model.objects.order_by("pk"))

        self.assertEqual(document_model.objects.count(), 4)
        self.assertEqual([item.pk for item in documents], self.document_ids)
        self.assertEqual(
            [item.original_name for item in documents],
            [f"historico-{index}.png" for index in range(4)],
        )
        self.assertTrue(all(item.consultation_id is None for item in documents))
        self.assertTrue(all(item.tooth_code is None for item in documents))
        self.assertTrue(document_model._meta.get_field("consultation").null)
        self.assertTrue(document_model._meta.get_field("tooth_code").null)
