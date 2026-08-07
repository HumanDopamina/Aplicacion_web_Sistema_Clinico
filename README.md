# Sistema Clínico Dental

Aplicación web para la gestión de una clínica odontológica. El proyecto utiliza una API REST en Django y una interfaz en React, organizadas dentro de `src/`.

Actualmente están implementados los flujos de autenticación y seguridad de la cuenta:

- Inicio de sesión con correo y contraseña.
- Autorización visual según el rol del usuario.
- Cierre de sesión con revocación de tokens.
- Recuperación de contraseña mediante enlace temporal.
- Cambio de contraseña para usuarios autenticados.
- Invalidación de sesiones anteriores después de cambiar la contraseña.

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
| `GET` | `/api/auth/me/` | Sí | Devuelve el usuario autenticado. |
| `POST` | `/api/auth/logout/` | Sí | Revoca la sesión y el refresh token. |
| `POST` | `/api/auth/password-reset/` | No | Solicita el enlace de recuperación. |
| `POST` | `/api/auth/password-reset/confirm/` | No | Confirma una nueva contraseña con uid y token. |
| `POST` | `/api/auth/password-change/` | Sí | Cambia la contraseña del usuario autenticado. |

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

Las historias HU-01, HU-02, HU-03 y HU-04 están implementadas y cuentan con pruebas automatizadas. Los módulos de pacientes, clínicas y citas conservan su estructura inicial para desarrollarse en historias posteriores.
