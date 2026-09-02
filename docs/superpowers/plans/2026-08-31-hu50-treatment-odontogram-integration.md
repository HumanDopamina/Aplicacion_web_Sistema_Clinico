# HU-50 Treatment/Odontogram Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Derive the odontogram planning overlay from pending TreatmentItems and atomically record an explicitly confirmed dental result when a treatment is performed.

**Architecture:** TreatmentItem remains the longitudinal plan and lifecycle source; OdontogramVersion remains the immutable observable dental state. A minimal patient overlay endpoint projects pending dental TreatmentItems. An optional perform payload applies one confirmed current finding to a new immutable version and records a nullable one-to-one result link for traceability and idempotency.

**Tech Stack:** Django 5.2, Django REST Framework, PostgreSQL row locking/transactions, React 19, Vite, Vitest, Testing Library.

## Global Constraints

- Do not infer a result from service, description, price, diagnosis, status, or planned_finding.
- Do not persist the derived overlay in OdontogramVersion.
- Preserve historical `planned` JSON without conversion or deletion.
- `odontogram_result` is optional; without it no version is created.
- With a result, transition and version creation are one transaction and one version per TreatmentItem.
- Do not implement HU-51, follow-up, billing, payments, backfill, or a TreatmentPlan model.
- Preserve all pre-existing user changes in the dirty worktree.

## Current schema and decisions

- Schema version is `1`. `teeth` maps FDI codes to `{reviewed, note, current, planned}`; each layer contains `{whole: [], surfaces: {surface: [finding]}}`.
- Current surface findings: `CARIES`, `RESTORATION`, `SEALANT`, `FRACTURE`; current whole findings: `MISSING`, `UNERUPTED`, `CROWN`, `IMPLANT`, `ROOT_CANAL`.
- Planned surface findings: `RESTORATION`, `SEALANT`; planned whole findings: `CROWN`, `IMPLANT`, `ROOT_CANAL`, `EXTRACTION`. TreatmentItem already validates against exactly this planned vocabulary.
- Initial versions copy the latest patient snapshot using `deepcopy`; revisions normalize the full snapshot, compute changed teeth, lock Patient, use a global version number, and link `based_on`.
- Historical versions are immutable because update/delete are rejected. PostgreSQL currently has 5 versions and zero versions with non-empty manual planning.
- Manual `planned` JSON remains valid historical data but the live planning UI will use the derived TreatmentItem overlay. No historical data is rewritten.
- Existing permissions use `consultations.view` for odontogram read and `consultations.edit` for both treatment and odontogram edit; therefore result recording requires the same existing edit capability, with backend enforcement.

---

### Task 1: Explicit result traceability migration

**Files:**
- Modify: `src/backend/apps/patients/models.py`
- Create: `src/backend/apps/patients/migrations/0013_treatmentitem_resulting_odontogram_version.py`
- Modify: `src/backend/apps/patients/test_migrations.py`

**Interfaces:**
- Produces: `TreatmentItem.resulting_odontogram_version: OneToOneField[OdontogramVersion] | None`, nullable, blank, `PROTECT`, historical rows NULL.

- [ ] **Step 1: Write the failing migration/model tests** asserting the field is absent before 0013, present and NULL after migration, and Patient/Consultation/TreatmentItem/OdontogramVersion counts are unchanged.
- [ ] **Step 2: Run** `python manage.py test apps.patients.test_migrations.TreatmentItemOdontogramResultMigrationTests --settings=config.settings.test --noinput`; expect failure because migration 0013 does not exist.
- [ ] **Step 3: Add the nullable OneToOneField and schema migration** with no `RunPython`, default, or backfill.
- [ ] **Step 4: Re-run the migration test** and expect pass.

### Task 2: Derived planned overlay API

**Files:**
- Create: `src/backend/apps/patients/test_odontogram_treatment_integration.py`
- Modify: `src/backend/apps/patients/serializers.py`
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/patients/urls.py`

**Interfaces:**
- Produces: `GET /api/patients/{patientId}/odontogram/planned-overlay/`.
- Response item: `{treatment_item_id, status, status_display, tooth_code, surfaces, planned_finding, description, proposed_in: {id, date}}`.

- [ ] **Step 1: Write failing API tests** for proposed/accepted inclusion, performed/cancelled/general/blank exclusion, patient scope, multiple same-tooth items, minimal payload, permissions, surfaces, and constant query count.
- [ ] **Step 2: Run the focused test file** and expect 404.
- [ ] **Step 3: Implement a read-only serializer and ListAPIView** filtering `proposed_in__patient_id`, pending statuses, non-null tooth, non-empty planned_finding; use `select_related("proposed_in")` and stable `proposed_in__date, pk` ordering.
- [ ] **Step 4: Re-run focused tests** and expect pass.

### Task 3: Atomic perform with explicit odontogram result

**Files:**
- Modify: `src/backend/apps/patients/odontograms.py`
- Modify: `src/backend/apps/patients/services.py`
- Modify: `src/backend/apps/patients/serializers.py`
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/patients/test_odontogram_treatment_integration.py`
- Modify: `src/backend/apps/patients/test_treatment_lifecycle.py`
- Modify: `src/backend/apps/patients/test_postgres.py`

**Interfaces:**
- Consumes: optional `odontogram_result={tooth_code: str, surfaces: list[str], finding: str}`.
- Produces: `perform_treatment_item(..., odontogram_result=None)` and response field `resulting_odontogram_version`.
- Produces: `create_treatment_result_version(item, consultation, actor, result)`.

