import apps.patients.documents
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0006_odontogramversion"),
        ("users", "0007_document_permissions"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PatientDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("category", models.CharField(max_length=80)),
                ("document_date", models.DateField()),
                ("notes", models.TextField(blank=True)),
                ("original_name", models.CharField(max_length=255)),
                ("mime_type", models.CharField(max_length=64)),
                ("size_bytes", models.PositiveBigIntegerField()),
                (
                    "file",
                    models.FileField(
                        max_length=255,
                        storage=apps.patients.documents.PrivateDocumentStorage(),
                        upload_to=apps.patients.documents.patient_document_path,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="documents",
                        to="patients.patient",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="uploaded_patient_documents",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ("-document_date", "-created_at"),
                "indexes": [
                    models.Index(fields=["patient", "-document_date"], name="patient_doc_patient_date_idx"),
                    models.Index(fields=["category"], name="patient_doc_category_idx"),
                ],
            },
        ),
    ]
