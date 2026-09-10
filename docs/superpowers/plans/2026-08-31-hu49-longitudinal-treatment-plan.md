# HU-49 Longitudinal Treatment Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar el plan estructurado completo del paciente, separado en pendientes e historial, tanto en el expediente como en una consulta, reutilizando las acciones de HU-48.

**Architecture:** `TreatmentItem` seguirá siendo la única fuente de verdad. Una proyección REST paginada filtrará por `proposed_in.patient`; el frontend cargará páginas independientes para pendientes e historial y reutilizará una tarjeta común en expediente y consulta. La consulta contextual dejará de descargar solo sus ítems y usará la proyección longitudinal, pasando siempre la consulta de origen a las acciones HU-48 y la consulta actual únicamente como `performed_in`.

**Tech Stack:** Django 5.2, Django REST Framework, PostgreSQL/SQLite de pruebas, React 19, Vite, Vitest y Testing Library.

## Global Constraints

- No crear `TreatmentPlan`, tablas, campos ni migraciones.
- No transformar campos textuales legados ni hacer backfill.
- No implementar HU-50, HU-51, FollowUp, facturación, pagos ni cambios del odontograma.
- Mantener intactos los endpoints anidados HU-47/HU-48.
- Requerir `consultations.view` en backend para la proyección longitudinal.
- Paginar por separado pendientes e historial; no descargar años de registros silenciosamente.

## Contrato vigente inspeccionado

1. Los TreatmentItems se obtienen hoy exclusivamente con `GET /patients/{patient}/consultations/{consultation}/treatment-items/`, sin paginación y limitados por `proposed_in` a una sola Consultation.
2. `TreatmentItemSerializer` devuelve `proposed_in` y `performed_in` como PK. La vista longitudinal necesita resúmenes mínimos `{id, date}` para ambos, además de snapshots, estado y localización dental; no necesita Consultation completa, ClinicalRecord, documentos ni odontograma.
3. El endpoint nuevo consultará directamente `TreatmentItem.objects.filter(proposed_in__patient_id=patientId)` y usará `select_related("proposed_in", "performed_in")`; no descargará consultas completas ni datos clínicos relacionados.
4. `PatientRecordPage` cargará la proyección solo con `consultations.view` y será de solo lectura. `ConsultationRecordPage` cargará pendientes e historial en paralelo y conservará creación/acciones.
5. Una única colección deduplicada por `id` alimentará dos grupos derivados por estado. El ítem de la consulta actual no se solicitará por una segunda API, evitando duplicación desde el origen.

---

### Task 1: Proyección longitudinal backend

**Files:**
- Create: `src/backend/apps/patients/test_treatment_plan.py`
- Modify: `src/backend/apps/patients/serializers.py`
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/patients/urls.py`

**Interfaces:**
- Produces: `GET /api/patients/{patientId}/treatment-items/`.
- Produces: `LongitudinalTreatmentItemSerializer` con consultas mínima de origen/ejecución.
- Consumes: `StandardPageNumberPagination`, `consultations.view` y estados de `TreatmentItem`.

- [ ] Escribir pruebas API para scope por paciente, contrato mínimo, snapshots, servicio inactivo, permisos y 404.
- [ ] Ejecutar las pruebas y confirmar fallos 404 por endpoint inexistente.
- [ ] Implementar serializer/list view/URL con `select_related("proposed_in", "performed_in")`.
- [ ] Ejecutar las pruebas y confirmar respuestas paginadas correctas.

### Task 2: Filtros, orden y rendimiento

**Files:**
- Modify: `src/backend/apps/patients/test_treatment_plan.py`
- Modify: `src/backend/apps/patients/views.py`

**Interfaces:**
- Consumes: `?status=<estado>` y `?scope=pending|history`.
- Produces: pendientes ACEPTADO antes que PROPUESTO y fecha/PK ascendentes; historial por evento más reciente descendente.

- [ ] Escribir pruebas rojas para cuatro estados, dos scopes, parámetros inválidos y combinación ambigua.
- [ ] Implementar filtros explícitos con errores 400 estables.
- [ ] Escribir pruebas de consultas constantes para uno y varios ítems mediante la vista real sin middleware.
- [ ] Implementar orden anotado y verificar que no se consultan ClinicalRecord, OdontogramVersion ni PatientDocument.

### Task 3: Servicio frontend paginado y presentación reutilizable

**Files:**
- Create: `src/frontend/src/pages/Patients/LongitudinalTreatmentPlan.jsx`
- Create: `src/frontend/src/pages/Patients/LongitudinalTreatmentPlan.test.jsx`
- Modify: `src/frontend/src/services/patientService.js`
- Modify: `src/frontend/src/services/patientService.test.js`
- Modify: `src/frontend/src/pages/Patients/TreatmentPlanSection.jsx`
- Modify: `src/frontend/src/pages/Patients/TreatmentPlanSection.test.jsx`

**Interfaces:**
- Produces: `listPatientTreatmentItems(access, patientId, filters)` que devuelve una página normalizada.
- Produces: `LongitudinalTreatmentPlan` con grupos Pendientes/Historial, estados vacíos, paginación y deduplicación por `id`.
- Consumes: callbacks HU-48 que reciben `(itemId, proposedInId)` y para perform `(itemId, proposedInId, currentConsultationId)`.

- [ ] Escribir pruebas rojas del servicio para query string/paginación.
- [ ] Escribir pruebas rojas del componente para cuatro estados, contexto, snapshots, vacíos, loading, error, load-more y deduplicación.
- [ ] Implementar el cliente API y el componente reutilizable sin componentes inline.
- [ ] Refactorizar `TreatmentPlanSection` para usar la presentación común y conservar formulario/cancelación/doble clic.
- [ ] Ejecutar todas las pruebas de componentes afectadas.

### Task 4: Integración de expediente y consulta

**Files:**
- Modify: `src/frontend/src/pages/Patients/PatientRecordPage.jsx`
- Modify: `src/frontend/src/pages/Patients/ConsultationRecordPage.jsx`
- Modify: `src/frontend/src/App.test.jsx`

**Interfaces:**
- PatientRecord: dos páginas iniciales en paralelo, read-only, errores independientes.
- ConsultationRecord: mismos grupos longitudinales, creación contextual y acciones mediante `proposed_in.id`; perform usa `consultation.id` actual.

- [ ] Escribir pruebas integradas rojas del expediente: loading/error/vacíos/pendientes/historial/permiso.
- [ ] Escribir pruebas integradas rojas de consulta: pendiente anterior visible una vez, acciones correctas, movimiento a historial y consulta completada sin perform.
- [ ] Implementar carga paralela con `Promise.allSettled`, merge por ID y callbacks de cargar más.
- [ ] Actualizar colecciones localmente tras crear/transicionar, sin recargar la aplicación.
- [ ] Ejecutar pruebas de App, PatientRecord, ConsultationRecord y TreatmentPlan.

### Task 5: Documentación y verificación

**Files:**
- Create: `docs/user-stories/HU-49-longitudinal-treatment-plan.md`
- Modify: `README.md`

- [ ] Documentar endpoint, filtros, orden, paginación, decisión read-only del expediente, deduplicación y ausencia de migración/odontograma.
- [ ] Ejecutar regresión HU-47/HU-48 y pruebas PostgreSQL relevantes sin crear migraciones.
- [ ] Ejecutar suites completas backend/frontend, lint y build.
- [ ] Ejecutar `manage.py check`, `migrate --check`, `makemigrations --check --dry-run`, `git status`, `git diff` y `git diff --check`.
- [ ] No crear commit si requiere incluir cambios preexistentes de otras historias en el worktree compartido.
