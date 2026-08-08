# Patient Edit Permission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que los roles autorizados editen la información personal y el contacto de emergencia de un paciente desde su expediente.

**Architecture:** El catálogo global incorporará `patients.edit`, heredado mediante los presets existentes. `PATCH /api/patients/{id}/` usará el mismo serializador con campos técnicos de solo lectura, mientras React reutilizará `PatientFormModal` en modo edición y reemplazará el estado visible con la respuesta del servidor.

**Tech Stack:** Django 5.2, Django REST Framework, React 19, React Router, Vitest y Testing Library.

## Global Constraints

- La API debe denegar por defecto la modificación sin `patients.edit`, aunque el botón no sea visible.
- `id`, `code`, `registered_by`, `created_at` y `updated_at` continúan protegidos contra asignación masiva.
- La edición cubre datos personales, contacto y estado del expediente base; no crea modelos de resumen clínico ni antecedentes.
- No se agregan dependencias ni migraciones de base de datos.

---

### Task 1: Permiso y API de actualización

**Files:**
- Modify: `src/backend/apps/users/permissions.py`
- Modify: `src/backend/apps/users/tests.py`
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/patients/serializers.py`
- Test: `src/backend/apps/patients/tests.py`

**Interfaces:**
- Produces: `patients.edit` y `PATCH /api/patients/{id}/`.

- [x] Escribir pruebas que exijan `patients.edit`, permitan actualizar con el preset y preserven campos técnicos.
- [x] Ejecutar las pruebas y confirmar fallos `405/403` por la funcionalidad ausente.
- [x] Agregar `patients.edit` al catálogo y permitir `PATCH` mediante `HasCapability`.
- [x] Ajustar la validación de cédula para excluir la instancia editada.
- [x] Ejecutar las pruebas focalizadas hasta obtener verde.

### Task 2: Formulario y botones de edición

**Files:**
- Modify: `src/frontend/src/services/patientService.js`
- Test: `src/frontend/src/services/patientService.test.js`
- Modify: `src/frontend/src/pages/Patients/PatientFormModal.jsx`
- Modify: `src/frontend/src/pages/Patients/PatientDetailPage.jsx`
- Test: `src/frontend/src/App.test.jsx`
- Test: `src/frontend/src/pages/Settings/SettingsPage.test.jsx`

**Interfaces:**
- Consumes: `PATCH /api/patients/{id}/` y permiso `patients.edit` de la sesión.
- Produces: `updatePatient(access, id, changes)` y modo edición de `PatientFormModal`.

- [x] Escribir una prueba del expediente que abra **Editar**, muestre datos actuales, guarde y actualice la vista.
- [x] Escribir una prueba del servicio para el `PATCH` autenticado.
- [x] Ejecutar Vitest y confirmar fallos por botones y servicio ausentes.
- [x] Reutilizar el formulario con `patient`, título **Editar paciente** y acción **Guardar cambios**.
- [x] Mostrar **Editar** en información personal y contacto de emergencia solo con `patients.edit` o rol administrador.
- [x] Incorporar **Editar pacientes** en la prueba visible de presets y ejecutar las pruebas focalizadas hasta verde.

### Task 3: Evidencia y entrega

**Files:**
- Modify: `docs/user-stories/HU-10-patient-registration.md`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-08-08-patient-edit-permission.md`

- [x] Ejecutar backend completo, migraciones en seco, frontend completo, lint y build.
- [x] Validar en navegador permiso visible, formulario precargado, guardado y datos actualizados.
- [x] Documentar el nuevo permiso, endpoint y límites de alcance.
- [x] Crear el commit `feat: add permission-based patient editing`.
