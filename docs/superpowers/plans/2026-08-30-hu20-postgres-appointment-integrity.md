# HU-20 / TEC-03 / TEC-05 Appointment Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent overlapping patient and dentist appointments under real PostgreSQL concurrency while retaining early application validation and returning a stable HTTP 409 contract.

**Architecture:** Keep `date`, `start_time`, and `duration_minutes`, add a canonical PostgreSQL `tstzrange` field populated as `[start, end)`, and enforce two independent partial GiST exclusion constraints for every non-cancelled status. Apply the schema as expand → backfill/diagnose → validate/not-null → constraints, while SQLite keeps the general suite without emulating PostgreSQL constraints. Catch only the two named constraint violations outside a nested atomic block and translate them to typed 409 responses.

**Tech Stack:** Django 5.2.17, Django REST Framework, PostgreSQL 18.6, `DateTimeRangeField`, `ExclusionConstraint`, `BtreeGistExtension`, psycopg 3.3.4, GitHub Actions PostgreSQL service.

## Global Constraints

- Do not migrate SQLite again, recreate `clinica_dental`, or destructively modify its current data.
- Keep `date`, `start_time`, and `duration_minutes`; field retirement is outside this block.
- Blocking statuses are exactly `PROGRAMADA`, `CONFIRMADA`, `COMPLETADA`, and `NO_ASISTIO`; `CANCELADA` releases the range.
- Do not add `EN_ATENCION`, HU-44 behavior, TEC-04, HU-54, HU-28, consultation links, treatment items, per-dentist hours, rooms, or rescheduling history.
- Never run destructive tests on `clinica_dental`; PostgreSQL tests require an isolated database/role or CI service.
- Preserve all pre-existing user, TEC-01, TEC-02, and SQLite-to-PostgreSQL migration changes.

---

## File Structure

- `src/backend/apps/appointments/models.py`: canonical range builder, PostgreSQL range field, save synchronization, and model constraint state.
- `src/backend/apps/appointments/serializers.py`: explicit blocking-state application validation retained for early feedback.
- `src/backend/apps/appointments/views.py`: narrow `IntegrityError` mapping around create/update transactions.
- `src/backend/apps/appointments/migrations/0003_appointment_scheduled_range.py`: expand, backfill, invalid-data/conflict diagnosis, and PostgreSQL not-null validation.
- `src/backend/apps/appointments/migrations/0004_appointment_overlap_constraints.py`: `btree_gist` plus the two PostgreSQL-only exclusion constraints.
- `src/backend/apps/appointments/tests.py`: database-neutral range and early-validation tests.
- `src/backend/apps/appointments/test_migrations.py`: PostgreSQL migration backfill and stop-on-conflict tests.
- `src/backend/apps/appointments/test_postgres.py`: real constraint, API 409, update, and threaded concurrency tests.
- `src/backend/config/settings/postgres_test.py`: isolated PostgreSQL test settings driven by `TEST_DATABASE_URL` and rejecting `clinica_dental`.
- `src/backend/config/tests/test_settings.py`: subprocess tests for fail-fast PostgreSQL test configuration.
- `.github/workflows/ci.yml`: retain fast SQLite job and add isolated PostgreSQL appointment-integrity job.
- `README.md`: minimal local PostgreSQL test-role/database setup and execution instructions.

### Task 1: Isolated PostgreSQL test settings

**Files:**
- Create: `src/backend/config/settings/postgres_test.py`
- Modify: `src/backend/config/tests/test_settings.py`

**Interfaces:**
- Consumes: `TEST_DATABASE_URL` containing a PostgreSQL control database distinct from `clinica_dental`.
- Produces: `DATABASES["default"]` for a role allowed to create and destroy Django's prefixed test database.

- [ ] Write subprocess tests proving a missing URL fails, SQLite URLs fail, and `clinica_dental` is rejected.
- [ ] Run `python manage.py test config.tests.test_settings --settings=config.settings.test` and verify those new tests fail because `config.settings.postgres_test` does not exist.
- [ ] Create `postgres_test.py` by importing `test`, parsing `TEST_DATABASE_URL` with `dj_database_url`, requiring the PostgreSQL engine, and rejecting database name `clinica_dental`.
- [ ] Re-run the focused settings tests and verify they pass.

### Task 2: Canonical scheduled range and blocking policy

**Files:**
- Modify: `src/backend/apps/appointments/models.py`
- Modify: `src/backend/apps/appointments/serializers.py`
- Modify: `src/backend/apps/appointments/tests.py`

**Interfaces:**
- Produces: `appointment_scheduled_range(date, start_time, duration_minutes)` returning a timezone-aware `[)` range.
- Produces: `BLOCKING_APPOINTMENT_STATUSES` shared by model constraints and application validation.
- Produces: `Appointment.scheduled_range`, synchronized on PostgreSQL saves.

- [ ] Add a test with literal UTC bounds proving 09:00 + 60 minutes becomes `[09:00,10:00)`.
- [ ] Run the test and verify it fails because the helper/field is absent.
- [ ] Add the helper, field, explicit blocking tuple, model constraints, and PostgreSQL-only save synchronization including `update_fields` handling.
- [ ] Replace the serializer's implicit `exclude(CANCELADA)` with an explicit `status__in=BLOCKING_APPOINTMENT_STATUSES` query without removing schedule, activity, duration, or overlap validation.
- [ ] Run all database-neutral appointment tests and verify they pass on SQLite.

### Task 3: Safe expand/backfill/validate migrations

