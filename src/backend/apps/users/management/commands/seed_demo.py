import os
from datetime import date, time, timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.appointments.models import Appointment
from apps.clinics.models import BusinessHour, ClinicProfile, ClinicService, ServiceCategory
from apps.patients.models import ClinicalRecord, Consultation, Patient, PatientDocument, TreatmentItem
from apps.patients.odontograms import create_initial_odontogram_version
from apps.users.models import User


class Command(BaseCommand):
    help = "Create synthetic demo accounts and records without overwriting existing data."

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEMO_MODE:
            raise CommandError("seed_demo sólo se permite con el perfil demo.")
        # Serialize seed invocations before creating accounts or sample records.
        clinic = ClinicProfile.objects.select_for_update().get(pk=1)
        accounts = {}
        for key, role in (
            ("admin", User.Role.ADMINISTRADOR),
            ("dentist", User.Role.ODONTOLOGO),
            ("reception", User.Role.RECEPCIONISTA),
        ):
            email = f"{key}@demo.example.test"
            user = User.objects.filter(email=email).first()
            if user is None:
                password = os.getenv(f"DEMO_{key.upper()}_PASSWORD", "")
                try:
                    validate_password(password)
                except ValidationError as error:
                    raise CommandError(f"Configura DEMO_{key.upper()}_PASSWORD con una contraseña segura.") from error
                user = User.objects.create_user(
                    email=email, password=password, role=role,
                    first_name="Demo", last_name=key.capitalize(),
                )
            accounts[key] = user
        first_seed = not Patient.objects.filter(code__startswith="DEMO-").exists()
        if first_seed and not clinic.schedule_configured:
            clinic.name = "Clínica de demostración — datos ficticios"
            clinic.schedule_configured = True
            clinic.save(update_fields=["name", "schedule_configured", "updated_at"])
            for weekday in range(7):
                BusinessHour.objects.update_or_create(weekday=weekday, defaults={
                    "is_open": weekday < 6, "opens_at": time(8), "closes_at": time(17),
                })
        category, _ = ServiceCategory.objects.get_or_create(name="Servicios de demostración")
        service, _ = ClinicService.objects.get_or_create(
            category=category, name="Valoración ficticia", defaults={"duration_minutes": 30, "price": "500.00"},
        )
        sample = Path(settings.BASE_DIR) / "demo_samples" / "documento-ficticio.pdf"
        if not sample.is_file():
            raise CommandError("Falta el documento ficticio empaquetado.")
        reference_date = date(2026, 9, 7)
        for index in range(1, 6):
            patient, created = Patient.objects.get_or_create(code=f"DEMO-{index:03}", defaults={
                "first_name": "Paciente ficticio", "last_name": str(index), "birth_place": "Demo",
                "date_of_birth": date(1990 + index, 1, 1), "gender": Patient.Gender.OTRO,
                "phone": "00000000", "registered_by": accounts["admin"],
            })
            if not created:
                continue
            ClinicalRecord.objects.create(patient=patient)
            consultation = Consultation.objects.create(
                patient=patient, professional=accounts["dentist"], date=reference_date,
                time=time(8 + index), consultation_type=Consultation.Type.GENERAL,
                summary="Consulta ficticia para probar el sistema.", status=Consultation.Status.IN_PROGRESS,
            )
            create_initial_odontogram_version(consultation)
            TreatmentItem.objects.create(proposed_in=consultation, service=service,
                                         description="Propuesta de ejemplo", unit_price_snapshot=service.price)
            PatientDocument.objects.create(
                patient=patient, consultation=consultation, category="Documento de muestra",
                document_date=reference_date, original_name="documento-ficticio.pdf",
                mime_type="application/pdf", size_bytes=sample.stat().st_size,
                file="documento-ficticio.pdf", uploaded_by=accounts["dentist"],
            )
            Appointment.objects.create(
                patient=patient, dentist=accounts["dentist"], service=service,
                date=reference_date + timedelta(days=1), start_time=time(8 + index),
                duration_minutes=30, reason="Cita ficticia", created_by=accounts["reception"],
            )
        self.stdout.write("Demo preparada. Las credenciales y los registros existentes se conservaron.")
