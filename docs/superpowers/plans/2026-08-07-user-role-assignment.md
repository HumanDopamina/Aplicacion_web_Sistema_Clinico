# HU-08 User Role Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un administrador asigne a cada usuario un rol que determine sus permisos en el sistema.

**Architecture:** El campo `role` existente se actualiza mediante el endpoint administrativo de detalle. Las comprobaciones de autorización del backend y las rutas protegidas de React consumen el rol persistido para permitir o denegar funciones.

**Tech Stack:** Django, Django REST Framework, Simple JWT, React Router, Vitest y Testing Library.

## Global Constraints

- Solo el rol `ADMINISTRADOR` puede asignar roles.
- Los valores admitidos son `ADMINISTRADOR`, `RECEPCIONISTA` y `ODONTOLOGO`.
- La autorización efectiva siempre se comprueba en el backend; ocultar una ruta no sustituye esa validación.

---

### Task 1: Asignación persistente de rol

- [x] Probar que un administrador puede cambiar el rol de un usuario.
- [x] Probar que un usuario no administrador recibe `403`.
- [x] Restringir `role` a las opciones definidas por `User.Role`.

### Task 2: Interfaz y permisos

- [x] Mostrar el selector de rol dentro del formulario de edición.
- [x] Reflejar el rol guardado en la tabla de Gestión de Staff.
- [x] Mantener las rutas administrativas protegidas por rol.

### Task 3: Verificación

- [x] Validar el cambio de rol con pruebas automatizadas.
- [x] Validar el flujo desde el navegador.
- [x] Ejecutar la suite completa, lint y build.
