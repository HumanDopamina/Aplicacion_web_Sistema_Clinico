# Controlled Development Baseline Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the preserved SQLite development baseline into the current PostgreSQL `clinica_dental` schema without recreating the database, reverting migrations, inventing relationships, or modifying functional code.

**Architecture:** Work from an immutable SQLite source and a disposable copy. Upgrade the copy through the repository's official migrations, export only application data with natural authorization metadata excluded, rehearse the import in an isolated PostgreSQL schema, validate counts/keys/constraints/sequences and functional reads, then repeat the identical import against `public` only if its application tables remain empty.

**Tech Stack:** Django 5.2 migrations/serializers, SQLite read-only URI, PostgreSQL 18 schemas, `pg_dump`/`pg_restore`, PowerShell, SHA-256.

## Global Constraints

- Do not implement HU-13, HU-52, or any functional user story.
- Do not change models or create migrations.
- Do not run `flush`, `DROP DATABASE`, `migrate zero`, or destructive operations against `public`.
- Preserve `src/backend/db.sqlite3` byte-for-byte and never open it for writing.
- Do not print database credentials.
- Preserve historical PK/FK values and leave post-baseline relationships nullable when no unequivocal source exists.
- Do not create an automatic commit.

---

### Task 1: Preserve and inventory both data stores

**Files:**
- Read: `src/backend/db.sqlite3`
- Create outside repository: `C:/Users/herna/.codex/backups/Aplicacion_web_Sistema_Clinico/clinica_dental_pre_baseline_recovery_20260901.dump`

**Interfaces:**
- Produces: source SHA-256, SQLite/PostgreSQL counts, schema/migration inventory, verified PostgreSQL custom-format dump.

- [x] **Step 1: Hash SQLite and query it through `mode=ro`.**
- [x] **Step 2: Record effective PostgreSQL database, counts, and `showmigrations`.**
- [x] **Step 3: Create a custom-format PostgreSQL dump and verify its TOC with `pg_restore --list`.**
- [x] **Step 4: Search the repository and Downloads for historical `.dump`, `.backup`, `.sql`, or fixture artifacts.**

### Task 2: Upgrade an isolated SQLite copy

**Files:**
- Create outside source: a temporary copy of `src/backend/db.sqlite3`
- Create temporarily: recovery-only settings module outside versioned source

**Interfaces:**
- Consumes: untouched SQLite baseline at migrations `patients.0008` and `appointments.0002`.
- Produces: disposable SQLite database migrated through `patients.0015` and `appointments.0006`.

- [x] **Step 1: Copy SQLite to a unique temporary directory and verify the copy hash equals the source hash.**
- [x] **Step 2: Point a temporary settings module at only the copied SQLite file.**
- [x] **Step 3: Run `manage.py migrate --noinput` on the copy and verify `makemigrations --check --dry-run` reports no changes.**
- [x] **Step 4: Verify HU-53 maps every historical `national_id` to `CEDULA` plus the exact visible number and leaves guardian fields null.**

### Task 3: Produce the canonical application-data fixture

**Files:**
- Create outside repository: temporary JSON fixture derived from the migrated copy.

**Interfaces:**
- Consumes: migrated SQLite copy.
- Produces: deterministic fixture excluding `contenttypes`, generated permissions, migrations, sessions, token blacklist data, and audit reads while retaining users, role presets, clinic configuration, patients, clinical records, consultations, odontograms, documents, and appointments.

- [x] **Step 1: Run `dumpdata` with explicit application model labels and `--natural-foreign`, retaining historical primary keys.**
- [x] **Step 2: Inspect object counts and assert no modern relationship is heuristically populated.**
- [x] **Step 3: Hash the fixture so rehearsal and promotion use exactly the same bytes.**

### Task 4: Rehearse in an isolated PostgreSQL schema

**Files:**
- No repository files modified.

**Interfaces:**
- Consumes: current migrations and canonical fixture.
- Produces: isolated schema with restored data and validation evidence.

- [x] **Step 1: Create a uniquely named schema after confirming no object with that name exists.**
- [x] **Step 2: Run current Django migrations with `search_path` restricted to the trial schema.**
- [x] **Step 3: Load the canonical fixture once; attempt a second preflight and confirm it aborts because destination tables are non-empty.**
- [x] **Step 4: Reset every restored serial sequence with Django `sqlsequencereset`.**
- [x] **Step 5: Validate FK constraints, identification constraints, exact counts, PK sets, checksums, and next sequence values.**
- [x] **Step 6: Run read-only smoke checks for users, patient list/search/detail, appointments, consultations, odontograms, services, and HU-53 derived profile state.**
- [x] **Step 7: Drop only the explicitly verified temporary schema after recording evidence.**

### Task 5: Promote to PostgreSQL `public`

**Files:**
- No repository files modified.

**Interfaces:**
- Consumes: the same hashed canonical fixture validated in Task 4.
- Produces: restored application baseline in `public`.

- [x] **Step 1: Recheck that every application destination table in `public` remains empty and abort otherwise.**
- [x] **Step 2: Load the fixture inside an atomic restoration operation.**
- [x] **Step 3: Reset restored sequences and verify the next generated value exceeds each historical maximum without leaving probe rows.**
- [x] **Step 4: Verify counts, historical PK sets, FK integrity, constraints, identification mapping, and checksums against the rehearsal.**

### Task 6: Final verification and handoff

**Files:**
- Verify: `src/backend/db.sqlite3`

**Interfaces:**
- Produces: evidence-backed recovery report; no functional code or migrations.

- [x] **Step 1: Recalculate the SQLite SHA-256 and require an exact match with Task 1.**
- [x] **Step 2: Run `manage.py check`, `migrate --check`, and `makemigrations --check --dry-run` against development PostgreSQL.**
- [x] **Step 3: Run isolated transactional regressions for patients, appointments, consultations, odontograms, authentication, ClinicService, and HU-53.**
- [x] **Step 4: Run `git status`, `git diff`, and `git diff --check`; confirm no functional implementation or migration was added.**
- [x] **Step 5: Report all 26 requested recovery outcomes and explicitly keep HU-13/HU-52 unimplemented.**
