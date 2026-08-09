# Unified Patient Record View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the current patient-record view as the single visual and behavioral surface for reading, editing, and creating patients.

**Architecture:** `PatientDetailPage` becomes `PatientRecordPage` and derives `isNew` from the route while managing `isEditing` locally. One record form state feeds shared display/edit primitives inside the existing header, tabs, cards, and section layout; creation uses `POST`, editing uses `PATCH`, and reading uses `GET` without navigating to a visually separate editor.

**Tech Stack:** React 19, React Router, Tailwind CSS utilities, Vitest, Testing Library.

## Global Constraints

- Preserve the existing record header, cards, sections, distribution, and tabs.
- The same component must support `isNew` and `isEditing` states.
- `/pacientes/nuevo` starts editable; `/pacientes/:id` starts read-only.
- Editing occurs in place and never navigates to `/pacientes/:id/editar`.
- Creation remains protected by `patients.create`; editing remains protected by `patients.edit` in both UI and API.
- Update HU-10 documentation and create a scoped commit.

---

### Task 1: Specify the unified state transitions

**Files:**
- Modify: `src/frontend/src/App.test.jsx`

**Interfaces:**
- Consumes: authenticated routes and complete patient fixture.
- Produces: behavioral contract for read, edit, create, cancel, `POST`, and `PATCH` states.

- [ ] **Step 1: Write failing behavior tests**

Change the HU-10 tests to assert that `/pacientes/nuevo` renders the same tabs and cards as `/pacientes/:id`, starts with editable fields, and saves with `POST`. Assert that “Editar expediente” converts values to controls on the same URL, cancel restores read mode, and save performs `PATCH` then returns to read mode without a second editor page.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --run src/App.test.jsx -t "HU-10"`

Expected: FAIL because new records use `PatientRecordFormPage` and existing editing navigates to `/editar`.

### Task 2: Build one record component with read/edit primitives

**Files:**
- Create: `src/frontend/src/pages/Patients/PatientRecordPage.jsx`
- Create: `src/frontend/src/pages/Patients/PatientRecordSection.jsx`
- Modify: `src/frontend/src/App.jsx`
- Delete: `src/frontend/src/pages/Patients/PatientDetailPage.jsx`
- Delete: `src/frontend/src/pages/Patients/PatientRecordFormPage.jsx`
- Delete: `src/frontend/src/pages/Patients/ClinicalRecordFields.jsx`

**Interfaces:**
- Consumes: `getPatient`, `createPatient`, `updatePatient`, `patientFields`, and `recordFields`.
- Produces: `PatientRecordPage({ isNew?: boolean })` and shared field/card primitives.

- [ ] **Step 1: Implement state initialization and persistence**

For `isNew`, initialize an empty record and set `isEditing=true`; otherwise fetch once and set read state. Build the nested API payload only in the save handler, select `POST` or `PATCH` from `isNew`, replace the new URL after creation, and keep the saved response as the read model.

- [ ] **Step 2: Implement shared display/edit controls**

Create `RecordValue` and `RecordSection` primitives. `RecordValue` renders a definition value in read mode and the matching input, textarea, select, checklist, or reference control in edit mode without changing its parent card or position.

- [ ] **Step 3: Preserve header, tabs, cards, and actions**

Reuse the existing patient header and four tabs. In new mode show a provisional code and name from current inputs. In read mode show “Editar expediente” when authorized; in edit mode show “Guardar expediente” and “Cancelar” in the same header action area.

- [ ] **Step 4: Remove obsolete routes and components**

Point both patient routes at `PatientRecordPage`, remove `/pacientes/:id/editar`, and delete the standalone editor components after all field groups are represented in the unified view.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- --run src/App.test.jsx -t "HU-10"`

Expected: all HU-10 tests pass.

### Task 3: Verify, document, and commit

**Files:**
- Modify: `docs/user-stories/HU-10-patient-registration.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: verified unified record behavior.
- Produces: updated acceptance evidence and repository commit.

- [ ] **Step 1: Update documentation**

Describe the single record component, `isNew`/`isEditing` transitions, unchanged visual structure, route behavior, permission boundaries, and API methods.

- [ ] **Step 2: Run complete verification**

Run `npm test`, `npm run lint`, and `npm run build`; verify read, inline edit, cancel, and new record states in Chromium at desktop and mobile widths with no console errors.

- [ ] **Step 3: Review and commit**

Run `git diff --check`, stage only the unified view, tests, plan, and docs, then commit with `feat: unify patient record view`.
