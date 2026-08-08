from django.contrib import admin

from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("code", "full_name", "national_id", "phone", "is_active", "created_at")
    list_filter = ("is_active", "gender")
    search_fields = ("code", "first_name", "last_name", "national_id", "email")
    readonly_fields = ("code", "registered_by", "created_at", "updated_at")
