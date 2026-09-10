# HU-01, HU-43 and HU-61 Users and Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make navigation follow current backend capabilities, refresh those capabilities in open sessions, and add optional professional identity fields for dentists.

**Architecture:** Keep Django as the authorization source. Extend effective permissions with non-delegable administrative capabilities, consume every navigation decision through one frontend helper, and revalidate `/api/auth/me/` on browser focus or a protected `403` without polling. Store the optional professional fields on the existing `User`; expose them only in self/admin/clinical contracts where they provide context and never copy them into consultations.

**Tech Stack:** Django 5.2, Django REST Framework, SimpleJWT, PostgreSQL, React 19, React Router 7, Vitest, Testing Library.

## Global Constraints

- Implement only HU-01, HU-43 and HU-61.
- Do not implement MFA, TEC-09, WebSockets, advanced session/device management, specialty catalogs or electronic signatures.
- Frontend hiding is UX; every backend authorization check remains authoritative and deny-by-default.
- Do not make administrative capabilities assignable to receptionist or dentist role presets.
- `specialty` and `professional_registration_number` are optional, trimmed, non-unique text fields with no invented national format or backfill.
- Changing role must preserve professional data.
- Preserve Patient 3, ClinicalRecord 2, Consultation 2, Appointment 5, OdontogramVersion 5 and PatientDocument 4.
- Do not modify the Product Backlog or unrelated stories.

---

### Task 1: Effective capability contract and navigation

**Files:**
- Modify: `src/backend/apps/users/permissions.py`
- Modify: `src/backend/apps/users/tests.py`
- Create: `src/frontend/src/utils/capabilities.js`
- Create: `src/frontend/src/utils/capabilities.test.js`
- Modify: `src/frontend/src/components/Sidebar.jsx`
- Modify: `src/frontend/src/App.jsx`
- Modify: `src/frontend/src/App.test.jsx`
- Modify: `src/frontend/src/pages/Settings/SettingsPage.jsx`
- Modify: `src/frontend/src/pages/Settings/SettingsPage.test.jsx`

**Interfaces:**
- Produces backend effective codes `clinic.manage` and `users.manage` for administrators only.
- Produces `hasCapability(user, code)` and `hasAnyCapability(user, codes)` without role-name branches.
- Consumes the existing `user.permissions` contract from login and `/api/auth/me/`.

- [ ] **Step 1: Write failing backend capability tests**

Assert administrator login/profile includes both administrative capabilities, operational role presets cannot accept them, and receptionist/dentist effective permissions do not gain them.

- [ ] **Step 2: Run backend tests and verify RED**

Run: `.venv\Scripts\python.exe manage.py test apps.users.tests.LoginApiTests apps.users.tests.RolePermissionPresetApiTests --settings=config.settings.test`

Expected: assertions fail because administrative capabilities do not exist.

- [ ] **Step 3: Implement the backend capability contract**

Keep the editable `PERMISSION_CATALOG` unchanged. Add an administrator-only ordered tuple and append it only in `get_effective_permissions()` for `ADMINISTRADOR`; role preset serializers continue accepting only `PERMISSION_CODES`.

- [ ] **Step 4: Write failing navigation and helper tests**

Assert partial permission sets hide Pacientes, Citas and Configuración independently; full effective permissions show them; manual URLs redirect; settings subsections consume centralized capabilities.

- [ ] **Step 5: Run frontend tests and verify RED**

Run: `npm test -- --reporter=dot src/utils/capabilities.test.js src/App.test.jsx src/pages/Settings/SettingsPage.test.jsx`

Expected: sidebar still renders every menu option and route guards still contain role bypasses.

- [ ] **Step 6: Implement centralized capability navigation**

Filter static menu descriptors with `hasCapability`/`hasAnyCapability`, replace `allowedRoles` and administrator bypass in `ProtectedLayout`, and filter settings sections before they can issue unauthorized requests.

- [ ] **Step 7: Re-run focused navigation tests until GREEN**

Require all desktop/mobile sidebar and direct URL assertions to pass without changing backend permissions.

---

### Task 2: Open-session capability revalidation

**Files:**
- Modify: `src/frontend/src/services/api.js`
- Modify: `src/frontend/src/services/api.test.js`
- Modify: `src/frontend/src/services/authService.js`
- Modify: `src/frontend/src/context/AuthContext.jsx`
- Modify: `src/frontend/src/context/AuthContext.test.jsx`
- Modify: `src/frontend/src/App.test.jsx`

**Interfaces:**
- Produces `setForbiddenHandler(handler)` in the API boundary.
- Produces `getCurrentSessionUser(access)` and `revalidateUser()` in authentication state.
- Revalidates only on focus/visible transition and protected `403`; concurrent requests share one promise and no interval is created.

- [ ] **Step 1: Write failing API and context tests**

