from io import BytesIO, StringIO
from tempfile import TemporaryDirectory
from unittest.mock import patch
from django.core.management import call_command, CommandError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from apps.users.models import User


@override_settings(DEMO_MODE=True, UPLOADS_ENABLED=False, PASSWORD_RESET_ENABLED=False)
class DemoBoundaryTests(APITestCase):
    def setUp(self):
        directory = TemporaryDirectory(prefix="demo-boundary-test-")
        self.addCleanup(directory.cleanup)
        override = override_settings(PRIVATE_MEDIA_ROOT=directory.name)
        override.enable()
        self.addCleanup(override.disable)

    def test_features_are_public_and_do_not_expose_configuration(self):
        response = self.client.get("/api/system/features/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"demo": True, "uploads": False, "password_reset": False})

    def test_password_reset_is_explicitly_unavailable(self):
        self.assertEqual(self.client.post("/api/auth/password-reset/", {"email": "demo@example.test"}).status_code, 403)

    def test_even_an_administrator_cannot_upload_an_avatar(self):
        user = User.objects.create_user(email="admin-demo@example.test", role=User.Role.ADMINISTRADOR)
        self.client.force_authenticate(user)
        buffer = BytesIO()
        Image.new("RGB", (4, 4), "white").save(buffer, "PNG")
        response = self.client.patch("/api/auth/me/", {
            "avatar": SimpleUploadedFile("avatar.png", buffer.getvalue(), "image/png"),
        }, format="multipart")
        self.assertEqual(response.status_code, 403)

    def test_demo_seed_is_idempotent_and_never_resets_passwords(self):
        from apps.patients.models import Patient, PatientDocument
        with patch.dict("os.environ", {
            "DEMO_ADMIN_PASSWORD": "SyntheticAdminOnly123!",
            "DEMO_DENTIST_PASSWORD": "SyntheticDentistOnly123!",
            "DEMO_RECEPTION_PASSWORD": "SyntheticReceptionOnly123!",
        }):
            call_command("seed_demo", stdout=StringIO())
            user = User.objects.get(email="admin@demo.example.test")
            user.set_password("ChangedSyntheticPassword456!")
            user.save(update_fields=["password"])
            call_command("seed_demo", stdout=StringIO())
        user.refresh_from_db()
        self.assertTrue(user.check_password("ChangedSyntheticPassword456!"))
        self.assertEqual(Patient.objects.filter(code__startswith="DEMO-").count(), 5)
        self.assertEqual(PatientDocument.objects.count(), 5)

    @override_settings(DEMO_MODE=False)
    def test_seed_is_forbidden_outside_demo(self):
        with self.assertRaises(CommandError):
            call_command("seed_demo")
