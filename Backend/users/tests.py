from django.urls import reverse
from rest_framework.test import APITestCase

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
        self.assertNotIn("password", response.data["user"])

    def test_invalid_credentials_return_generic_error(self):
        response = self.client.post(
            self.url,
            {"email": self.user.email, "password": "incorrecta"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"][0], "Correo electrónico o contraseña incorrectos.")

    def test_profile_requires_a_valid_token(self):
        url = reverse("users:current-user")
        self.assertEqual(self.client.get(url).status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid-token")
        self.assertEqual(self.client.get(url).status_code, 401)
