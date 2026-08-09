# Sistema Clínico Dental

Aplicación web para la gestión de una clínica odontológica. El proyecto utiliza una API REST en Django y una interfaz en React, organizadas dentro de `src/`.

Actualmente están implementados los flujos de autenticación y seguridad de la cuenta:

- Inicio de sesión con correo y contraseña.
- Autorización visual según el rol del usuario.
- Cierre de sesión con revocación de tokens.
- Recuperación de contraseña mediante enlace temporal.
- Cambio de contraseña para usuarios autenticados.
- Invalidación de sesiones anteriores después de cambiar la contraseña.
- Administración de usuarios por parte del rol administrador.
- Prevención de cuentas duplicadas mediante validación de correo.
- Registro y búsqueda de pacientes con apertura automática de su expediente clínico completo.
- Historial, creación, visualización y edición en línea de consultas clínicas por paciente.

## Tecnologías

### Backend

- Python 3
- Django 5.2
- Django REST Framework
- SimpleJWT
- SQLite para desarrollo

### Frontend

- React 19
- React Router
- Vite
- Tailwind CSS 4
- Vitest y Testing Library
- Oxlint

## Estructura del proyecto

```text
.
├── src/
│   ├── backend/
│   │   ├── apps/
│   │   │   ├── users/
│   │   │   ├── patients/
│   │   │   ├── clinics/
│   │   │   └── appointments/
│   │   ├── config/
│   │   ├── manage.py
│   │   └── requirements.txt
│   └── frontend/
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   ├── context/
│       │   ├── pages/
│       │   └── services/
│       └── package.json
├── AGENTS.md
└── README.md
```

## Requisitos

- Python 3 instalado.
- Node.js y npm instalados.
- PowerShell, CMD o una terminal compatible.

## Instalación del backend

Desde la raíz del proyecto:

```powershell
cd src/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
```

En Linux o macOS, activa el entorno con:

```bash
source .venv/bin/activate
```

### Crear un superusuario

```powershell
python manage.py createsuperuser
```

El modelo de usuario utiliza el correo electrónico como identificador de acceso y solicita uno de estos roles:

- `ADMINISTRADOR`
- `RECEPCIONISTA`
- `ODONTOLOGO`

El administrador configura presets globales de permisos para `RECEPCIONISTA` y `ODONTOLOGO` desde **Configuración → Permisos por rol**. El rol `ADMINISTRADOR` conserva acceso total y no es editable.

### Ejecutar el backend

```powershell
python manage.py runserver
```

La API estará disponible en:

```text
http://127.0.0.1:8000/
```

El panel administrativo estará en:

```text
http://127.0.0.1:8000/admin/
```

## Instalación del frontend

En otra terminal:

```powershell
cd src/frontend
npm ci
npm run dev
```

La aplicación estará disponible en:

```text
http://localhost:5173/
```

## Variables de entorno

El frontend utiliza la siguiente variable opcional:

```text
VITE_API_URL=http://127.0.0.1:8000
```

El backend reconoce:

| Variable | Valor predeterminado | Uso |
|---|---|---|
| `FRONTEND_URL` | `http://localhost:5173` | Base de los enlaces de recuperación. |
| `EMAIL_BACKEND` | Backend de consola de Django | Define cómo se envían los correos. |
| `DEFAULT_FROM_EMAIL` | `no-reply@dentalclinic.local` | Remitente de recuperación. |

En el entorno de desarrollo, los correos no se envían a una bandeja real: su contenido y el enlace de recuperación aparecen en la terminal del backend.

La configuración de un proveedor SMTP real está pendiente. Las credenciales SMTP deben suministrarse mediante variables de entorno y nunca guardarse en Git.

## Autenticación y seguridad

La API utiliza access y refresh tokens JWT. Cada usuario tiene una versión de token que permite invalidar inmediatamente los access tokens emitidos previamente.

Los siguientes eventos invalidan las sesiones anteriores:

