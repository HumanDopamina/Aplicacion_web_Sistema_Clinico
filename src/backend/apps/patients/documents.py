import os
import re
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible
from django.utils.module_loading import import_string
from rest_framework import serializers

from apps.common.file_validation import validate_image_content
from apps.common.pdf_validation import validate_pdf_content
from apps.common.features import require_uploads_enabled


ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}
EXTENSION_MIME_TYPES = {
    ".pdf": {"application/pdf"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".png": {"image/png"},
    ".webp": {"image/webp"},
}
MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_BATCH_FILES = 10
MAX_BATCH_SIZE = 50 * 1024 * 1024
IMAGE_FORMATS = {
    "image/jpeg": {"JPEG"},
    "image/png": {"PNG"},
    "image/webp": {"WEBP"},
}
CLINICAL_PHOTO_CATEGORY = "Fotografía clínica"


@deconstructible
class PrivateDocumentStorage(FileSystemStorage):
    @property
    def base_location(self):
        return settings.PRIVATE_MEDIA_ROOT

    @property
    def location(self):
        return os.path.abspath(self.base_location)


private_document_storage = import_string(settings.PRIVATE_MEDIA_STORAGE_BACKEND)()


def patient_document_path(instance, filename):
    extension = Path(filename).suffix.lower()
    return f"patients/{instance.patient_id}/documents/{uuid4().hex}{extension}"


def normalize_category(value):
    return re.sub(r"\s+", " ", value).strip()


def is_clinical_photo_category(value):
    return normalize_category(value).casefold() == CLINICAL_PHOTO_CATEGORY.casefold()


def safe_original_name(value):
    return Path(value).name[:255]


def validate_document_file(uploaded_file):
    require_uploads_enabled()
    extension = Path(uploaded_file.name).suffix.lower()
    content_type = getattr(uploaded_file, "content_type", "").lower()
    if (
        extension not in ALLOWED_EXTENSIONS
        or content_type not in ALLOWED_MIME_TYPES
        or content_type not in EXTENSION_MIME_TYPES.get(extension, set())
    ):
        raise serializers.ValidationError(
            "Solo se permiten archivos PDF, JPG, PNG o WebP.",
        )
    if uploaded_file.size > MAX_FILE_SIZE:
        raise serializers.ValidationError("Cada archivo puede pesar como máximo 10 MB.")

    uploaded_file.seek(0)
    try:
        if content_type == "application/pdf":
            validate_pdf_content(uploaded_file)
        else:
            uploaded_file = validate_image_content(
                uploaded_file,
                IMAGE_FORMATS[content_type],
                "El contenido de la imagen no es válido.",
            )
            if uploaded_file.size > MAX_FILE_SIZE:
                raise serializers.ValidationError("La imagen procesada supera 10 MB.")
    except serializers.ValidationError:
        raise
    finally:
        uploaded_file.seek(0)
    return uploaded_file
