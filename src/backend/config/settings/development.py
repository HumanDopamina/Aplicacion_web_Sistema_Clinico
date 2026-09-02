import os

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-development-only-not-for-production")
DEBUG = True
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "testserver"]
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

database_url = os.getenv("DATABASE_URL", "").strip()
if not database_url:
    raise ImproperlyConfigured(
        "La variable DATABASE_URL es obligatoria en desarrollo y debe apuntar a PostgreSQL."
    )

database = dj_database_url.parse(
    database_url,
    conn_max_age=0,
    conn_health_checks=True,
)
if database["ENGINE"] != "django.db.backends.postgresql":
    raise ImproperlyConfigured(
        "DATABASE_URL debe utilizar PostgreSQL en el entorno de desarrollo."
    )

DATABASES = {"default": database}
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

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "human": {
            "format": "{levelname} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "human",
        },
    },
    "loggers": {
        "dentalclinic.request": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
