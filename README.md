# Sistema Clínico Dental

Aplicación web para la gestión de una clínica odontológica. El proyecto utiliza una API REST en Django y una interfaz en React, organizadas dentro de `src/`.

Preparación de demo y correcciones de seguridad: consulta la [guía de Vercel + Render](docs/demo-deployment.md) y el [informe de cambios y pendientes](docs/production-readiness-improvements.md). La demo utiliza datos ficticios y no habilita cargas. La validación automatizada local no sustituye las pruebas en PostgreSQL ni la verificación del despliegue real.

Actualmente están implementados los flujos de autenticación y seguridad de la cuenta:

- Inicio de sesión con correo y contraseña.
- Autorización visual según capacidades efectivas entregadas por el backend.
- Cierre de sesión con revocación de tokens.
- Recuperación de contraseña mediante enlace temporal.
- Cambio de contraseña para usuarios autenticados.
- Invalidación de sesiones anteriores después de cambiar la contraseña.
- Administración de usuarios por parte del rol administrador.
- Prevención de cuentas duplicadas mediante validación de correo.
- Registro y búsqueda de pacientes con apertura automática de su expediente clínico completo.
- Detección robusta de pacientes duplicados por identificación, ignorando guiones, espacios y mayúsculas sin alterar el formato visible.
- Historial, creación, visualización y edición en línea de consultas clínicas por paciente.
- Procedimientos planificados estructurados por consulta con snapshots históricos de servicio y precio.
- Odontogramas FDI por consulta con revisiones inmutables y comparación histórica por paciente.
- Sesiones de ocho horas con refresh JWT en cookie `HttpOnly`, CSRF y access token sólo en memoria.
- Protección de login por cuenta e IP y auditoría append-only de operaciones clínicas y administrativas.
- Edición clínica con control de versión, retiro recuperable de documentos y revocación de sesiones al archivar usuarios.
- Modo demo con muestras ficticias, cargas deshabilitadas y configuración separada de producción.

## Tecnologías

### Backend

- Python 3
- Django 5.2
- Django REST Framework
- SimpleJWT
- PostgreSQL para desarrollo y producción
- SQLite en memoria para pruebas automatizadas
- Redis y almacenamiento S3-compatible configurables en producción

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
- PostgreSQL 18 instalado y accesible.
- PowerShell, CMD o una terminal compatible.

## Instalación del backend

Desde la raíz del proyecto:

```powershell
cd src/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
$env:DATABASE_URL = "postgresql://clinica_user:<contraseña-codificada>@localhost:5432/clinica_dental"
python manage.py check
python manage.py migrate
```

La base y el rol pueden prepararse desde una sesión administrativa de PostgreSQL:

```sql
CREATE ROLE clinica_user WITH LOGIN PASSWORD '<contraseña-local>';
CREATE DATABASE clinica_dental OWNER clinica_user;
```

`DATABASE_URL` es obligatoria en desarrollo y debe apuntar a PostgreSQL. Si la
contraseña contiene caracteres reservados para una URL, debe codificarse. El
perfil de desarrollo carga `src/backend/.env` sin reemplazar variables ya exportadas.
Los perfiles demo y producción reciben las variables del entorno de despliegue. La
plantilla `src/backend/.env.example` documenta el perfil de producción.

En Linux o macOS, activa el entorno con:

