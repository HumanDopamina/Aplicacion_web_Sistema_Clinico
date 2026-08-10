# Patient Documents Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with strict red-green-refactor cycles. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable authenticated clinical document upload, browsing, preview, download, and physical deletion from the patient record.

**Architecture:** Store metadata in `PatientDocument` and file content under an unserved private storage root with UUID filenames. Patient-scoped DRF endpoints enforce capabilities and return only metadata; a separate authenticated streaming endpoint serves blobs. React adds a lazy route with batch upload and centered preview dialogs.

**Tech Stack:** Django 5.2, Django REST Framework, Pillow, React 19, Vite, Vitest, Testing Library, Playwright.

## Global Constraints

- Accept PDF, JPG, PNG, and WebP only.
- Maximum 10 MB per file, 10 files per batch, and 50 MB combined.
- Documents belong only to patients; no consultation relation or versioning.
- Reception and dentistry receive view/create by default; delete remains unassigned and configurable.
- Inactive patients are read-only for documents.
- Deletion removes both database record and physical file with no recovery.
- No new frontend dependencies.

---

### Task 1: Backend contract and private storage

- [x] Write failing API tests for role capabilities, patient scoping, batch uploads, validation boundaries, inactive patients, categories, secure content responses, and physical deletion.
- [x] Run the focused document tests and confirm failures are caused by missing document behavior.
- [x] Add `PatientDocument`, private storage, validators, serializers, views, URLs, migrations, and permission presets.
- [x] Re-run the focused backend tests until green; run migration consistency checks.

### Task 2: Frontend service contract

- [x] Write failing tests for multipart batch requests and authenticated blob requests with token refresh.
- [x] Add document methods to `patientService` and a blob-aware API request path that never parses binary responses as JSON.
- [x] Re-run focused service tests until green.

### Task 3: Patient Documents interface

- [x] Write failing tests for the enabled route/tab, loading/error/empty/list states, filtering, batch upload, preview, permissions, and inactive patients.
- [x] Add a lazy patient documents route, responsive list/cards, centered upload dialog, and centered blob preview dialog.
- [x] Keep object URL lifecycles, Escape handling, focus restoration, keyboard navigation, and visible focus within the components.
- [x] Re-run focused UI tests until green.

### Task 4: Documentation and release verification

- [x] Update README and create patient-documentation with API, permissions, retention, storage, and operational notes.
- [x] Run `python manage.py test`, `npm test`, `npm run lint`, `npm run build`, `makemigrations --check --dry-run`, and `git diff --check`.
- [x] Validate desktop/mobile, empty/populated/error states, preview, upload, deletion, keyboard, and console output with Playwright; capture evidence.
- [x] Commit `feat: add patient document management` and push `feature/documentos-pacientes`.
