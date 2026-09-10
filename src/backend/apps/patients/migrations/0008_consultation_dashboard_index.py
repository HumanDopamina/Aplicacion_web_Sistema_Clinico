from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0007_patientdocument"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="consultation",
            index=models.Index(
                fields=["status", "patient", "-date", "-time"],
                name="consult_st_pat_dt_tm_idx",
            ),
        ),
    ]