```bash
source .venv/bin/activate
export DATABASE_URL='postgresql://clinica_user:<contraseña-codificada>@localhost:5432/clinica_dental'
python manage.py check
python manage.py migrate
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

El frontend utiliza la siguiente variable. En una publicación normal debe
apuntar al origen HTTPS de la API; en la demo Vercel + Render se configura como
`/` para que el proxy de Vercel mantenga frontend y API bajo el mismo origen:

```text
VITE_API_URL=http://localhost:8000
```

En desarrollo, si se omite, el frontend reutiliza automáticamente el hostname
con el que fue abierto y usa el puerto `8000`. Un build de producción falla de
forma explícita si no se configura esta variable. No mezcles `localhost` con
`127.0.0.1`: las cookies CSRF y de sesión deben pertenecer al mismo sitio.

En desarrollo, el backend reconoce:

| Variable | Valor predeterminado | Uso |
|---|---|---|
| `DATABASE_URL` | Sin valor predeterminado | Conexión PostgreSQL obligatoria. |
| `FRONTEND_URL` | `http://localhost:5173` | Base de los enlaces de recuperación. |
| `EMAIL_BACKEND` | Backend de consola de Django | Define cómo se envían los correos. |
| `DEFAULT_FROM_EMAIL` | `no-reply@dentalclinic.local` | Remitente de recuperación. |

Las pruebas automatizadas conservan SQLite de forma explícita y aislada:

```powershell
python manage.py test --settings=config.settings.test
```

Las reglas críticas de agenda se prueban además sobre PostgreSQL real. Usa un rol
y una base exclusivos de testing; el rol necesita `CREATEDB` únicamente para que
Django cree y destruya `test_clinic_test`:

```sql
CREATE ROLE clinic_test WITH LOGIN PASSWORD '<contraseña-sintética-local>' CREATEDB;
CREATE DATABASE clinic_test OWNER clinic_test;
```

```powershell
$env:TEST_DATABASE_URL='postgresql://clinic_test:<contraseña-sintética-local>@127.0.0.1:5432/clinic_test'
python manage.py test --settings=config.settings.postgres_test --noinput
```

`config.settings.postgres_test` ejecuta toda la suite con PostgreSQL, rechaza
SQLite y también rechaza explícitamente `clinica_dental`, evitando que las
pruebas destructivas apunten a desarrollo.

En el entorno de desarrollo, los correos no se envían a una bandeja real: su contenido y el enlace de recuperación aparecen en la terminal del backend.

Producción utiliza `config.settings.production` y exige base PostgreSQL, Redis, hosts/orígenes, SMTP, buckets y prefijos S3-compatible. Consulta [`src/backend/.env.example`](src/backend/.env.example) y el [procedimiento de despliegue](docs/deployment.md). Las credenciales deben suministrarse mediante un gestor de secretos y nunca guardarse en Git.

## Autenticación y seguridad

La API utiliza un access JWT de cinco minutos sólo en memoria y un refresh rotatorio de ocho horas en cookie `HttpOnly`. Login, refresh y logout requieren CSRF. Cada usuario tiene una versión de token que permite invalidar inmediatamente los tokens emitidos previamente.

Los siguientes eventos invalidan las sesiones anteriores:

- Cierre de sesión.
- Restablecimiento de contraseña.
- Cambio de contraseña desde una sesión autenticada.
- Archivo, reactivación o cambio de rol de una cuenta por Administración.

Los enlaces de recuperación:

- Expiran después de 60 minutos.
- Solo pueden utilizarse una vez.
- No revelan si el correo solicitado está registrado.
- Están limitados a cinco solicitudes por hora y cliente.

No se guardan JWT en `localStorage` ni `sessionStorage`. La decisión y sus consecuencias están en [ADR-0001](docs/adr/0001-refresh-token-cookie.md).

## Endpoints de autenticación

