from django.contrib import admin

from .models import Appointment


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
