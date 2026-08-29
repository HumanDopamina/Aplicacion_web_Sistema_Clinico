from .development import *  # noqa: F403


SECRET_KEY = "test-only-secret-key-not-used-outside-the-automated-suite"
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "dentalclinic-tests",
    }
}

