from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from PIL import Image
from pypdf import PdfWriter
from rest_framework.exceptions import ValidationError

from apps.patients.documents import validate_document_file


class FileSafetyTests(SimpleTestCase):
    def test_header_and_eof_are_not_enough_to_accept_a_pdf(self):
        file = SimpleUploadedFile("fake.pdf", b"%PDF-1.4\ninvalid\n%%EOF", "application/pdf")
        with self.assertRaises(ValidationError):
            validate_document_file(file)

    def test_encrypted_active_and_attached_pdf_are_rejected(self):
        for kind in ("encrypted", "javascript", "attachment"):
            with self.subTest(kind=kind):
                writer = PdfWriter()
                writer.add_blank_page(width=100, height=100)
                if kind == "encrypted":
                    writer.encrypt("secret")
                elif kind == "javascript":
                    writer.add_js("app.alert('demo');")
                else:
                    writer.add_attachment("sample.txt", b"embedded")
                buffer = BytesIO()
                writer.write(buffer)
                with self.assertRaises(ValidationError):
                    validate_document_file(SimpleUploadedFile("sample.pdf", buffer.getvalue(), "application/pdf"))

    def test_image_is_reencoded_without_trailing_payload(self):
        buffer = BytesIO()
        Image.new("RGB", (4, 4), "white").save(buffer, "PNG")
        file = SimpleUploadedFile("photo.png", buffer.getvalue() + b"UNWANTED_TRAILER", "image/png")
        clean = validate_document_file(file)
        self.assertNotIn(b"UNWANTED_TRAILER", clean.read())