- Cierre de sesión.
- Restablecimiento de contraseña.
- Cambio de contraseña desde una sesión autenticada.

Los enlaces de recuperación:

- Expiran después de 60 minutos.
- Solo pueden utilizarse una vez.
- No revelan si el correo solicitado está registrado.
- Están limitados a cinco solicitudes por hora y cliente.

> El almacenamiento actual de JWT en Web Storage es adecuado para el entorno de desarrollo, pero debe revisarse antes de un despliegue con información clínica real.

## Endpoints de autenticación

| Método | Endpoint | Autenticación | Descripción |
|---|---|---:|---|
| `POST` | `/api/auth/login/` | No | Inicia sesión y devuelve los tokens. |
| `POST` | `/api/auth/token/refresh/` | Refresh token | Renueva automáticamente un access token vencido. |
| `GET` | `/api/auth/me/` | Sí | Devuelve el usuario autenticado. |
| `POST` | `/api/auth/logout/` | Sí | Revoca la sesión y el refresh token. |
| `POST` | `/api/auth/password-reset/` | No | Solicita el enlace de recuperación. |
| `POST` | `/api/auth/password-reset/confirm/` | No | Confirma una nueva contraseña con uid y token. |
| `POST` | `/api/auth/password-change/` | Sí | Cambia la contraseña del usuario autenticado. |
| `GET` | `/api/auth/users/` | Administrador | Lista los usuarios registrados. |
| `POST` | `/api/auth/users/` | Administrador | Registra un usuario con sus credenciales y rol. |
| `PATCH` | `/api/auth/users/{id}/` | Administrador | Actualiza datos, rol y estado activo de un usuario. |
| `GET` | `/api/auth/role-permissions/` | Administrador | Lista el catálogo y los presets editables por rol. |
| `PATCH` | `/api/auth/role-permissions/{role}/` | Administrador | Reemplaza el preset global de un rol editable. |

## Endpoints de pacientes

| Método | Endpoint | Autorización | Descripción |
|---|---|---:|---|
| `GET` | `/api/patients/` | `patients.view` | Lista pacientes y permite buscar con `?search=`. |
| `POST` | `/api/patients/` | `patients.create` | Registra un paciente, genera su código y crea `clinical_record`. |
| `GET` | `/api/patients/{id}/` | `patients.view` | Abre la identidad y el expediente clínico completo. |
| `PATCH` | `/api/patients/{id}/` | `patients.edit` | Actualiza datos personales y el expediente clínico anidado. |
| `GET` | `/api/patients/{id}/consultations/` | `consultations.view` | Lista las consultas del paciente por fecha descendente. |
| `POST` | `/api/patients/{id}/consultations/` | `consultations.create` | Registra una consulta y asigna el profesional autenticado. |
| `GET` | `/api/patients/{id}/consultations/{consultationId}/` | `consultations.view` | Abre la ficha clínica completa de la consulta. |
| `PATCH` | `/api/patients/{id}/consultations/{consultationId}/` | `consultations.edit` | Actualiza la consulta sin cambiar paciente o profesional. |

## Pruebas y validación

### Backend

```powershell
cd src/backend
.\.venv\Scripts\Activate.ps1
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```

### Frontend

```powershell
cd src/frontend
npm test
npm run lint
npm run build
```

## Flujos disponibles

### Inicio de sesión

1. Abre `/login`.
2. Introduce el correo y la contraseña.
3. El sistema muestra las opciones permitidas por el rol.

### Recuperación de contraseña

1. Selecciona **¿Has olvidado tu contraseña?**.
2. Introduce un correo registrado.
3. En desarrollo, copia el enlace mostrado en la terminal del backend.
4. Abre el enlace y define una contraseña segura.

### Cambio de contraseña autenticado

1. Inicia sesión.
2. Selecciona **Cambiar contraseña** en la barra superior.
3. Introduce la contraseña actual y confirma la nueva.
4. Después del cambio, el sistema cierra la sesión y solicita iniciar nuevamente.

