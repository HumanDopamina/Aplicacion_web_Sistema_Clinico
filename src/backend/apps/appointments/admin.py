from django.contrib import admin

from .models import Appointment, AppointmentRescheduleEvent


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("date", "start_time", "patient", "dentist", "status")
    list_filter = ("status", "date", "dentist")
    search_fields = (
        "patient__code",
        "patient__first_name",
        "patient__last_name",
        "dentist__email",
        "reason",
    )
    readonly_fields = ("created_by", "created_at", "updated_at")


@admin.register(AppointmentRescheduleEvent)
class AppointmentRescheduleEventAdmin(admin.ModelAdmin):
    list_display = (
        "appointment",
        "previous_date",
        "previous_start_time",
        "new_date",
        "new_start_time",
        "changed_by",
        "created_at",
    )
    readonly_fields = (
        "appointment",
        "previous_date",
        "previous_start_time",
        "previous_duration_minutes",
        "new_date",
        "new_start_time",
        "new_duration_minutes",
        "reason",
        "changed_by",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
