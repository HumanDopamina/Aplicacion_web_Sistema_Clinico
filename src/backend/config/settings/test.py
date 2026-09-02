import os

from .base import *  # noqa: F403
from .base import BASE_DIR


SECRET_KEY = "test-only-secret-key-not-used-outside-the-automated-suite"
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
        "NAME": BASE_DIR / "test.sqlite3",
        "TEST": {"NAME": ":memory:"},
    }
}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "dentalclinic-tests",
    }
}

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
DEFAULT_FROM_EMAIL = "no-reply@dentalclinic.local"
PRIVATE_MEDIA_STORAGE_BACKEND = "apps.patients.documents.PrivateDocumentStorage"
PRIVATE_AVATAR_STORAGE_BACKEND = "apps.users.storage.PrivateAvatarStorage"
REFRESH_COOKIE_SECURE = False
LOGIN_TRUSTED_PROXY_IPS = []
