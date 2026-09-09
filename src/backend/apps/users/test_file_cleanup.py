from tempfile import TemporaryDirectory
from unittest.mock import patch
from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from django.db import transaction

from .models import User


class AvatarCleanupTests(TestCase):
    def test_cleanup_survives_storage_failure_and_retries(self):
        from .file_cleanup import process_file_deletion, schedule_file_deletion
        from .models import PendingFileDeletion
        with TemporaryDirectory() as directory, override_settings(PRIVATE_MEDIA_ROOT=directory):
            storage = User._meta.get_field("avatar").storage
            name = storage.save("users/test/avatars/obsolete.png", ContentFile(b"old"))
            with patch.object(storage, "delete", side_effect=OSError("Storage unavailable")):
                with self.captureOnCommitCallbacks(execute=True):
                    job = schedule_file_deletion("avatar", name)
            self.assertTrue(PendingFileDeletion.objects.filter(pk=job.pk).exists())
            self.assertTrue(storage.exists(name))
            process_file_deletion(job.pk)
            self.assertFalse(storage.exists(name))
            self.assertFalse(PendingFileDeletion.objects.filter(pk=job.pk).exists())

    def test_rollback_never_deletes_the_previous_avatar(self):
        from .file_cleanup import schedule_file_deletion
        with patch("apps.users.file_cleanup.process_file_deletion") as process:
            with self.captureOnCommitCallbacks(execute=True):
                try:
                    with transaction.atomic():
                        schedule_file_deletion("avatar", "users/test/avatars/old.png")
                        raise RuntimeError("Audit write failed")
                except RuntimeError:
                    pass
            process.assert_not_called()
