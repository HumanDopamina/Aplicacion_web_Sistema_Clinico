from django.contrib import admin

from .models import Consultation, Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("code", "full_name", "national_id", "phone", "is_active", "created_at")
    list_filter = ("is_active", "gender")
    search_fields = ("code", "first_name", "last_name", "national_id", "email")
    readonly_fields = ("code", "registered_by", "created_at", "updated_at")


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ("date", "patient", "consultation_type", "professional", "status")
    list_filter = ("consultation_type", "status", "date")
    search_fields = (
        "patient__code",
        "patient__first_name",
        "patient__last_name",
        "professional__email",
        "summary",
    )
    readonly_fields = ("created_at", "updated_at")
