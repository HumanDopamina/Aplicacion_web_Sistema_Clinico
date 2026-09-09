from pypdf import PdfReader
from pypdf.errors import PyPdfError
from pypdf.generic import ArrayObject, DictionaryObject, IndirectObject
from rest_framework import serializers


FORBIDDEN_KEYS = {
    "/JS", "/JavaScript", "/AA", "/OpenAction", "/A", "/AcroForm", "/XFA",
    "/EmbeddedFiles", "/EF", "/RichMediaContent", "/RichMediaSettings",
}
FORBIDDEN_TYPES = {"/Launch", "/JavaScript", "/RichMedia", "/Movie", "/Sound", "/FileAttachment"}


def validate_pdf_content(uploaded_file):
    """Structural validation with bounded object traversal; not a malware scanner."""
    message = "Usa un PDF válido, sin contraseña, archivos incrustados ni contenido interactivo."
    try:
        reader = PdfReader(uploaded_file, strict=True)
        if reader.is_encrypted:
            raise serializers.ValidationError(message)
        pending = [(reader.root_object, 0)]
        visited = set()
        nodes = 0
        while pending:
            obj, depth = pending.pop()
            nodes += 1
            if nodes > 20000 or depth > 64:
                raise serializers.ValidationError("El PDF supera el límite de complejidad admitido.")
            if isinstance(obj, IndirectObject):
                key = (obj.idnum, obj.generation)
                if key in visited:
                    continue
                visited.add(key)
                obj = obj.get_object()
            if isinstance(obj, DictionaryObject):
                if FORBIDDEN_KEYS.intersection(obj) or any(
                    obj.get(key) in FORBIDDEN_TYPES for key in ("/S", "/Subtype")
                ):
                    raise serializers.ValidationError(message)
                pending.extend((value, depth + 1) for value in obj.values())
            elif isinstance(obj, ArrayObject):
                pending.extend((value, depth + 1) for value in obj)
        if not 1 <= len(reader.pages) <= 500:
            raise serializers.ValidationError("El PDF debe contener entre 1 y 500 páginas.")
    except serializers.ValidationError:
        raise
    except (PyPdfError, ValueError, TypeError, KeyError, OSError, RecursionError) as error:
        raise serializers.ValidationError(message) from error
    finally:
        uploaded_file.seek(0)
    return uploaded_file
