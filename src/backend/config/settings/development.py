import os

from .base import *  # noqa: F403
from .base import BASE_DIR


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-development-only-not-for-production")
DEBUG = True
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "testserver"]
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.getenv("DJANGO_DB_PATH", BASE_DIR / "db.sqlite3"),
    }
}
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "dentalclinic-development",
    }
}

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@dentalclinic.local")
PRIVATE_MEDIA_STORAGE_BACKEND = "apps.patients.documents.PrivateDocumentStorage"
PRIVATE_AVATAR_STORAGE_BACKEND = "apps.users.storage.PrivateAvatarStorage"
REFRESH_COOKIE_SECURE = False
LOGIN_TRUSTED_PROXY_IPS = []