Assert a protected 403 notifies the authentication provider, focus fetches `/api/auth/me/`, simultaneous triggers deduplicate, idle time causes no polling, and a new session does not inherit stale permissions.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --reporter=dot src/services/api.test.js src/context/AuthContext.test.jsx`

Expected: missing forbidden handler and revalidation methods.

- [ ] **Step 3: Implement minimal revalidation**

Register a single handler with cleanup, retain permissions only in provider memory, refresh the complete current-user object, and let existing route guards unmount revoked modules after state changes.

- [ ] **Step 4: Write and run revocation/concession integration tests**

Start on an authorized route, return a profile without its permission on focus and assert redirect/data unmount; then return a granted permission and assert navigation appears without logout/login.

- [ ] **Step 5: Re-run focused tests until GREEN**

Require generic login errors, session expiry, refresh-token behavior and route protection regressions to remain green.

---

### Task 3: Optional dentist professional profile

**Files:**
- Modify: `src/backend/apps/users/models.py`
- Create: `src/backend/apps/users/migrations/0010_user_professional_profile.py`
- Create: `src/backend/apps/users/test_hu61.py`
- Create: `src/backend/apps/users/test_hu61_migrations.py`
- Modify: `src/backend/apps/users/serializers.py`
- Modify: `src/backend/apps/users/views.py`
- Modify: `src/backend/apps/users/admin.py`
- Modify: `src/backend/apps/patients/serializers.py`
- Modify: `src/backend/apps/patients/clinical_record_pdf.py`
- Modify: `src/backend/apps/patients/test_clinical_record_export.py`
- Modify: `src/frontend/src/pages/Settings/SettingsPage.jsx`
- Modify: `src/frontend/src/pages/Settings/SettingsPage.test.jsx`
- Modify: `src/frontend/src/pages/Profile/MyProfilePage.jsx`
- Modify: `src/frontend/src/pages/Profile/MyProfilePage.test.jsx`
- Modify: `src/frontend/src/pages/Patients/ConsultationRecordPage.jsx`
- Modify: `src/frontend/src/App.test.jsx`

**Interfaces:**
- Adds nullable-by-content `User.specialty: CharField(max_length=200, blank=True)`.
- Adds `User.professional_registration_number: CharField(max_length=100, blank=True)`.
- Adds read-only current-professional fields to consultation responses; no consultation columns or snapshots.

- [ ] **Step 1: Write failing model/serializer/API tests**

Assert optional values, trimming, length bounds, create/edit dentist, non-dentist omission, role changes preserving values, self-profile read-only behavior, no mass assignment, and safe audit changed fields.

- [ ] **Step 2: Verify RED**

Run: `.venv\Scripts\python.exe manage.py test apps.users.test_hu61 --settings=config.settings.test`

Expected: model and serializer fields are missing.

- [ ] **Step 3: Add the expansion migration and minimal contracts**

Add only the two blank fields, expose them in login/current/admin contracts as required, validate with DRF max lengths and trimming, and record safe staff changed-field names without passwords or tokens.

- [ ] **Step 4: Write and run migration preservation test**

Migrate an isolated database from users `0009` to `0010`, assert existing users receive empty strings and no role/name/email is altered, then restore the latest graph.

- [ ] **Step 5: Write failing UI and clinical-context tests**

Assert dentist-only admin inputs, preserved hidden values after role change, read-only personal profile context, current professional values in consultation JSON/UI/PDF, and new PDF exports reflecting later professional updates.

- [ ] **Step 6: Implement the admin/profile/clinical presentation**

Keep professional fields in form state when role changes, show them conditionally, serialize current professional values through the existing foreign key, and render them next to the professional name in the consultation and PDF.

- [ ] **Step 7: Re-run HU-61 tests until GREEN**

Require admin, profile, consultation and HU-35/HU-41 focused regressions to pass.

---

### Task 4: Security review, regression suite and documentation

**Files:**
- Create: `docs/user-stories/HU-01-capability-navigation.md`
- Create: `docs/user-stories/HU-43-open-session-capability-refresh.md`
- Create: `docs/user-stories/HU-61-dentist-professional-profile.md`
- Modify: `README.md`

**Interfaces:**
- Produces acceptance evidence only; no Product Backlog changes and no mixed commit from the dirty worktree.

- [ ] **Step 1: Review OWASP access-control boundaries**

Verify every hidden module still returns 401/403 server-side, admin-only codes are not delegable, profile serializers allowlist fields, audit excludes credentials, and no session permissions are persisted in browser storage.

- [ ] **Step 2: Verify migration and PostgreSQL baseline**

Run `migrate --check`, `makemigrations --check --dry-run`, the migration test, and compare exact 3/2/2/5/5/4 clinical counts before/after.

- [ ] **Step 3: Run complete regression gates**

Run backend and frontend full suites, lint, build, `manage.py check`, `pip check`, relevant dependency audit if available and `git diff --check`.

- [ ] **Step 4: Document and inspect scope**

Record interfaces, migration, security evidence, commands and residual risks; update README implemented stories; verify no MFA, TEC-09, WebSocket, specialty catalog or unrelated schema/code was added.
