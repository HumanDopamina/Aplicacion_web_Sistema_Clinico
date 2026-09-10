from django.core.signals import request_finished
from django.db import close_old_connections, connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class MigrationTestCase(TransactionTestCase):
    """Restore the complete migration graph before Django flushes the test DB."""

    def _post_teardown(self):
        try:
            executor = MigrationExecutor(connection)
            executor.migrate(executor.loader.graph.leaf_nodes())
        finally:
            super()._post_teardown()


def close_test_response(response):
    """Close a streaming response without closing a TestCase transaction."""

    disconnected = request_finished.disconnect(close_old_connections)
    try:
        response.close()
    finally:
        if disconnected:
            request_finished.connect(close_old_connections)