| Método | Endpoint | Autenticación | Descripción |
|---|---|---:|---|
| `GET` | `/api/auth/csrf/` | No | Establece la cookie CSRF y devuelve `204`. |
| `POST` | `/api/auth/login/` | CSRF | Devuelve access y usuario; establece el refresh `HttpOnly`. |
| `POST` | `/api/auth/token/refresh/` | Cookie refresh + CSRF | Rota la cookie y devuelve un access nuevo. |
| `GET` | `/api/auth/me/` | Sí | Devuelve el usuario autenticado. |
| `PATCH` | `/api/auth/me/` | Sí | Actualiza nombre, apellidos, teléfono, correo y foto del usuario autenticado. |
| `GET` | `/api/auth/me/avatar/` | Propietario | Sirve la foto privada del usuario autenticado. |
| `POST` | `/api/auth/logout/` | Cookie refresh + CSRF; access opcional | Revoca la sesión, incluso con access vencido, limpia la cookie y devuelve `204`. |
| `POST` | `/api/auth/password-reset/` | No | Solicita el enlace de recuperación; se deshabilita en demo. |
| `POST` | `/api/auth/password-reset/confirm/` | No | Confirma una nueva contraseña con uid y token; se deshabilita en demo. |
| `POST` | `/api/auth/password-change/` | Sí | Cambia la contraseña del usuario autenticado. |
| `GET` | `/api/auth/users/` | Administrador | Lista los usuarios registrados. |
| `POST` | `/api/auth/users/` | Administrador | Registra un usuario con sus credenciales y rol. |
| `PATCH` | `/api/auth/users/{id}/` | Administrador | Actualiza datos, rol y estado activo de un usuario. |
| `GET` | `/api/auth/users/{id}/avatar/` | Propietario o administrador | Sirve una foto de perfil desde almacenamiento privado. |
| `GET` | `/api/auth/role-permissions/` | Administrador | Lista el catálogo y los presets editables por rol. |
| `PATCH` | `/api/auth/role-permissions/{role}/` | Administrador | Reemplaza el preset global de un rol editable. |

## Edición concurrente y documentos clínicos

Los `PATCH` de paciente, consulta y procedimiento reciben el
`expected_version` devuelto por su lectura. En demo y producción es obligatorio:
la API responde `400` si falta y `409` con código `edit_conflict` si otra persona
guardó antes. La interfaz conserva el borrador para que el profesional decida
cómo reconciliarlo; no reemplaza cambios de forma silenciosa.

Los documentos se retiran con `DELETE /api/patients/{patient}/documents/{id}/`
y un cuerpo `{"reason":"motivo"}`. El retiro conserva archivo, fecha, actor y
motivo. Solo Administración puede consultar retirados con `?retired=true` y
restaurarlos mediante `POST .../documents/{id}/restore/`. No existe una purga
física de documentos clínicos.

## Endpoints de pacientes

