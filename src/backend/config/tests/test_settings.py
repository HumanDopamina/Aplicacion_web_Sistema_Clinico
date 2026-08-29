import os
import subprocess
import sys
from pathlib import Path

from django.test import SimpleTestCase


BACKEND_ROOT = Path(__file__).resolve().parents[2]


class ProductionSettingsTests(SimpleTestCase):
    def run_django(self, *args, extra_env=None):
        env = {
            **os.environ,
            "DJANGO_SETTINGS_MODULE": "config.settings.production",
            **(extra_env or {}),
        }
        return subprocess.run(
            [sys.executable, "manage.py", *args],
            cwd=BACKEND_ROOT,
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )

    def production_environment(self):
        return {
            "DJANGO_SECRET_KEY": "qa-only-secret-key-with-more-than-fifty-characters-1234567890",
            "DATABASE_URL": "postgresql://clinic:password@db.example.test:5432/clinic?sslmode=require",
            "REDIS_URL": "redis://cache.example.test:6379/0",
            "ALLOWED_HOSTS": "clinic.example.test",
            "CSRF_TRUSTED_ORIGINS": "https://clinic.example.test",
            "FRONTEND_URL": "https://clinic.example.test",
            "EMAIL_HOST": "smtp.example.test",
            "EMAIL_PORT": "587",
            "EMAIL_HOST_USER": "mailer@example.test",
            "EMAIL_HOST_PASSWORD": "qa-mail-password",
            "DEFAULT_FROM_EMAIL": "no-reply@example.test",
            "AWS_STORAGE_BUCKET_NAME": "clinic-public-test",
            "AWS_PRIVATE_STORAGE_BUCKET_NAME": "clinic-private-test",
            "AWS_PUBLIC_MEDIA_PREFIX": "public",
            "AWS_PRIVATE_MEDIA_PREFIX": "private",
            "AWS_S3_REGION_NAME": "us-east-1",
            "LOGIN_TRUSTED_PROXY_IPS": "10.0.0.10",
        }

    def test_production_settings_fail_fast_when_required_values_are_missing(self):
        env = {key: "" for key in self.production_environment()}

        result = self.run_django("check", extra_env=env)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DJANGO_SECRET_KEY", result.stderr)

    def test_production_settings_pass_deploy_check_with_safe_values(self):
        result = self.run_django(
            "check",
            "--deploy",
            extra_env=self.production_environment(),
        )

        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("System check identified no issues", result.stdout)
