from rest_framework.permissions import BasePermission


PERMISSION_CATALOG = (
    {"code": "patients.view", "label": "Ver pacientes", "group": "Pacientes"},
    {"code": "patients.create", "label": "Registrar pacientes", "group": "Pacientes"},
    {"code": "appointments.view", "label": "Ver citas", "group": "Citas"},
    {"code": "appointments.create", "label": "Crear citas", "group": "Citas"},
)

PERMISSION_CODES = tuple(item["code"] for item in PERMISSION_CATALOG)
EDITABLE_ROLES = ("RECEPCIONISTA", "ODONTOLOGO")
DEFAULT_ROLE_PERMISSIONS = {
    "RECEPCIONISTA": list(PERMISSION_CODES),
    "ODONTOLOGO": ["patients.view", "appointments.view"],
}


def order_permissions(permissions):
    selected = set(permissions)
    return [code for code in PERMISSION_CODES if code in selected]


def get_effective_permissions(user):
    if user.role == "ADMINISTRADOR":
        return list(PERMISSION_CODES)

    from .models import RolePermissionPreset

    permissions = RolePermissionPreset.objects.filter(role=user.role).values_list(
        "permissions",
        flat=True,
    ).first()
    if permissions is None:
        permissions = DEFAULT_ROLE_PERMISSIONS.get(user.role, [])
    return order_permissions(permissions)


def user_has_permission(user, permission_code):
    return permission_code in get_effective_permissions(user)


class HasCapability(BasePermission):
    """Authorize each HTTP method with the capability declared by the view."""

    def has_permission(self, request, view):
        permission_code = getattr(view, "required_permissions", {}).get(request.method)
        return bool(
            request.user
            and request.user.is_authenticated
            and permission_code
            and user_has_permission(request.user, permission_code)
        )
