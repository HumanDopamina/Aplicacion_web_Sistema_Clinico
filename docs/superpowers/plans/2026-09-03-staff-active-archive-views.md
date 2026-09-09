# Staff Active and Archived Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar el personal activo del archivado y permitir archivar/reactivar cuentas preservando identidad e historial.

**Architecture:** La colección de usuarios aceptará `status=active|archived|all` y búsqueda DRF antes de paginar, manteniendo `all` como valor predeterminado compatible para consumidores existentes. Gestión de Staff solicitará explícitamente `active`, ofrecerá pestañas Activos/Archivados y mutará únicamente `is_active` mediante PATCH; DELETE seguirá disponible en backend pero desaparecerá del flujo normal de UI.

**Tech Stack:** Django REST Framework, Django ORM, React 19, Vitest y Testing Library.

## Global Constraints

- `is_active=True` significa Activo y `is_active=False` significa Archivado; no se crea `is_archived`.
- El filtrado ocurre en backend antes de paginar y funciona junto con búsqueda y orden estable.
- Archivar/reactivar conserva PK, relaciones e historial; no modifica modelos clínicos ni requiere migraciones.
- Solo las reglas administrativas existentes pueden listar, editar, archivar o reactivar staff.
- Un administrador no puede archivarse a sí mismo.
- DELETE no se elimina del backend, pero no se expone como acción normal en Gestión de Staff.
- No se modifican usuarios reales de desarrollo.
- Se preservan intactos los cambios pendientes de `.env`.

---

### Task 1: Filtrado, búsqueda y auditoría del backend

**Files:**
- Modify: `src/backend/apps/users/views.py`
- Modify: `src/backend/apps/users/serializers.py`
- Modify: `src/backend/apps/users/tests.py`

**Interfaces:**
- Consumes: `GET /api/auth/users/?status=active|archived|all&search=<texto>&page=<n>` y `PATCH /api/auth/users/<id>/` con `{"is_active": boolean}`.
- Produces: colección filtrada antes de paginar, búsqueda por nombre/apellido/correo, acciones auditadas `USER_ARCHIVED`/`USER_REACTIVATED` y error 400 de campo `is_active` al autoarchivarse.

- [x] **Step 1: Write failing backend tests**

Agregar pruebas observables para active, archived, all, combinación con búsqueda, conteo paginado, preservación de PK/relación al archivar, reactivación, eventos de auditoría, permisos y autoarchivo.

- [x] **Step 2: Run backend tests and verify RED**

Run: `python manage.py test apps.users.tests.UserRegistrationApiTests --settings=config.settings.test --noinput`

Expected: FAIL porque la colección ignora `status`/`search`, no emite acciones específicas y permite autoarchivo.

- [x] **Step 3: Implement the backend contract**

Configurar `SearchFilter` con `email`, `first_name` y `last_name`; filtrar el queryset por estado antes de que DRF lo pagine; rechazar estados inválidos; proteger autoarchivo en `UserAdminUpdateSerializer`; asignar la acción auditada al detectar una transición real de `is_active`.

- [x] **Step 4: Run backend tests and verify GREEN**

Run: `python manage.py test apps.users.tests.UserRegistrationApiTests --settings=config.settings.test --noinput`

Expected: PASS.

### Task 2: Pestañas y acciones de archivo en frontend

**Files:**
- Modify: `src/frontend/src/services/userService.js`
- Modify: `src/frontend/src/services/userService.test.js`
- Modify: `src/frontend/src/pages/Settings/SettingsPage.jsx`
- Modify: `src/frontend/src/pages/Settings/SettingsPage.test.jsx`

**Interfaces:**
- Consumes: `listUsers(access, {page, pageSize, status, search})` y `updateUser(access, id, {is_active})`.
- Produces: pestañas Activos/Archivados, búsqueda conservada al paginar, confirmación de archivo, reactivación directa, estados vacíos específicos y errores visibles.

- [x] **Step 1: Write failing frontend tests**

Probar solicitud active inicial, cambio a archived, búsqueda/paginación con estado, modal y cancelación, archivo/reactivación, ausencia de DELETE, estados vacíos y errores de mutación.

- [x] **Step 2: Run frontend tests and verify RED**

Run: `npm test -- src/services/userService.test.js src/pages/Settings/SettingsPage.test.jsx`

Expected: FAIL porque el servicio no serializa filtros y la pantalla mezcla estados y expone Eliminar.

- [x] **Step 3: Implement the frontend flow**

Evolucionar `listUsers` a opciones nombradas, añadir controles de estado/búsqueda, reemplazar el diálogo de eliminación por confirmación de archivo, usar PATCH para ambas transiciones y retirar cada usuario de la vista filtrada tras éxito.

- [x] **Step 4: Run frontend tests and verify GREEN**

Run: `npm test -- src/services/userService.test.js src/pages/Settings/SettingsPage.test.jsx`

Expected: PASS.

### Task 3: Verificación completa y alcance

**Files:**
- Verify: backend, frontend y diff completo.

**Interfaces:**
- Consumes: Tasks 1 y 2.
- Produces: evidencia fresca de regresión, esquema, build y alcance.

- [x] **Step 1: Run backend verification**

Run: `python -m pip check`, `python manage.py test --settings=config.settings.test --noinput`, `python manage.py check --settings=config.settings.test`, `python manage.py makemigrations --check --dry-run --settings=config.settings.test`.

- [x] **Step 2: Run frontend verification**

Run: `npm test`, `npm run lint`, `npm run build`.

- [x] **Step 3: Inspect the final diff**

Run: `git diff --check`, `git status --short` y revisión dirigida de los archivos de usuarios/staff, distinguiendo los cambios preexistentes de `.env`.
