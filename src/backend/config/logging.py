import json
import logging
import traceback
from datetime import datetime, timezone
from pathlib import Path


class JsonLogFormatter(logging.Formatter):
    SAFE_FIELDS = ("request_id", "method", "path", "status", "duration_ms")

    def format(self, record):
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for field in self.SAFE_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info:
            exception_type, _, exception_traceback = record.exc_info
            payload["exception"] = {
                "type": exception_type.__name__,
                "stack": [
                    {
                        "file": Path(frame.filename).name,
                        "line": frame.lineno,
                        "function": frame.name,
                    }
                    for frame in traceback.extract_tb(exception_traceback)
                ],
            }
        return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
