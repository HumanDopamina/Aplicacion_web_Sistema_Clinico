# Odoo-style Inline Patient Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the patient record's global edit mode with permission-aware inline editing and explicit dirty-state save/discard actions.

**Architecture:** `PatientRecordPage` keeps a normalized draft and persisted baseline, deriving dirtiness instead of toggling an edit state. Authorized fields remain interactive with read-like styling; React Router's data router blocks navigation while the draft is dirty, while the existing API continues to provide `POST` and `PATCH` persistence.

**Tech Stack:** React 19, React Router 7 data router, Tailwind CSS 4, Vitest, Testing Library, Playwright.

## Global Constraints

- Preserve the current patient header, cards, layout, tabs, URLs, API contracts, and role permissions.
- Use inline SVG icons and add no dependencies.
- Keep unauthorized users read-only.
- Update HU-10 documentation and finish with commit `feat: add Odoo-style inline patient editing`.

---

### Task 1: Lock the inline-editing behavior with tests

**Files:**
- Modify: `src/frontend/src/App.test.jsx`

**Interfaces:**
- Consumes: existing patient fixtures and authenticated route helper.
- Produces: acceptance coverage for immediate editing, dirty actions, save/discard, permissions, errors, and navigation protection.

- [x] Replace the edit-toggle scenario with expectations that authorized fields are immediately interactive and no **Editar expediente** control exists.
- [x] Assert that **Guardar cambios** and **Descartar cambios** remain hidden until a real field change, the header updates live, discard restores the baseline without `PATCH`, and save performs `PATCH` then clears dirtiness without disabling the fields.
- [x] Cover `POST` creation, new-record discard, API failure preservation, read-only permissions, and navigation confirmation.
- [x] Run `npm test -- --run src/App.test.jsx -t "HU-10"` and confirm failures come from the missing inline behavior.

### Task 2: Implement draft-based inline fields and actions

**Files:**
- Modify: `src/frontend/src/pages/Patients/PatientRecordPage.jsx`

**Interfaces:**
- Consumes: `createPatient`, `getPatient`, `updatePatient`, current auth permissions and patient schema.
- Produces: `baselineForm`, `form`, derived `isDirty`, and permission-aware inline field/disease controls.

- [x] Normalize loaded and empty forms, store the persisted baseline, and derive dirtiness from stable form snapshots.
- [x] Replace `isEditing` branches with `canModify`; render scalar fields as transparent controls with visible hover/focus states and keep computed fields read-only.
- [x] Keep disease summaries compact and open their local checkbox editor on interaction.
- [x] Render inline cloud and X buttons only while dirty; save resets the baseline, discard restores it, and new-record discard returns to `/pacientes`.
- [x] Keep draft/actions on API errors and update patient header content live from the form.
- [x] Run the focused HU-10 tests until these behaviors pass.

### Task 3: Protect unsaved navigation

**Files:**
- Modify: `src/frontend/src/main.jsx`
- Modify: `src/frontend/src/pages/Patients/PatientRecordPage.jsx`
- Modify: `src/frontend/src/App.test.jsx`

**Interfaces:**
- Produces: data-router context, an accessible unsaved-changes dialog, and native unload protection.

- [x] Switch production startup to `createBrowserRouter` and `RouterProvider` without changing route definitions or URLs; use `createMemoryRouter` in App integration tests.
- [x] Block internal navigation only while dirty and not saving; allow explicit save/discard navigation.
- [x] Offer **Seguir editando** and **Descartar y salir**, and register `beforeunload` while dirty.
- [x] Verify navigation tests and the full App suite.

### Task 4: Document and verify the finished interaction

**Files:**
- Modify: `docs/user-stories/HU-10-patient-registration.md`
- Modify: `README.md`

**Interfaces:**
- Produces: user-facing description of inline edits, permissions, dirty actions, and navigation safety.

- [x] Update documentation to remove the edit-toggle workflow and describe cloud/X behavior.
- [x] Run `npm test -- --run`, `npm run lint`, and `npm run build`.
- [x] Use Playwright to verify existing, dirty, saved, read-only, and new-record states on desktop and mobile with no console errors.
- [x] Inspect the final diff and commit the scoped changes as `feat: add Odoo-style inline patient editing`.
