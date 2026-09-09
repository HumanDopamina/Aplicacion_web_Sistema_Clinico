from django.db import transaction
from .models import PendingFileDeletion, User


def schedule_file_deletion(storage_kind, name):
    if not name:
        return None
    job = PendingFileDeletion.objects.create(storage_kind=storage_kind, name=name)
    transaction.on_commit(lambda: process_file_deletion(job.pk), robust=True)
    return job


@transaction.atomic
def process_file_deletion(job_id):
    job = PendingFileDeletion.objects.select_for_update().filter(pk=job_id).first()
    if job is None:
        return
    if job.storage_kind == "avatar":
        model, field = User, "avatar"
    elif job.storage_kind == "logo":
        from apps.clinics.models import ClinicProfile
        model, field = ClinicProfile, "logo"
    else:
        return
    if model.objects.filter(**{field: job.name}).exists():
        return  # Never delete a file that is still referenced.
    try:
        model._meta.get_field(field).storage.delete(job.name)
    except Exception:
        # Persist retries without storing backend errors, paths or credentials in logs.
        job.attempts += 1
        job.save(update_fields=["attempts"])
    else:
        job.delete()
