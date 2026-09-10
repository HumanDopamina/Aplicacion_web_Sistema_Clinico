# MVP Immediate Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining P2/P3 QA defects and leave the desktop MVP bounded, accessible, and free of placeholder controls.

**Architecture:** Django list endpoints return one shared page-number contract while React pages own the current page and render one reusable pager. Existing clinic configuration becomes the canonical destination for legacy `/usuarios` and `/clinicas` links. The staff dialog receives keyboard containment and focus restoration without introducing a new modal framework.

**Tech Stack:** Django REST Framework, React 19, React Router, Vitest, Testing Library, Tailwind CSS, Vite, Playwright.

## Global Constraints

- Preserve the existing role and capability model.
- Keep Google Calendar and notifications out of the MVP.
- Do not add a new component library.
- Pagination uses 25 rows by default, accepts `page_size`, and never exceeds 100.
- Follow TDD: every behavior change begins with a failing observable test.
- Preserve unrelated working-tree changes.

---

### Task 1: Bound API collections and restore HTTP method semantics

**Files:**
- Create: `src/backend/apps/common/pagination.py`
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/users/views.py`
- Modify: `src/backend/apps/appointments/views.py`
- Modify: `src/backend/apps/users/permissions.py`
- Test: `src/backend/apps/patients/tests.py`
- Test: `src/backend/apps/patients/test_documents.py`
- Test: `src/backend/apps/users/tests.py`
- Test: `src/backend/apps/appointments/tests.py`

**Interfaces:**
- Produces: `{count: number, next: string|null, previous: string|null, results: array}`.
- Produces: unsupported authenticated methods return `405`; supported unauthorized methods remain `403`.

- [ ] **Step 1: Write failing pagination and method tests**

```python
response = self.client.get(url, {"page_size": 2})
self.assertEqual(response.data["count"], 3)
self.assertEqual(len(response.data["results"]), 2)
self.assertIsNotNone(response.data["next"])
self.assertEqual(self.client.delete(patient_url).status_code, 405)
```

- [ ] **Step 2: Run focused Django tests and confirm missing page envelopes plus the current `403` failure.**
- [ ] **Step 3: Add `StandardPageNumberPagination`, apply it to patients, staff, consultations, odontograms, documents and appointments, and bypass capability rejection only for methods DRF does not expose.**
- [ ] **Step 4: Run focused Django tests and confirm the page contract, maximum size and `403`/`405` distinction.**
- [ ] **Step 5: Commit with `perf: paginate mvp collections`.**

### Task 2: Consume pagination without hiding records

**Files:**
- Create: `src/frontend/src/components/PaginationControls.jsx`
- Create: `src/frontend/src/components/PaginationControls.test.jsx`
- Modify: `src/frontend/src/services/patientService.js`
- Modify: `src/frontend/src/services/patientService.test.js`
- Modify: `src/frontend/src/services/userService.js`
- Modify: `src/frontend/src/services/userService.test.js`
- Modify: `src/frontend/src/services/appointmentService.js`
- Modify: `src/frontend/src/services/appointmentService.test.js`
- Modify: patient, document, consultation, odontogram, staff and appointment pages and tests.

**Interfaces:**
- Consumes: DRF page envelope from Task 1.
- Produces: `PaginationControls({page, pageSize, count, onPageChange, label})` and page-aware list service arguments.

- [ ] **Step 1: Write failing service and component tests**

```jsx
render(<PaginationControls page={2} pageSize={25} count={60} onPageChange={change} label="Pacientes" />)
fireEvent.click(screen.getByRole('button', { name: 'Página siguiente de Pacientes' }))
expect(change).toHaveBeenCalledWith(3)
```

- [ ] **Step 2: Confirm tests fail because services omit `page` and the pager does not exist.**
- [ ] **Step 3: Implement the shared pager, reset page on filter changes, preserve totals and request bounded appointment ranges.**
- [ ] **Step 4: Update observable page tests and run all affected Vitest files.**
- [ ] **Step 5: Commit with `perf: add accessible list pagination`.**

### Task 3: Remove incomplete UI and make staff dialog keyboard-safe

**Files:**
- Modify: `src/frontend/src/App.jsx`
- Modify: `src/frontend/src/App.test.jsx`
- Modify: `src/frontend/src/components/Navbar.jsx`
- Modify: `src/frontend/src/pages/Settings/SettingsPage.jsx`
- Modify: `src/frontend/src/pages/Settings/SettingsPage.test.jsx`

**Interfaces:**
- Produces: `/usuarios` → `/configuracion?seccion=staff`; `/clinicas` → `/configuracion?seccion=perfil`.
- Produces: no notifications or fake global-search controls.
- Produces: staff dialog closes on `Escape`, traps `Tab`, and restores focus to its opener.

- [ ] **Step 1: Write failing route, absence and keyboard tests.**
- [ ] **Step 2: Confirm the placeholder headings, notification controls and escaped focus remain observable.**
- [ ] **Step 3: Redirect legacy routes, derive the settings section from the URL, remove excluded controls, and implement dialog keyboard lifecycle.**
- [ ] **Step 4: Run App, Navbar and Settings tests.**
- [ ] **Step 5: Commit with `fix: polish mvp navigation and dialogs`.**

### Task 4: Optimize login presentation and release metadata

**Files:**
- Replace: `src/frontend/src/assets/logo_login.svg`
- Modify: `src/frontend/src/pages/Auth/LoginPage.jsx`
- Modify: `src/frontend/src/pages/Auth/LoginPage.test.jsx`
- Modify: `src/frontend/index.html`

**Interfaces:**
- Produces: vector logo below 20 KB, Spanish metadata, responsive login at narrow widths, explicit image dimensions and localized placeholders.

- [ ] **Step 1: Write failing tests for localized fields and responsive/decorative image contract.**
- [ ] **Step 2: Confirm current English placeholder and missing dimensions fail.**
- [ ] **Step 3: Replace the embedded bitmap logo with native SVG, update responsive layout and metadata.**
- [ ] **Step 4: Run login tests and confirm the production bundle no longer contains a 500 KB logo.**
- [ ] **Step 5: Commit with `fix: optimize responsive login assets`.**

### Task 5: Regression and browser acceptance

**Files:**
- Modify: `docs/qa/2026-08-28-full-qa-report.md`
- Modify: `README.md` only for the new page contract if its existing unrelated hunks can be preserved.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: regression evidence for the remaining QA defects.

- [ ] **Step 1: Run Django, Vitest, Oxlint, Vite build, migration checks and `check --deploy`.**
- [ ] **Step 2: Run Chromium at 1440×900 and a narrow viewport; verify pagination, legacy redirects, keyboard modal, login and absence of dead controls.**
- [ ] **Step 3: Append a dated remediation table without rewriting historical evidence.**
- [ ] **Step 4: Review `git diff --check`, status and commit scope.**

## Self-review

- Coverage: the plan maps every item in the requested immediate MVP polish to an API, UI, asset or verification task.
- Placeholder scan: implementation steps name exact contracts and observable outcomes; no implementation placeholders remain.
- Type consistency: every paginated consumer uses the same `count/next/previous/results` envelope and page-number input.

