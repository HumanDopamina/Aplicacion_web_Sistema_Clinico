# HU-19, HU-23 and HU-58 Agenda Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the professional daily agenda, add a transactional patient check-in state, and preserve an immutable history for real appointment reschedules.

**Architecture:** Reuse the existing dentist-lane daily timeline and appointment permission scopes. Add `PRESENTE` as a blocking operational state managed only by a locked domain service, and add a compact `AppointmentRescheduleEvent` written atomically by the appointment update path whenever date, start time, or duration changes. Expose history through a read-only scoped endpoint and load it only when appointment details are open.

**Tech Stack:** Django 5.2, Django REST Framework, PostgreSQL exclusion constraints, React 19, Vite, Vitest, Testing Library.

## Global Constraints

- Implement only HU-19, HU-23, and HU-58.
- Do not introduce rooms, chairs, individual availability, reminders, later agenda stories, TreatmentItem changes, or odontogram changes.
- Preserve HU-17, HU-20, HU-44, HU-45, HU-46, HU-53, HU-55, current appointment scopes, and audit privacy.
- `PRESENTE` must continue blocking both dentist and patient schedule ranges.
- Do not infer check-ins or reschedule events for historical appointments.
- Preserve the development counts Patient 3, ClinicalRecord 2, Consultation 2, Appointment 5, and OdontogramVersion 5; initial reschedule history count is zero.
- Preserve all pre-existing dirty-worktree changes and do not create a mixed commit.

---

### Task 1: HU-19 professional daily agenda completion

**Files:**
- Modify: `src/frontend/src/pages/Appointments/AppointmentTimeline.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentsPage.test.jsx`
- Test: `src/backend/apps/appointments/tests.py`

**Interfaces:**
- Consumes: the existing appointment list contract (`dentist`, `dentist_name`, date filters) and backend `appointments.view_all` scope.
- Produces: stable professional lanes whose headings include each professional's appointment count.

- [x] **Step 1: Write failing UI behavior tests**

Add a daily agenda fixture with two dentists and literal appointment counts. Assert headings such as `Dra. Elena Vargas · 2 citas`, cards in their professional lane, date-filter requests, and the current reception/odontologist scopes through existing API tests.

