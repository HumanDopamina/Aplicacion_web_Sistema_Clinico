# Authentication Stories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete and verify HU-01 login and HU-02 logout across the Django REST API and React client.

**Architecture:** Django SimpleJWT issues access/refresh tokens and blacklists refresh tokens at logout. React owns the browser session, calls the logout endpoint before clearing local state, and route guards prevent browser-history access after logout.

**Tech Stack:** Django 5.2, Django REST Framework, SimpleJWT blacklist, React 19, React Router, Vitest, Testing Library.

## Global Constraints

- Return the same generic error for unknown email and invalid password.
- Enforce authentication and role decisions server-side; client menus are presentation only.
- A successful logout must revoke the submitted refresh token and clear browser storage.
- Implement behavior with red-green TDD and run complete backend/frontend verification.

---

### Task 1: Restore Django module configuration

**Files:**
- Modify: `src/backend/manage.py`
- Modify: `src/backend/config/settings.py`
- Modify: `src/backend/config/asgi.py`
- Modify: `src/backend/config/wsgi.py`
- Modify: `src/backend/apps/users/apps.py`

**Interfaces:**
- Produces: importable `config.settings` and registered `apps.users` Django app.

- [ ] Run `python manage.py check` and retain the failing `django_project` import as evidence.
- [ ] Replace stale `django_project.*` paths with `config.*` and register `apps.users` consistently.
- [ ] Run `python manage.py check` and the backend suite.

### Task 2: Add server-side logout revocation

**Files:**
- Modify: `src/backend/config/settings.py`
- Modify: `src/backend/apps/users/serializers.py`
- Modify: `src/backend/apps/users/views.py`
- Modify: `src/backend/apps/users/urls.py`
- Modify: `src/backend/apps/users/tests.py`

**Interfaces:**
- Consumes: `{ "refresh": string }` with bearer access authentication.
- Produces: `POST /api/auth/logout/` returning HTTP 204 and blacklisting the refresh token.

- [ ] Add an API test proving unauthenticated logout is rejected.
- [ ] Add an API test proving authenticated logout blacklists the refresh token and prevents reuse.
- [ ] Run the focused tests and verify the expected missing-route failure.
- [ ] Enable `rest_framework_simplejwt.token_blacklist` and implement validated token revocation.
- [ ] Run focused and full backend tests.

### Task 3: Complete client logout and route behavior

**Files:**
- Modify: `src/frontend/src/services/authService.js`
- Modify: `src/frontend/src/context/AuthContext.jsx`
- Modify: `src/frontend/src/components/Navbar.jsx`
- Modify: `src/frontend/src/App.jsx`
- Create: `src/frontend/src/App.test.jsx`

**Interfaces:**
- Consumes: stored `{ access, refresh, user }` session.
- Produces: asynchronous `signOut()` which attempts API revocation, always clears storage, and redirects protected navigation to `/login`.

- [ ] Add integration tests for logout, storage removal, login redirect, and browser-history protection.
- [ ] Run the focused frontend test and verify failure because no logout request is made.
- [ ] Implement the logout request and await it from the navbar while always clearing local state.
- [ ] Define protected placeholder routes so role-visible options remain inside the authenticated layout.
- [ ] Run focused and full frontend tests.

### Task 4: Strengthen acceptance coverage

**Files:**
- Modify: `src/backend/apps/users/tests.py`
- Modify: `src/frontend/src/pages/Auth/LoginPage.test.jsx`
- Modify: `src/frontend/src/App.test.jsx`

**Interfaces:**
- Produces: regression coverage for generic invalid-credential errors and all three role menus.

- [ ] Add tests for unknown email and wrong password returning identical messages.
- [ ] Add UI tests for invalid credentials and Administrador, Recepcionista, and Odontólogo menu visibility.
- [ ] Run each focused test first and confirm its expected failure where behavior is absent.
- [ ] Implement only missing behavior and run both complete suites.

### Task 5: Final verification

**Files:**
- Inspect: all modified files and repository status.

**Interfaces:**
- Produces: evidence-backed completion decision for HU-01 and HU-02.

- [ ] Run Django checks, migrations check, and all backend tests.
- [ ] Run frontend tests, lint, and production build.
- [ ] Review the diff for secrets, unintended files, and acceptance-criteria coverage.
- [ ] Report exact test counts and any remaining non-blocking risk.
