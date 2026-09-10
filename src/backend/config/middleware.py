from django.conf import settings


class ApiSecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/api/"):
            response["Cache-Control"] = "private, no-store"
            response["Pragma"] = "no-cache"
            response["X-Vercel-Enable-Rewrite-Caching"] = "0"
            response.setdefault(
                "Content-Security-Policy",
                settings.API_CONTENT_SECURITY_POLICY,
            )
            response.setdefault("Permissions-Policy", settings.API_PERMISSIONS_POLICY)
        return response
