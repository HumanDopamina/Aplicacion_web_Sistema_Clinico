from rest_framework import serializers


def validated_parameter(params, name, field):
    value = params.get(name)
    if value in (None, ""):
        return None
    try:
        return field.run_validation(value)
    except serializers.ValidationError as error:
        raise serializers.ValidationError({name: error.detail}) from error
