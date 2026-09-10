from django.contrib import admin

from .models import Consultation, OdontogramVersion, Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "full_name",
        "identification_type",
        "identification_number",
        "phone",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "gender", "identification_type")
    search_fields = (
        "code",
        "first_name",
        "last_name",
        "identification_number",
        "email",
    )
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


@admin.register(OdontogramVersion)
class OdontogramVersionAdmin(admin.ModelAdmin):
    list_display = (
        "version_number",
        "patient",
        "consultation",
        "dentition",
        "created_by",
        "created_at",
    )
    list_filter = ("dentition", "created_at")
    search_fields = (
        "patient__code",
        "patient__first_name",
        "patient__last_name",
        "created_by__email",
        "note",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
