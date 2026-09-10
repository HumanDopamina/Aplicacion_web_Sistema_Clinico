import os
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible
from django.utils.module_loading import import_string


@deconstructible
class PrivateAvatarStorage(FileSystemStorage):
    @property
    def base_location(self):
        return settings.PRIVATE_MEDIA_ROOT

    @property
    def location(self):
        return os.path.abspath(self.base_location)


private_avatar_storage = import_string(settings.PRIVATE_AVATAR_STORAGE_BACKEND)()


def user_avatar_path(instance, filename):
    extension = Path(filename).suffix.lower()
    return f"users/{instance.pk}/avatars/{uuid4().hex}{extension}"
