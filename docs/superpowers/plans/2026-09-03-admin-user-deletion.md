# Administrator User Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un administrador elimine desde Gestión de Staff una cuenta sin historial, sin comprometer su propia sesión ni la trazabilidad clínica.

**Architecture:** El endpoint de detalle conservará PATCH y añadirá DELETE con autorización administrativa, bloqueo de autoeliminación y traducción de relaciones `PROTECT` a HTTP 409. El frontend añadirá un diálogo de confirmación accesible y actualizará la lista local tras una respuesta 204.

**Tech Stack:** Django REST Framework, Django ORM, React 19, Vitest y Testing Library.

## Global Constraints

- Solo un usuario con permisos administrativos puede eliminar cuentas.
- No se permite eliminar la cuenta autenticada.
- No se elimina una cuenta que tenga historial protegido; se indica que debe desactivarse.
- La acción destructiva exige confirmación explícita en la aplicación.
- No se modifican modelos, migraciones ni lógica clínica.
- Los cambios pendientes de carga de `.env` se conservan intactos y fuera de este alcance.

---

### Task 1: Contrato DELETE seguro en backend

**Files:**
- Modify: `src/backend/apps/users/tests.py`
- Modify: `src/backend/apps/users/views.py`

**Interfaces:**
- Consumes: `DELETE /api/auth/users/<id>/` autenticado con JWT.
- Produces: HTTP 204 al eliminar; HTTP 409 con `detail` para autoeliminación o historial protegido; HTTP 403 para no administradores.

- [x] **Step 1: Write the failing tests**

Añadir casos para eliminación exitosa, rechazo de autoeliminación, rechazo por relación clínica protegida y rechazo para roles no administrativos.

- [x] **Step 2: Run tests to verify they fail**

Run: `python manage.py test apps.users.tests.UserRegistrationApiTests --settings=config.settings.test --noinput`

Expected: FAIL porque el endpoint actual responde 405 a DELETE.

- [x] **Step 3: Write minimal implementation**

Extender `UserDetailView` con `DestroyModelMixin`, validar que objetivo y actor sean distintos, capturar `ProtectedError` como conflicto y eliminar el avatar en `transaction.on_commit` solo después de una eliminación confirmada.

- [x] **Step 4: Run tests to verify they pass**

Run: `python manage.py test apps.users.tests.UserRegistrationApiTests --settings=config.settings.test --noinput`

Expected: PASS.

### Task 2: Eliminación confirmada en Gestión de Staff

**Files:**
- Modify: `src/frontend/src/services/userService.js`
- Modify: `src/frontend/src/services/userService.test.js`
- Modify: `src/frontend/src/pages/Settings/SettingsPage.jsx`
- Modify: `src/frontend/src/pages/Settings/SettingsPage.test.jsx`

**Interfaces:**
- Consumes: `deleteUser(accessToken, id): Promise<object>`.
- Produces: botón Eliminar para otras cuentas, diálogo modal de confirmación, estado de envío/error y retiro de la fila eliminada.

- [x] **Step 1: Write the failing tests**

Probar que el servicio envía DELETE, que la interfaz no expone autoeliminación, que cancelar no llama a la API y que confirmar elimina la fila.

- [x] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/services/userService.test.js src/pages/Settings/SettingsPage.test.jsx`

Expected: FAIL porque no existen el servicio ni los controles.

- [x] **Step 3: Write minimal implementation**

Añadir `deleteUser`, el diálogo accesible y el ajuste del contador/paginación tras éxito; mantener el diálogo abierto y mostrar el mensaje de API ante conflicto.

- [x] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/services/userService.test.js src/pages/Settings/SettingsPage.test.jsx`

Expected: PASS.

### Task 3: Verificación integral

**Files:**
- Verify only: backend, frontend y diff completo.

**Interfaces:**
- Consumes: implementación de Tasks 1 y 2.
- Produces: evidencia de ausencia de regresiones y de cambios de esquema.

- [x] **Step 1: Run backend verification**

Run: `python -m pip check`, `python manage.py test --settings=config.settings.test --noinput`, `python manage.py check --settings=config.settings.test`, `python manage.py makemigrations --check --dry-run --settings=config.settings.test`.

- [x] **Step 2: Run frontend verification**

Run: `npm test`, `npm run lint`, `npm run build`.

- [x] **Step 3: Inspect scope and whitespace**

Run: `git diff --check` y revisar `git status --short`/`git diff` para distinguir los cambios preexistentes de `.env`.