| Método | Endpoint | Autorización | Descripción |
|---|---|---:|---|
| `GET` | `/api/patients/` | `patients.view` | Lista pacientes y permite buscar con `?search=`. |
| `GET` | `/api/patients/dashboard-summary/` | `patients.view` | Devuelve el total y hasta cuatro pacientes distintos ordenados por su última consulta completada. |
| `POST` | `/api/patients/` | `patients.create` | Registra un paciente, genera su código y crea `clinical_record`. |
| `GET` | `/api/patients/{id}/` | `patients.view` | Abre la identidad y el expediente clínico completo. |
| `PATCH` | `/api/patients/{id}/` | `patients.edit` | Actualiza datos personales y el expediente clínico anidado. |
| `GET` | `/api/patients/consultations/recent/` | `consultations.view` | Devuelve hasta cuatro consultas recientes; `consultations.view_all` amplía el resumen a todo el equipo. |
| `GET` | `/api/patients/{id}/consultations/` | `consultations.view` | Lista las consultas del paciente por fecha descendente. |
| `POST` | `/api/patients/{id}/consultations/` | `consultations.create` | Registra una consulta y asigna el profesional autenticado. |
| `GET` | `/api/patients/{id}/consultations/{consultationId}/` | `consultations.view` | Abre la ficha clínica completa de la consulta. |
| `PATCH` | `/api/patients/{id}/consultations/{consultationId}/` | `consultations.edit` | Actualiza una consulta en progreso sin cambiar paciente, profesional ni estado. |
| `POST` | `/api/patients/{id}/consultations/{consultationId}/complete/` | `consultations.edit` | Cierra la consulta y completa atómicamente la cita vinculada. |
| `POST` | `/api/patients/{id}/consultations/{consultationId}/cancel/` | `consultations.edit` | Cancela de forma explícita una consulta manual en progreso; una vinculada responde 409. |
| `GET` | `/api/patients/{id}/consultations/{consultationId}/treatment-items/` | `consultations.view` | Lista los procedimientos planificados de la consulta. |
| `POST` | `/api/patients/{id}/consultations/{consultationId}/treatment-items/` | `consultations.edit` | Registra una propuesta estructurada mientras la consulta está en progreso. |
| `GET` | `/api/patients/{id}/consultations/{consultationId}/treatment-items/{itemId}/` | `consultations.view` | Consulta un procedimiento planificado dentro de su contexto clínico. |
| `PATCH` | `/api/patients/{id}/consultations/{consultationId}/treatment-items/{itemId}/` | `consultations.edit` | Edita una propuesta en progreso sin cambiar origen ni estado. |
| `POST` | `/api/patients/{id}/consultations/{consultationId}/treatment-items/{itemId}/accept/` | `consultations.edit` | Acepta explícita e idempotentemente una propuesta. |
| `POST` | `/api/patients/{id}/consultations/{consultationId}/treatment-items/{itemId}/perform/` | `consultations.edit` | Realiza un ítem aceptado y, opcionalmente, registra un resultado confirmado en una nueva versión odontográfica. |
| `POST` | `/api/patients/{id}/consultations/{consultationId}/treatment-items/{itemId}/cancel/` | `consultations.edit` | Cancela una propuesta o aceptación sin eliminar su historia. |
| `GET` | `/api/patients/{id}/consultations/{consultationId}/odontogram/` | `consultations.view` | Devuelve la última versión del odontograma de la consulta. |
| `GET` | `/api/patients/{id}/odontogram/planned-overlay/` | `consultations.view` | Proyecta los tratamientos propuestos y aceptados con contexto dental sobre la capa planificada. |
| `POST` | `/api/patients/{id}/consultations/{consultationId}/odontogram/versions/` | `consultations.edit` | Guarda una revisión inmutable con control de concurrencia. |
| `GET` | `/api/patients/{id}/odontogram-versions/` | `consultations.view` | Lista el histórico de versiones del paciente. |
| `GET` | `/api/patients/{id}/odontogram-versions/{versionId}/` | `consultations.view` | Devuelve el snapshot completo de una versión. |

## Pruebas y validación

### Backend

```powershell
cd src/backend
.\.venv\Scripts\Activate.ps1
python manage.py check --settings=config.settings.test
python manage.py makemigrations --check --dry-run --settings=config.settings.test
python manage.py test --settings=config.settings.test
```

### Frontend

```powershell
cd src/frontend
npm test
npm run lint
npm run build
```

CI ejecuta estas comprobaciones, audita dependencias Python y npm, valida que no
falten migraciones, aplica las migraciones desde cero y corre `check --deploy`
con configuración productiva sintética. Un job separado levanta PostgreSQL 18
con credenciales efímeras y ejecuta la suite completa, incluidas constraints,
migraciones, respuestas `409` y concurrencia de citas y transiciones clínicas.

## Auditoría

`GET /api/audit/events/` permite a Administración consultar eventos paginados y filtrados. El modelo es append-only y no expone endpoints de escritura. El contrato, la redacción de datos sensibles y la retención están documentados en [Auditoría clínica y administrativa](docs/audit-trail.md).

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

### Perfil personal

1. Inicia sesión y selecciona el avatar de la barra superior.
2. Abre **Mi perfil** para actualizar nombre, apellidos, teléfono, correo o fotografía.
3. Si cambias el correo usado para iniciar sesión, confirma la contraseña actual.
4. La sesión permanece activa y la barra superior refleja los datos guardados inmediatamente.

Las fotografías admiten PNG, JPEG o WebP de hasta 2 MB. Se guardan fuera del directorio público y solo el propietario o Administración pueden descargarlas mediante la API autenticada. El perfil personal nunca permite cambiar el rol, estado, permisos ni contraseña; esta última conserva su flujo independiente.

