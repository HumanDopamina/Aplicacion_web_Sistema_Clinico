from django.conf import settings
from storages.backends.s3 import S3Storage


class PublicMediaStorage(S3Storage):
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    location = settings.AWS_PUBLIC_MEDIA_PREFIX
    default_acl = None
    file_overwrite = False
    querystring_auth = True


class PrivateMediaStorage(S3Storage):
    bucket_name = settings.AWS_PRIVATE_STORAGE_BUCKET_NAME
    location = settings.AWS_PRIVATE_MEDIA_PREFIX
    default_acl = None
    file_overwrite = False
    querystring_auth = True
    querystring_expire = 60
