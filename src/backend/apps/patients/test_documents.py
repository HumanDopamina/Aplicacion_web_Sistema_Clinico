import shutil
import tempfile
from datetime import date
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from apps.users.models import RolePermissionPreset, User

from .models import Patient


def png_file(name="radiografia.png", color="white"):
    content = BytesIO()
    Image.new("RGB", (4, 4), color).save(content, format="PNG")
    return SimpleUploadedFile(name, content.getvalue(), content_type="image/png")


def pdf_file(name="informe.pdf", padding=b""):
    content = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n" + padding + b"\n%%EOF"
    return SimpleUploadedFile(name, content, content_type="application/pdf")


def corrupt_png_file(name="corrupta.png"):
    valid = png_file(name)
    content = bytearray(valid.read())
    idat_payload = content.index(b"IDAT") + 4
    content[idat_payload] ^= 0xFF
    return SimpleUploadedFile(name, bytes(content), content_type="image/png")


class PatientDocumentApiTests(APITestCase):
    def setUp(self):
        self.private_root = Path(tempfile.mkdtemp(prefix="patient-documents-"))
        self.settings_override = override_settings(PRIVATE_MEDIA_ROOT=self.private_root)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.addCleanup(shutil.rmtree, self.private_root, True)

        self.receptionist = User.objects.create_user(
            email="recepcion-documentos@dentalclinic.com",
            password="ContraseñaRecepcion123!",
            role=User.Role.RECEPCIONISTA,
            first_name="Rosa",
            last_name="López",
        )
        self.dentist = User.objects.create_user(
            email="odontologa-documentos@dentalclinic.com",
            password="ContraseñaOdontologa123!",
            role=User.Role.ODONTOLOGO,
            first_name="Elena",
            last_name="Vargas",
        )
        self.admin = User.objects.create_user(
            email="admin-documentos@dentalclinic.com",
            password="ContraseñaAdmin123!",
            role=User.Role.ADMINISTRADOR,
            first_name="Ada",
        )
        self.patient = self.create_patient("001-140190-0001A", "Ana")
        self.other_patient = self.create_patient("001-150190-0002B", "Luis")

    def create_patient(self, national_id, first_name, **overrides):
        values = {
            "first_name": first_name,
            "last_name": "Pérez",
            "birth_place": "Managua",
            "national_id": national_id,
            "gender": Patient.Gender.FEMENINO,
            "date_of_birth": date(1990, 1, 14),
            "registered_by": self.receptionist,
        }
        values.update(overrides)
        return Patient.objects.create(**values)

    def list_url(self, patient=None):
        return f"/api/patients/{(patient or self.patient).pk}/documents/"

    def upload(self, *files, patient=None, category="Radiografía dental", **metadata):
        response = self.client.post(
            self.list_url(patient),
            {
                "files": list(files),
                "category": category,
                "document_date": metadata.get("document_date", "2026-08-09"),
                "notes": metadata.get("notes", "Control radiográfico"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 201, getattr(response, "data", response.content))
        return response.data

    def test_default_roles_view_and_create_but_delete_is_not_assigned(self):
        self.client.force_authenticate(self.receptionist)
        created = self.upload(png_file())[0]
        self.assertEqual(self.client.get(self.list_url()).status_code, 200)
        self.assertEqual(
            self.client.delete(f"{self.list_url()}{created['id']}/").status_code,
            403,
        )

        self.client.force_authenticate(self.dentist)
        self.assertEqual(self.client.get(self.list_url()).status_code, 200)
        self.assertEqual(self.upload(pdf_file())[0]["mime_type"], "application/pdf")

    def test_document_list_is_paginated(self):
        self.client.force_authenticate(self.receptionist)
        self.upload(png_file("primero.png"), pdf_file("segundo.pdf"))

        response = self.client.get(self.list_url(), {"page_size": 1})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNotNone(response.data["next"])

    def test_batch_upload_normalizes_metadata_and_never_exposes_private_path(self):
        self.client.force_authenticate(self.receptionist)
        created = self.upload(
            png_file("frontal.png"),
            pdf_file("evaluacion.pdf"),
            category="  Radiografía   Dental  ",
        )

        self.assertEqual(len(created), 2)
        self.assertEqual({item["category"] for item in created}, {"Radiografía Dental"})
        self.assertEqual({item["uploaded_by_name"] for item in created}, {"Rosa López"})
        self.assertTrue(all(item["content_url"].startswith("/api/patients/") for item in created))
        self.assertTrue(all("file" not in item and "private" not in str(item) for item in created))
        stored = [path for path in self.private_root.rglob("*") if path.is_file()]
        self.assertEqual(len(stored), 2)
        self.assertTrue(all(path.name not in {"frontal.png", "evaluacion.pdf"} for path in stored))

    def test_batch_is_atomic_when_one_file_is_invalid(self):
        self.client.force_authenticate(self.receptionist)
        invalid = SimpleUploadedFile("script.pdf", b"not a pdf", content_type="application/pdf")
        response = self.client.post(
            self.list_url(),
            {
                "files": [png_file(), invalid],
                "category": "Informe",
                "document_date": "2026-08-09",
                "notes": "",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("PDF", str(response.data))
        self.assertEqual(self.client.get(self.list_url()).data["results"], [])
        self.assertEqual([path for path in self.private_root.rglob("*") if path.is_file()], [])

    def test_corrupted_png_returns_validation_error_without_leaving_files(self):
        self.client.force_authenticate(self.receptionist)

        response = self.client.post(
            self.list_url(),
            {
                "files": [corrupt_png_file()],
                "category": "Radiografía",
                "document_date": "2026-08-09",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("imagen no es válido", str(response.data))
        self.assertEqual(self.client.get(self.list_url()).data["results"], [])
        self.assertEqual([path for path in self.private_root.rglob("*") if path.is_file()], [])

    def test_image_pixel_bomb_returns_validation_error(self):
        self.client.force_authenticate(self.receptionist)

        with patch("PIL.Image.MAX_IMAGE_PIXELS", 1):
            response = self.client.post(
                self.list_url(),
                {
                    "files": [png_file()],
                    "category": "Radiografía",
                    "document_date": "2026-08-09",
                },
                format="multipart",
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.get(self.list_url()).data["results"], [])

    def test_rejects_unsupported_content_extension_size_count_and_batch_size(self):
        self.client.force_authenticate(self.receptionist)
        cases = [
            [SimpleUploadedFile("archivo.svg", b"<svg/>", content_type="image/svg+xml")],
            [png_file("extension-falsa.jpg")],
            [SimpleUploadedFile("imagen.jpg", b"not an image", content_type="image/jpeg")],
            [SimpleUploadedFile("grande.pdf", b"%PDF" + b"x" * (10 * 1024 * 1024) + b"%%EOF", content_type="application/pdf")],
            [png_file(f"foto-{index}.png") for index in range(11)],
            [pdf_file(f"informe-{index}.pdf", b"x" * (9 * 1024 * 1024)) for index in range(6)],
        ]

        for files in cases:
            response = self.client.post(
                self.list_url(),
                {"files": files, "category": "Prueba", "document_date": "2026-08-09"},
                format="multipart",
            )
            self.assertEqual(response.status_code, 400)

    def test_list_search_filter_and_global_category_suggestions(self):
        self.client.force_authenticate(self.receptionist)
        self.upload(png_file("panoramica.png"), category="Radiografía")
        self.upload(pdf_file("consentimiento.pdf"), category="Consentimiento")
        self.upload(png_file("otra.png"), patient=self.other_patient, category="radiografía")

        filtered = self.client.get(f"{self.list_url()}?category=Radiograf%C3%ADa&search=panoramica")
        categories = self.client.get("/api/patients/document-categories/")

        self.assertEqual(filtered.status_code, 200)
        self.assertEqual(
            [item["original_name"] for item in filtered.data["results"]],
            ["panoramica.png"],
        )
        self.assertEqual(categories.status_code, 200)
        self.assertEqual(categories.data, ["Consentimiento", "Radiografía"])

    def test_content_is_authenticated_patient_scoped_and_uses_private_headers(self):
        self.client.force_authenticate(self.receptionist)
        created = self.upload(pdf_file())[0]
        content_url = created["content_url"]

        inline = self.client.get(content_url)
        download = self.client.get(f"{content_url}?download=true")
        wrong_patient = self.client.get(
            content_url.replace(f"/{self.patient.pk}/", f"/{self.other_patient.pk}/"),
        )
        self.client.force_authenticate(None)
        anonymous = self.client.get(content_url)

        self.assertEqual(inline.status_code, 200)
        self.assertEqual(inline["Content-Type"], "application/pdf")
        self.assertIn("inline", inline["Content-Disposition"])
        self.assertEqual(inline["Cache-Control"], "private, no-store")
        self.assertEqual(inline["X-Content-Type-Options"], "nosniff")
        self.assertIn("attachment", download["Content-Disposition"])
        self.assertEqual(wrong_patient.status_code, 404)
        self.assertEqual(anonymous.status_code, 401)

    def test_inactive_patient_is_read_only_for_documents(self):
        self.client.force_authenticate(self.receptionist)
        created = self.upload(png_file())[0]
        self.patient.is_active = False
        self.patient.save(update_fields=("is_active",))

        listed = self.client.get(self.list_url())
        upload = self.client.post(
            self.list_url(),
            {"files": [png_file("nueva.png")], "category": "Fotografía"},
            format="multipart",
        )
        self.client.force_authenticate(self.admin)
        deleted = self.client.delete(f"{self.list_url()}{created['id']}/")

        self.assertEqual(listed.status_code, 200)
        self.assertEqual(upload.status_code, 400)
        self.assertIn("inactivo", str(upload.data).lower())
        self.assertEqual(deleted.status_code, 400)

    def test_configurable_delete_removes_database_record_and_physical_file(self):
        self.client.force_authenticate(self.receptionist)
        created = self.upload(png_file())[0]
        stored_path = next(path for path in self.private_root.rglob("*") if path.is_file())
        preset = RolePermissionPreset.objects.get(role=User.Role.RECEPCIONISTA)
        preset.permissions = [*preset.permissions, "documents.delete"]
        preset.save(update_fields=("permissions",))

        response = self.client.delete(f"{self.list_url()}{created['id']}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(stored_path.exists())
        self.assertEqual(self.client.get(self.list_url()).data["results"], [])

    def test_missing_capability_is_denied_even_when_patient_exists(self):
        preset = RolePermissionPreset.objects.get(role=User.Role.RECEPCIONISTA)
        preset.permissions = [
            code for code in preset.permissions if code not in {"documents.view", "documents.create"}
        ]
        preset.save(update_fields=("permissions",))
        self.client.force_authenticate(self.receptionist)

        self.assertEqual(self.client.get(self.list_url()).status_code, 403)
        self.assertEqual(
            self.client.post(
                self.list_url(),
                {"files": [png_file()], "category": "Radiografía"},
                format="multipart",
            ).status_code,
            403,
        )