### Administración de usuarios

1. Inicia sesión con una cuenta de rol `ADMINISTRADOR`.
2. Abre **Configuración** y selecciona **Gestión de Staff**.
3. Consulta la lista completa de usuarios con su rol y estado activo o inactivo.
4. Selecciona **Añadir miembro** y completa los datos, el rol y una contraseña segura.
5. El usuario creado queda disponible inmediatamente para iniciar sesión.
6. Abre **Permisos por rol** para definir los accesos globales de recepcionistas y odontólogos.

Como parte de HU-06, **Editar** permite cambiar de forma persistente los datos sin revelar la contraseña actual. La sección **Acceso** permite asignar una nueva contraseña tras confirmarla; el sistema aplica la política de contraseñas y revoca las sesiones anteriores del miembro. Si la sección permanece cerrada, la contraseña y sus sesiones no se modifican. HU-07 permite desactivar la cuenta sin eliminarla, HU-08 asigna el rol y sus permisos, HU-09 presenta todos los usuarios con su rol y estado, y HU-11 incorpora teléfono y fotografía privada tanto al alta como a la edición administrativa.

La aplicación rechaza correos ya registrados, incluso si se escriben usando una combinación diferente de mayúsculas y minúsculas. Los usuarios sin rol administrador no pueden acceder a esta pantalla ni a sus endpoints.

### Registro de pacientes

1. Inicia sesión con una cuenta que tenga `patients.view` y `patients.create`.
2. Selecciona **Nuevo paciente** desde el dashboard o desde **Pacientes**; ambas acciones abren `/pacientes/nuevo` usando la misma ficha visual que muestra un expediente existente.
3. Al guardar, la cédula se compara sin guiones, espacios ni diferencias de mayúsculas. Si ya existe, el formulario conserva el borrador y muestra **Ya existe un paciente con esta cédula.**
4. Completa los datos personales y antecedentes disponibles; al detectar cambios aparecerá la nube **Guardar cambios**.
5. El sistema genera un código `PAC-00001` y abre automáticamente el expediente inicial.

El **Resumen clínico** presenta los datos permanentes del paciente y sus antecedentes familiares, infectocontagiosos y hereditarios. Los datos variables de cada atención —anamnesis, examen físico, diagnóstico, plan, presupuesto y tratamiento— se registran exclusivamente en **Consultas**, evitando información duplicada.

Para editar el expediente, el administrador debe otorgar `patients.edit` desde **Configuración → Permisos por rol**. Con ese permiso, los campos de las mismas tarjetas son editables directamente y conservan apariencia de texto hasta recibir foco. La nube **Guardar cambios** y la X **Descartar cambios** aparecen únicamente cuando el borrador difiere de la última versión guardada; la aplicación advierte antes de abandonar cambios pendientes.

La pestaña **Consultas** muestra el historial clínico persistido del paciente en orden descendente por fecha. Cada registro identifica el tipo, profesional, resumen y estado. **Nueva consulta** abre una ficha completa con el mismo comportamiento de edición directa: fecha/hora actuales y estado **En progreso**, nube para guardar, X para descartar y advertencia al abandonar cambios pendientes. **Completar consulta** solicita confirmación, registra fecha/usuario de cierre y sincroniza la cita vinculada; el registro completado pasa a sólo lectura hasta que TEC-13 defina adendas o correcciones.

El administrador gestiona `consultations.view`, `consultations.view_all`, `consultations.create` y `consultations.edit` desde los presets de rol. Recepción obtiene visualización por defecto; Odontología obtiene visualización, creación y edición. `consultations.view_all` no se asigna por defecto y amplía únicamente el resumen de consultas recientes del dashboard a todo el equipo. Paciente y profesional se determinan en backend, y `DELETE` no está disponible.

