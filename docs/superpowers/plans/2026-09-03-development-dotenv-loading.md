# Development Dotenv Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Django development commands load `src/backend/.env` automatically without weakening the mandatory PostgreSQL configuration.

**Architecture:** Keep production isolated from dotenv. The development settings module will call `python-dotenv` against `BASE_DIR / ".env"` before reading `DATABASE_URL`, while explicit process variables retain precedence.

**Tech Stack:** Django 5.2, python-dotenv, unittest subprocess tests, PowerShell.

## Global Constraints

- Add `python-dotenv` only to `requirements-dev.txt`.
- Keep `DATABASE_URL` mandatory and reject non-PostgreSQL URLs.
- Do not load `.env` from production settings or add SQLite fallback.
- Do not inspect, modify, or stage the real `.env` file.
- Do not execute migrations or modify application data.

---

### Task 1: Automatic development environment loading

**Files:**
- Modify: `src/backend/config/settings/development.py`
- Modify: `src/backend/config/tests/test_settings.py`
- Modify: `src/backend/requirements-dev.txt`

**Interfaces:**
- Consumes: `BASE_DIR` from `config.settings.base` and `load_dotenv(dotenv_path, override=False)`.
- Produces: development settings that load `BASE_DIR / ".env"` before `os.getenv("DATABASE_URL")`.

- [x] **Step 1: Write the failing regression test**

Create a temporary backend-shaped directory containing a controlled `.env`, point a copied development settings module at that temporary `BASE_DIR`, clear `DATABASE_URL` from the subprocess environment, and assert the imported database engine/name are PostgreSQL values from the temporary file.

- [x] **Step 2: Verify RED**

Run:

```powershell
.venv\Scripts\python.exe manage.py test config.tests.test_settings.DevelopmentDatabaseSettingsTests --settings=config.settings.test --noinput
```

Expected: the new test fails because `development.py` does not invoke `load_dotenv`.

- [x] **Step 3: Implement the minimal fix**

Pin `python-dotenv` in `requirements-dev.txt`, import `load_dotenv`, import `BASE_DIR` explicitly, and invoke:

```python
load_dotenv(BASE_DIR / ".env", override=False)
```

immediately before the first development environment lookup.

- [x] **Step 4: Verify GREEN and existing safeguards**

Run the focused settings tests. Confirm the temporary `.env` loads, an explicit process `DATABASE_URL` wins, a missing value still fails, and SQLite is still rejected.

- [x] **Step 5: Verify the developer workflow**

Install `requirements-dev.txt`, run `pip check`, relevant tests, `manage.py check`, and `git diff --check`. Launch `runserver 8000` from a fresh PowerShell process with `DATABASE_URL` removed, wait for the server to accept a request, then terminate only that test process without running migrations.
