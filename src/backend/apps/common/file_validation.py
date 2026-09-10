import warnings
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile

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
            uploaded_file.seek(0)
            with Image.open(uploaded_file) as image:
                image_format = image.format
                clean = image.convert("RGBA" if "A" in image.getbands() and image_format != "JPEG" else "RGB")
                # Never copy EXIF, comments, profiles or trailing bytes.
                clean.info.clear()
                output = BytesIO()
                clean.save(output, format=image_format)
                result = SimpleUploadedFile(
                    uploaded_file.name, output.getvalue(),
                    content_type=getattr(uploaded_file, "content_type", None),
                )
    except serializers.ValidationError:
        raise
    except IMAGE_VALIDATION_ERRORS as error:
        raise serializers.ValidationError(invalid_message) from error
    finally:
        uploaded_file.seek(0)
    return result
