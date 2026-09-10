from django.conf import settings
from rest_framework.exceptions import PermissionDenied


def require_uploads_enabled():
    if not settings.UPLOADS_ENABLED:
        raise PermissionDenied("La demo utiliza documentos de muestra. Las cargas están deshabilitadas.")
