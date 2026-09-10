from django.conf import settings
from django.core.cache import cache
from types import SimpleNamespace
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIClient, APITestCase

from .models import User
from .serializers import CurrentUserProfileSerializer, LoginSerializer, UserAdminUpdateSerializer


class SessionSafetyTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_user(email="admin-safety@example.test", role=User.Role.ADMINISTRADOR)
        self.user = User.objects.create_user(email="user-safety@example.test", role=User.Role.ODONTOLOGO)

    def test_archiving_revokes_tokens_permanently(self):
        token = LoginSerializer.get_token(self.user)
        for active in (False, True):
            serializer = UserAdminUpdateSerializer(self.user, data={"is_active": active}, partial=True)
            serializer.is_valid(raise_exception=True)
            self.user = serializer.save()
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = str(token)
        self.assertEqual(self.client.post("/api/auth/token/refresh/").status_code, 401)

    def test_profile_update_cannot_restore_an_account_archived_during_the_request(self):
        serializer = CurrentUserProfileSerializer(
            self.user, data={"first_name": "Cambio"}, partial=True,
            context={"request": SimpleNamespace(user=self.user)},
        )
        serializer.is_valid(raise_exception=True)
        User.objects.filter(pk=self.user.pk).update(is_active=False, token_version=1)
        with self.assertRaises(AuthenticationFailed):
            serializer.save()
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_last_active_administrator_cannot_be_demoted(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f"/api/auth/users/{self.admin.pk}/", {"role": User.Role.ODONTOLOGO})
        self.assertEqual(response.status_code, 400)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.role, User.Role.ADMINISTRADOR)

    def test_logout_accepts_refresh_without_access_and_is_idempotent(self):
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = str(LoginSerializer.get_token(self.user))
        for _ in range(2):
            self.assertEqual(self.client.post("/api/auth/logout/").status_code, 204)
        self.user.refresh_from_db()
        self.assertEqual(self.user.token_version, 1)

    def test_logout_keeps_csrf_protection(self):
        client = APIClient(enforce_csrf_checks=True)
        client.cookies[settings.REFRESH_COOKIE_NAME] = str(LoginSerializer.get_token(self.user))
        self.assertEqual(client.post("/api/auth/logout/").status_code, 403)

    def test_malformed_login_payloads_return_400(self):
        for data in ({"email": 42, "password": "x"}, ["bad"], {"email": {"bad": True}}):
            with self.subTest(data=data):
                self.assertEqual(self.client.post("/api/auth/login/", data, format="json").status_code, 400)

    def test_api_responses_cannot_be_cached(self):
        response = self.client.get("/api/auth/me/")
        self.assertIn("no-store", response.get("Cache-Control", ""))

    def test_invalid_appointment_and_audit_filters_return_400(self):
        self.client.force_authenticate(self.admin)
        for url in ("/api/appointments/?date=2026-02-31", "/api/appointments/?dentist=bad", "/api/audit/events/?actor_id=bad"):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 400)