En el dashboard, Odontología ve sus cuatro consultas más recientes en lugar de **Pacientes recientes**. Para Administración y Recepción con `patients.view`, **Pacientes recientes** muestra hasta cuatro pacientes distintos ordenados por su última consulta completada; Administración conserva además las consultas generales y Recepción solo incorpora ese resumen de consultas cuando `consultations.view_all` está habilitado.

### Odontogramas por consulta

1. Abre una consulta guardada y selecciona **Odontograma** en la navegación contextual.
2. Elige dentición temporal, mixta o permanente y trabaja sobre **Estado actual** o **Plan de tratamiento**.
3. Selecciona un hallazgo y activa las superficies de cada pieza; el panel permite estados de pieza completa, nota clínica, marcar sano o restablecer.
4. La nube crea una nueva versión y la X restaura el último snapshot persistido. Los cambios sin guardar bloquean la salida.
5. Abre la pestaña **Odontograma** del expediente para revisar la línea temporal y comparar dos versiones arbitrarias.

Cada nueva consulta hereda el odontograma más reciente del paciente. Las versiones anteriores no pueden editarse ni eliminarse. Si otra persona guarda una revisión mientras el odontograma está abierto, la API responde `409`; el borrador se conserva hasta que el profesional decida cargar la última versión.

### Documentos clínicos del paciente

1. Abre un expediente y selecciona **Documentos**.
2. Busca por nombre, notas o categoría, o filtra usando las categorías normalizadas que ya utiliza la clínica.
3. Selecciona **Adjuntar documentos** para cargar hasta 10 archivos PDF, JPG, PNG o WebP con categoría, fecha y notas comunes.
4. Abre un documento para previsualizarlo de forma autenticada, descargarlo con su nombre original o retirarlo indicando un motivo si tu rol tiene `documents.delete`.

Los archivos se guardan fuera del directorio público con nombres UUID; la API nunca expone su ruta física. Cada archivo admite hasta 10 MB y cada lote hasta 50 MB. Recepción y Odontología obtienen `documents.view` y `documents.create` por defecto. El retiro es lógico, requiere motivo y deja el archivo recuperable; Administración puede listar los retirados y restaurarlos. Un paciente inactivo conserva vista previa y descarga, pero su archivo clínico pasa a modo de solo lectura. La demo deshabilita nuevas cargas. Consulta la operación y el contrato completo en [`docs/patient-documents.md`](docs/patient-documents.md).

### Agenda de citas

1. Abre **Citas** y elige la vista diaria, semanal o mensual según el nivel de detalle que necesites.
2. Elige **Nueva cita** e indica paciente, hora, duración, odontólogo disponible, motivo y notas opcionales.
3. La agenda impide que un paciente u odontólogo ocupe intervalos solapados; las citas adyacentes sí están permitidas.
4. Selecciona una tarjeta para editarla, confirmarla, completarla, cancelarla o registrar una inasistencia según su estado y tus permisos.

La agenda utiliza `appointments.view`, `appointments.create` y `appointments.edit`; `appointments.view_all` amplía el alcance a las citas de todo el equipo. Recepción recibe los cuatro permisos por defecto, Odontología conserva visualización únicamente de sus propias citas y Administración mantiene acceso completo implícito. Este alcance se aplica en el dashboard, las vistas diaria, semanal y mensual, el detalle y la disponibilidad. Las citas canceladas permanecen en el calendario para trazabilidad, pero dejan libre su intervalo.

## Consideraciones para producción

La guía integral, arquitectura objetivo, SLO, controles de seguridad, requisitos
legales, estrategia de recuperación y puertas `NO-GO` se mantienen en
[`docs/production-readiness.md`](docs/production-readiness.md). El plan técnico
ejecutable por tareas está en
[`docs/superpowers/plans/2026-08-28-production-readiness-and-scalability.md`](docs/superpowers/plans/2026-08-28-production-readiness-and-scalability.md).

Antes de desplegar el sistema:

