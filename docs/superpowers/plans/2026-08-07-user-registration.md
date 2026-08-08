# HU-05 User Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un administrador registre personal autorizado desde Configuración, rechazando correos duplicados y mostrando el nuevo usuario en Gestión de Staff.

**Architecture:** Django REST Framework expondrá una colección administrativa en `/api/auth/users/` protegida por autenticación JWT y una comprobación explícita del rol `ADMINISTRADOR`. React consumirá esa colección desde un servicio dedicado y presentará un formulario modal accesible dentro de la vista de Configuración; la lista se iniciará vacía cuando la base no tenga personal.

**Tech Stack:** Django 5.2, Django REST Framework, Simple JWT, React 19, React Router, Tailwind CSS 4, Vitest y Testing Library.

## Global Constraints

- Solo un usuario con rol `ADMINISTRADOR` puede listar o registrar usuarios.
- El API acepta únicamente `email`, `first_name`, `last_name`, `role`, `password` y `confirm_password`.
- La contraseña se valida con los validadores configurados de Django y se almacena mediante `set_password`.
- Un correo existente se rechaza sin crear un segundo registro.
- La interfaz no contiene usuarios ficticios y conserva el diseño visual entregado.
- El formulario y sus errores deben ser accesibles mediante etiquetas, foco y mensajes visibles.

---

### Task 1: API administrativa de usuarios

**Files:**
- Modify: `src/backend/apps/users/serializers.py`
- Modify: `src/backend/apps/users/views.py`
- Modify: `src/backend/apps/users/urls.py`
- Test: `src/backend/apps/users/tests.py`

**Interfaces:**
- Consumes: `User.Role`, `validate_password`, autenticación JWT existente.
- Produces: `UserAdminSerializer`; `UserCollectionView`; `GET/POST /api/auth/users/`.

- [ ] **Step 1: Escribir pruebas fallidas de permisos y creación**

```python
class UserRegistrationApiTests(APITestCase):
    def test_administrator_creates_login_ready_user(self):
        response = self.client.post(self.url, self.payload(), format="json")
        self.assertEqual(response.status_code, 201)
        created = User.objects.get(email="nuevo@dentalclinic.com")
        self.assertTrue(created.check_password("ContraseñaSegura123!"))

    def test_duplicate_email_is_rejected(self):
        User.objects.create_user(email="nuevo@dentalclinic.com", password="OtraClave123!", role=User.Role.ODONTOLOGO)
        response = self.client.post(self.url, self.payload(), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_non_administrator_cannot_create_users(self):
        self.authenticate_as(User.Role.RECEPCIONISTA)
        self.assertEqual(self.client.post(self.url, self.payload(), format="json").status_code, 403)
```

- [ ] **Step 2: Ejecutar las pruebas y confirmar RED**

Run: `.\.venv\Scripts\python.exe manage.py test apps.users.tests.UserRegistrationApiTests`

Expected: FAIL porque `users:user-list` y el endpoint aún no existen.

- [ ] **Step 3: Implementar serializer con allowlist y validación**

```python
class UserAdminSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "is_active", "password", "confirm_password")
        read_only_fields = ("id", "is_active")

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Las contraseñas no coinciden."})
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        return User.objects.create_user(**validated_data)
```

- [ ] **Step 4: Implementar permiso y endpoint de colección**

```python
class IsAdministrator(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.ADMINISTRADOR

class UserCollectionView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdministrator]
    serializer_class = UserAdminSerializer
    queryset = User.objects.order_by("first_name", "email")
```

Registrar `path("users/", UserCollectionView.as_view(), name="user-list")`.

- [ ] **Step 5: Ejecutar las pruebas y confirmar GREEN**

Run: `.\.venv\Scripts\python.exe manage.py test apps.users.tests.UserRegistrationApiTests`

Expected: PASS en creación, duplicado, contraseña débil y control de acceso.

### Task 2: Servicio frontend para gestión de usuarios

**Files:**
- Create: `src/frontend/src/services/userService.js`
- Create: `src/frontend/src/services/userService.test.js`

**Interfaces:**
- Consumes: `apiRequest(path, options)` y token de acceso.
- Produces: `listUsers(access)` y `createUser(access, payload)`.

- [ ] **Step 1: Escribir pruebas fallidas del contrato HTTP**

```javascript
it('creates a user with bearer authentication', async () => {
  fetch.mockResolvedValue(response({ id: 2, email: 'nuevo@dentalclinic.com' }, 201))
  await createUser('access-token', payload)
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/users/'), expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
  }))
})
```

- [ ] **Step 2: Ejecutar prueba y confirmar RED**

Run: `npm test -- src/services/userService.test.js`

Expected: FAIL porque el módulo no existe.

- [ ] **Step 3: Implementar el servicio mínimo**