- [ ] **Step 1: Write failing service/API tests** for optional result, explicit current finding, wrong/missing tooth, invalid finding/surfaces, immutable previous version, one result link, audit metadata, and both rollback directions.
- [ ] **Step 2: Run focused tests** and expect serializer/service signature failures.
- [ ] **Step 3: Add nested serializer validation**: current surface findings require at least one valid surface; current whole findings require no surfaces; all require a valid FDI tooth.
- [ ] **Step 4: Add the version helper**: lock Patient, read latest version, verify dentition, deep-copy teeth, append only the confirmed current finding, normalize, create one version based on latest and attributed to execution consultation/actor.
- [ ] **Step 5: Extend perform inside its existing transaction**: preserve item and consultation locks, reject result without matching item tooth, create version, assign one-to-one link, then save performed state. Repeated perform returns the existing item and never reapplies payload.
- [ ] **Step 6: Add version ID to audit metadata and serializers**, then re-run focused lifecycle/integration/audit tests.
- [ ] **Step 7: Add PostgreSQL perform/perform and perform/cancel result tests** asserting one terminal transition, one attributable version and no 500.

### Task 4: Frontend overlay projection and interaction

**Files:**
- Modify: `src/frontend/src/services/patientService.js`
- Modify: `src/frontend/src/services/patientService.test.js`
- Create: `src/frontend/src/pages/Patients/odontogramOverlay.js`
- Modify: `src/frontend/src/pages/Patients/OdontogramChart.jsx`
- Modify: `src/frontend/src/pages/Patients/ConsultationOdontogramPage.jsx`
- Modify: `src/frontend/src/pages/Patients/OdontogramPages.test.jsx`

**Interfaces:**
- Produces: `getPatientOdontogramPlannedOverlay(access, patientId)`.
- Produces: `buildPlannedOverlayTeeth(items)` retaining every item in a per-tooth details map while deduplicating only visual finding marks.

- [ ] **Step 1: Write failing service/component tests** for overlay URL, proposed/accepted rendering, multiple same-tooth details, empty state, legend, current-state distinction and isolated overlay error.
- [ ] **Step 2: Run focused Vitest files** and expect missing client/UI failures.
- [ ] **Step 3: Implement overlay client and pure projection helper** using Set/Map lookups; never merge away TreatmentItem identities.
- [ ] **Step 4: Load core odontogram requests in parallel and overlay independently** with `Promise.allSettled`; core failure remains fatal, overlay failure is a local alert.
- [ ] **Step 5: Make the planned layer read-only and derived**, retain current-layer editing, show a per-tooth list with status/procedure/surfaces/origin, and explain that manual planning persists only in historical versions.
- [ ] **Step 6: Re-run focused tests** and expect pass.

### Task 5: Explicit perform-result UI

**Files:**
- Modify: `src/frontend/src/services/patientService.js`
- Modify: `src/frontend/src/services/patientService.test.js`
- Create: `src/frontend/src/pages/Patients/TreatmentResultDialog.jsx`
- Modify: `src/frontend/src/pages/Patients/TreatmentPlanSection.jsx`
- Modify: `src/frontend/src/pages/Patients/TreatmentPlanSection.test.jsx`
- Modify: `src/frontend/src/pages/Patients/ConsultationRecordPage.jsx`
- Modify: `src/frontend/src/App.test.jsx`

**Interfaces:**
- `onPerform(itemId, originConsultationId, performedInId, odontogramResultOrNull)`.
- `performConsultationTreatmentItem(..., performedIn, odontogramResult?)` emits `odontogram_result` only when explicitly confirmed.

- [ ] **Step 1: Write failing tests** for the two choices, tooth prefill/read-only, surface prefill/edit, required real finding, general-treatment restriction, loading/double click, backend error, success and response version link.
- [ ] **Step 2: Run focused tests** and expect the old immediate-perform behavior to fail.
- [ ] **Step 3: Implement a standalone dialog** with no inline component definitions; suggest only planned findings valid in the current vocabulary, require explicit confirmation, and use tooth-specific existing surface choices.
- [ ] **Step 4: Pass the optional payload through section, page and service**, retaining the existing pending-ref duplicate guard and local item replacement.
- [ ] **Step 5: Re-run focused tests** and expect pass.

### Task 6: Documentation and full verification

**Files:**
- Create: `docs/user-stories/HU-50-treatment-odontogram-integration.md`
- Modify: `README.md`

**Interfaces:**
- Documents migration strategy, manual-history compatibility, payload, permission coupling, PostgreSQL counts, concurrency and TEC-07 status.

- [ ] **Step 1: Run backend focused suites**, full Django suite, PostgreSQL isolated concurrency/migration tests, `check`, `migrate --check`, and `makemigrations --check --dry-run`.
- [ ] **Step 2: Run frontend focused suites, full Vitest, lint and build**.
- [ ] **Step 3: Inspect `git status`, scoped `git diff`, and `git diff --check`**, preserving unrelated user changes.
- [ ] **Step 4: Record evidence in HU-50 documentation and README**; do not commit a mixed dirty worktree.

## Self-review

- Spec coverage: overlay, explicit result, schema validation, atomicity, idempotency, concurrency, permissions, audit, historical compatibility, frontend UX and all verification groups are mapped above.
- Placeholder scan: no TBD/TODO/later/similar-step placeholders remain.
- Type consistency: `odontogram_result` and `resulting_odontogram_version` names are identical across migration, serializer, service and frontend tasks.
