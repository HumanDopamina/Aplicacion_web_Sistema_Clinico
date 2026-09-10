from rest_framework import serializers

from .models import AuditEvent


class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = (
            "id",
            "occurred_at",
            "request_id",
            "actor_id",
            "actor_role",
            "action",
            "outcome",
            "resource_type",
            "resource_id",
            "patient_id",
            "changed_fields",
            "metadata",
            "ip_address",
            "user_agent",
        )
        read_only_fields = fields
