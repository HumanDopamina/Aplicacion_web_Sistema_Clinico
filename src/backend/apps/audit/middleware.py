import ipaddress
import json
import logging
import re
import time
import uuid

from django.db import transaction

from .models import AuditEvent


REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
request_logger = logging.getLogger("dentalclinic.request")


def safe_request_path(request):
    resolver_match = getattr(request, "resolver_match", None)
    route = getattr(resolver_match, "route", None)
    if route is None:
        return "/<unmatched>"
    return f"/{route.lstrip('/')}"


class RequestIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started_at = time.monotonic()
        request.observability_started_at = started_at
        supplied = request.headers.get("X-Request-ID", "")
        request.request_id = supplied if REQUEST_ID_PATTERN.fullmatch(supplied) else str(uuid.uuid4())
        response = self.get_response(request)
        response["X-Request-ID"] = request.request_id
        status = response.status_code
        level = logging.ERROR if status >= 500 else logging.WARNING if status >= 400 else logging.INFO
        request_logger.log(
            level,
            "request.completed",
            extra={
                "request_id": request.request_id,
                "method": request.method,
                "path": safe_request_path(request),
                "status": status,
                "duration_ms": round((time.monotonic() - started_at) * 1000, 3),
            },
        )
        return response

    def process_exception(self, request, exception):
        started_at = getattr(request, "observability_started_at", time.monotonic())
        request_logger.error(
            "request.exception",
            extra={
                "request_id": getattr(request, "request_id", ""),
                "method": request.method,
                "path": safe_request_path(request),
                "status": 500,
                "duration_ms": round((time.monotonic() - started_at) * 1000, 3),
            },
            exc_info=(type(exception), exception, exception.__traceback__),
        )
        return None


