# Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement HU-03 so registered users can request and complete a secure, time-limited password reset without exposing whether an email exists.

**Architecture:** Django uses its signed password-reset token generator and mail abstraction; the request endpoint always returns the same response while only active registered users receive mail. React provides public request and confirmation routes, with the reset token carried only in the URL and sent to the confirmation endpoint.

**Tech Stack:** Django 5.2, Django REST Framework, Django email/password validation, React 19, React Router, Vitest, Testing Library.

## Global Constraints

- Recovery responses must not reveal whether an email is registered.
- Reset links expire after 60 minutes and become invalid after password change.
- New passwords must pass Django password validators.
- Recovery endpoints are anonymous and request throttling is enabled.
- The interface remains consistent with the existing DentalClinic login and works on mobile.

---

### Task 1: Password-reset request API

**Files:**
- Modify: `src/backend/config/settings.py`
- Modify: `src/backend/apps/users/serializers.py`
- Modify: `src/backend/apps/users/views.py`
- Modify: `src/backend/apps/users/urls.py`
- Modify: `src/backend/apps/users/tests.py`

**Interfaces:**
- Consumes: `POST /api/auth/password-reset/` with `{ "email": string }`.
- Produces: HTTP 200 with the same generic message for registered and unknown email addresses; registered active users receive a frontend reset URL.

- [ ] Add failing tests comparing known and unknown email responses and asserting mail delivery only for the known user.
- [ ] Run focused tests and confirm the missing route failure.
- [ ] Implement normalized email lookup, signed uid/token URL generation, generic response, console email configuration, 60-minute expiry, and scoped throttling.
- [ ] Run focused backend tests to green.

### Task 2: Password-reset confirmation API

**Files:**
- Modify: `src/backend/apps/users/serializers.py`
- Modify: `src/backend/apps/users/views.py`
- Modify: `src/backend/apps/users/urls.py`
- Modify: `src/backend/apps/users/tests.py`

**Interfaces:**
- Consumes: `POST /api/auth/password-reset/confirm/` with `{ "uid", "token", "new_password", "confirm_password" }`.
- Produces: HTTP 200 after changing the password; HTTP 400 for mismatch, weak, expired, malformed, or previously used tokens.

- [ ] Add failing tests for successful reset, single-use token, mismatched passwords, weak password, and expired token.
- [ ] Run focused tests and confirm failures are caused by the missing endpoint.
- [ ] Implement uid decoding, token verification, Django password validation, password update, and token-version increment.
- [ ] Run focused and complete backend tests.

### Task 3: Recovery request interface

**Files:**
- Create: `src/frontend/src/pages/Auth/PasswordResetRequestPage.jsx`
- Create: `src/frontend/src/pages/Auth/PasswordResetRequestPage.test.jsx`
- Modify: `src/frontend/src/pages/Auth/LoginPage.jsx`
- Modify: `src/frontend/src/services/authService.js`
- Modify: `src/frontend/src/App.jsx`

**Interfaces:**
- Consumes: user email and `requestPasswordReset({ email })`.
- Produces: public `/recuperar-contrasena` page with a generic confirmation state and navigation back to login.

- [ ] Add failing UI tests for navigation from login, required email, successful generic confirmation, and API error recovery.
- [ ] Run focused tests and confirm the route/service is absent.
- [ ] Build the responsive recovery panel and connect it to the API.
- [ ] Run focused frontend tests.

### Task 4: New-password interface

**Files:**
- Create: `src/frontend/src/pages/Auth/PasswordResetConfirmPage.jsx`
- Create: `src/frontend/src/pages/Auth/PasswordResetConfirmPage.test.jsx`
- Modify: `src/frontend/src/services/authService.js`
- Modify: `src/frontend/src/App.jsx`

**Interfaces:**
- Consumes: `/restablecer-contrasena/:uid/:token`, new password, and confirmation.
- Produces: completed reset state with login navigation, plus actionable mismatch/invalid-link errors.

- [ ] Add failing UI tests for mismatch, valid submission, and invalid/expired token response.
- [ ] Run focused tests and confirm the missing page/service failure.
- [ ] Implement accessible password fields, client mismatch validation, API submission, and success state.
- [ ] Run focused and complete frontend tests.

### Task 5: Verification

**Files:**
- Inspect: all changed files and repository status.

**Interfaces:**
- Produces: evidence-backed completion result for SCRUM-60 through SCRUM-63.

- [ ] Run Django checks, migration checks, and all backend tests.
- [ ] Run all frontend tests, lint, and production build.
- [ ] Review generic-response equality, token expiry, single use, password validation, and route accessibility.
- [ ] Report exact results and production email configuration requirement.
