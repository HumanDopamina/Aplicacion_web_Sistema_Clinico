from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0009_user_profile_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="professional_registration_number",
            field=models.CharField(
                blank=True,
                max_length=100,
                verbose_name="número de registro profesional",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="specialty",
            field=models.CharField(
                blank=True,
                max_length=200,
                verbose_name="especialidad",
            ),
        ),
    ]
