from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class AppointmentEditPermissionMigrationTests(TransactionTestCase):
    migrate_from = ("users", "0005_consultation_permissions")
    migrate_to = ("users", "0006_appointment_edit_permission")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_from])
        old_apps = self.executor.loader.project_state([self.migrate_from]).apps
        preset_model = old_apps.get_model("users", "RolePermissionPreset")
        preset, _ = preset_model.objects.get_or_create(role="RECEPCIONISTA")
        preset.permissions = ["appointments.view", "appointments.create"]
        preset.save(update_fields=["permissions"])

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate([self.migrate_to])
        super().tearDown()

    def test_hu18_adds_edit_to_reception_presets_that_can_create_appointments(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_to])
        new_apps = self.executor.loader.project_state([self.migrate_to]).apps
        preset_model = new_apps.get_model("users", "RolePermissionPreset")

        permissions = preset_model.objects.get(role="RECEPCIONISTA").permissions

        self.assertEqual(
            permissions,
            ["appointments.view", "appointments.create", "appointments.edit"],
        )
