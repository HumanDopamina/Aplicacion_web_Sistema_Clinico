# Admin Staff Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un administrador asigne una nueva contraseña a un miembro del staff desde su formulario de edición, con validación robusta y revocación inmediata de sus sesiones.

**Architecture:** El `PATCH /api/auth/users/{id}/` existente recibirá opcionalmente `new_password` y `confirm_password`; el serializador administrativo validará ambos con la política de Django, almacenará sólo el hash e incrementará `token_version`. El formulario React revelará esos campos bajo demanda, validará la confirmación antes de enviar y conservará el flujo actual cuando no se solicite un cambio.

**Tech Stack:** Django 5.2, Django REST Framework, Simple JWT, React 19, Vite, Vitest y Testing Library.

## Global Constraints

- Sólo los usuarios con rol `ADMINISTRADOR` pueden usar el endpoint de gestión de staff.
- Las contraseñas nunca se devuelven en la respuesta ni se registran en logs.
- Un cambio exitoso incrementa `token_version` para invalidar access y refresh tokens emitidos previamente.
- Si no se envían campos de contraseña, la edición conserva la contraseña y las sesiones actuales.
- La interfaz mantiene los estilos y la estructura del modal existente y usa `autocomplete="new-password"`.

---

### Task 1: Contrato seguro de cambio de contraseña administrativo

**Files:**
- Modify: `src/backend/apps/users/serializers.py:340`
- Test: `src/backend/apps/users/tests.py:698`

**Interfaces:**
- Consumes: `PATCH /api/auth/users/{id}/`, `validate_password(password, user)` y `User.token_version`.
- Produces: campos opcionales de escritura `new_password: string` y `confirm_password: string`; respuesta pública sin ambos campos.

- [x] **Step 1: Write the failing API tests**

```python
def test_hu06_administrator_changes_password_and_revokes_existing_sessions(self):
    # Autenticar al miembro, guardar su access token, cambiar la contraseña como admin
    # y comprobar hash nuevo, token_version + 1, campos secretos ausentes y token anterior 401.

def test_hu06_password_change_rejects_mismatch_without_mutating_user(self):
    # Enviar confirmación diferente y comprobar 400, hash y token_version sin cambios.

def test_hu06_password_change_rejects_weak_password(self):
    # Enviar "123" en ambos campos y comprobar 400 bajo new_password.
```

- [x] **Step 2: Run the focused tests to verify RED**

Run: `cd src/backend; .\.venv\Scripts\python.exe manage.py test apps.users.tests.UserRegistrationApiTests`

Expected: los nuevos casos fallan porque el serializador todavía ignora `new_password` y `confirm_password`.

- [x] **Step 3: Implement optional write-only password fields**

```python
new_password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)
confirm_password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)

def validate(self, attrs):
    # Exigir ambos campos juntos, comprobar igualdad y ejecutar validate_password con self.instance.

def update(self, instance, validated_data):
    # Retirar credenciales antes del update normal; si existen, usar set_password,
    # incrementar token_version y guardar ambos campos dentro de transaction.atomic.
```

- [x] **Step 4: Run the focused backend suite to verify GREEN**

Run: `cd src/backend; .\.venv\Scripts\python.exe manage.py test apps.users.tests.UserRegistrationApiTests`

Expected: todos los casos de gestión administrativa pasan.

### Task 2: Controles de contraseña en el modal de staff

**Files:**
- Modify: `src/frontend/src/pages/Settings/SettingsPage.jsx:36`
- Test: `src/frontend/src/pages/Settings/SettingsPage.test.jsx:335`

**Interfaces:**
- Consumes: `updateUser(accessToken, id, changes)` y los campos API `new_password`/`confirm_password`.
- Produces: botón `Cambiar contraseña`, panel accesible con dos campos y error local ante campos incompletos o diferentes.

- [x] **Step 1: Write the failing interaction tests**

```jsx
it('[HU-06] lets an administrator assign a new staff password', async () => {
  // Abrir edición, desplegar Acceso, completar campos iguales y verificar el payload exacto.
})

it('[HU-06] rejects mismatched staff passwords before calling the API', async () => {
  // Completar valores diferentes, guardar, comprobar alerta y cero llamadas a updateUser.
})
```

- [x] **Step 2: Run the focused frontend tests to verify RED**

Run: `cd src/frontend; $env:NODE_OPTIONS="--localstorage-file=$env:TEMP\clinic-staff-password-red.json"; npm test -- src/pages/Settings/SettingsPage.test.jsx`

Expected: no existe todavía el control `Cambiar contraseña`.

- [x] **Step 3: Implement the progressive disclosure form**

```jsx
const [passwordChangeOpen, setPasswordChangeOpen] = useState(false)

// Al desplegar, renderizar new_password y confirm_password con autoComplete="new-password".
// Al cancelar el cambio, limpiar ambos valores. Antes del request, validar presencia e igualdad.
```

- [x] **Step 4: Run the focused frontend tests to verify GREEN**

Run: `cd src/frontend; $env:NODE_OPTIONS="--localstorage-file=$env:TEMP\clinic-staff-password-green.json"; npm test -- src/pages/Settings/SettingsPage.test.jsx`

Expected: todos los casos del panel de configuración pasan.

### Task 3: Documentación y verificación integral de HU-06

**Files:**
- Create: `docs/user-stories/HU-06-staff-user-editing.md`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-08-28-admin-staff-password-reset.md`

**Interfaces:**
- Consumes: evidencia de las suites backend/frontend, lint y build.
- Produces: historia HU-06 con criterios, controles de seguridad, archivos afectados y comandos reproducibles.

- [x] **Step 1: Document acceptance evidence**

```markdown
- El administrador puede asignar y confirmar una contraseña nueva al editar un miembro.
- Una confirmación distinta o una contraseña débil no modifica el usuario.
- La respuesta no expone credenciales y las sesiones anteriores quedan revocadas.
```

- [x] **Step 2: Run full verification**

Run: `cd src/backend; .\.venv\Scripts\python.exe manage.py test`

Run: `cd src/frontend; $env:NODE_OPTIONS="--no-experimental-webstorage"; npm test`

Run: `cd src/frontend; npm run lint`

Run: `cd src/frontend; npm run build`

Expected: cuatro comandos finalizan con código 0 y sin fallos.

- [x] **Step 3: Mark this plan complete and commit the story**

```bash
git add src/backend/apps/users/serializers.py src/backend/apps/users/tests.py src/frontend/src/pages/Settings/SettingsPage.jsx src/frontend/src/pages/Settings/SettingsPage.test.jsx docs/user-stories/HU-06-staff-user-editing.md docs/superpowers/plans/2026-08-28-admin-staff-password-reset.md README.md
git commit -m "feat: complete HU-06 staff password reset"
```
