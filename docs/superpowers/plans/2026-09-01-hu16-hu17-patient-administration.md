# HU-16 and HU-17 Patient Administration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add selectable, server-side patient ordering and enforce one uniform inactive-patient boundary while preserving all historical reads.

**Architecture:** The patient list will accept one allowlisted `ordering` value whose database ordering always ends in `pk`, and the React page will send field/direction changes back to page one. A reusable domain guard will reject operations that start new patient activity; existing read endpoints and historical records remain unchanged, while frontend entry points are hidden or disabled from the loaded `is_active` state.

**Tech Stack:** Django 5.2, Django REST Framework, PostgreSQL, React 19, Vite, Vitest, Testing Library.

## Global Constraints

- Implement only HU-16 and HU-17.
- Add zero models, zero fields, zero migrations, and zero indexes.
- Preserve `PatientSummary`, `PatientOption`, HU-13, HU-52, HU-53, and HU-54 minimization and behavior.
- Keep historical patient, consultation, odontogram, treatment, document, and appointment reads available under their existing permissions.
- Do not implement HU-19, HU-23, merging, physical deletion, or a new permission architecture.
- Keep `clinica_dental` at Patient 3, ClinicalRecord 2, Consultation 2, Appointment 5, and OdontogramVersion 5 by using rollback for development probes.

---

### Task 1: HU-16 allowlisted, stable database ordering

**Files:**
- Create: `src/backend/apps/patients/test_hu16_hu17.py`
- Modify: `src/backend/apps/patients/views.py`

**Interfaces:**
- Consumes: `GET /api/patients/?search=&page=&ordering=<value>`.
- Produces: allowlisted values `code`, `name`, `created_at`, `is_active` and their `-` descending forms, each with a deterministic `pk` tie-breaker.

- [x] **Step 1: Write failing API tests**

  Create fixtures with tied names, dates, and activity values. Assert ascending and descending literal ID orders, combined search/order, pagination across ordered pages, stable ties, unchanged `patients.view` authorization, and `400` for arbitrary or multi-field ordering.

- [x] **Step 2: Run the HU-16 tests and verify RED**

  Run: `.venv\Scripts\python manage.py test apps.patients.test_hu16_hu17.PatientOrderingApiTests --settings=config.settings.test --noinput`

- [x] **Step 3: Implement the minimal ordering map**

  Add a constant mapping such as `{"name": ("first_name", "last_name", "second_last_name", "pk"), "-name": ("-first_name", "-last_name", "-second_last_name", "-pk")}` and equivalent stable tuples for code, registration date, and activity. Apply it to the queryset before DRF search/pagination, default to `-created_at, -pk`, and raise a field validation error for any non-empty value outside the map.

- [x] **Step 4: Re-run HU-16 tests until GREEN**

### Task 2: HU-16 frontend ordering controls

**Files:**
- Create: `src/frontend/src/pages/Patients/PatientsPage.test.jsx`
- Modify: `src/frontend/src/pages/Patients/PatientsPage.jsx`
- Modify: `src/frontend/src/services/patientService.js`
- Modify: `src/frontend/src/services/patientService.test.js`

**Interfaces:**
- Consumes: `listPatients(access, search, page, pageSize, ordering)`.
- Produces: field and direction controls that encode one backend `ordering` value and reset pagination to page 1.

- [x] **Step 1: Write failing service and page tests**

  Assert literal URLs for order-only and search/page/order combinations. In the real page, change order field/direction and verify the requested URL, page reset, loading result order, state badges, and preserved permission behavior.

- [x] **Step 2: Run focused frontend tests and verify RED**

  Run: `npm test -- src/services/patientService.test.js src/pages/Patients/PatientsPage.test.jsx`

- [x] **Step 3: Implement controls and backend request integration**

  Add accessible `Ordenar por` and `Dirección` selects for name, code, registration, and state; send the resulting value to `listPatients`, reset to page 1 on either change, and add an explicit active/inactive column without clinical data.

- [x] **Step 4: Re-run focused frontend tests until GREEN**

### Task 3: HU-17 backend inactive-patient guard

