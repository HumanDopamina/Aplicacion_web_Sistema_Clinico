from django.contrib.postgres.fields import DateTimeRangeField


class PostgresDateTimeRangeField(DateTimeRangeField):
    """Keep PostgreSQL range SQL out of the fast SQLite test suite."""

    def get_placeholder(self, value, compiler, connection):
        if connection.vendor != "postgresql":
            return "%s"
        return super().get_placeholder(value, compiler, connection)
