# HU-53 Flexible Patient Identification Implementation Plan

> **For agentic workers:** Implement each task test-first. Preserve the dirty worktree and do not include unrelated prior-story changes.

**Goal:** Evolve the single `Patient` domain so it supports typed or absent identification and an optional responsible guardian, while preserving historical IDs, exact-duplicate protection, scheduling of incomplete profiles, and safe clinical-attendance gates.

**Architecture:** Keep one canonical `Patient`. Replace the persisted legacy cédula fields through an explicit expand/backfill/contract migration pair; expose typed identification only in detail contracts; derive minority and profile completeness in the domain; and reuse one profile guard from attendance start, manual consultation creation, and consultation completion. The appointment creation path remains unchanged so incomplete patients stay schedulable.

**Tech Stack:** Django 5.2/DRF, PostgreSQL conditional functional constraints, React 19, React Router 7, Vitest/Testing Library.

## Decisions and scope guardrails

- Do not create provisional-patient, guardian, or person models.
- Do not implement HU-52 quick patient creation or HU-13 fuzzy/possible-match warnings.
- Keep `examiner_national_id` unchanged: it identifies a clinician, not a patient.
- Canonical patient identity is `identification_type` plus optional `identification_number`; both are null when no document exists.
- Preserve the displayed number except for trimming accidental outer whitespace. Duplicate comparison is case-insensitive. For `CEDULA`, retain the current equivalence that ignores spaces and hyphens; for `PASAPORTE` and `OTRO`, preserve internal separators.
- Use a database functional conditional unique constraint, so the normalized guarantee does not depend only on serializers or `save()`.
- Adult profile minimum: `first_name`, `last_name`, `date_of_birth`, and `phone`. Identification is intentionally not part of profile completeness because HU-53 explicitly supports patients without it and no existing story proves it is required for clinical attention.
- A minor is under 18 on the reference date, calculated by exact birthday. Minors additionally require `guardian_name`, `guardian_relationship`, and `guardian_phone` for a complete profile, but may still be saved and scheduled without them.
- Summary and option contracts expose only `profile_complete`; detail exposes typed identification, guardian fields, `profile_complete`, and `missing_profile_fields`.
- Keep the current inactive-patient semantics intact and separate from profile completeness; HU-17 is not completed here.

---

### Task 1: Backend contract tests in red

**Files:**
- Modify: `src/backend/apps/patients/tests.py`
- Modify: `src/backend/apps/appointments/tests.py`
- Modify: `src/backend/apps/patients/test_postgres.py`
- Modify: `src/backend/apps/audit/tests.py`

- [ ] Add model/API tests for CEDULA, PASAPORTE, OTRO, no identification, number-without-type rejection, same normalized type/number rejection, different-type acceptance, and multiple patients without identification.
- [ ] Add profile tests for adults, exact eighteenth birthday, minors with/without guardian, missing-field order, and preservation of optional guardian data for adults.
- [ ] Assert detail, summary, option, and search minimization/behavior.
- [ ] Assert incomplete patients can be scheduled but get structured `patient_profile_incomplete` errors at attendance start, manual consultation creation, and completion; assert rollback/idempotency.
- [ ] Add PostgreSQL-level constraint tests and audit assertions that values are not copied into metadata.
- [ ] Run focused tests and confirm failures are caused by missing HU-53 behavior.

### Task 2: Safe expand/backfill/contract migrations

**Files:**
- Create: `src/backend/apps/patients/migrations/0014_expand_flexible_identification.py`
- Create: `src/backend/apps/patients/migrations/0015_contract_legacy_national_id.py`
- Modify: `src/backend/apps/patients/test_migrations.py`

- [ ] Add a migration test from `0013` through `0015` with historical cédulas, exact value preservation, unchanged row count/digest, null guardians, conditional uniqueness, and multiple document-less patients.
- [ ] In `0014`, relax legacy columns for the transition, add nullable typed-identification and guardian fields, backfill every nonempty legacy ID as `CEDULA` without changing its displayed value, validate generic invariants without logging identifiers, and add pair-consistency plus normalized conditional uniqueness constraints.
- [ ] In `0015`, remove both legacy persisted columns after every runtime consumer has moved. Ensure reverse ordering can reconstruct legacy values before restoring the old non-null state.
- [ ] Run the focused migration test forward and backward.

### Task 3: Canonical patient domain and API

