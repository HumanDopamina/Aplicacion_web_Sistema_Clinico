import os

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

from .test import *  # noqa: F403


test_database_url = os.getenv("TEST_DATABASE_URL", "").strip()
if not test_database_url:
    raise ImproperlyConfigured(
        "La variable TEST_DATABASE_URL es obligatoria para las pruebas PostgreSQL."
    )

test_database = dj_database_url.parse(
    test_database_url,
    conn_max_age=0,
    conn_health_checks=True,
)
if test_database["ENGINE"] != "django.db.backends.postgresql":
    raise ImproperlyConfigured("TEST_DATABASE_URL debe utilizar PostgreSQL.")
if test_database["NAME"].casefold() == "clinica_dental":
    raise ImproperlyConfigured(
        "TEST_DATABASE_URL no puede apuntar a clinica_dental; usa una base aislada."
    )

test_database["TEST"] = {}
DATABASES = {"default": test_database}
