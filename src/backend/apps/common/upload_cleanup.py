import logging

logger = logging.getLogger(__name__)


def save_tracked_upload(field_file, uploaded_file, request):
    field_file.save(uploaded_file.name, uploaded_file, save=False)
    raw = getattr(request, "_request", request)
    if not hasattr(raw, "created_uploads"):
        raw.created_uploads = []
    raw.created_uploads.append((field_file.storage, field_file.name))


def cleanup_created_uploads(request):
    raw = getattr(request, "_request", request)
    for storage, name in getattr(raw, "created_uploads", []):
        try:
            storage.delete(name)
        except Exception:
            logger.error("upload.rollback_cleanup_failed")
    raw.created_uploads = []
