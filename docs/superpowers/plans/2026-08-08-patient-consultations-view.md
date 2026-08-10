# Patient Consultations View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, read-only consultations history to the existing patient record and leave one local demonstration record.

**Architecture:** Store consultations as records related to `Patient` and the professional `User`, preserving the professional reference with `PROTECT`. Expose an authenticated patient-scoped list endpoint and load it only when the Consultas tab becomes active. Keep consultation creation and detail outside this increment so the interface contains no inactive primary actions.

**Tech Stack:** Django 5, Django REST Framework, React 19, React Router 7, Tailwind CSS 4, Vitest, Testing Library, Playwright.

## Global Constraints

- Preserve the current patient header, record routes, inline-editing draft and unsaved-change protection.
- Reuse the existing `patients.view` capability for the read-only history.
- Order consultations from newest to oldest.
- Do not hardcode demonstration data in the frontend.
- Update documentation and create one scoped commit.

---

### Task 1: Persist and expose patient consultations

**Files:**
- Modify: `src/backend/apps/patients/models.py`
- Modify: `src/backend/apps/patients/serializers.py`
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/patients/urls.py`
- Modify: `src/backend/apps/patients/admin.py`
- Create: `src/backend/apps/patients/migrations/0003_consultation.py`
- Test: `src/backend/apps/patients/tests.py`

**Interfaces:**
- Produces: `GET /api/patients/{id}/consultations/` returning `id`, `date`, `consultation_type`, `consultation_type_display`, `professional`, `professional_name`, `summary`, `status`, and `status_display`.

- [x] Add a failing API test that creates two consultations and expects newest-first output for an authenticated user with `patients.view`.
- [x] Add a failing authorization test that expects `403` when the role preset lacks `patients.view`.
- [x] Implement `Consultation`, its serializer, list view, URL and admin registration.
- [x] Generate and inspect migration `0003_consultation.py`.
- [x] Run `python manage.py test apps.patients` and confirm the patient suite passes.

### Task 2: Render the Consultas tab

**Files:**
- Create: `src/frontend/src/pages/Patients/PatientConsultationsPanel.jsx`
- Modify: `src/frontend/src/pages/Patients/PatientRecordPage.jsx`
- Modify: `src/frontend/src/services/patientService.js`
- Test: `src/frontend/src/App.test.jsx`
- Test: `src/frontend/src/services/patientService.test.js`

**Interfaces:**
- Consumes: `listPatientConsultations(access, patientId)` and the existing authenticated patient record.
- Produces: an accessible Consultas tab with loading, error, empty and populated table/card states.

- [x] Add a failing service test for the patient-scoped consultations endpoint.
- [x] Add failing UI tests that activate Consultas, render the persisted row and show useful empty/error states.
- [x] Implement `listPatientConsultations` and a focused `PatientConsultationsPanel` that fetches only while mounted.
- [x] Convert record tabs to accessible buttons, retain Resumen clínico as the default, and disable non-summary tabs for unsaved new patients.
- [x] Run focused frontend tests and confirm they pass.

### Task 3: Document, seed locally and verify

**Files:**
- Modify: `docs/user-stories/HU-10-patient-registration.md`
- Modify: `README.md`

**Interfaces:**
- Produces: documented endpoint/scope and one consultation linked to the existing local demonstration patient.

- [x] Update HU-10 and README with the read-only consultations history and deferred creation/detail scope.
- [x] Apply migrations and create one idempotent local demonstration consultation for the existing patient named Leonel.
- [x] Run backend tests, `npm test -- --run`, `npm run lint`, and `npm run build`.
- [x] Verify the populated consultation state at desktop and mobile widths with no browser console errors; verify empty/error states through integration tests.
- [x] Inspect the diff and commit as `feat: add patient consultations history`.
