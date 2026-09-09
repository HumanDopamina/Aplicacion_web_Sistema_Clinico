from django.conf import settings
from django.db import models
from rest_framework import serializers
from rest_framework.exceptions import APIException


class EditConflict(APIException):
    status_code = 409
    default_code = "edit_conflict"

    def __init__(self, version):
        super().__init__({
            "code": "edit_conflict",
            "detail": "Otra persona modificó este registro. Recarga y revisa los cambios antes de guardar.",
            "current_version": version,
        })


class VersionedModel(models.Model):
    version = models.PositiveIntegerField(default=1, editable=False)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        updating = not self._state.adding
        if updating:
            if kwargs.get("update_fields") is not None:
                if not kwargs["update_fields"]:
                    return
                kwargs["update_fields"] = set(kwargs["update_fields"]) | {"version"}
            self.version = models.F("version") + 1
        super().save(*args, **kwargs)
        if updating:
            self.refresh_from_db(fields=["version"])


class VersionedSerializer(serializers.ModelSerializer):
    expected_version = serializers.IntegerField(min_value=1, required=False, write_only=True)

    def validate(self, attrs):
        if self.instance and settings.REQUIRE_EDIT_VERSION and "expected_version" not in attrs:
            raise serializers.ValidationError({"expected_version": "Indica la versión que estás editando."})
        return super().validate(attrs)

    def check_version(self, locked, attrs):
        # Also detect a write between server-side validation and acquiring the lock.
        expected = attrs.pop("expected_version", self.instance.version)
        if expected != locked.version:
            raise EditConflict(locked.version)

    def create(self, validated_data):
        validated_data.pop("expected_version", None)
        return super().create(validated_data)
