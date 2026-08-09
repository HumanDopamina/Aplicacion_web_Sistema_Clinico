# Inline Patient Consultation Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add routed creation, viewing, and Odoo-style inline editing for complete patient consultation records.

**Architecture:** Extend the existing patient-scoped `Consultation` resource and protect list, create, retrieve, and update independently through role capabilities. Reuse the patient record shell in React, while a focused consultation page owns its draft, persistence, and unsaved-navigation behavior.

**Tech Stack:** Django 5.2, Django REST Framework, React 19, React Router 7, Vitest, Testing Library, Tailwind CSS, Playwright.

## Global Constraints

- Preserve legacy consultation values in `ClinicalRecord`, but keep consultation-specific fields out of the patient summary UI and payload.
- Assign the patient and professional only from the URL and authenticated request.
- Keep consultation deletion unavailable.
- Keep the existing visual language and responsive patient record layout.
- Update HU-10 and README, then create one scoped feature commit.

---

### Task 1: Consultation persistence and permissions

**Files:**
- Modify: `src/backend/apps/patients/models.py`
- Modify: `src/backend/apps/users/permissions.py`
- Create: `src/backend/apps/patients/migrations/0004_consultation_clinical_fields.py`
- Create: `src/backend/apps/users/migrations/0005_consultation_permissions.py`
- Test: `src/backend/apps/patients/tests.py`
- Test: `src/backend/apps/users/tests.py`

**Interfaces:**
- Produces: persisted consultation metadata and clinical fields; capabilities `consultations.view`, `consultations.create`, and `consultations.edit`.

- [x] Write API and permission tests that fail because the fields and capabilities do not exist.
- [x] Run the focused Django tests and confirm the expected failures.
- [x] Add optional clinical fields, required consultation metadata, time, and a historical professional-name snapshot.
- [x] Add the permission catalog entries and append default capabilities without removing existing preset values.
- [x] Generate migrations and rerun the focused tests.

### Task 2: Patient-scoped consultation API

**Files:**
- Modify: `src/backend/apps/patients/serializers.py`
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/patients/urls.py`
- Test: `src/backend/apps/patients/tests.py`

**Interfaces:**
- Produces: `GET/POST /api/patients/{patientId}/consultations/` and `GET/PATCH /api/patients/{patientId}/consultations/{consultationId}/`.

- [x] Test authenticated creation, required fields, immutable ownership, full clinical persistence, patient scoping, completed edits, permission boundaries, and rejected deletion.
- [x] Confirm every new test fails for the missing behavior.
- [x] Make the serializer writable while keeping identifiers, display labels, ownership, and audit fields read-only.
- [x] Add create/list and retrieve/update views with method-specific capabilities and URL-scoped querysets.
- [x] Run the patient and user Django suites until green.

### Task 3: Frontend API and routed record shell

**Files:**
- Modify: `src/frontend/src/services/patientService.js`
- Modify: `src/frontend/src/services/patientService.test.js`
- Modify: `src/frontend/src/App.jsx`
- Modify: `src/frontend/src/App.test.jsx`
- Create: `src/frontend/src/pages/Patients/PatientRecordShell.jsx`

**Interfaces:**
- Produces: consultation service methods and routes `/pacientes/:patientId/consultas`, `/pacientes/:patientId/consultas/nueva`, and `/pacientes/:patientId/consultas/:consultationId`.

- [x] Add failing service tests for retrieve, create, and update requests.
- [x] Add failing route tests for the consultation list and detail entry points.
- [x] Implement service functions and route guards.
- [x] Extract the shared header and routed tabs without changing patient summary behavior.
- [x] Run the focused frontend tests until green.

### Task 4: Consultation history actions

**Files:**
- Modify: `src/frontend/src/pages/Patients/PatientConsultationsPanel.jsx`
- Modify: `src/frontend/src/App.test.jsx`

**Interfaces:**
- Consumes: consultation routes and user capabilities.
- Produces: conditional `Nueva consulta` and per-record `Ver detalle` links on desktop and mobile.

- [x] Write failing tests for action visibility and correct destinations.
- [x] Add accessible links while preserving loading, error, empty, desktop table, and mobile cards.
- [x] Run the focused tests until green.

### Task 5: Odoo-style consultation form

**Files:**
- Create: `src/frontend/src/pages/Patients/consultationSchema.js`
- Create: `src/frontend/src/pages/Patients/ConsultationRecordPage.jsx`
- Modify: `src/frontend/src/App.test.jsx`

**Interfaces:**
- Consumes: patient and consultation service methods plus permissions.
- Produces: one inline-editable page for consultation creation, viewing, and editing.

- [x] Write failing behavior tests for defaults, every clinical group, dirty actions, POST, PATCH, discard, errors, read-only mode, live metadata, and navigation blocking.
- [x] Implement normalized empty and loaded forms with `baselineForm`, `form`, and derived `isDirty`.
- [x] Render text-like accessible controls, cloud save, X discard, and the existing unsaved-change dialog pattern.
- [x] Keep the draft after API failures and refresh the baseline only after successful persistence.
- [x] Run all frontend tests until green.

### Task 6: Documentation and complete verification

**Files:**
- Modify: `docs/user-stories/HU-10-patient-registration.md`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-08-08-inline-patient-consultation-records.md`

- [x] Document consultation routes, capabilities, behavior, migration, and the deliberate lack of summary synchronization.
- [x] Run `python manage.py test` and `python manage.py makemigrations --check --dry-run` from `src/backend`.
- [x] Run `npm test -- --run`, `npm run lint`, and `npm run build` from `src/frontend`.
- [x] Validate desktop and mobile flows in Chromium with no overflow or console errors.
- [x] Review the diff and commit as `feat: add inline patient consultation records`.

### Task 7: Remove duplicated consultation fields from the patient summary

**Files:**
- Modify: `src/frontend/src/pages/Patients/PatientRecordPage.jsx`
- Modify: `src/frontend/src/pages/Patients/patientRecordSchema.js`
- Test: `src/frontend/src/App.test.jsx`

- [x] Add regressions proving that consultation sections are absent from **Resumen clínico** and excluded from patient `POST/PATCH` payloads.
- [x] Keep patient identity, contact, family history, and structured disease antecedents editable in the summary.
- [x] Remove consultation metadata, anamnesis, systems review, physical examination, diagnosis, plan, budget, and treatment cards from the summary.
- [x] Leave backend fields and stored legacy values intact; no destructive migration or automatic synchronization is introduced.
