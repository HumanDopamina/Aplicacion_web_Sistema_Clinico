import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("appointments", "0001_initial"),
        ("clinics", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="appointment",
            name="service",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="appointments",
                to="clinics.clinicservice",
            ),
        ),
        migrations.AlterField(
            model_name="appointment",
            name="duration_minutes",
            field=models.PositiveSmallIntegerField(
                validators=[
                    django.core.validators.MinValueValidator(15),
                    django.core.validators.MaxValueValidator(240),
                ],
            ),
        ),
    ]
