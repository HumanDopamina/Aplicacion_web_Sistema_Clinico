# HU-10 Patient Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que una recepcionista autorizada registre un paciente y abra automáticamente su expediente inicial.

**Architecture:** `Patient` será el expediente base y conservará datos personales, contacto de emergencia, código automático y autor del registro. DRF expondrá colección y detalle protegidos por los presets de HU-09; React implementará listado, formulario modal y detalle navegable.

**Tech Stack:** Django 5.2, Django REST Framework, React 19, React Router, Tailwind CSS, Vitest y Testing Library.

## Global Constraints

- `patients.view` autoriza listado y detalle; `patients.create` autoriza el registro.
- `Código`, fechas de auditoría y autor son solo lectura.
- Cédula, nombres, primer apellido, lugar/fecha de nacimiento y género son obligatorios.
- El código se genera como `PAC-00001` después de crear el registro.
- Al guardar, navegar a `/pacientes/{id}`.
- Resumen clínico, antecedentes, consultas y odontograma quedan como estados vacíos sin modelos adicionales.

---

### Task 1: Modelo y API

- [x] Escribir pruebas fallidas de creación, validación, permisos, listado, búsqueda y detalle.
- [x] Instalar `apps.patients`, crear `Patient`, migración y registro administrativo.
- [x] Implementar serializador y endpoints `GET/POST /api/patients/` y `GET /api/patients/{id}/`.
- [x] Aplicar autorización de capacidades en backend y proteger campos de auditoría contra asignación masiva.

### Task 2: Flujo React

- [x] Escribir una prueba fallida del flujo formulario → guardado → expediente.
- [x] Crear servicio de pacientes, listado con búsqueda y formulario accesible.
- [x] Crear la página de expediente y conectar `/pacientes` y `/pacientes/:id`.
- [x] Mostrar **Nuevo paciente** solo con `patients.create` o rol administrador.

### Task 3: Cierre

- [x] Aplicar migración y ejecutar pruebas, lint, build y navegador.
- [x] Actualizar README y `docs/user-stories/HU-10-patient-registration.md`.
- [x] Crear el commit `feat: complete HU-10 patient registration`.
