import os
import re
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible
from PIL import Image, UnidentifiedImageError
from rest_framework import serializers


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


@deconstructible
class PrivateDocumentStorage(FileSystemStorage):
    @property
    def base_location(self):
        return settings.PRIVATE_MEDIA_ROOT

    @property
    def location(self):
        return os.path.abspath(self.base_location)


private_document_storage = PrivateDocumentStorage()


def patient_document_path(instance, filename):
    extension = Path(filename).suffix.lower()
    return f"patients/{instance.patient_id}/documents/{uuid4().hex}{extension}"


def normalize_category(value):
    return re.sub(r"\s+", " ", value).strip()


def safe_original_name(value):
    return Path(value).name[:255]


def validate_document_file(uploaded_file):
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
            head = uploaded_file.read(5)
            uploaded_file.seek(max(0, uploaded_file.size - 1024))
            tail = uploaded_file.read()
            if head != b"%PDF-" or b"%%EOF" not in tail:
                raise serializers.ValidationError("El contenido del archivo PDF no es válido.")
        else:
            with Image.open(uploaded_file) as image:
                if image.format not in IMAGE_FORMATS[content_type]:
                    raise serializers.ValidationError("El formato real de la imagen no coincide.")
                image.verify()
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise serializers.ValidationError("El contenido de la imagen no es válido.") from error
    finally:
        uploaded_file.seek(0)
    return uploaded_file