### Administración de usuarios

1. Inicia sesión con una cuenta de rol `ADMINISTRADOR`.
2. Abre **Configuración** y selecciona **Gestión de Staff**.
3. Consulta la lista completa de usuarios con su rol y estado activo o inactivo.
4. Selecciona **Añadir miembro** y completa los datos, el rol y una contraseña segura.
5. El usuario creado queda disponible inmediatamente para iniciar sesión.
6. Abre **Permisos por rol** para definir los accesos globales de recepcionistas y odontólogos.

Como parte de HU-06, **Editar** permite cambiar de forma persistente los datos sin mostrar ni modificar la contraseña. HU-07 permite desactivar la cuenta sin eliminarla, HU-08 asigna el rol y sus permisos, y HU-09 presenta todos los usuarios con su rol y estado.

La aplicación rechaza correos ya registrados, incluso si se escriben usando una combinación diferente de mayúsculas y minúsculas. Los usuarios sin rol administrador no pueden acceder a esta pantalla ni a sus endpoints.

### Registro de pacientes

1. Inicia sesión con una cuenta que tenga `patients.view` y `patients.create`.
2. Selecciona **Nuevo paciente** desde el dashboard o desde **Pacientes**; ambas acciones abren `/pacientes/nuevo` usando la misma ficha visual que muestra un expediente existente.
3. Completa los datos personales y antecedentes disponibles; al detectar cambios aparecerá la nube **Guardar cambios**.
4. El sistema genera un código `PAC-00001` y abre automáticamente el expediente inicial.

El **Resumen clínico** presenta los datos permanentes del paciente y sus antecedentes familiares, infectocontagiosos y hereditarios. Los datos variables de cada atención —anamnesis, examen físico, diagnóstico, plan, presupuesto y tratamiento— se registran exclusivamente en **Consultas**, evitando información duplicada.

Para editar el expediente, el administrador debe otorgar `patients.edit` desde **Configuración → Permisos por rol**. Con ese permiso, los campos de las mismas tarjetas son editables directamente y conservan apariencia de texto hasta recibir foco. La nube **Guardar cambios** y la X **Descartar cambios** aparecen únicamente cuando el borrador difiere de la última versión guardada; la aplicación advierte antes de abandonar cambios pendientes.

La pestaña **Consultas** muestra el historial clínico persistido del paciente en orden descendente por fecha. Cada registro identifica el tipo, profesional, resumen y estado. **Nueva consulta** abre una ficha completa con el mismo comportamiento de edición directa: fecha/hora actuales y estado **En progreso**, nube para guardar, X para descartar y advertencia al abandonar cambios pendientes.

El administrador gestiona `consultations.view`, `consultations.create` y `consultations.edit` desde los presets de rol. Recepción obtiene visualización por defecto; Odontología obtiene visualización, creación y edición. Paciente y profesional se determinan en backend, y `DELETE` no está disponible.

## Consideraciones para producción

Antes de desplegar el sistema:

- Mover `SECRET_KEY` a una variable de entorno.
- Desactivar `DEBUG`.
- Configurar `ALLOWED_HOSTS` y CORS para los dominios reales.
- Configurar HTTPS y cabeceras de seguridad.
- Sustituir SQLite por una base de datos adecuada para producción.
- Configurar un servicio SMTP o transaccional.
- Evaluar cookies `HttpOnly` para almacenar las credenciales de sesión.
- Ejecutar auditorías de dependencias y seguridad.

## Estado actual

Las historias HU-01, HU-02, HU-03, HU-04, HU-05, HU-06, HU-07, HU-08, HU-09 y HU-10 están implementadas y cuentan con pruebas automatizadas. La evidencia de aceptación de cada historia cerrada se conserva en `docs/user-stories/`. El módulo de pacientes permite registrar, buscar, abrir y editar expedientes, además de listar, crear, visualizar y editar consultas clínicas. Odontograma, documentos y citas continúan en historias posteriores.
