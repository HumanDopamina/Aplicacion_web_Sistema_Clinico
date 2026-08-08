# HU-09 Role Permission Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar HU-09 para que el administrador configure permisos globales para los roles Recepcionista y Odontólogo desde Configuración.

**Architecture:** Un modelo `RolePermissionPreset` persistirá una lista validada de capacidades por rol. El backend expondrá lectura y reemplazo de presets solo para administradores y resolverá los permisos efectivos en cada consulta; React ofrecerá una sección específica de permisos por rol.

**Tech Stack:** Django 5.2, Django REST Framework, React 19, Vite, Vitest y Testing Library.

## Global Constraints

- `ADMINISTRADOR` conserva acceso total y no es editable.
- Solo `RECEPCIONISTA` y `ODONTOLOGO` tienen presets persistidos.
- El catálogo inicial es `patients.view`, `patients.create`, `appointments.view` y `appointments.create`.
- La autorización efectiva siempre se valida en backend.
- Seguir TDD y actualizar `docs/user-stories/HU-09-user-listing.md` antes del commit.

---

### Task 1: Persistencia y API de presets

- [x] Probar listado, actualización, validación de códigos y rechazo a usuarios no administradores.
- [x] Crear `RolePermissionPreset`, migración con defaults y helpers para permisos efectivos.
- [x] Exponer `GET /api/auth/role-permissions/` y `PATCH /api/auth/role-permissions/{role}/`.
- [x] Incluir `permissions` en login y `/api/auth/me/`.

### Task 2: Administración desde React

- [x] Probar la carga de presets, cambio de rol, selección de capacidades y guardado.
- [x] Añadir servicios y la sección **Permisos por rol** en Configuración.
- [x] Mantener el patrón visual, estados accesibles y carga diferida al abrir la sección.

### Task 3: Cierre de HU-09

- [x] Ejecutar migraciones, pruebas backend/frontend, lint y build.
- [x] Actualizar README y la evidencia de HU-09.
- [x] Crear un commit convencional exclusivo de la ampliación HU-09.