**Files:**
- Create: `src/backend/apps/appointments/migrations/0003_appointment_scheduled_range.py`
- Create: `src/backend/apps/appointments/migrations/0004_appointment_overlap_constraints.py`
- Create: `src/backend/apps/appointments/test_migrations.py`

**Interfaces:**
- `0003` adds a nullable field, backfills all rows using timezone-aware datetimes, rejects invalid duration/day ranges, rejects pre-existing patient/dentist overlaps with IDs in the diagnostic, and sets PostgreSQL `NOT NULL` before changing model state.
- `0004` installs `btree_gist` and adds `appointment_dentist_schedule_excl` and `appointment_patient_schedule_excl` only on PostgreSQL while recording both constraints in migration state for all engines.

- [ ] Add PostgreSQL migration tests that start at `0002`, create literal historical appointments, migrate to `0003`, and assert unchanged legacy fields plus exact range bounds.
- [ ] Add a migration test that creates a conflict at `0002` and asserts `0003` raises a diagnostic before constraints.
- [ ] Run the tests against isolated PostgreSQL and verify they fail because migrations are absent.
- [ ] Implement `0003` with `AddField`, `RunPython`, and `SeparateDatabaseAndState` for PostgreSQL-only `SET NOT NULL`.
- [ ] Implement `0004` with `BtreeGistExtension` and PostgreSQL-only constraint database operations paired with `AddConstraint` state operations.
- [ ] Re-run migration tests and verify the backfill succeeds and conflict fixture stops before constraint activation.

### Task 4: Database constraint behavior

**Files:**
- Create: `src/backend/apps/appointments/test_postgres.py`

**Interfaces:**
- Exercises the real `appointment_dentist_schedule_excl` and `appointment_patient_schedule_excl` constraints.

- [ ] Add direct-write tests for same start, partial overlap, containment, adjacent ranges, distinct dentist/patient, CANCELADA, COMPLETADA, and NO_ASISTIO.
- [ ] Run them against isolated PostgreSQL and verify they fail before `0004`/model synchronization is active.
- [ ] Apply the minimal model/migration corrections needed for all direct-write tests to pass.
- [ ] Verify each `IntegrityError` is contained in `transaction.atomic()` and the connection remains usable afterward.

### Task 5: Stable API 409 on create and update

**Files:**
- Modify: `src/backend/apps/appointments/views.py`
- Modify: `src/backend/apps/appointments/test_postgres.py`

**Interfaces:**
- Produces 409 payloads `{code: "appointment_overlap", conflict: "dentist"|"patient", detail: <Spanish message>}`.
- Unknown integrity failures must be re-raised.

- [ ] Add API tests that bypass only the early overlap check, hit each real named constraint on create/update, and assert exact 409 payloads plus a usable connection.
- [ ] Run the tests and verify they fail as unhandled `IntegrityError`/500.
- [ ] Wrap `super().create()` and `super().update()` in `transaction.atomic()`, catch outside the block, inspect `error.__cause__.diag.constraint_name`, map only the two stable names, and re-raise anything else.
- [ ] Re-run API tests and existing appointment tests.

### Task 6: Real concurrent requests

**Files:**
- Modify: `src/backend/apps/appointments/test_postgres.py`

**Interfaces:**
- Uses two threads, independent Django connections/clients, and a barrier inserted immediately before the real serializer create method persists.

- [ ] Add one test for same dentist/different patients and one for same patient/different dentists.
- [ ] Run both tests and verify the pre-constraint implementation can persist both or produce an uncontrolled failure.
- [ ] Execute the real API requests concurrently; assert status multiset `[201, 409]`, exact conflict kind, exactly one persisted appointment, and a usable transaction afterward.
- [ ] Repeat the focused test enough to detect nondeterministic failures.

### Task 7: CI and developer instructions

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

**Interfaces:**
- CI PostgreSQL service uses only synthetic `clinic_test` credentials and runs PostgreSQL migrations, appointment tests, concurrency tests, and migration checks.

- [ ] Keep the existing SQLite backend job unchanged in purpose.
- [ ] Add a `backend-postgres` job using `postgres:18`, health checks, `TEST_DATABASE_URL`, `config.settings.postgres_test`, migrations, `apps.appointments`, and migration checks.
- [ ] Document a dedicated local test role/database with placeholder password and the `TEST_DATABASE_URL` command; explicitly prohibit `clinica_dental`.
- [ ] Validate the workflow syntax by inspection and execute the same commands against an isolated local PostgreSQL cluster.

### Task 8: Existing development database migration and final verification

**Files:**
- No additional production files unless verification exposes a scoped defect.

**Interfaces:**
- Applies only migrations `appointments.0003` and `appointments.0004` to `clinica_dental` after a read-only conflict check.

- [ ] Record IDs, patient/dentist/service, date/time/duration/status, count, and computed ranges for all five current appointments.
- [ ] Confirm zero existing blocking conflicts and then run `migrate --plan`, `migrate --noinput`, and `migrate --check` against development PostgreSQL.
- [ ] Compare the five rows after migration: count and legacy values exactly unchanged; each range equals its literal expected `[)` value.
- [ ] Query `pg_constraint` for both exclusion constraints and `pg_extension` for `btree_gist`.
- [ ] Run the complete SQLite suite, focused isolated PostgreSQL suite, `check`, `makemigrations --check --dry-run`, and `git diff --check`.
- [ ] Review `git status`/`git diff`, confirm no models outside appointments, no destructive migration, no secret, no dump, and no HU-44/TEC-04/HU-54 behavior.
