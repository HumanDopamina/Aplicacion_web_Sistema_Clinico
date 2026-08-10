from datetime import datetime, timedelta
from unittest.mock import patch

from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APITestCase
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class LoginApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="admin@dentalclinic.com",
            password="ContraseñaSegura123!",
            role=User.Role.ADMINISTRADOR,
            first_name="Ana",
        )
        self.url = reverse("users:login")

    def test_valid_credentials_return_tokens_and_safe_user_data(self):
        response = self.client.post(
            self.url,
            {"email": self.user.email, "password": "ContraseñaSegura123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["role"], User.Role.ADMINISTRADOR)
        self.assertEqual(
            response.data["user"]["permissions"],
            [
                "patients.view",
                "patients.create",
                "patients.edit",
                "consultations.view",
                "consultations.create",
                "consultations.edit",
                "appointments.view",
                "appointments.view_all",
                "appointments.create",
                "appointments.edit",
                "documents.view",
                "documents.create",
                "documents.delete",
            ],
        )
        self.assertNotIn("password", response.data["user"])

    def test_invalid_credentials_return_generic_error(self):
        response = self.client.post(
            self.url,
            {"email": self.user.email, "password": "incorrecta"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"][0], "Correo electrónico o contraseña incorrectos.")

    def test_unknown_email_returns_the_same_generic_error(self):
        response = self.client.post(
            self.url,
            {"email": "unknown@dentalclinic.com", "password": "incorrecta"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"][0], "Correo electrónico o contraseña incorrectos.")

    def test_profile_requires_a_valid_token(self):
        url = reverse("users:current-user")
        self.assertEqual(self.client.get(url).status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid-token")
        self.assertEqual(self.client.get(url).status_code, 401)

    def test_logout_requires_authentication(self):
        response = self.client.post(
            reverse("users:logout"),
            {"refresh": "invalid-token"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)

    def test_logout_blacklists_the_refresh_token(self):
        login_response = self.client.post(
            self.url,
            {"email": self.user.email, "password": "ContraseñaSegura123!"},
            format="json",
        )
        access = login_response.data["access"]
        refresh = login_response.data["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.post(
            reverse("users:logout"),
            {"refresh": refresh},
            format="json",
        )

        self.assertEqual(response.status_code, 204)
        with self.assertRaises(TokenError):
            RefreshToken(refresh).check_blacklist()

        profile_response = self.client.get(reverse("users:current-user"))
        self.assertEqual(profile_response.status_code, 401)

    def test_refresh_token_issues_a_new_access_token_for_protected_requests(self):
        login_response = self.client.post(
            self.url,
            {"email": self.user.email, "password": "ContraseñaSegura123!"},
            format="json",
        )

        refresh_response = self.client.post(
            reverse("users:token-refresh"),
            {"refresh": login_response.data["refresh"]},
            format="json",
        )

        self.assertEqual(refresh_response.status_code, 200)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {refresh_response.data['access']}"
        )
        self.assertEqual(
            self.client.get(reverse("users:current-user")).status_code,
            200,
        )


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class PasswordResetApiTests(APITestCase):
    generic_message = "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="odontologo@dentalclinic.com",
            password="ContraseñaAnterior123!",
            role=User.Role.ODONTOLOGO,
            first_name="Lucía",
        )

    def reset_payload(self, password="NuevaContraseña123!"):
        return {
            "uid": urlsafe_base64_encode(force_bytes(self.user.pk)),
            "token": default_token_generator.make_token(self.user),
            "new_password": password,
            "confirm_password": password,
        }

    def test_registered_email_receives_a_time_limited_reset_link(self):
        response = self.client.post(
            reverse("users:password-reset"),
            {"email": " ODONTOLOGO@dentalclinic.com "},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], self.generic_message)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])
        self.assertIn("/restablecer-contrasena/", mail.outbox[0].body)

    def test_unknown_email_returns_the_same_response_without_sending_mail(self):
        response = self.client.post(
            reverse("users:password-reset"),
            {"email": "unknown@dentalclinic.com"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], self.generic_message)
        self.assertEqual(len(mail.outbox), 0)

    def test_valid_token_changes_password_and_is_single_use(self):
        payload = self.reset_payload()

        response = self.client.post(reverse("users:password-reset-confirm"), payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NuevaContraseña123!"))
        reused_response = self.client.post(
            reverse("users:password-reset-confirm"), payload, format="json"
        )
        self.assertEqual(reused_response.status_code, 400)

    def test_confirmation_rejects_mismatched_passwords(self):
        payload = self.reset_payload()
        payload["confirm_password"] = "OtraContraseña123!"

        response = self.client.post(reverse("users:password-reset-confirm"), payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("confirm_password", response.data)

    def test_confirmation_rejects_a_weak_password(self):
        response = self.client.post(
            reverse("users:password-reset-confirm"),
            self.reset_payload(password="123"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("new_password", response.data)

    def test_confirmation_rejects_an_expired_token(self):
        issued_at = datetime(2026, 8, 7, 12, 0, 0)
        with patch.object(default_token_generator, "_now", return_value=issued_at):
            payload = self.reset_payload()

        with patch.object(
            default_token_generator,
            "_now",
            return_value=issued_at + timedelta(minutes=61),
        ):
            response = self.client.post(
                reverse("users:password-reset-confirm"), payload, format="json"
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("token", response.data)


class ChangePasswordApiTests(APITestCase):
    current_password = "ContraseñaActual123!"
    new_password = "NuevaContraseña456!"

    def setUp(self):
        self.user = User.objects.create_user(
            email="recepcion@dentalclinic.com",
            password=self.current_password,
            role=User.Role.RECEPCIONISTA,
            first_name="Marta",
        )

    def authenticate(self):
        response = self.client.post(
            reverse("users:login"),
            {"email": self.user.email, "password": self.current_password},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        return response.data["access"]

    def payload(self, **overrides):
        data = {
            "current_password": self.current_password,
            "new_password": self.new_password,
            "confirm_password": self.new_password,
        }
        data.update(overrides)
        return data

    def test_password_change_requires_authentication(self):
        response = self.client.post(
            reverse("users:password-change"), self.payload(), format="json"
        )

        self.assertEqual(response.status_code, 401)

    def test_correct_current_password_updates_password_and_revokes_access(self):
        old_access = self.authenticate()

        response = self.client.post(
            reverse("users:password-change"), self.payload(), format="json"
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.new_password))
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {old_access}")
        self.assertEqual(self.client.get(reverse("users:current-user")).status_code, 401)

    def test_incorrect_current_password_is_rejected(self):
        self.authenticate()

        response = self.client.post(
            reverse("users:password-change"),
            self.payload(current_password="incorrecta"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("current_password", response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.current_password))

    def test_mismatched_confirmation_is_rejected(self):
        self.authenticate()

        response = self.client.post(
            reverse("users:password-change"),
            self.payload(confirm_password="ContraseñaDistinta456!"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("confirm_password", response.data)

    def test_reusing_current_password_is_rejected(self):
        self.authenticate()

        response = self.client.post(
            reverse("users:password-change"),
            self.payload(
                new_password=self.current_password,
                confirm_password=self.current_password,
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("new_password", response.data)

    def test_weak_password_explains_the_missing_requirements(self):
        self.authenticate()

        response = self.client.post(
            reverse("users:password-change"),
            self.payload(new_password="123", confirm_password="123"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("new_password", response.data)
        self.assertGreaterEqual(len(response.data["new_password"]), 2)


class UserRegistrationApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin-users@dentalclinic.com",
            password="ContraseñaAdmin123!",
            role=User.Role.ADMINISTRADOR,
            first_name="Admin",
        )
        self.url = reverse("users:user-list")

    def payload(self, **overrides):
        data = {
            "email": "nuevo@dentalclinic.com",
            "first_name": "Lucía",
            "last_name": "Méndez",
            "role": User.Role.ODONTOLOGO,
            "password": "ContraseñaSegura123!",
            "confirm_password": "ContraseñaSegura123!",
        }
        data.update(overrides)
        return data

    def test_hu09_administrator_lists_every_user_with_role_and_status(self):
        User.objects.create_user(
            email="activo@dentalclinic.com",
            password="ContraseñaSegura123!",
            first_name="Ana",
            role=User.Role.ODONTOLOGO,
        )
        User.objects.create_user(
            email="inactivo@dentalclinic.com",
            password="ContraseñaSegura123!",
            first_name="Bruno",
            role=User.Role.RECEPCIONISTA,
            is_active=False,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 3)
        for user in response.data:
            self.assertIn("role", user)
            self.assertIn("is_active", user)
        users_by_email = {user["email"]: user for user in response.data}
        self.assertEqual(
            users_by_email["activo@dentalclinic.com"]["role"],
            User.Role.ODONTOLOGO,
        )
        self.assertTrue(users_by_email["activo@dentalclinic.com"]["is_active"])
        self.assertEqual(
            users_by_email["inactivo@dentalclinic.com"]["role"],
            User.Role.RECEPCIONISTA,
        )
        self.assertFalse(users_by_email["inactivo@dentalclinic.com"]["is_active"])
        self.assertIn("admin-users@dentalclinic.com", users_by_email)

    def test_administrator_creates_a_login_ready_user_without_exposing_password(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(self.url, self.payload(), format="json")

        self.assertEqual(response.status_code, 201)
        created = User.objects.get(email="nuevo@dentalclinic.com")
        self.assertTrue(created.check_password("ContraseñaSegura123!"))
        self.assertNotIn("password", response.data)
        self.assertNotIn("confirm_password", response.data)
        login = self.client.post(
            reverse("users:login"),
            {"email": created.email, "password": "ContraseñaSegura123!"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)

    def test_existing_email_is_rejected_case_insensitively(self):
        User.objects.create_user(
            email="existente@dentalclinic.com",
            password="OtraContraseña123!",
            role=User.Role.RECEPCIONISTA,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            self.url,
            self.payload(email="EXISTENTE@dentalclinic.com"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)
        self.assertEqual(User.objects.filter(email__iexact="existente@dentalclinic.com").count(), 1)

    def test_weak_password_is_rejected(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            self.url,
            self.payload(password="123", confirm_password="123"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)

    def test_non_administrator_cannot_create_or_list_users(self):
        receptionist = User.objects.create_user(
            email="recepcion-users@dentalclinic.com",
            password="ContraseñaRecepcion123!",
            role=User.Role.RECEPCIONISTA,
        )
        self.client.force_authenticate(receptionist)

        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.assertEqual(self.client.post(self.url, self.payload(), format="json").status_code, 403)

    def test_hu06_and_hu08_update_information_and_role_without_changing_password(self):
        member = User.objects.create_user(
            email="editar@dentalclinic.com",
            password="ContraseñaOriginal123!",
            role=User.Role.RECEPCIONISTA,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            reverse("users:user-detail", kwargs={"pk": member.pk}),
            {
                "email": "EDITADO@dentalclinic.com",
                "first_name": "Elena",
                "last_name": "Vargas",
                "role": User.Role.ODONTOLOGO,
                "is_superuser": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        member.refresh_from_db()
        self.assertEqual(member.email, "editado@dentalclinic.com")
        self.assertEqual(member.first_name, "Elena")
        self.assertEqual(member.role, User.Role.ODONTOLOGO)
        self.assertTrue(member.is_active)
        self.assertFalse(member.is_superuser)
        self.assertTrue(member.check_password("ContraseñaOriginal123!"))
        self.assertNotIn("password", response.data)

    def test_hu07_deactivation_preserves_user_and_blocks_login(self):
        password = "ContraseñaOriginal123!"
        member = User.objects.create_user(
            email="desactivar@dentalclinic.com",
            password=password,
            first_name="Elena",
            last_name="Vargas",
            role=User.Role.RECEPCIONISTA,
        )
        original_id = member.pk
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            reverse("users:user-detail", kwargs={"pk": original_id}),
            {"is_active": False},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        member.refresh_from_db()
        self.assertFalse(member.is_active)
        self.assertTrue(
            User.objects.filter(
                pk=original_id,
                email="desactivar@dentalclinic.com",
                first_name="Elena",
                last_name="Vargas",
                role=User.Role.RECEPCIONISTA,
            ).exists()
        )

        self.client.force_authenticate(user=None)
        login = self.client.post(
            reverse("users:login"),
            {"email": member.email, "password": password},
            format="json",
        )

        self.assertEqual(login.status_code, 400)
        self.assertEqual(
            login.data["detail"][0],
            "Correo electrónico o contraseña incorrectos.",
        )

    def test_hu07_user_detail_does_not_allow_deletion(self):
        member = User.objects.create_user(
            email="conservar@dentalclinic.com",
            password="ContraseñaOriginal123!",
            role=User.Role.ODONTOLOGO,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.delete(
            reverse("users:user-detail", kwargs={"pk": member.pk}),
        )

        self.assertEqual(response.status_code, 405)
        self.assertTrue(User.objects.filter(pk=member.pk).exists())

    def test_update_rejects_an_email_used_by_another_user(self):
        member = User.objects.create_user(
            email="editar@dentalclinic.com",
            password="ContraseñaOriginal123!",
        )
        User.objects.create_user(
            email="ocupado@dentalclinic.com",
            password="ContraseñaOcupada123!",
        )
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            reverse("users:user-detail", kwargs={"pk": member.pk}),
            {"email": "OCUPADO@dentalclinic.com"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)
        member.refresh_from_db()
        self.assertEqual(member.email, "editar@dentalclinic.com")

    def test_non_administrator_cannot_update_users(self):
        receptionist = User.objects.create_user(
            email="recepcion-edit@dentalclinic.com",
            password="ContraseñaRecepcion123!",
            role=User.Role.RECEPCIONISTA,
        )
        self.client.force_authenticate(receptionist)

        response = self.client.patch(
            reverse("users:user-detail", kwargs={"pk": self.admin.pk}),
            {"first_name": "Alterado"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.first_name, "Admin")


class RolePermissionPresetApiTests(APITestCase):
    list_url = "/api/auth/role-permissions/"

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin-permissions@dentalclinic.com",
            password="ContraseñaAdmin123!",
            role=User.Role.ADMINISTRADOR,
        )
        self.receptionist = User.objects.create_user(
            email="recepcion-permissions@dentalclinic.com",
            password="ContraseñaRecepcion123!",
            role=User.Role.RECEPCIONISTA,
        )

    def test_hu09_administrator_lists_editable_role_presets_and_catalog(self):
        self.client.force_authenticate(self.admin)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["code"] for item in response.data["available_permissions"]],
            [
                "patients.view",
                "patients.create",
                "patients.edit",
                "consultations.view",
                "consultations.create",
                "consultations.edit",
                "appointments.view",
                "appointments.view_all",
                "appointments.create",
                "appointments.edit",
                "documents.view",
                "documents.create",
                "documents.delete",
            ],
        )
        self.assertEqual(
            {preset["role"] for preset in response.data["presets"]},
            {User.Role.RECEPCIONISTA, User.Role.ODONTOLOGO},
        )

    def test_hu09_administrator_replaces_a_role_permission_preset(self):
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f"{self.list_url}{User.Role.ODONTOLOGO}/",
            {"permissions": ["patients.view", "patients.create"]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "role": User.Role.ODONTOLOGO,
                "permissions": ["patients.view", "patients.create"],
            },
        )

    def test_view_all_requires_the_base_appointment_view_permission(self):
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f"{self.list_url}{User.Role.ODONTOLOGO}/",
            {"permissions": ["appointments.view_all"]},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("appointments.view_all", str(response.data))

    def test_hu09_effective_permissions_follow_the_global_role_preset(self):
        self.client.force_authenticate(self.admin)
        self.client.patch(
            f"{self.list_url}{User.Role.RECEPCIONISTA}/",
            {"permissions": ["patients.view", "patients.create"]},
            format="json",
        )
        self.client.force_authenticate(self.receptionist)

        profile = self.client.get(reverse("users:current-user"))

        self.assertEqual(profile.status_code, 200)
        self.assertIn("permissions", profile.data)
        self.assertEqual(
            profile.data["permissions"],
            ["patients.view", "patients.create"],
        )

    def test_hu09_rejects_unknown_permission_codes_without_changing_preset(self):
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f"{self.list_url}{User.Role.RECEPCIONISTA}/",
            {"permissions": ["users.become_admin"]},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        current = self.client.get(self.list_url)
        receptionist = next(
            preset
            for preset in current.data["presets"]
            if preset["role"] == User.Role.RECEPCIONISTA
        )
        self.assertNotIn("users.become_admin", receptionist["permissions"])

    def test_hu09_non_administrator_cannot_read_or_change_role_presets(self):
        self.client.force_authenticate(self.receptionist)

        self.assertEqual(self.client.get(self.list_url).status_code, 403)
        self.assertEqual(
            self.client.patch(
                f"{self.list_url}{User.Role.ODONTOLOGO}/",
                {"permissions": ["patients.view"]},
                format="json",
            ).status_code,
            403,
        )

    def test_hu09_administrator_role_is_not_an_editable_preset(self):
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f"{self.list_url}{User.Role.ADMINISTRADOR}/",
            {"permissions": []},
            format="json",
        )

        self.assertEqual(response.status_code, 404)
