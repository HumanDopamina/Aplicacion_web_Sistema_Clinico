# HU-35 and HU-41 Clinical Record PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a reproducible, printable clinical-record PDF on demand with current institutional identity and an authenticated frontend download action.

**Architecture:** Add a pure PDF builder in the patients domain that receives already-scoped ORM objects and returns bytes without persisting records. Expose it through one patient-scoped DRF endpoint requiring both patient and consultation read capabilities, and let the existing audit middleware record `CLINICAL_RECORD_EXPORT`. The React record page downloads the authenticated response as a blob and never renders clinical history for conversion.

**Tech Stack:** Django 5.2, Django REST Framework, ReportLab 5.0.1, Pillow, PostgreSQL, React 19, Vite, Vitest, Testing Library, pypdf/pdfplumber and Poppler for PDF QA.

## Global Constraints

- Implement only HU-35 and HU-41.
- Generate A4 PDF under demand; never persist it as `PatientDocument`.
- Add zero models, zero fields and zero migrations.
- Require both `patients.view` and `consultations.view` and preserve inactive-patient historical export.
- Use only current `ClinicProfile` fields and authorized logo storage; missing/corrupt logo must fall back to institutional name.
- Do not expose filesystem paths, clinical content in logs, or PII-heavy filenames.
- Keep current clinical models immutable and preserve Patient 3, ClinicalRecord 2, Consultation 2, Appointment 5, OdontogramVersion 5 and PatientDocument 4.
- Do not implement signatures, email, ZIP, patient portal, antimalware, addenda or odontogram changes.

---

### Task 1: Backend PDF contract and dependency

**Files:**
- Create: `src/backend/apps/patients/test_clinical_record_export.py`
- Create: `src/backend/apps/patients/clinical_record_pdf.py`
- Modify: `src/backend/requirements.txt`

**Interfaces:**
- Produces: `build_clinical_record_pdf(*, patient, clinic, generated_at) -> bytes`.
- Consumes: patient relations `clinical_record`, chronological consultations, treatment items, latest odontogram and document metadata.

- [ ] **Step 1: Write failing PDF-content tests**

Create real ORM fixtures and assert a valid non-empty PDF contains literal patient/institutional data, chronological consultation text, clinical alerts, separated treatment states, a current odontogram textual summary and document references without embedded attachments.

- [ ] **Step 2: Run tests and verify RED**

Run: `.venv\Scripts\python.exe manage.py test apps.patients.test_clinical_record_export --settings=config.settings.test`

Expected: FAIL because the builder/route does not exist.

- [ ] **Step 3: Add ReportLab 5.0.1 and minimal builder**

Pin `reportlab==5.0.1`. Use `SimpleDocTemplate` with A4 margins, repeatable institutional header, patient identity, generated timestamp, page number, safe escaped paragraphs and split-capable tables. Read logo bytes through Django storage and fall back on any missing/corrupt-image error.

- [ ] **Step 4: Re-run content tests until GREEN**

Require valid `%PDF`, extractable expected text and more than one page for a deliberately long fixture so page breaks/header/footer are exercised.

---

### Task 2: Authenticated export endpoint, privacy and audit

