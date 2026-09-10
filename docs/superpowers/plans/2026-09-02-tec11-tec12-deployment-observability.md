# TEC-11 and TEC-12 Deployment and Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a reproducible, non-root Django container with a real production runtime, safe configuration, health probes, and PII-safe structured request logs.

**Architecture:** Package only `src/backend` in a Python 3.13 Linux image, collect static assets during build, and run Gunicorn without applying migrations in the web process. Keep PostgreSQL, Redis, SMTP, and S3-compatible media external; add constant-shape liveness/readiness views and extend the existing request-ID middleware with one structured completion/error record per request.

**Tech Stack:** Django 5.2, PostgreSQL, Gunicorn, WhiteNoise, Docker, Vite, GitHub Actions, `pip-audit`.

## Global Constraints

- Implement only TEC-11 and TEC-12; no functional stories, Product Backlog edits, Kubernetes, autoscaling, Celery, RQ, Prometheus, Grafana, or mandatory SaaS.
- Never run `manage.py migrate` from each web replica; migration is a separate release command.
- Never log request bodies, credentials, tokens, cookies, authorization headers, clinical notes, diagnoses, documents, or patient identity data.
- Preserve the local `localhost`/`127.0.0.1` CSRF fix and require an explicit production API URL.
- Preserve the PostgreSQL baseline counts and never run `flush` or destructive commands against `clinica_dental`.
- Production must use `DEBUG=False`, PostgreSQL, explicit trusted hosts/origins, HTTPS cookies, persistent external media, and no wildcard CORS/hosts.

---

### Task 1: Health and request observability

**Files:**
- Create: `src/backend/config/health.py`
- Create: `src/backend/config/logging.py`
- Create: `src/backend/config/tests/test_observability.py`
- Modify: `src/backend/config/urls.py`
- Modify: `src/backend/apps/audit/middleware.py`
- Modify: `src/backend/config/settings/base.py`
- Modify: `src/backend/config/settings/production.py`

**Interfaces:**
- Produces: `GET /health/live/`, `GET /health/ready/`, `JsonLogFormatter`, and request records with `request_id`, `method`, `path`, `status`, and `duration_ms`.

- [ ] **Step 1: Write failing endpoint tests**

Test that live returns `{"status": "ok"}` with zero queries; ready returns 200 with a working cursor and 503 `{"status": "unavailable"}` when `OperationalError` is raised.

- [ ] **Step 2: Write failing request/logging tests**

Send a request with a valid and invalid `X-Request-ID`; assert a response ID, safe structured fields, no request body/header values, and a generic `DEBUG=False` 500 response while the server record contains the request ID, exception type, and stack frames.

- [ ] **Step 3: Verify RED**

Run: `python manage.py test config.tests.test_observability --settings=config.settings.test`

Expected: fail because health routes, structured formatter, timing fields, and safe exception serialization do not exist.

- [ ] **Step 4: Implement minimal health and logging code**

Use `JsonResponse`, `connections["default"].cursor()` with `SELECT 1`, `time.monotonic()`, the existing validated UUID request ID, and `logging` extras only. Serialize exception type and traceback frame locations without exception messages or local values.

- [ ] **Step 5: Verify GREEN**

Run the same focused suite and require zero failures.

### Task 2: Production configuration and static assets

**Files:**
- Create: `src/backend/config/settings/build.py`
- Modify: `src/backend/config/settings/base.py`
- Modify: `src/backend/config/settings/production.py`
- Modify: `src/backend/config/tests/test_settings.py`
- Modify: `src/backend/requirements.txt`

**Interfaces:**
- Produces: fail-fast PostgreSQL/HTTPS/origin validation and WhiteNoise compressed-manifest static serving; build settings are for `collectstatic` only.

- [ ] **Step 1: Add failing production-setting tests**

Test missing `DATABASE_URL`, non-PostgreSQL URLs, wildcard hosts/CORS, insecure trusted origins/frontend URLs, mandatory `DEBUG=False`, secure cookie/proxy settings, and compressed manifest storage.

- [ ] **Step 2: Verify RED**

Run: `python manage.py test config.tests.test_settings --settings=config.settings.test`.

- [ ] **Step 3: Add pinned runtime dependencies and minimal settings**

Pin `gunicorn==26.2.0` and `whitenoise==6.12.0`; place `WhiteNoiseMiddleware` after `SecurityMiddleware`; validate production URLs/hosts; configure the JSON handler only in production; and add isolated build settings for `collectstatic` without production secrets or runtime database fallback.

- [ ] **Step 4: Verify GREEN and collect static**

Run focused settings tests and `python manage.py collectstatic --noinput --settings=config.settings.build`.

