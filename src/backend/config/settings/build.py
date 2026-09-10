from .base import *  # noqa: F403


SECRET_KEY = "static-build-only-not-a-runtime-secret"
DEBUG = False
ALLOWED_HOSTS = []
ENABLE_DJANGO_ADMIN = False
PRIVATE_MEDIA_STORAGE_BACKEND = "apps.patients.documents.PrivateDocumentStorage"
PRIVATE_AVATAR_STORAGE_BACKEND = "apps.users.storage.PrivateAvatarStorage"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
