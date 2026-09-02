from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class DentistProfessionalProfileMigrationTests(TransactionTestCase):
    migrate_from = ("users", "0009_user_profile_fields")
    migrate_to = ("users", "0010_user_professional_profile")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_from])
        old_apps = self.executor.loader.project_state([self.migrate_from]).apps
        user_model = old_apps.get_model("users", "User")
        self.user_id = user_model.objects.create(
            email="existing-professional@example.test",
            password="!",
            role="ODONTOLOGO",
            first_name="Elena",
            last_name="Rivera",
        ).pk

    def tearDown(self):
        MigrationExecutor(connection).migrate([self.migrate_to])
        super().tearDown()

    def test_hu61_expansion_preserves_existing_user_and_adds_blank_optional_fields(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_to])
        new_apps = self.executor.loader.project_state([self.migrate_to]).apps
        user_model = new_apps.get_model("users", "User")

        migrated = user_model.objects.get(pk=self.user_id)

        self.assertEqual(migrated.email, "existing-professional@example.test")
        self.assertEqual(migrated.role, "ODONTOLOGO")
        self.assertEqual(migrated.first_name, "Elena")
        self.assertEqual(migrated.last_name, "Rivera")
        self.assertEqual(migrated.specialty, "")
        self.assertEqual(migrated.professional_registration_number, "")
