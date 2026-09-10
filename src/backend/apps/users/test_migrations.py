from django.db import connection
from django.db.migrations.executor import MigrationExecutor

from apps.common.test_utils import MigrationTestCase


class AppointmentEditPermissionMigrationTests(MigrationTestCase):
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


class AppointmentViewAllPermissionMigrationTests(MigrationTestCase):
    migrate_from = ("users", "0007_document_permissions")
    migrate_to = ("users", "0008_appointment_view_all_permission")

    def setUp(self):
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_from])
        old_apps = self.executor.loader.project_state([self.migrate_from]).apps
        preset_model = old_apps.get_model("users", "RolePermissionPreset")
        preset_model.objects.update_or_create(
            role="RECEPCIONISTA",
            defaults={"permissions": ["appointments.view", "appointments.create"]},
        )
        preset_model.objects.update_or_create(
            role="ODONTOLOGO",
            defaults={"permissions": ["appointments.view"]},
        )

    def test_adds_view_all_to_reception_only(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate([self.migrate_to])
        new_apps = self.executor.loader.project_state([self.migrate_to]).apps
        preset_model = new_apps.get_model("users", "RolePermissionPreset")

        reception = preset_model.objects.get(role="RECEPCIONISTA").permissions
        dentist = preset_model.objects.get(role="ODONTOLOGO").permissions

        self.assertEqual(
            reception,
            ["appointments.view", "appointments.create", "appointments.view_all"],
        )
        self.assertEqual(dentist, ["appointments.view"])