- [x] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- src/pages/Appointments/AppointmentsPage.test.jsx --reporter=dot`

Expected: the load text/count assertions fail because headings currently contain names only.

- [x] **Step 3: Implement the minimal derived lane summary**

Build one `Map` from returned appointments, increment `appointmentCount`, sort lanes by professional name, and render singular/plural counts. Do not request rooms, chairs, or another endpoint.

- [x] **Step 4: Re-run focused frontend and appointment scope tests until GREEN**

Run: `.venv\Scripts\python manage.py test apps.appointments.tests.AppointmentApiTests --settings=config.settings.test --noinput`

---

### Task 2: HU-23 transactional check-in domain and API

**Files:**
- Modify: `src/backend/apps/appointments/models.py`
- Modify: `src/backend/apps/appointments/services.py`
- Modify: `src/backend/apps/appointments/serializers.py`
- Modify: `src/backend/apps/appointments/views.py`
- Modify: `src/backend/apps/appointments/urls.py`
- Modify: `src/backend/apps/audit/middleware.py`
- Create: `src/backend/apps/appointments/test_hu19_hu23_hu58.py`
- Modify: `src/backend/apps/appointments/test_postgres.py`

**Interfaces:**
- Produces: `Appointment.Status.CHECKED_IN = "PRESENTE"`.
- Produces: `check_in_appointment(*, appointment_id: int, actor: User) -> AppointmentCheckInResult` where `changed` is true only for the first valid transition.
- Produces: `POST /api/appointments/{id}/check-in/`, returning `201` on the first transition and `200` when already present.

- [x] **Step 1: Write failing API/domain tests**

Cover PROGRAMADA/CONFIRMADA to PRESENTE; zero consultations, odontograms, or `attendance_started_at`; idempotence; every invalid source state; `appointments.edit`; dentist scope; inactive patient; direct PATCH rejection; PRESENTE to start attendance; and audit action `APPOINTMENT_CHECK_IN`.

- [x] **Step 2: Run tests and verify RED**

Run: `.venv\Scripts\python manage.py test apps.appointments.test_hu19_hu23_hu58 --settings=config.settings.test --noinput`

Expected: missing `CHECKED_IN`, endpoint, and service failures.

- [x] **Step 3: Implement the locked service and explicit endpoint**

Inside `transaction.atomic()`, load the scoped appointment with `select_for_update(of=("self",))`; return unchanged for PRESENTE; reject other invalid states with stable code `appointment_cannot_check_in`; apply the HU-17 active-patient guard; save only `status` and `updated_at`. Permit `start_attendance` from PROGRAMADA, CONFIRMADA, or PRESENTE. Reject direct serializer PATCH to PRESENTE.

- [x] **Step 4: Register audit mapping and verify GREEN**

Map the check-in URL name to `APPOINTMENT_CHECK_IN` and include only appointment/patient identifiers in audit metadata.

- [x] **Step 5: Add PostgreSQL concurrency and blocking tests**

Run two check-ins through separate database connections and assert one `changed=true`, one idempotent result, one PRESENTE row, no consultation, and no odontogram. Assert a PRESENTE appointment still triggers the existing dentist/patient exclusion constraints.

---

### Task 3: HU-58 immutable reschedule history and atomic update

**Files:**
- Modify: `src/backend/apps/appointments/models.py`
- Modify: `src/backend/apps/appointments/admin.py`
- Modify: `src/backend/apps/appointments/services.py`
- Modify: `src/backend/apps/appointments/serializers.py`
- Modify: `src/backend/apps/appointments/views.py`
- Modify: `src/backend/apps/appointments/urls.py`
- Modify: `src/backend/apps/audit/middleware.py`
- Modify: `src/backend/apps/appointments/test_hu19_hu23_hu58.py`
- Modify: `src/backend/apps/appointments/test_postgres.py`

**Interfaces:**
- Produces: `AppointmentRescheduleEvent` with appointment, previous/new date, previous/new time, previous/new duration, optional reason, actor, and immutable timestamp.
- Consumes: write-only `reschedule_reason` (maximum 500 characters) on appointment PATCH.
- Produces: paginated read-only `GET /api/appointments/{id}/reschedule-history/` scoped by `appointments.view`.

- [x] **Step 1: Write failing history tests**

Assert exactly one event for a real temporal change; literal old/new interval values; actor/timestamp/reason; no event for reason, notes, or service-only changes; multiple events ordered newest first; endpoint read permission/scope; unsupported write methods; and audit action `APPOINTMENT_RESCHEDULE` only for a temporal change.

- [x] **Step 2: Run focused tests and verify RED**

Expected: model, payload field, endpoint, and event assertions fail because the history contract is absent.

- [x] **Step 3: Implement atomic rescheduling**

Validate the PATCH with the existing serializer, remove `reschedule_reason` from model changes, lock the appointment inside the update transaction, capture the old interval, save validated fields, and create one event only if `(date, start_time, duration_minutes)` differs. Let any overlap `IntegrityError` roll back both the appointment and event and preserve the current typed `409` response.

- [x] **Step 4: Implement the read-only serializer/endpoint and audit override**

Return only the compact event contract. Set an explicit request audit action after creating an event; do not duplicate interval snapshots in audit metadata.

- [x] **Step 5: Verify failed overlap atomicity on PostgreSQL**

Assert the appointment retains its original slot and event count remains zero after a constraint-backed `409`.

---

### Task 4: HU-23 and HU-58 agenda UI

**Files:**
- Modify: `src/frontend/src/services/appointmentService.js`
- Modify: `src/frontend/src/services/appointmentService.test.js`
- Modify: `src/frontend/src/pages/Appointments/appointmentDisplay.js`
- Modify: `src/frontend/src/pages/Appointments/appointments.css`
- Modify: `src/frontend/src/pages/Appointments/AppointmentFormPanel.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentFormPanel.test.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentDetailsPanel.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentsPage.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentsPage.test.jsx`

**Interfaces:**
- Produces: `checkInAppointment(access, id)` and `listAppointmentReschedules(access, id)`.
- Consumes: `appointment.status === "PRESENTE"`, event list, and optional `reschedule_reason`.

- [x] **Step 1: Write failing service and UI tests**

Assert literal check-in/history URLs; reception sees `Registrar llegada` but never clinical start; a clinical user sees `Iniciar atención` after PRESENTE; check-in updates state once; direct errors remain in the detail; edit submits a trimmed optional reason; and history renders old/new interval, reason, actor, and change timestamp.

- [x] **Step 2: Run focused frontend tests and verify RED**

Run: `npm test -- src/services/appointmentService.test.js src/pages/Appointments/AppointmentFormPanel.test.jsx src/pages/Appointments/AppointmentsPage.test.jsx --reporter=dot`

- [x] **Step 3: Implement minimal UI state and data flow**

Add the PRESENTE tone, check-in action guarded by `appointments.edit`, and history loading only while a detail is selected. Keep `canStartAttendance` independent so reception gains no consultation permission. Add the optional edit-only reason input and compact history section.

- [x] **Step 4: Re-run focused tests until GREEN**

---

### Task 5: Safe migration, documentation, and complete verification

**Files:**
- Create: `src/backend/apps/appointments/migrations/0007_appointmentrescheduleevent_and_more.py`
- Modify: `src/backend/apps/appointments/test_migrations.py`
- Create: `docs/user-stories/HU-19-professional-daily-agenda.md`
- Create: `docs/user-stories/HU-23-appointment-check-in.md`
- Create: `docs/user-stories/HU-58-appointment-reschedule-history.md`
- Modify: `README.md`

**Interfaces:**
- Migration changes status choices, recreates both exclusion constraints with PRESENTE, and creates an empty event table without data migration.

- [x] **Step 1: Write the failing migration preservation test**

Migrate from `appointments.0006` with historical fixtures, migrate forward, and assert statuses/counts are preserved and `AppointmentRescheduleEvent` is empty.

- [x] **Step 2: Generate and inspect the migration**

Run: `.venv\Scripts\python manage.py makemigrations appointments`

Reject any data backfill or unrelated model alteration.

- [x] **Step 3: Apply to development PostgreSQL and verify counts**

Record the five required counts and event count before/after. Apply `migrate`; require 3/2/2/5/5 unchanged and event count zero.

- [x] **Step 4: Run focused, full, PostgreSQL, frontend, lint, and build gates**

Run all requested suites plus `manage.py check`, `migrate --check`, `makemigrations --check --dry-run`, and `git diff --check`.

- [x] **Step 5: Document acceptance evidence and review scope**

Update the three story documents and README, inspect the scoped diff, and confirm no HU-57/HU-59/HU-60/HU-61/HU-62, treatment, or odontogram functionality was added.
