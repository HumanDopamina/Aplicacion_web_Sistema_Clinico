import apps.users.storage
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("users", "0008_appointment_view_all_permission")]

    operations = [
        migrations.AddField(
            model_name="user",
            name="phone",
            field=models.CharField(blank=True, max_length=30, verbose_name="teléfono"),
        ),
        migrations.AddField(
            model_name="user",
            name="avatar",
            field=models.ImageField(
                blank=True,
                storage=apps.users.storage.PrivateAvatarStorage(),
                upload_to=apps.users.storage.user_avatar_path,
            ),
        ),
    ]