```javascript
export const listUsers = (access) => apiRequest('/api/auth/users/', {
  headers: { Authorization: `Bearer ${access}` },
})

export const createUser = (access, user) => apiRequest('/api/auth/users/', {
  method: 'POST',
  body: JSON.stringify(user),
  headers: { Authorization: `Bearer ${access}` },
})
```

- [ ] **Step 4: Ejecutar prueba y confirmar GREEN**

Run: `npm test -- src/services/userService.test.js`

Expected: PASS.

### Task 3: Vista Configuración y registro de staff

**Files:**
- Create: `src/frontend/src/pages/Settings/SettingsPage.jsx`
- Create: `src/frontend/src/pages/Settings/SettingsPage.test.jsx`
- Modify: `src/frontend/src/App.jsx`
- Modify: `src/frontend/src/components/Sidebar.jsx`

**Interfaces:**
- Consumes: `useAuth().accessToken`, `listUsers`, `createUser`.
- Produces: ruta administrativa `/configuracion`, modal “Añadir miembro”, lista o estado vacío.

- [ ] **Step 1: Escribir pruebas fallidas de interfaz**

```javascript
it('registers a member and adds it to the staff list', async () => {
  renderSettingsAsAdmin()
  await user.click(await screen.findByRole('button', { name: 'Añadir miembro' }))
  await user.type(screen.getByLabelText('Correo electrónico'), 'nuevo@dentalclinic.com')
  await user.type(screen.getByLabelText('Nombre'), 'Lucía')
  await user.selectOptions(screen.getByLabelText('Rol'), 'ODONTOLOGO')
  await user.type(screen.getByLabelText('Contraseña'), 'ContraseñaSegura123!')
  await user.type(screen.getByLabelText('Confirmar contraseña'), 'ContraseñaSegura123!')
  await user.click(screen.getByRole('button', { name: 'Guardar usuario' }))
  expect(await screen.findByText('Lucía')).toBeInTheDocument()
})

it('shows the duplicate warning returned by the API', async () => {
  createUser.mockRejectedValue(new Error('Ya existe un usuario con este correo electrónico.'))
  renderSettingsAsAdmin()
  await user.click(await screen.findByRole('button', { name: 'Añadir miembro' }))
  await fillValidMemberForm(user)
  await user.click(screen.getByRole('button', { name: 'Guardar usuario' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe un usuario con este correo electrónico.')
})
```

- [ ] **Step 2: Ejecutar pruebas y confirmar RED**

Run: `npm test -- src/pages/Settings/SettingsPage.test.jsx src/App.test.jsx`

Expected: FAIL porque `SettingsPage` aún no existe y la ruta usa `ModulePage`.

- [ ] **Step 3: Implementar la vista y el modal**

Crear encabezado “Configuración”, categorías laterales, panel activo “Gestión de Staff”, botón “Añadir miembro”, tabla responsive, estado vacío y formulario con los seis campos permitidos. Cargar usuarios una vez al montar y añadir la respuesta creada al estado sin una segunda solicitud.

- [ ] **Step 4: Restringir la ruta en frontend**

```jsx
<Route
  path="/configuracion"
  element={<ProtectedLayout allowedRoles={['ADMINISTRADOR']}><SettingsPage /></ProtectedLayout>}
/>
```

- [ ] **Step 5: Ejecutar pruebas y confirmar GREEN**

Run: `npm test -- src/pages/Settings/SettingsPage.test.jsx src/App.test.jsx`

Expected: PASS para creación, duplicado, vacío y restricción de rol.

### Task 4: Verificación integral y QA visual

**Files:**
- Verify: `src/backend/apps/users/tests.py`
- Verify: `src/frontend/src/pages/Settings/SettingsPage.jsx`

**Interfaces:**
- Consumes: API y vista terminadas.
- Produces: evidencia de aceptación de HU-05.

- [ ] **Step 1: Ejecutar backend completo**

Run: `.\.venv\Scripts\python.exe manage.py test`

Expected: todas las pruebas pasan.

- [ ] **Step 2: Ejecutar frontend completo**

Run: `npm test && npm run lint && npm run build`

Expected: pruebas, lint y build pasan sin errores.

- [ ] **Step 3: Ejecutar QA Playwright**

Levantar backend y frontend, iniciar sesión como administrador, abrir `/configuracion`, comprobar el estado vacío, registrar un usuario y confirmar que aparece en la tabla. Repetir el correo y comprobar el aviso de duplicado. Capturar escritorio `1366x768` y móvil `390x844`, verificar ausencia de overflow y errores de consola.

- [ ] **Step 4: Revisar seguridad**

Confirmar que un token de recepcionista obtiene `403`, que la respuesta nunca contiene `password` ni `confirm_password`, que no se usa `dangerouslySetInnerHTML` y que el serializer mantiene una allowlist explícita.
