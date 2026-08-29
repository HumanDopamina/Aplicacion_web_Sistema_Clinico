from hashlib import sha256
import ipaddress

from django.conf import settings
from django.core.cache import cache


WINDOW_SECONDS = 15 * 60
ACCOUNT_FAILURE_LIMIT = 5
IP_FAILURE_LIMIT = 20


def _digest(value):
    return sha256(value.encode("utf-8")).hexdigest()


def _normalized_client_ip(request):
    remote = request.META.get("REMOTE_ADDR", "")
    try:
        normalized_remote = str(ipaddress.ip_address(remote))
    except ValueError:
        normalized_remote = "unknown"
    if normalized_remote not in set(settings.LOGIN_TRUSTED_PROXY_IPS):
        return normalized_remote
    forwarded = request.META.get("HTTP_X_REAL_IP", "")
    try:
        return str(ipaddress.ip_address(forwarded))
    except ValueError:
        return normalized_remote


class LoginAttemptLimiter:
    def __init__(self, request, email):
        normalized_email = (email or "").strip().lower()
        identifier = _normalized_client_ip(request)
        self.account_key = f"login-fail:account:{_digest(normalized_email)}"
        self.ip_key = f"login-fail:ip:{_digest(identifier)}"

    def is_blocked(self):
        return (
            int(cache.get(self.account_key, 0)) >= ACCOUNT_FAILURE_LIMIT
            or int(cache.get(self.ip_key, 0)) >= IP_FAILURE_LIMIT
        )

    def record_failure(self):
        self._increment(self.account_key)
        self._increment(self.ip_key)

    def clear_account(self):
        cache.delete(self.account_key)

    @staticmethod
    def _increment(key):
        if cache.add(key, 1, timeout=WINDOW_SECONDS):
            return 1
        try:
            return cache.incr(key)
        except ValueError:
            cache.set(key, 1, timeout=WINDOW_SECONDS)
            return 1