- Mover `SECRET_KEY` a una variable de entorno.
- Desactivar `DEBUG`.
- Configurar `ALLOWED_HOSTS` y CORS para los dominios reales.
- Configurar HTTPS y cabeceras de seguridad.
- Verificar respaldo, restauración y operación de PostgreSQL en el entorno de despliegue.
- Configurar un servicio SMTP o transaccional.
- Verificar las cookies `HttpOnly`, `Secure` y CSRF de las sesiones en el dominio real.
- Ejecutar auditorías de dependencias y seguridad.

### Demo en Vercel + Render

La demostración usa `config.settings.demo`, PostgreSQL y Redis separados, datos
ficticios y el proxy `/api/` de Vercel hacia Render. Las cargas de archivos y la
recuperación por correo están deshabilitadas. Sigue la
[guía de despliegue de demo](docs/demo-deployment.md) para configurar secretos,
migraciones, datos de muestra y las comprobaciones posteriores al despliegue.
No se han creado servicios externos ni se ha publicado la demo desde este
repositorio.

Para datos reales, consulta además el
[informe de cambios y pendientes](docs/production-readiness-improvements.md):
faltan controles operativos como respaldos y restauraciones probadas,
antimalware/cuarentena de archivos, tareas periódicas, MFA y pruebas de carga
en un entorno de staging.

Esta lista es solamente un resumen. La salida con datos clínicos reales requiere
cerrar todas las puertas P0 y adjuntar la evidencia definida en la guía de
preparación productiva.

## Estado actual

Las historias HU-01, HU-02, HU-03, HU-04, HU-05, HU-06, HU-07, HU-08, HU-09, HU-10, HU-11, HU-13, HU-16, HU-17, HU-18, HU-19, HU-20, HU-23, HU-28, HU-32, HU-35, HU-41, HU-43, HU-44, HU-45, HU-46, HU-47, HU-48, HU-49, HU-50, HU-51, HU-52, HU-53, HU-54, HU-55, HU-56, HU-58 y HU-61 están implementadas y cuentan con pruebas automatizadas. La evidencia de aceptación de cada historia cerrada se conserva en `docs/user-stories/`. La navegación y las rutas cliente consumen capacidades efectivas del backend, revalidan cambios en sesiones abiertas y mantienen los módulos administrativos reservados; los odontólogos disponen además de especialidad y registro profesional opcionales reutilizados en su perfil, consultas y exportaciones clínicas. El sistema permite administrar perfiles personales, ordenar el listado de pacientes en el backend, inactivar o reactivar expedientes conservando su historia y bloqueando nuevas operaciones, registrar expedientes con identificación tipada opcional y responsable administrativo para menores, advertir posibles duplicados por teléfono o nombre y nacimiento, y crear pacientes reales desde la agenda sin abandonar una cita nueva. También permite distinguir perfiles incompletos para agenda y atención clínica, administrar alertas longitudinales, consultas, procedimientos planificados con snapshots históricos, su ciclo de aceptación, realización o cancelación, visualizar el plan longitudinal, integrar odontogramas versionados y programar opcionalmente la próxima cita desde una consulta completada. Incluye fotografías clínicas en el repositorio documental privado, permite asociar opcionalmente documentos a una consulta y pieza FDI sin inferir contexto histórico y exporta el expediente completo como PDF A4 de solo lectura con identidad institucional vigente y fallback seguro del logotipo. También mantiene una agenda diaria, semanal y mensual con profesionales y carga diaria claramente visibles, registro transaccional de llegada, historial inmutable de reprogramaciones, validación de disponibilidad, garantía de no solapamiento en PostgreSQL, búsqueda remota de opciones de paciente e inicio/cierre clínico transaccional e idempotente con sincronización de la cita.

La configuración operativa permite personalizar el perfil y branding de la clínica, definir jornadas con pausas y festivos, y administrar servicios y tarifas. Estas reglas controlan la disponibilidad de citas y usan la zona horaria configurada para el dashboard y la agenda. Consulta el contrato completo en [`docs/clinic-configuration.md`](docs/clinic-configuration.md).
