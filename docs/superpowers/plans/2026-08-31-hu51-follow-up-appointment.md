# HU-51 Follow-up Appointment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow an authorized user to schedule a normal follow-up appointment from a completed consultation, using pending longitudinal treatment context to prefill the existing appointment form.

**Architecture:** Keep consultation completion and appointment creation independent. Reuse the HU-49 longitudinal treatment endpoint, extend only its minimal service projection, and pass a one-shot administrative prefill through React Router location state to the existing appointment form; the normal appointment endpoint remains the sole write path.

**Tech Stack:** Django 5.2/DRF, PostgreSQL exclusion constraints, React 19, React Router 7, Vitest/Testing Library.

## Global Constraints

- Do not create `FollowUp`, `FollowUpAppointment`, a new treatment plan, or any `Appointment` to `TreatmentItem` relationship.
- `complete_consultation` must remain independent and must not create an appointment or return a full clinical record.
- Pending treatments are exclusively HU-49 items in `PROPUESTO` or `ACEPTADO`; `REALIZADO` and `CANCELADO` are excluded.
- The user must choose date and time and confirm the normal appointment form.
- Navigation state may contain only IDs, names, and brief administrative context; never diagnosis, notes, alerts, or complete clinical records.
- Do not implement HU-52, HU-53, reminders, recurrence, billing, payments, or odontogram changes.
- Add no model fields and no migrations.

---

### Task 1: Minimal longitudinal service contract

**Files:**
- Modify: `src/backend/apps/patients/serializers.py`
- Modify: `src/backend/apps/patients/views.py`
- Test: `src/backend/apps/patients/test_treatment_plan.py`

**Interfaces:**
- Consumes: `PatientTreatmentItemListView` and `ClinicService` already used by HU-49.
- Produces: each longitudinal item exposes nullable `service: {id, name, category_name, duration_minutes, price, is_active}`.

- [ ] **Step 1: Write the failing API assertion**

```python
self.assertEqual(payload[proposed.pk]["service"]["id"], self.inactive_service.pk)
self.assertEqual(payload[proposed.pk]["service"]["duration_minutes"], 60)
self.assertFalse(payload[proposed.pk]["service"]["is_active"])
```

- [ ] **Step 2: Run the focused test and verify it fails because `service` is absent**

Run: `python manage.py test apps.patients.test_treatment_plan.LongitudinalTreatmentPlanApiTests.test_returns_only_patient_items_with_minimal_consultation_context_and_snapshots --settings=config.settings.test`

- [ ] **Step 3: Add the minimal nested serializer field and eager loading**

Add `duration_minutes` to `TreatmentItemServiceSerializer`, add `service = TreatmentItemServiceSerializer(read_only=True)` to `LongitudinalTreatmentItemSerializer`, include it in `fields`, and select `service`/`service__category` in the HU-49 queryset.

- [ ] **Step 4: Re-run the focused backend test and verify it passes**

Run the command from Step 2.

### Task 2: Post-completion follow-up decision UI

**Files:**
- Create: `src/frontend/src/pages/Patients/ConsultationFollowUpSection.jsx`
- Create: `src/frontend/src/pages/Patients/ConsultationFollowUpSection.test.jsx`
- Modify: `src/frontend/src/pages/Patients/ConsultationRecordPage.jsx`
- Modify: `src/frontend/src/App.test.jsx`

**Interfaces:**
- Consumes: `treatmentPlan.items`, `Consultation.status`, patient option data, consultation professional, and `appointments.create` permission.
- Produces: `navigate('/citas', {state: {appointmentPrefill: {patient, dentist, treatment}}})` where `treatment` contains only `id`, `description`, and minimal service identifiers/names.

- [ ] **Step 1: Write failing component tests**

Cover completed consultation with pending items, no pending items, optional selection, inactive service context, CTA permission gating, and absence for `EN_PROGRESO`/`CANCELADA`.

- [ ] **Step 2: Run the focused tests and verify the expected missing-section failures**

Run: `npm test -- src/pages/Patients/ConsultationFollowUpSection.test.jsx src/App.test.jsx`

- [ ] **Step 3: Implement the minimal section and navigation handler**

Filter only `PROPUESTO`/`ACEPTADO`, show one selectable operational summary per pending item, keep the CTA available with zero pending items, and project the already-loaded patient into the HU-54 option shape.

- [ ] **Step 4: Re-run the focused tests and verify they pass**

Run the command from Step 2.

