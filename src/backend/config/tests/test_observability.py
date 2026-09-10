import importlib
import json
import logging
from unittest.mock import patch

from django.db import OperationalError
from django.http import JsonResponse
from django.test import TestCase, override_settings
from django.urls import path


def exploding_view(request):
    raise RuntimeError("diagnosis=private-clinical-value password=private-password")


def patient_route_view(request, patient_id):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("test/error/", exploding_view),
    path("test/patients/<int:patient_id>/", patient_route_view),
]


def json_formatter():
    try:
        module = importlib.import_module("config.logging")
        formatter_class = module.JsonLogFormatter
    except (AttributeError, ModuleNotFoundError):
        formatter_class = logging.Formatter
    return formatter_class()


class HealthEndpointTests(TestCase):
    def test_live_reports_process_health_without_querying_the_database(self):
        with self.assertNumQueries(0):
            response = self.client.get("/health/live/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_ready_reports_database_availability_with_a_constant_response(self):
        with self.assertNumQueries(1):
            response = self.client.get("/health/ready/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_ready_hides_database_details_when_the_database_is_unavailable(self):
        self.client.raise_request_exception = False
        with patch(
            "config.health.connection.cursor",
            side_effect=OperationalError("postgresql://private-user:private-password@db/private"),
        ):
            response = self.client.get("/health/ready/")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"status": "unavailable"})
        self.assertNotContains(response, "private", status_code=503)


class RequestLoggingTests(TestCase):
    def test_request_log_and_response_share_safe_correlation_fields(self):
        with self.assertLogs("dentalclinic.request", level="INFO") as captured:
            response = self.client.get(
                "/health/live/",
                HTTP_X_REQUEST_ID="deployment-check-123",
            )

        self.assertEqual(response["X-Request-ID"], "deployment-check-123")
        record = captured.records[-1]
        self.assertEqual(record.request_id, "deployment-check-123")
        self.assertEqual(record.method, "GET")
        self.assertEqual(record.path, "/health/live/")
        self.assertEqual(record.status, 200)
        self.assertGreaterEqual(record.duration_ms, 0)

    def test_invalid_incoming_request_id_is_replaced(self):
        with self.assertLogs("dentalclinic.request", level="INFO") as captured:
            response = self.client.get(
                "/health/live/",
                HTTP_X_REQUEST_ID="unsafe request id with spaces",
            )

        self.assertNotEqual(response["X-Request-ID"], "unsafe request id with spaces")
        self.assertEqual(captured.records[-1].request_id, response["X-Request-ID"])

    def test_json_log_contains_only_processable_request_fields(self):
        record = logging.LogRecord(
            "dentalclinic.request",
            logging.INFO,
            __file__,
            1,
            "request.completed",
            (),
            None,
        )
        record.request_id = "safe-request-123"
        record.method = "POST"
        record.path = "/api/patients/"
        record.status = 201
        record.duration_ms = 12.345
        record.request_body = {"diagnosis": "private-clinical-value"}
        record.authorization = "Bearer private-token"
        record.cookies = "session=private-cookie"

        try:
            payload = json.loads(json_formatter().format(record))
        except json.JSONDecodeError as error:
            self.fail(f"The production log is not valid JSON: {error}")

        self.assertEqual(payload["level"], "INFO")
        self.assertEqual(payload["logger"], "dentalclinic.request")
        self.assertEqual(payload["request_id"], "safe-request-123")
        self.assertEqual(payload["method"], "POST")
        self.assertEqual(payload["path"], "/api/patients/")
        self.assertEqual(payload["status"], 201)
        self.assertEqual(payload["duration_ms"], 12.345)
        self.assertNotIn("private-clinical-value", json.dumps(payload))
        self.assertNotIn("private-token", json.dumps(payload))
        self.assertNotIn("private-cookie", json.dumps(payload))

    @override_settings(ROOT_URLCONF=__name__)
    def test_request_log_uses_the_route_template_instead_of_resource_identifiers(self):
        with self.assertLogs("dentalclinic.request", level="INFO") as captured:
            response = self.client.get("/test/patients/987654/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            captured.records[-1].path,
            "/test/patients/<int:patient_id>/",
        )
        self.assertNotIn("987654", captured.records[-1].path)

    @override_settings(DEBUG=False, ROOT_URLCONF=__name__)
    def test_unhandled_error_is_generic_for_the_client_and_correlated_in_server_logs(self):
        self.client.raise_request_exception = False
        with self.assertLogs("dentalclinic.request", level="ERROR") as captured:
            response = self.client.get(
                "/test/error/",
                HTTP_X_REQUEST_ID="error-request-123",
            )

        self.assertEqual(response.status_code, 500)
        self.assertNotContains(response, "private-clinical-value", status_code=500)
        self.assertNotContains(response, "Traceback", status_code=500)
        exception_records = [
            record for record in captured.records
            if record.getMessage() == "request.exception"
        ]
        self.assertEqual(len(exception_records), 1)
        payload = json.loads(json_formatter().format(exception_records[0]))
        self.assertEqual(payload["request_id"], "error-request-123")
        self.assertEqual(payload["exception"]["type"], "RuntimeError")
        self.assertTrue(payload["exception"]["stack"])
        serialized = json.dumps(payload)
        self.assertNotIn("private-clinical-value", serialized)
        self.assertNotIn("private-password", serialized)
