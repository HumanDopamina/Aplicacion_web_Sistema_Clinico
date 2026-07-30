from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class LoginSerializer(TokenObtainPairSerializer):
    """Emite JWT y devuelve solo los datos públicos necesarios por la interfaz."""

    username_field = "email"
    default_error_messages = {
        "no_active_account": "Correo electrónico o contraseña incorrectos.",
    }

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password")
        user = authenticate(request=self.context.get("request"), email=email, password=password)

        if user is None or not user.is_active:
            raise serializers.ValidationError(
                {"detail": "Correo electrónico o contraseña incorrectos."},
                code="authorization",
            )

        refresh = self.get_token(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "role": user.role,
            },
        }
