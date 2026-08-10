# HU-10 Complete Clinical Record Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the patient-registration modal with a full-page clinical-record form that persists every applicable field listed in `campos_expediente_clinico.md` and opens the saved record automatically.

**Architecture:** Keep permanent identity and demographic data on `Patient`; introduce a one-to-one `ClinicalRecord` for the initial consultation, anamnesis, examination, diagnosis, budget, and treatment. The patient API accepts and returns the record as a nested `clinical_record` object so registration remains one atomic transaction. React uses one reusable full-page editor for creation and later editing, while the read view keeps the established card-based visual language.

**Tech Stack:** Django 5.2, Django REST Framework, SQLite, React 19, React Router, Tailwind CSS utilities, Vitest, Testing Library.

## Global Constraints

- Preserve the existing clinical-record visual identity and responsive shell.
- `patients.create` protects `/pacientes/nuevo` and creation in the API; `patients.edit` protects updates.
- Keep `Patient.code`, audit fields, and record ownership read-only.
- The excluded Markdown sections are not implemented.
- Update `docs/user-stories/HU-10-patient-registration.md` and create one scoped commit.
- Do not stage or modify the untracked `DESING.md` file.

---

### Task 1: Persist the complete clinical record

**Files:**
- Modify: `src/backend/apps/patients/models.py`
- Modify: `src/backend/apps/patients/serializers.py`
- Modify: `src/backend/apps/patients/tests.py`
- Create: `src/backend/apps/patients/migrations/0002_clinical_record.py`

**Interfaces:**
- Consumes: existing `PatientListCreateView` and `PatientDetailView`.
- Produces: nested `clinical_record` in `PatientSerializer`; `ClinicalRecord(patient: OneToOneField)`.

- [ ] **Step 1: Write the failing API test**

Add `[HU-10]` coverage that posts permanent demographic values plus a nested record containing doctor data, consultation metadata, motive, current illness, all system-review groups, family/infectious/hereditary history, vitals, anthropometrics, physical examination, observations, diagnosis, plan, budget, treatment, and clinical-file descriptions. Assert the response and a subsequent detail request preserve representative values from every section.

- [ ] **Step 2: Run the focused backend test and verify RED**

Run: `src/backend/.venv/Scripts/python.exe src/backend/manage.py test apps.patients.tests.PatientApiTests.test_hu10_registers_complete_clinical_record`

Expected: FAIL because `clinical_record` and the additional demographic fields do not exist.

- [ ] **Step 3: Implement the models and nested serializer**

Add optional `origin`, `religion`, `education`, `profession`, `father_name`, `mother_name`, `information_source`, and `information_reliability` fields to `Patient`. Add `ClinicalRecord` with explicit text/decimal/date/time fields for scalar clinical data and JSON objects for the two named disease checklists. Create/update the nested record inside `transaction.atomic()` and keep `patient`, timestamps, and derived values read-only.

- [ ] **Step 4: Generate and inspect the migration**

Run: `src/backend/.venv/Scripts/python.exe src/backend/manage.py makemigrations patients`

Expected: one migration adding the demographic columns and `ClinicalRecord` table without destructive operations.

- [ ] **Step 5: Run patient backend tests and verify GREEN**

Run: `src/backend/.venv/Scripts/python.exe src/backend/manage.py test apps.patients`

Expected: all patient tests pass.

### Task 2: Replace the modal with a full-page record editor

**Files:**
- Create: `src/frontend/src/pages/Patients/PatientRecordFormPage.jsx`
- Create: `src/frontend/src/pages/Patients/ClinicalRecordFields.jsx`
- Modify: `src/frontend/src/App.jsx`
- Modify: `src/frontend/src/pages/Patients/PatientsPage.jsx`
- Modify: `src/frontend/src/pages/Dashboard/DashboardPage.jsx`
- Modify: `src/frontend/src/App.test.jsx`

**Interfaces:**
- Consumes: `createPatient(accessToken, payload)` and the nested serializer contract from Task 1.
- Produces: protected route `/pacientes/nuevo`; navigation to `/pacientes/{id}` after save.

- [ ] **Step 1: Write failing route and form tests**

Add tests proving both “Nuevo paciente” actions navigate to `/pacientes/nuevo`, the page is not a dialog, every Markdown section is visible through its heading, representative fields are editable, and successful save sends nested data then opens the generated expediente.

- [ ] **Step 2: Run focused frontend tests and verify RED**

Run: `npm test -- --run src/App.test.jsx`

Expected: FAIL because the new route/page and complete fields do not exist.

- [ ] **Step 3: Build the page editor**

Implement a two-column desktop layout with a sticky record identity rail, numbered clinical sections, restrained blue/cyan status accents, semantic fieldsets, mobile single-column fallbacks, keyboard-visible focus, and direct validation copy. Keep one form state object and derive the nested API payload only in the submit handler.

- [ ] **Step 4: Replace modal actions with navigation**

Change patient-list and dashboard buttons to `navigate('/pacientes/nuevo')`; register the route behind `patients.create`. Leave editing of an existing patient compatible until the detail editor is migrated to the same page.

- [ ] **Step 5: Run frontend tests and verify GREEN**

Run: `npm test -- --run src/App.test.jsx`

Expected: the focused patient workflows pass.

### Task 3: Render the persisted clinical record

**Files:**
- Modify: `src/frontend/src/pages/Patients/PatientDetailPage.jsx`
- Modify: `src/frontend/src/App.test.jsx`

**Interfaces:**
- Consumes: `patient.clinical_record` returned by `GET /api/patients/{id}/`.
- Produces: read-only cards covering every included Markdown section.

- [ ] **Step 1: Write a failing detail-view test**

Return a complete patient fixture and assert representative values from consultation, personal data, motive/history, systems, antecedents, physical examination, observations, diagnosis, plan, budget, treatment, and file descriptions are visible under correctly named sections.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/App.test.jsx -t "complete clinical record"`

Expected: FAIL because the current detail page only renders the basic summary.

- [ ] **Step 3: Implement complete read sections**

Preserve the header and cards, replace the placeholder summary with compact definition lists and checklist summaries, and show “Sin información registrada” only for genuinely empty optional values.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --run src/App.test.jsx -t "complete clinical record"`

Expected: PASS.

### Task 4: Documentation, complete verification, and commit

**Files:**
- Modify: `docs/user-stories/HU-10-patient-registration.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: verified implementation from Tasks 1–3.
- Produces: acceptance evidence and repository handoff.

- [ ] **Step 1: Update documentation**

Document the Patient/ClinicalRecord boundary, nested API shape, full-page `/pacientes/nuevo` workflow, permissions, included sections, excluded sections, migration, and automated evidence.

- [ ] **Step 2: Run complete verification**

Run backend `manage.py test`, frontend `npm test`, `npm run lint`, and `npm run build`; then validate creation and detail rendering in Chromium with a local API fixture and inspect screenshots.

- [ ] **Step 3: Review the diff and commit**

Stage only implementation, migration, tests, and docs. Run `git diff --cached --check`, then commit with `feat: expand HU-10 clinical record`.
