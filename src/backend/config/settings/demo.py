"""Disposable Vercel/Render demo. Never use this profile for real patient data."""
import os
from urllib.parse import urlparse

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from .base import *  # noqa: F403


def required(name):
    value = os.getenv(name, "").strip()
    if not value:
        raise ImproperlyConfigured(f"{name} es obligatoria en la demo.")
    return value


SECRET_KEY = required("DJANGO_SECRET_KEY")
if len(SECRET_KEY) < 50:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY debe tener al menos 50 caracteres aleatorios.")
DEBUG = False
DEMO_MODE = True
UPLOADS_ENABLED = False
PASSWORD_RESET_ENABLED = False
REQUIRE_EDIT_VERSION = True
ENABLE_DJANGO_ADMIN = False
ALLOWED_HOSTS = [host.strip() for host in required("ALLOWED_HOSTS").split(",")]
if any(not host or "*" in host or host.startswith(".") or "/" in host for host in ALLOWED_HOSTS):
    raise ImproperlyConfigured("ALLOWED_HOSTS requiere hosts exactos sin comodines.")
FRONTEND_URL = required("FRONTEND_URL").rstrip("/")
origin = urlparse(FRONTEND_URL)
if origin.scheme != "https" or not origin.hostname or origin.path or origin.query or origin.fragment or origin.username:
    raise ImproperlyConfigured("FRONTEND_URL debe ser un origen HTTPS exacto.")
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]
CORS_ALLOWED_ORIGINS = []
CORS_ALLOW_CREDENTIALS = True
database = dj_database_url.parse(required("DATABASE_URL"), conn_max_age=60, conn_health_checks=True)
if database["ENGINE"] != "django.db.backends.postgresql" or "demo" not in database["NAME"].lower():
    raise ImproperlyConfigured("La demo requiere una base PostgreSQL separada cuyo nombre contenga demo.")
DATABASES = {"default": database}
redis_url = required("REDIS_URL")
if urlparse(redis_url).scheme not in ("redis", "rediss"):
    raise ImproperlyConfigured("REDIS_URL debe utilizar Redis.")
CACHES = {"default": {
    "BACKEND": "django_redis.cache.RedisCache", "LOCATION": redis_url,
    "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"}, "TIMEOUT": 900,
}}
LOGIN_TRUSTED_PROXY_IPS = []
EMAIL_BACKEND = "django.core.mail.backends.dummy.EmailBackend"
DEFAULT_FROM_EMAIL = "demo@example.test"
PRIVATE_MEDIA_STORAGE_BACKEND = "config.demo_storage.DemoDocumentStorage"
PRIVATE_AVATAR_STORAGE_BACKEND = "config.demo_storage.DemoDocumentStorage"
STORAGES = {
    "default": {"BACKEND": "config.demo_storage.DemoDocumentStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"
REFRESH_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
