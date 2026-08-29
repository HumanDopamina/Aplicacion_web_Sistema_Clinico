import warnings

from PIL import Image, UnidentifiedImageError
from rest_framework import serializers


IMAGE_VALIDATION_ERRORS = (
    UnidentifiedImageError,
    OSError,
    ValueError,
    SyntaxError,
    Image.DecompressionBombError,
    Image.DecompressionBombWarning,
)
MAX_IMAGE_PIXELS = 40_000_000


def validate_image_content(uploaded_file, allowed_formats, invalid_message):
    uploaded_file.seek(0)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(uploaded_file) as image:
                if image.format not in allowed_formats:
                    raise serializers.ValidationError(
                        "El formato real de la imagen no coincide.",
                    )
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise serializers.ValidationError(invalid_message)
                image.verify()
    except serializers.ValidationError:
        raise
    except IMAGE_VALIDATION_ERRORS as error:
        raise serializers.ValidationError(invalid_message) from error
    finally:
        uploaded_file.seek(0)
    return uploaded_file
