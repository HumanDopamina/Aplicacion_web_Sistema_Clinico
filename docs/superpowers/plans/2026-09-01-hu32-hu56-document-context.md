# HU-32 and HU-56 Document Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make clinical photographs an explicit category of the existing private patient document repository and add optional consultation/tooth context without invalidating historical documents.

**Architecture:** Keep `PatientDocument` as the only persisted document/photo entity. Use its existing normalized `category` as the functional classification and existing `mime_type` as the content/preview source of truth; add only nullable `consultation` and `tooth_code` fields, validate them at the document API boundary, and expose a permission-aware `{id, date}` consultation summary. Extend the existing list/create/detail URLs and current document page rather than adding a gallery or parallel API.

**Tech Stack:** Django 5.2, Django REST Framework, PostgreSQL, private Django storage, Pillow content validation, React 19, Vite, Vitest, Testing Library.

## Global Constraints

- Implement only HU-32 and HU-56.
- Do not create `ClinicalPhoto`, a photo gallery, a Tooth table, parallel storage, OCR/AI, antimalware quarantine, electronic signatures, record PDF/printing, institutional headers, or TreatmentItem changes.
- Keep Patient mandatory; make Consultation and FDI tooth optional.
- Keep extension, MIME, size, content, Pillow and private-storage validation unchanged.
- Do not expose consultation notes, diagnoses, TreatmentItems, alerts or any consultation field beyond `id` and `date`.
- Do not infer context for historical documents; all four current documents must receive NULL fields.
- Preserve Patient 3, ClinicalRecord 2, Consultation 2, Appointment 5, OdontogramVersion 5 and Document 4.
- Preserve all pre-existing dirty-worktree changes and do not create a mixed commit.

---

### Task 1: Document domain contract and safe migration

**Files:**
- Modify: `src/backend/apps/patients/models.py`
- Create: `src/backend/apps/patients/migrations/0016_patientdocument_consultation_and_tooth_code.py`
- Modify: `src/backend/apps/patients/test_migrations.py`

**Interfaces:**
- Produces: `PatientDocument.consultation -> Consultation | None` with `PROTECT` and `related_name="documents"`.
- Produces: `PatientDocument.tooth_code -> str | None`, maximum two characters.

- [ ] **Step 1: Write the failing migration preservation test**

Create four historical `PatientDocument` rows at migration state `0015`, migrate to `0016`, and assert literal count `4`, unchanged patient/file metadata, `consultation_id is None`, `tooth_code is None`, nullable fields and protected FK deletion.

- [ ] **Step 2: Run the migration test and verify RED**

Run: `.venv\Scripts\python.exe manage.py test apps.patients.test_migrations.PatientDocumentContextMigrationTests --settings=config.settings.test`

Expected: FAIL because migration `0016` and fields do not exist.

- [ ] **Step 3: Add the two nullable model fields and generate the migration**

Implement:

```python
consultation = models.ForeignKey(
    Consultation,
    on_delete=models.PROTECT,
    related_name="documents",
    null=True,
    blank=True,
)
tooth_code = models.CharField(max_length=2, null=True, blank=True)
```

Add an index on `(patient, consultation)` for the required filter; generate a schema-only migration with no default, `RunPython`, or backfill.

- [ ] **Step 4: Re-run the migration test until GREEN**

Run the exact test from Step 2 and require count/context preservation.

---

### Task 2: HU-32/HU-56 API validation, filters and metadata update

**Files:**
- Modify: `src/backend/apps/patients/serializers.py`
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/patients/urls.py`
- Modify: `src/backend/apps/patients/test_documents.py`
- Modify: `src/backend/apps/audit/tests.py`

**Interfaces:**
- Consumes: existing `POST/GET /api/patients/{patient_id}/documents/` and `PATCH /api/patients/{patient_id}/documents/{document_id}/`.
- Consumes input: optional `consultation_id`, nullable `tooth_code`, and category `Fotografía clínica`.
- Produces output: `consultation: {id, date} | null` and `tooth_code: str | null`, hidden as null without `consultations.view`.
- Produces filters: `category` and `consultation_id` on the existing document list.

- [ ] **Step 1: Write failing behavioral API tests**

Add literal cases for Patient only, Patient+Consultation, Patient+tooth, all three, cross-patient consultation rejection, invalid FDI rejection, photo category accepting valid images but rejecting PDF/corrupt images, consultation filtering, minimal response fields, no-context privacy without `consultations.view`, inactive upload/update rejection, historical reads and PATCH audit changed fields.

- [ ] **Step 2: Run focused document/audit tests and verify RED**

Run: `.venv\Scripts\python.exe manage.py test apps.patients.test_documents apps.audit.tests.AuditTrailTests.test_document_context_update_records_safe_changed_fields --settings=config.settings.test`

Expected: FAIL on missing fields, PATCH method, filters and validation.

- [ ] **Step 3: Implement minimal serializers and permission-aware context**

Add explicit `consultation_id` relation input, normalized optional FDI validation against `PERMANENT_TEETH | PRIMARY_TEETH`, same-patient validation, and the existing `{id,date}` summary. Reject clinical context input unless the actor has `consultations.view`; never serialize more consultation data.

- [ ] **Step 4: Extend existing views without parallel endpoints**

Select-related consultation on reads; apply `consultation_id` only after validation and permission checks; add PATCH to the existing document detail URL using `documents.create`; keep inactive patients read-only and physical deletion/storage behavior unchanged. Mark only `category`, `consultation_id`, and `tooth_code` as safe audit fields.

- [ ] **Step 5: Re-run focused backend tests until GREEN**

Run the command from Step 2 plus all `apps.patients.test_documents` cases.

---

### Task 3: Bounded minimal consultation options

**Files:**
- Modify: `src/backend/apps/patients/serializers.py`
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/patients/tests.py`
- Modify: `src/frontend/src/services/patientService.js`
- Modify: `src/frontend/src/services/patientService.test.js`

