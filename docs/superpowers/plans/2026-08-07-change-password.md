# Authenticated Password Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement HU-04 so authenticated users can securely change their password after verifying the current password.

**Architecture:** A protected Django endpoint validates the current credential, confirmation, reuse, and Django password policy before updating the password and token version. React exposes a protected settings screen and clears the local session after success because all previously issued access tokens become invalid.

**Tech Stack:** Django 5.2, Django REST Framework, SimpleJWT, React 19, React Router, Vitest, Testing Library.

## Global Constraints

- The endpoint requires a valid authenticated session.
- The current password must be correct.
- The new password must be confirmed, differ from the current password, and pass Django validators.
- Successful changes invalidate all previously issued access tokens.
- The interface must explain actionable validation failures without exposing passwords.

---

### Task 1: Password-change API

**Files:**
- Modify: `src/backend/apps/users/serializers.py`
- Modify: `src/backend/apps/users/views.py`
- Modify: `src/backend/apps/users/urls.py`
- Modify: `src/backend/apps/users/tests.py`

**Interfaces:**
- Consumes: authenticated `POST /api/auth/password-change/` with `{ "current_password", "new_password", "confirm_password" }`.
- Produces: HTTP 200 after changing the password and incrementing `token_version`; HTTP 400 with field-specific errors for incorrect, reused, mismatched, or weak passwords.

- [ ] Add failing tests for authentication, correct change, wrong current password, mismatch, reuse, weak password, and access-token invalidation.
- [ ] Run focused tests and confirm the missing-route failure.
- [ ] Implement serializer validation, password update, token-version increment, protected view, and URL.
- [ ] Run focused and complete backend tests.

### Task 2: Frontend service contract

**Files:**
- Modify: `src/frontend/src/services/authService.js`
- Modify: `src/frontend/src/services/authService.test.js`

**Interfaces:**
- Consumes: `{ access, current_password, new_password, confirm_password }`.
- Produces: `changePassword()` request to `/api/auth/password-change/` with bearer authorization.

- [ ] Add a failing boundary test for URL, authorization header, and request payload.
- [ ] Run the focused test and confirm `changePassword` is absent.
- [ ] Implement the service wrapper and run it to green.

### Task 3: Password-change interface

**Files:**
- Create: `src/frontend/src/pages/Auth/ChangePasswordPage.jsx`
- Create: `src/frontend/src/pages/Auth/ChangePasswordPage.test.jsx`
- Modify: `src/frontend/src/components/Navbar.jsx`
- Modify: `src/frontend/src/App.jsx`

**Interfaces:**
- Consumes: current password, new password, confirmation, current access token, and `signOut()`.
- Produces: protected `/cambiar-contrasena` page with rules, field validation, success confirmation, and local logout.

- [ ] Add failing tests for navbar access, mismatched passwords, server policy errors, successful session clearing, and unauthenticated route protection.
- [ ] Run focused tests and confirm the page/route are absent.
- [ ] Build the responsive security card, connect the service, and add protected navigation.
- [ ] Run focused and complete frontend tests.

### Task 4: Final verification

**Files:**
- Inspect: all changed files and repository status.

**Interfaces:**
- Produces: evidence-backed completion decision for SCRUM-64 through SCRUM-67.

- [ ] Run Django checks, migration checks, and all backend tests.
- [ ] Run all frontend tests, lint, and production build.
- [ ] Review authentication enforcement, password-policy messages, session invalidation, and responsive route behavior.
- [ ] Report exact verification totals and any remaining deployment-only concern.