class AuditTrailMiddleware:
    EXCLUDED_PREFIXES = ("/api/auth/csrf/",)
    ACTIONS = {
        "login": "AUTH_LOGIN",
        "token-refresh": "AUTH_REFRESH",
        "logout": "AUTH_LOGOUT",
        "password-change": "PASSWORD_CHANGE",
        "password-reset": "PASSWORD_RESET_REQUEST",
        "password-reset-confirm": "PASSWORD_RESET_CONFIRM",
        "current-user": "PROFILE",
        "current-user-avatar": "PROFILE_AVATAR",
        "user-list": "STAFF",
        "user-detail": "STAFF",
        "user-avatar": "STAFF_AVATAR",
        "role-permission-list": "ROLE_PERMISSION",
        "role-permission-detail": "ROLE_PERMISSION",
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if (
            not request.path.startswith("/api/")
            or request.path.startswith(self.EXCLUDED_PREFIXES)
            or request.method == "OPTIONS"
        ):
            return self.get_response(request)
        self._capture_safe_request_details(request)
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            with transaction.atomic():
                response = self.get_response(request)
                self._record(request, response)
                return response
        response = self.get_response(request)
        self._record(request, response)
        return response

    def _record(self, request, response):
        match = request.resolver_match
        url_name = match.url_name if match else "unknown"
        base = self.ACTIONS.get(url_name) or self._resource_name(match)
        action = self._action(base, request.method, url_name, request)
        actor = getattr(request, "audit_actor", None)
        if actor is None:
            candidate = getattr(request, "user", None)
            actor = candidate if getattr(candidate, "is_authenticated", False) else None
        kwargs = match.kwargs if match else {}
        resource_id = kwargs.get("pk") or kwargs.get("consultation_pk") or ""
        patient_id = getattr(request, "audit_patient_id", None) or kwargs.get("patient_pk")
        if base == "CONSULTATION" and patient_id is None and kwargs.get("pk"):
            patient_id = kwargs["pk"]
            resource_id = ""
        if patient_id is None and base == "PATIENT" and resource_id:
            patient_id = resource_id
        response_data = getattr(response, "data", None)
        if request.method == "POST" and isinstance(response_data, dict) and response_data.get("id"):
            resource_id = response_data["id"]
            if base == "PATIENT":
                patient_id = resource_id
        AuditEvent.objects.create(
            request_id=request.request_id,
            actor_id=getattr(actor, "pk", None),
            actor_role=getattr(actor, "role", ""),
            action=action,
            outcome=self._outcome(response.status_code),
            resource_type=base.lower(),
            resource_id=str(resource_id),
            patient_id=patient_id,
            changed_fields=getattr(request, "audit_changed_fields", []),
            metadata=self._safe_metadata(request),
            ip_address=self._ip(request.META.get("REMOTE_ADDR")),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:512],
        )

    @staticmethod
    def _resource_name(match):
        if not match:
            return "API"
        view_name = match.view_name or match.url_name or ""
        namespace, separator, name = view_name.rpartition(":")
        namespace = namespace.upper() if separator else "API"
        name = name.upper()
        if namespace == "PATIENTS":
            if "DOCUMENT" in name:
                return "DOCUMENT"
            if "ODONTOGRAM" in name:
                return "ODONTOGRAM"
            if "TREATMENT-ITEM" in name:
                return "TREATMENT_ITEM"
            if "CONSULTATION" in name:
                return "CONSULTATION"
            return "PATIENT"
        if namespace == "APPOINTMENTS":
            return "APPOINTMENT"
        if namespace == "CLINICS":
            return "CLINIC_CONFIGURATION"
        return namespace

    @staticmethod
    def _action(base, method, url_name, request):
        explicit_action = getattr(request, "audit_action", None)
        if explicit_action:
            return explicit_action
        if base.startswith(("AUTH_", "PASSWORD_")):
            return base
        if base == "DOCUMENT" and "content" in url_name:
            return "DOCUMENT_DOWNLOAD" if request.GET.get("download") == "true" else "DOCUMENT_VIEW"
        if url_name == "appointment-start-attendance":
            return "APPOINTMENT_START_ATTENDANCE"
        if url_name == "appointment-check-in":
            return "APPOINTMENT_CHECK_IN"
        if url_name == "patient-duplicate-check":
            return "PATIENT_DUPLICATE_CHECK"
        if url_name == "patient-consultation-complete":
            return "CONSULTATION_COMPLETE"
        if url_name == "patient-consultation-cancel":
            return "CONSULTATION_CANCEL"
        treatment_actions = {
            "consultation-treatment-item-accept": "TREATMENT_ITEM_ACCEPT",
            "consultation-treatment-item-perform": "TREATMENT_ITEM_PERFORM",
            "consultation-treatment-item-cancel": "TREATMENT_ITEM_CANCEL",
        }
        if url_name in treatment_actions:
            return treatment_actions[url_name]
        singleton_reads = {
            "business-hours",
            "clinic-profile",
            "clinic-profile-options",
            "consultation-odontogram",
        }
        operation = {
            "GET": "READ" if url_name in singleton_reads or any(
                key in url_name for key in ("detail", "content", "avatar", "current-user")
            ) else "LIST",
            "POST": "CREATE",
            "PUT": "UPDATE",
            "PATCH": "UPDATE",
            "DELETE": "DELETE",
        }.get(method, method)
        return f"{base}_{operation}"

    @staticmethod
    def _capture_safe_request_details(request):
        request.audit_changed_fields = []
        request.audit_metadata = {}
        if request.method not in ("POST", "PUT", "PATCH"):
            return
        if not request.content_type.startswith("application/json"):
            return
        try:
            if int(request.META.get("CONTENT_LENGTH") or 0) > 64 * 1024:
                return
        except ValueError:
            return
        try:
            payload = json.loads(request.body or b"{}")
        except (TypeError, ValueError, UnicodeDecodeError):
            return
        if not isinstance(payload, dict):
            return
        excluded = ("password", "token", "refresh", "diagnos", "note", "observ")
        request.audit_changed_fields = sorted(
            key for key in payload
            if not any(fragment in key.lower() for fragment in excluded)
        )
        if "status" in payload and isinstance(payload["status"], str):
            request.audit_metadata["to_status"] = payload["status"][:40]
        if "role" in payload and isinstance(payload["role"], str):
            request.audit_metadata["to_role"] = payload["role"][:40]

    @staticmethod
    def _safe_metadata(request):
        metadata = dict(getattr(request, "audit_metadata", {}))
        if request.FILES:
            files = [item for _, values in request.FILES.lists() for item in values]
            metadata.update(
                {
                    "file_count": len(files),
                    "total_size": sum(item.size for item in files),
                    "mime_types": sorted({item.content_type for item in files}),
                }
            )
        return metadata

    @staticmethod
    def _outcome(status_code):
        if status_code == 429:
            return AuditEvent.Outcome.BLOCKED
        if status_code in (401, 403):
            return AuditEvent.Outcome.DENIED
        if status_code >= 400:
            return AuditEvent.Outcome.FAILURE
        return AuditEvent.Outcome.SUCCESS

    @staticmethod
    def _ip(value):
        try:
            return str(ipaddress.ip_address(value)) if value else None
        except ValueError:
            return None
