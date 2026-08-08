# HU-09: Lista de usuarios registrados

- Jira: SCRUM-17
- Estado: Cumplida
- Validada: 2026-08-08

## Historia

Como administrador, quiero visualizar la lista de usuarios registrados para administrar las cuentas existentes.

## Criterio y evidencia

| Criterio | Evidencia | Resultado |
|---|---|---|
| Al cargar el módulo se muestran todos los usuarios con su rol y estado activo o inactivo. | `GET /api/auth/users/` devuelve todas las cuentas con `role` e `is_active`; `SettingsPage` representa cada cuenta y traduce esos valores a etiquetas visibles. | Cumple |
| El listado está restringido a administradores. | El endpoint usa `IsAuthenticated` e `IsAdministrator`; la ruta `/configuracion` también exige el rol `ADMINISTRADOR`. | Cumple |
| Los estados vacío y de error son visibles. | La pantalla muestra una indicación cuando no existen miembros y un mensaje de error cuando falla la carga. | Cumple |
| El administrador puede modificar los permisos de los otros roles como presets. | **Permisos por rol** permite reemplazar el preset global de `RECEPCIONISTA` y `ODONTOLOGO`; el backend valida el catálogo y bloquea a usuarios no administradores. | Cumple |
| Los permisos modificados son efectivos para todas las cuentas del rol. | `/api/auth/me/` y el login resuelven los permisos desde el preset persistido; el administrador mantiene acceso total implícito. | Cumple |

## Interfaces

- `GET /api/auth/users/`
- Respuesta por usuario: `id`, `email`, `first_name`, `last_name`, `role`, `is_active`.
- Interfaz: **Configuración → Gestión de Staff**.
- `GET /api/auth/role-permissions/`: devuelve `available_permissions` y los presets editables.
- `PATCH /api/auth/role-permissions/{role}/`: acepta `{ "permissions": ["patients.view"] }`.
- El catálogo incluye `patients.edit` (**Editar pacientes**) para otorgarlo explícitamente a recepcionistas u odontólogos.
- Login y `GET /api/auth/me/`: incluyen `permissions` efectivos.
- Interfaz: **Configuración → Permisos por rol**.

## Presets iniciales

- `RECEPCIONISTA`: ver/registrar pacientes y ver/crear citas.
- `ODONTOLOGO`: ver pacientes y ver citas.
- `ADMINISTRADOR`: todas las capacidades del catálogo, sin preset editable.

## Archivos de prueba

- `src/backend/apps/users/tests.py`
- `src/frontend/src/services/userService.test.js`
- `src/frontend/src/pages/Settings/SettingsPage.test.jsx`

## Verificación

```powershell
src/backend/.venv/Scripts/python.exe src/backend/manage.py test apps.users
cd src/frontend
npm test -- --run
npm run lint
npm run build
```