**Files:**
- Modify: `src/backend/apps/patients/services.py`
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/appointments/services.py`
- Modify: `src/backend/apps/appointments/serializers.py`
- Modify: `src/backend/apps/patients/test_hu16_hu17.py`

**Interfaces:**
- Produces: `require_active_patient(patient, error_class=ConsultationOperationError)` raising code `patient_inactive` and a clear Spanish detail.
- Preserves: current appointment field validation and document read-only behavior.

- [x] **Step 1: Write failing inactive-policy tests**

  Assert that PATCH through `patients.edit` can inactivate/reactivate; inactive details and historical consultations/treatments/documents remain readable; options and forced appointment creation reject; start attendance returns `409 patient_inactive` without consultation/odontogram/appointment mutation; manual consultation and new treatment proposal return `409 patient_inactive`; existing treatment lists remain unchanged; incomplete-active and complete-inactive patients yield distinct codes; active flows still create normally; HU-13 still includes inactive matches.

- [x] **Step 2: Run the HU-17 backend tests and verify RED**

  Run: `.venv\Scripts\python manage.py test apps.patients.test_hu16_hu17 --settings=config.settings.test --noinput`

- [x] **Step 3: Add and apply the domain guard**

  Call `require_active_patient` before profile validation in attendance/manual consultation and before saving a treatment proposal. Translate domain errors through existing `409` response patterns. Add `patient_is_active` to appointment serialization so the existing agenda can suppress start attendance without loading patient detail.

- [x] **Step 4: Re-run HU-17 and affected backend suites until GREEN**

### Task 4: HU-17 frontend entry-point restrictions

**Files:**
- Modify: `src/frontend/src/pages/Patients/PatientRecordPage.jsx`
- Modify: `src/frontend/src/pages/Patients/PatientConsultationsPage.jsx`
- Modify: `src/frontend/src/pages/Patients/PatientConsultationsPanel.jsx`
- Modify: `src/frontend/src/pages/Patients/ConsultationRecordPage.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentDetailsPanel.jsx`
- Create or modify focused tests beside those pages.

**Interfaces:**
- Consumes: `patient.is_active`, `appointment.patient_is_active`, and backend `patient_inactive` errors.
- Produces: clear status, a simple `patients.edit` status control, historical navigation, and hidden creation/start actions for inactive patients.

- [x] **Step 1: Write failing UI tests**

  Assert state badges in list/record, simple inactivate/reactivate editing with `patients.edit`, hidden New consultation and treatment-proposal creation, direct new-consultation read-only notice, historical consultation/treatment/document links still present, disabled start attendance, and readable `patient_inactive` error fallback.

- [x] **Step 2: Run focused frontend tests and verify RED**

- [x] **Step 3: Implement the minimal UI policy**

  Pass `patientActive` into consultation panels, gate only prohibited creation actions, preserve all history links, show a distinct inactive notice, and keep profile-incomplete rendering independent.

- [x] **Step 4: Re-run focused frontend tests until GREEN**

### Task 5: Documentation and complete verification

**Files:**
- Create: `docs/user-stories/HU-16-patient-list-ordering.md`
- Create: `docs/user-stories/HU-17-inactive-patient-policy.md`
- Modify: `README.md`

**Interfaces:**
- Produces: acceptance evidence and the final compact report.

- [x] **Step 1: Document contracts, permissions, evidence, and non-goals**

- [x] **Step 2: Run focused and complete backend suites**

  Run HU-16/HU-17, patients, appointments, documents, treatments, then the complete Django suite using `config.settings.test`.

- [x] **Step 3: Run PostgreSQL rollback probes**

  Verify order execution, inactive exact policy, appointment constraint continuity, and unchanged 3/2/2/5/5 counts before/after without printing credentials.

- [x] **Step 4: Run frontend suite, lint, and build**

- [x] **Step 5: Run Django and repository gates**

  Run `manage.py check`, `migrate --check`, `makemigrations --check --dry-run`, `git status`, scoped `git diff`, and `git diff --check`; require no schema changes and do not commit overlapping pre-existing user work.
