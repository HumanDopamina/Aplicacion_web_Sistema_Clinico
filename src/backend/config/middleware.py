from django.conf import settings


class ApiSecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/api/"):
            response.setdefault(
                "Content-Security-Policy",
                settings.API_CONTENT_SECURITY_POLICY,
            )
            response.setdefault("Permissions-Policy", settings.API_PERMISSIONS_POLICY)
        return response