**Files:**
- Modify: `src/backend/apps/patients/models.py`
- Modify: `src/backend/apps/patients/identifiers.py`
- Modify: `src/backend/apps/patients/serializers.py`
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/patients/admin.py`

- [ ] Define identification choices, canonical nullable fields, guardian fields, the database constraints, and derived `is_minor`, `missing_profile_fields`, and `profile_complete` behavior.
- [ ] Centralize display trimming and comparison normalization without applying cédula-specific rules to other types.
- [ ] Validate create and partial update as a pair, map concurrent conflicts to `identification_number`, and keep a temporary write-only `national_id` input alias only if compatibility tests demonstrate it is needed; never retain a second persisted source.
- [ ] Update detail/summary/option contracts and search. Keep document and guardian data out of summary/option responses.
- [ ] Update runtime/admin consumers and non-historical test fixtures away from the legacy fields.
- [ ] Run the patient-focused suite until green.

### Task 4: Reusable clinical profile gate

**Files:**
- Modify: `src/backend/apps/patients/services.py`
- Modify: `src/backend/apps/patients/views.py`
- Modify: `src/backend/apps/appointments/services.py`
- Modify: `src/backend/apps/appointments/views.py`

- [ ] Add one reusable domain validation result/error containing stable code, detail, and ordered `missing_fields`.
- [ ] Apply it inside the locked transaction immediately before mutation in `start_attendance`, after the existing idempotent return.
- [ ] Apply the same gate before a manual consultation creates its consultation/odontogram.
- [ ] Apply it to new completion operations without replacing HU-46 clinical-minimum errors or breaking completed-operation idempotency.
- [ ] Return HTTP 409 structured payloads and preserve patient attribution for failed audit events.
- [ ] Run focused appointment, manual-consultation, completion, and audit tests until green.

### Task 5: Frontend tests in red

**Files:**
- Modify: `src/frontend/src/App.test.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentFormPanel.test.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentsPage.test.jsx`
- Create: `src/frontend/src/pages/Patients/patientDisplay.test.js`
- Modify: `src/frontend/src/services/patientService.test.js`

- [ ] Cover all three identification types and absent identification in create/edit/detail.
- [ ] Cover a minor with missing/present guardian fields, an adult that does not require them, and date changes that never erase guardian data.
- [ ] Cover summary/record incomplete markers and translated missing fields.
- [ ] Cover agenda option marking without filtering or disabling and without fetching patient detail.
- [ ] Cover structured attendance failure, unchanged appointment/detail state, no navigation, and permission-gated navigation to complete the profile.
- [ ] Run focused Vitest files and confirm expected HU-53 failures.

### Task 6: Minimal frontend implementation

**Files:**
- Modify: `src/frontend/src/pages/Patients/patientRecordSchema.js`
- Modify: `src/frontend/src/pages/Patients/PatientRecordPage.jsx`
- Modify: `src/frontend/src/pages/Patients/PatientRecordShell.jsx`
- Modify: `src/frontend/src/pages/Patients/patientDisplay.js`
- Create: `src/frontend/src/pages/Patients/patientProfileDisplay.js`
- Modify: `src/frontend/src/pages/Patients/PatientsPage.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentFormPanel.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentDetailsPanel.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentsPage.jsx`

- [ ] Replace the patient cédula input with optional type/number controls and add a separate responsible-guardian section.
- [ ] Highlight the guardian section for minors without destructively clearing values when DOB changes.
- [ ] Show profile state and translated missing fields in the patient record; render typed identification correctly everywhere the shared header is used.
- [ ] Update search copy and add a minimal profile marker without exposing document/guardian data in lists.
- [ ] Mark incomplete patient options in the existing appointment form while leaving them selectable.
- [ ] Render structured attendance errors and offer profile navigation only with both patient view/edit permissions.
- [ ] Run focused frontend tests until green.

### Task 7: PostgreSQL development migration and evidence

**Files:**
- No additional source files unless verification exposes a defect.

- [ ] Reconfirm pre-migration aggregate count, null/blank count, duplicate groups, and ordered SHA-256 without printing PII.
- [ ] Apply real migrations to `clinica_dental`; never recreate or flush it.
- [ ] Recompute the same aggregate evidence and inspect installed constraints/columns.
- [ ] Run `migrate --check` and PostgreSQL-specific constraint tests against the isolated test database.

### Task 8: Documentation and complete verification

**Files:**
- Create: `docs/user-stories/HU-53-flexible-identification-and-guardians.md`
- Modify: `docs/user-stories/HU-13-duplicate-patient-detection.md`
- Modify: `README.md`

- [ ] Document design, migration evidence, contracts, privacy, exact-duplicate progress, and why HU-13 remains Partial and HU-52 remains unimplemented.
- [ ] Run focused and full backend suites separately where migration-test ordering requires it, then the complete Django suite.
- [ ] Run `manage.py check`, `makemigrations --check --dry-run`, and `migrate --check`.
- [ ] Run focused and full frontend tests, lint, and production build.
- [ ] Run `git diff --check`, inspect `git status` and the HU-53 diff, and distinguish all pre-existing dirty-worktree changes.
- [ ] Do not commit unless a clean, story-isolated commit can be proven without absorbing prior user changes.
