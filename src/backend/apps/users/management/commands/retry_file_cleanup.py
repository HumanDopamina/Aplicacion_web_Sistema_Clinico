from django.core.management.base import BaseCommand
from apps.users.file_cleanup import process_file_deletion
from apps.users.models import PendingFileDeletion


class Command(BaseCommand):
    help = "Retry up to 100 pending avatar/logo deletions; never purge clinical documents."

    def handle(self, *args, **options):
        for job_id in list(PendingFileDeletion.objects.order_by("created_at").values_list("pk", flat=True)[:100]):
            process_file_deletion(job_id)
        self.stdout.write(f"Pendientes: {PendingFileDeletion.objects.count()}")
