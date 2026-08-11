from rest_framework.permissions import BasePermission


PERMISSION_CATALOG = (
    {"code": "patients.view", "label": "Ver pacientes", "group": "Pacientes"},
    {"code": "patients.create", "label": "Registrar pacientes", "group": "Pacientes"},
    {"code": "patients.edit", "label": "Editar pacientes", "group": "Pacientes"},
    {"code": "consultations.view", "label": "Ver consultas", "group": "Consultas"},
    {
        "code": "consultations.view_all",
        "label": "Ver consultas de todo el equipo",
        "group": "Consultas",
    },
    {"code": "consultations.create", "label": "Registrar consultas", "group": "Consultas"},
    {"code": "consultations.edit", "label": "Editar consultas", "group": "Consultas"},
    {"code": "appointments.view", "label": "Ver citas", "group": "Citas"},
    {
        "code": "appointments.view_all",
        "label": "Ver citas de todo el equipo",
        "group": "Citas",
    },
    {"code": "appointments.create", "label": "Crear citas", "group": "Citas"},
    {"code": "appointments.edit", "label": "Editar citas", "group": "Citas"},
    {"code": "documents.view", "label": "Ver documentos", "group": "Documentos"},
    {"code": "documents.create", "label": "Adjuntar documentos", "group": "Documentos"},
    {"code": "documents.delete", "label": "Borrar documentos", "group": "Documentos"},
)

PERMISSION_CODES = tuple(item["code"] for item in PERMISSION_CATALOG)
EDITABLE_ROLES = ("RECEPCIONISTA", "ODONTOLOGO")
DEFAULT_ROLE_PERMISSIONS = {
    "RECEPCIONISTA": [
        "patients.view",
        "patients.create",
        "patients.edit",
        "consultations.view",
        "appointments.view",
        "appointments.view_all",
        "appointments.create",
        "appointments.edit",
        "documents.view",
        "documents.create",
    ],
    "ODONTOLOGO": [
        "patients.view",
        "consultations.view",
        "consultations.create",
        "consultations.edit",
        "appointments.view",
        "documents.view",
        "documents.create",
    ],
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
