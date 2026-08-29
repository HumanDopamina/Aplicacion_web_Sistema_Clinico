from django.utils.dateparse import parse_date
from rest_framework import generics, pagination, permissions, serializers

from apps.users.models import User

from .models import AuditEvent
from .serializers import AuditEventSerializer


class IsAdministrator(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated
            and request.user.role == User.Role.ADMINISTRADOR
        )


class AuditPagination(pagination.PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


class AuditEventListView(generics.ListAPIView):
    serializer_class = AuditEventSerializer
    permission_classes = (permissions.IsAuthenticated, IsAdministrator)
    pagination_class = AuditPagination
    http_method_names = ("get", "head", "options")

    def get_queryset(self):
        queryset = AuditEvent.objects.all()
        for field in (
            "action",
            "outcome",
            "actor_id",
            "patient_id",
            "resource_type",
            "resource_id",
        ):
            value = self.request.query_params.get(field)
            if value not in (None, ""):
                queryset = queryset.filter(**{field: value})

        for parameter, lookup in (("date_from", "occurred_at__date__gte"), ("date_to", "occurred_at__date__lte")):
            value = self.request.query_params.get(parameter)
            if value:
                parsed = parse_date(value)
                if parsed is None:
                    raise serializers.ValidationError({parameter: "Usa una fecha válida en formato AAAA-MM-DD."})
                queryset = queryset.filter(**{lookup: parsed})
        return queryset
