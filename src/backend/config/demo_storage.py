from pathlib import Path
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible


@deconstructible
class DemoDocumentStorage(FileSystemStorage):
    """Only packaged synthetic files can be opened; uploads/deletions are forbidden."""
    def __init__(self):
        super().__init__(location=Path(__file__).resolve().parent.parent / "demo_samples")

    def _save(self, name, content):
        raise PermissionError("El almacenamiento demo es de solo lectura.")

    def delete(self, name):
        raise PermissionError("Las muestras demo son inmutables.")

    def url(self, name):
        raise PermissionError("Usa el endpoint autenticado de documentos.")