**Interfaces:**
- Consumes: existing `GET /api/patients/{id}/consultations/?compact=true&page_size=100` with `consultations.view`.
- Produces: paginated summaries containing only `id` and `date`.
- Produces frontend function: `listPatientConsultationOptions(access, patientId)`.

- [ ] **Step 1: Write failing API/service tests**

Assert the compact response keys are exactly `id,date`, remains patient-scoped and permission-protected; assert the frontend emits the literal compact bounded URL. Also assert document requests encode `consultation_id` and multipart/PATCH payloads carry nullable context.

- [ ] **Step 2: Verify RED**

Run the focused Django consultation test and `npm test -- src/services/patientService.test.js -t "document context|consultation options" --reporter=dot`.

- [ ] **Step 3: Implement compact serializer selection and service methods**

Use `get_serializer_class()` only for GET+`compact=true`, and `.only("id", "date")` so full clinical rows are not serialized. Add document filters and update service methods without manually setting multipart content type.

- [ ] **Step 4: Re-run focused tests until GREEN**

Require both focused suites to pass.

---

### Task 4: Existing document repository UI

**Files:**
- Modify: `src/frontend/src/pages/Patients/PatientDocumentsPage.jsx`
- Modify: `src/frontend/src/pages/Patients/PatientDocumentDialogs.jsx`
- Modify: `src/frontend/src/pages/Patients/patientDocumentDisplay.js`
- Modify: `src/frontend/src/pages/Patients/PatientDocumentsPage.test.jsx`

**Interfaces:**
- Consumes: existing paginated document list, minimal consultation options and permission-aware context.
- Produces: clinical-photo category upload/filter/label/preview, consultation filter, optional consultation/tooth inputs and compact context display/editing.

- [ ] **Step 1: Write failing UI behavior tests**

Use complete document fixtures. Assert a valid clinical image is labeled `Fotografía clínica`, opens an authenticated `<img>` preview, can be filtered by that category, and remains in the normal repository. Assert upload sends optional consultation/tooth; list filter sends consultation; detail renders `Consulta · 01/09/2026` and `Pieza 16`; metadata editing updates the same dialog; users without consultation permission neither request options nor see context.

- [ ] **Step 2: Run the page suite and verify RED**

Run: `npm test -- src/pages/Patients/PatientDocumentsPage.test.jsx --reporter=dot`

Expected: failures for missing filters, controls, context labels and update path.

- [ ] **Step 3: Implement parallel bounded loading and derived display**

Load patient/categories/minimal consultation options in one `Promise.all` only when `consultations.view` is present. Keep document loading independent and add the selected consultation ID to its existing filter object. Reuse category and MIME rather than adding client classification state.

- [ ] **Step 4: Extend the existing dialogs**

Add an always-available `Fotografía clínica` suggestion, optional consultation and FDI controls when authorized, compact context in detail, and a metadata edit mode that PATCHes the existing document URL. Keep blob URL cleanup and private content endpoint unchanged.

- [ ] **Step 5: Re-run the page and service tests until GREEN**

Run both frontend files and require no React warnings.

---

### Task 5: PostgreSQL baseline, regression gates and documentation

**Files:**
- Create: `docs/user-stories/HU-32-clinical-photos.md`
- Create: `docs/user-stories/HU-56-document-clinical-context.md`
- Modify: `README.md`

**Interfaces:**
- Produces: acceptance evidence and preserves the requested development baseline.

- [ ] **Step 1: Apply migration to an isolated PostgreSQL schema**

Create a uniquely verified `codex_documents_*` schema, migrate through `0016`, run migration/API PostgreSQL checks, then drop only that schema. Verify FK `PROTECT`, nullable fields and all historical document rows.

- [ ] **Step 2: Apply the migration to development and verify literal counts**

Record before and after Patient `3`, ClinicalRecord `2`, Consultation `2`, Appointment `5`, OdontogramVersion `5`, Document `4`; assert all four document contexts remain NULL.

- [ ] **Step 3: Run every requested verification gate**

Run full backend/frontend suites, `npm run lint`, `npm run build`, `manage.py check`, `manage.py migrate --check`, `manage.py makemigrations --check --dry-run`, and `git diff --check`.

- [ ] **Step 4: Document and audit scope**

Create the two story evidence files, update the implemented-story README summary, inspect the scoped diff, and confirm no Product Backlog, gallery, storage, TreatmentItem, odontogram, signature, print/PDF or antimalware feature changed.
