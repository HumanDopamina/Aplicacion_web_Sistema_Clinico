# HU-06 User Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un administrador modifique persistentemente la información de un usuario.

**Architecture:** Django REST Framework expone `PATCH /api/auth/users/{id}/` con autorización administrativa y una lista explícita de campos editables. React abre el usuario seleccionado en un modal y reemplaza la fila con la representación persistida devuelta por la API.

**Tech Stack:** Django REST Framework, React 19, Tailwind CSS, Vitest y Testing Library.

## Global Constraints

- No aceptar ni devolver contraseñas, hashes o permisos internos de Django.
- Rechazar correos pertenecientes a otra cuenta sin distinguir mayúsculas.
- Persistir los cambios antes de reflejarlos en la tabla.

---

### Task 1: API de modificación

- [x] Probar actualización persistente, duplicados y acceso no administrativo.
- [x] Implementar `UserAdminUpdateSerializer` y `UserDetailView`.
- [x] Registrar `PATCH /api/auth/users/{id}/`.

### Task 2: Interfaz de modificación

- [x] Añadir una acción accesible **Editar** por usuario.
- [x] Reutilizar el modal sin mostrar campos de contraseña.
- [x] Actualizar la fila únicamente con la respuesta satisfactoria de la API.

### Task 3: Verificación

- [x] Validar la persistencia mediante pruebas de Django y React.
- [x] Ejecutar el recorrido real con Playwright.
- [x] Ejecutar pruebas completas, lint, build y comprobación de migraciones.