### Task 3: Reusable appointment form prefill

**Files:**
- Modify: `src/frontend/src/pages/Appointments/AppointmentFormPanel.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentFormPanel.test.jsx`

**Interfaces:**
- Consumes: optional `initialValues`, `initialPatient`, `initialDentist`, and `followUpContext` props.
- Produces: the unchanged `onSave` appointment payload `{patient, dentist, service, date, start_time, duration_minutes, reason, notes}`.

- [ ] **Step 1: Write failing form tests**

Assert patient/dentist/service/duration/reason are initialized without remote patient search, date/time remain blank for follow-up, inactive service is not selected, changing service replaces duration with the new current catalog duration, and user edits remain possible.

- [ ] **Step 2: Run the focused form test and verify failures are caused by unsupported initial props**

Run: `npm test -- src/pages/Appointments/AppointmentFormPanel.test.jsx`

- [ ] **Step 3: Implement prop-based initialization and deferred availability**

Merge explicit initial values only for creation, seed the selected patient/dentist options, and call dentist availability only after both date and time exist; when availability loads, clear a suggested dentist only if it is not available.

- [ ] **Step 4: Re-run the focused form test and verify it passes**

Run the command from Step 2.

### Task 4: One-shot navigation state and normal appointment creation

**Files:**
- Modify: `src/frontend/src/pages/Appointments/AppointmentsPage.jsx`
- Modify: `src/frontend/src/pages/Appointments/AppointmentsPage.test.jsx`

**Interfaces:**
- Consumes: `location.state.appointmentPrefill` and the current service catalog.
- Produces: one opening of `AppointmentFormPanel`; consumes route state with `replace`, and calls existing `createAppointment` only.

- [ ] **Step 1: Write failing integration tests**

Navigate from a completed manual consultation, choose a pending item, open agenda, assert minimal prefill/no patient search/no date-time invention, complete date/time, submit once, verify normal payload, preserve form on 409/error, and verify loading prevents double submit.

- [ ] **Step 2: Run the focused integration test and verify it fails at navigation/prefill**

Run: `npm test -- src/pages/Appointments/AppointmentsPage.test.jsx`

- [ ] **Step 3: Consume state after the current catalog loads**

Resolve the service by active catalog ID, derive duration from that current service, leave service empty when inactive/missing, retain brief historical context, and clear navigation state so refresh shows a normal agenda.

- [ ] **Step 4: Re-run the focused integration tests and verify they pass**

Run the command from Step 2.

### Task 5: Backend continuity regression

**Files:**
- Create: `src/backend/apps/patients/test_follow_up_continuity.py`

**Interfaces:**
- Consumes: normal completion, appointment creation, start-attendance, and HU-49 APIs.
- Produces: regression evidence that the accepted item remains longitudinally pending in Consultation B without any persisted appointment link.

- [ ] **Step 1: Add the end-to-end API regression**

Create Consultation A and an accepted item, complete A, POST a normal Appointment B, start B, assert Consultation B has the same patient, and GET HU-49 pending to assert the original item remains.

- [ ] **Step 2: Run the regression**

Run: `python manage.py test apps.patients.test_follow_up_continuity --settings=config.settings.test`

### Task 6: Documentation and complete verification

**Files:**
- Create: `docs/user-stories/HU-51-follow-up-appointment.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: verified implementation and command output.
- Produces: acceptance evidence, affected interfaces, refresh/privacy decisions, and verification commands.

- [ ] **Step 1: Document HU-51 and update the implemented-story summary**

Record that state is one-shot, the normal appointment endpoint is reused, no models/migrations exist, and no clinical details are transported.

- [ ] **Step 2: Run backend focused and full verification**

Run appointment, consultation, longitudinal, continuity, full Django suite, `manage.py check`, `migrate --check`, and `makemigrations --check --dry-run` using test settings.

- [ ] **Step 3: Run PostgreSQL appointment constraints without destructive use of the development database**

Use the repository PostgreSQL test settings against an isolated disposable test database or schema and run `apps.appointments.test_postgres` plus the relevant patient PostgreSQL tests.

- [ ] **Step 4: Run frontend focused and full verification**

Run focused Vitest files, full `npm test`, `npm run lint`, and `npm run build`.

- [ ] **Step 5: Inspect scope and formatting**

Run `git status --short`, `git diff`, and `git diff --check`; distinguish HU-51 files from pre-existing worktree changes and do not commit unrelated work.