### Task 3: Reproducible backend image and runtime

**Files:**
- Create: `src/backend/Dockerfile`
- Create: `src/backend/.dockerignore`
- Create: `src/backend/gunicorn.conf.py`
- Create: `src/backend/requirements-dev.txt`

**Interfaces:**
- Produces: `docker build -t dentalclinic-backend src/backend`, separate `python manage.py migrate --noinput`, and a Gunicorn `CMD` with environment-controlled bind/workers/timeouts.

- [ ] **Step 1: Define the runtime contract**

Use `python:3.13.15-slim-bookworm`, install exact requirements with no pip cache, copy only backend sources, run `collectstatic`, create UID/GID 10001, and switch to that user. Do not copy `.env`, SQLite files, virtualenvs, media, dumps, backups, Git, or temporary files.

- [ ] **Step 2: Configure Gunicorn and Docker health**

Bind to `0.0.0.0:${PORT:-8000}`, default to two workers and a 30-second timeout, log to stdout/stderr, do not daemonize, and probe `/health/live/` with Python stdlib plus the configured host/forwarded HTTPS header.

- [ ] **Step 3: Build and inspect the image**

Run `docker build`; inspect the configured user/CMD/healthcheck; run `collectstatic` output checks. If the local Docker daemon cannot run, record the environmental blocker and rely on the identical CI build gate without claiming a local smoke pass.

- [ ] **Step 4: Smoke against isolated PostgreSQL**

Run migration once as a separate container/job, start the web container, and check live/ready without using or recreating `clinica_dental`.

### Task 4: Frontend production API contract

**Files:**
- Modify: `src/frontend/src/services/api.js`
- Modify: `src/frontend/src/services/api.test.js`

**Interfaces:**
- Produces: `resolveApiUrl({ configured, isDevelopment, location })`; explicit `VITE_API_URL` in production and same-host port-8000 fallback only in development.

- [ ] **Step 1: Write failing resolver tests**

Cover explicit URL normalization, `localhost`, `127.0.0.1`, missing production configuration, and the existing CSRF URL behavior.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --reporter=dot src/services/api.test.js`.

- [ ] **Step 3: Implement the pure resolver**

Return an explicit configured URL without a trailing slash; use the current window hostname only when `isDevelopment` is true; otherwise throw a configuration error before any API request.

- [ ] **Step 4: Verify GREEN and production build**

Run the focused test and `VITE_API_URL=https://api.example.test npm run build`.

### Task 5: CI, environment template, and deployment guide

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `src/backend/.env.example`
- Modify: `docs/deployment.md`

**Interfaces:**
- Produces: CI dependency audit and Docker build gates plus an operator sequence of build → migrate → start → live/ready → logs.

- [ ] **Step 1: Add security/build gates**

Install `requirements-dev.txt`, run `pip check` and `pip-audit -r requirements.txt`, preserve all current PostgreSQL jobs, and add a backend image build.

- [ ] **Step 2: Document explicit variables and lifecycle**

Document `VITE_API_URL`, Gunicorn knobs, external PostgreSQL/Redis/SMTP/S3 media, separate migrations, `collectstatic`/WhiteNoise, health semantics, JSON request logs, optional future `SENTRY_DSN`, and deferred async infrastructure for TEC-10/HU-60.

- [ ] **Step 3: Confirm no secrets**

Inspect `.env.example`, Docker context exclusions, CI values, and docs; all values must be synthetic placeholders.

### Task 6: Verification and baseline preservation

**Files:**
- Inspect: all scoped diffs only.

**Interfaces:**
- Produces: final evidence for TEC-11 and TEC-12 acceptance.

- [ ] **Step 1: Audit Python dependencies**

Run `python -m pip check` and `python -m pip_audit -r requirements.txt`; investigate every advisory.

- [ ] **Step 2: Run backend gates**

Run the full Django suite, `check`, production `check --deploy`, `migrate --check`, and `makemigrations --check --dry-run` with safe synthetic settings.

- [ ] **Step 3: Run frontend gates**

Run the full Vitest suite, Oxlint, and a production Vite build with explicit `VITE_API_URL`.

- [ ] **Step 4: Recheck PostgreSQL data and health**

Confirm `Patient=3`, `ClinicalRecord=2`, `Consultation=2`, `Appointment=5`, `OdontogramVersion=5`, and `PatientDocument=4`; exercise live/ready against the configured development PostgreSQL without mutations.

- [ ] **Step 5: Review scope**

Run `git diff --check`, inspect `git status`, verify no temporary/static artifacts are included, and report any Docker-daemon limitation as a residual risk rather than hiding it.