**Files:**
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/patients/urls.py`
- Modify: `src/backend/apps/audit/tests.py`
- Test: `src/backend/apps/patients/test_clinical_record_export.py`

**Interfaces:**
- Produces: `GET /api/patients/{id}/clinical-record/export/`.
- Produces headers: `application/pdf`, attachment filename based on patient code, `Cache-Control: private, no-store`, `Pragma: no-cache`, `X-Content-Type-Options: nosniff`.
- Produces audit action: `CLINICAL_RECORD_EXPORT` with actor/patient/timestamp and empty clinical metadata.

- [ ] **Step 1: Write failing endpoint/privacy tests**

Assert authentication, both capabilities, 404, inactive export, safe filename/headers, exact audit metadata, and unchanged model counts/state after export.

- [ ] **Step 2: Verify RED**

Run the focused backend module and require route/permission/audit failures.

- [ ] **Step 3: Implement view and route**

Load the patient and current clinic profile without creating configuration rows, prefetch only required patient-scoped relations, generate bytes, set safe headers, and assign `request.audit_action = "CLINICAL_RECORD_EXPORT"` before resolution.

- [ ] **Step 4: Re-run focused backend tests until GREEN**

Require every authorization, immutability, header and audit assertion to pass.

---

### Task 3: Dynamic institutional identity and logo fallback

**Files:**
- Modify: `src/backend/apps/patients/clinical_record_pdf.py`
- Test: `src/backend/apps/patients/test_clinical_record_export.py`

**Interfaces:**
- Consumes: current `ClinicProfile.name`, `tagline`, `phone`, `email`, `address`, `timezone` and `logo` storage object.
- Produces: header rendering that is request-current, contains no storage path, and survives absent/missing/corrupt logo.

- [ ] **Step 1: Write failing dynamic-profile tests**

Export with profile/logo A, update the same profile to B, export again, and assert A remains unchanged in memory while the new bytes contain B. Add absent, missing-file and corrupt-logo cases.

- [ ] **Step 2: Verify RED**

Run only the HU-41 tests and require failures on missing dynamic header/fallback behavior.

- [ ] **Step 3: Implement safe logo loading and current-profile header**

Read the storage file into memory, validate it with Pillow, pass bytes to ReportLab, catch storage/image/rendering exceptions and render clinic name/contact text regardless.

- [ ] **Step 4: Re-run HU-41 tests until GREEN**

Require both exports to reflect their generation-time profile and no PDF/storage path leakage.

---

### Task 4: Frontend authenticated download experience

**Files:**
- Modify: `src/frontend/src/services/api.js`
- Modify: `src/frontend/src/services/api.test.js`
- Modify: `src/frontend/src/services/patientService.js`
- Modify: `src/frontend/src/services/patientService.test.js`
- Modify: `src/frontend/src/pages/Patients/PatientRecordPage.jsx`
- Create: `src/frontend/src/pages/Patients/PatientClinicalRecordExport.test.jsx`

**Interfaces:**
- Produces: `apiFileRequest(path, options) -> Promise<{blob, filename}>`.
- Produces: `exportPatientClinicalRecord(access, patientId)`.
- Produces UI action: `Exportar PDF`, visible only with both read capabilities, single-flight disabled/loading behavior, browser download and API error message.

- [ ] **Step 1: Write failing service and UI tests**

Assert exact authenticated URL, RFC-compatible filename extraction, visibility by permission, no button on create, one request across double click, loading state, download name, object URL cleanup and 403/404/500 message.

- [ ] **Step 2: Verify RED**

Run focused service/page suites and require missing function/button failures.

- [ ] **Step 3: Implement minimal file response and page action**

Add a response-preserving API helper and patient service. In the page event handler, await the download, create/click/revoke one object URL, and use a primitive `exporting` state to disable the action.

- [ ] **Step 4: Re-run focused frontend tests until GREEN**

Require no duplicate request, no unauthorized render and no React warnings.

---

### Task 5: Visual QA, regressions and documentation

**Files:**
- Create: `docs/user-stories/HU-35-clinical-record-pdf-export.md`
- Create: `docs/user-stories/HU-41-institutional-pdf-header.md`
- Modify: `README.md`

**Interfaces:**
- Produces acceptance evidence and an inspected representative PDF under temporary QA output only; no generated patient PDF is committed.

- [ ] **Step 1: Render and inspect a representative PDF**

Generate from controlled synthetic fixtures, inspect with `pdfinfo`/`pypdf`, render every page with `pdftoppm`, inspect PNG pages and remove temporary clinical output after QA.

- [ ] **Step 2: Verify PostgreSQL counts and zero schema changes**

Assert literal before/after counts 3/2/2/5/5/4 and `makemigrations --check --dry-run` reports `No changes detected`.

- [ ] **Step 3: Run complete verification gates**

Run full backend/frontend suites, `pip check`, dependency audit when available, lint, build, `manage.py check`, `migrate --check`, `makemigrations --check --dry-run` and `git diff --check`.

- [ ] **Step 4: Document and inspect scope**

Create both user-story evidence files, update the implemented-story README summary, confirm Product Backlog is untouched, and do not create a mixed commit from the pre-existing dirty worktree.
