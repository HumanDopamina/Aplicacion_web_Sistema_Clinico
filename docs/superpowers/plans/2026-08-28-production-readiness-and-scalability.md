# Production Readiness and Scalability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir Sistema Clínico Dental en un servicio productivo seguro, auditable, recuperable y capaz de cumplir los SLO y volúmenes definidos en `docs/production-readiness.md`.

**Architecture:** La SPA React se sirve como contenido estático por CDN y comparte origen con `/api/`. Django se ejecuta en contenedores Linux sin estado detrás de un balanceador, con PostgreSQL HA/PITR, Redis compartido, objetos privados y workers asíncronos. Los cambios se entregan por hitos independientes: fundación, seguridad clínica, integridad/escalabilidad y operación/lanzamiento.

**Tech Stack:** Python 3.14, Django 5.2, Django REST Framework, SimpleJWT, PostgreSQL 17+, Redis, Celery, almacenamiento S3 compatible, ClamAV, React 19, Vite 8, Vitest, Playwright, Docker, OpenTelemetry/Sentry, k6 y GitHub Actions.

## Global Constraints

- No procesar datos reales hasta cerrar todas las puertas P0 de `docs/production-readiness.md`.
- Mantener frontend y API bajo el mismo sitio productivo; `/api/` se enruta a Django.
- Mantener compatibilidad hacia atrás durante cada despliegue de migraciones mediante expand/contract.
- No registrar PII, PHI, tokens, cookies, cuerpos clínicos ni URLs firmadas.
- Usar TDD para cada cambio funcional y ejecutar la matriz completa antes de cada commit de historia.
- Cada entorno usa base, bucket, Redis, secretos y cuentas independientes.
- Producción requiere dos o más réplicas web y no puede depender del disco del contenedor.
- RPO máximo de 15 minutos y RTO máximo de 2 horas demostrados mediante restauración.
- API p95: lecturas menores de 500 ms y escrituras menores de 800 ms bajo la carga objetivo.
- Los dictámenes jurídicos, clínicos y de privacidad son puertas humanas; ningún resultado automatizado los reemplaza.

---

## Mapa de archivos

### Crear

- `src/backend/config/settings/base.py`: configuración común validada.
- `src/backend/config/settings/development.py`: SQLite, consola y DEBUG local.
- `src/backend/config/settings/test.py`: configuración determinista de pruebas.
- `src/backend/config/settings/test_postgres.py`: integración y concurrencia sobre PostgreSQL.
- `src/backend/config/settings/production.py`: PostgreSQL, Redis, objetos y seguridad.
- `src/backend/apps/core/`: salud, paginación, throttling, request IDs y auditoría.
- `src/backend/apps/core/migrations/`: tabla append-only de auditoría.
- `src/backend/apps/core/tests/`: pruebas de controles transversales.
- `src/backend/apps/users/session_cookies.py`: emisión y eliminación de cookie refresh.
- `src/backend/apps/users/mfa.py`: enrolamiento y verificación TOTP y códigos de recuperación.
- `src/backend/apps/patients/tasks.py`: escaneo y publicación de documentos.
- `src/backend/apps/patients/management/commands/`: reconciliación de objetos y purga autorizada.
- `src/backend/apps/appointments/migrations/`: rangos temporales y restricciones de solapamiento.
- `src/backend/requirements.in` y `requirements-dev.in`: dependencias fuente auditables.
- `Dockerfile`, `.dockerignore` y `compose.yaml`: runtime reproducible.
- `.github/workflows/ci.yml`, `security.yml` y `deploy.yml`: puertas CI/CD.
- `src/frontend/.nvmrc`: runtime Node probado.
- `src/frontend/src/services/sessionStore.js`: access token exclusivamente en memoria.
- `src/frontend/src/services/queryClient.js`: deduplicación, cancelación y caché controlada.
- `tests/load/`: escenarios k6 y sembrado sintético.
- `docs/runbooks/`: despliegue, restauración, incidentes y dependencias.
- `docs/compliance/`: inventario, retención, privacidad, derechos y terceros.
- `infra/`: módulos de infraestructura como código una vez elegido el proveedor.

### Modificar

- `src/backend/config/settings.py`: compatibilidad temporal o eliminación al concluir la división.
- `src/backend/config/urls.py`: health endpoints y API core.
- `src/backend/apps/users/views.py`, `urls.py`, `serializers.py`, `authentication.py`: cookies, MFA y eventos.
- `src/backend/apps/patients/views.py`, `serializers.py`, `models.py`, `documents.py`: contratos mínimos, auditoría y objetos.
- `src/backend/apps/appointments/models.py`, `serializers.py`, `views.py`: integridad temporal PostgreSQL.
- `src/backend/apps/clinics/views.py` y `serializers.py`: caché e invalidación.
- `src/frontend/src/context/AuthContext.jsx`: sesión en memoria y expiración central.
- `src/frontend/src/services/api.js`: cookies, CSRF, refresh y cancelación.
- `src/frontend/src/App.jsx`: lazy loading completo.
- `src/frontend/index.html` y assets: metadatos y optimización.
- `README.md`: operación productiva y referencias.

---

## Hito 1: Fundación productiva

### Task 1: Runtimes y dependencias reproducibles

**Files:**
- Create: `src/frontend/.nvmrc`
- Modify: `src/frontend/package.json`
- Create: `src/backend/requirements.in`
- Create: `src/backend/requirements-dev.in`
- Modify: `src/backend/requirements.txt`
- Create: `src/backend/requirements-dev.txt`
- Create: `.python-version`

**Interfaces:**
- Consumes: dependencias actuales de `requirements.txt` y `package-lock.json`.
- Produces: Python 3.14.6 y Node 24 como runtimes reproducibles; locks Python con hashes y lock npm vigente.

- [ ] **Step 1: Añadir prueba de runtime a CI local**

Crear un script de verificación que falle si Python no es `3.14.x` o Node no es `24.x`:

```powershell
python -c "import sys; assert sys.version_info[:2] == (3, 14), sys.version"
node -e "const major=Number(process.versions.node.split('.')[0]); if(major!==24) process.exit(1)"
```

- [ ] **Step 2: Declarar runtimes**

`src/frontend/.nvmrc` contiene `24`; `package.json` añade:

```json
"engines": { "node": ">=24 <25", "npm": ">=11 <12" }
```

`.python-version` contiene `3.14.6`.

- [ ] **Step 3: Separar dependencias de ejecución y desarrollo**

`requirements.in` conserva Django/DRF y añade rangos mayores compatibles:

```text
Django>=5.2,<5.3
django-cors-headers>=4.9,<5
djangorestframework>=3.17,<4
djangorestframework-simplejwt>=5.5,<6
Pillow>=12,<13
psycopg[binary]>=3.2,<4
gunicorn>=23,<24
django-environ>=0.12,<1
django-storages[s3]>=1.14,<2
boto3>=1.40,<2
redis>=6,<7
django-redis>=6,<7
celery>=5.5,<6
clamd>=1,<2
django-otp>=1.6,<2
qrcode>=8,<9
cryptography>=45,<46
sentry-sdk[django]>=2,<3
```

`requirements-dev.in` incluye `-r requirements.in`, `pip-tools`, `pip-audit`, `coverage` y herramientas de prueba.

- [ ] **Step 4: Compilar y verificar locks**

Run:

```powershell
python -m piptools compile --generate-hashes requirements.in -o requirements.txt
python -m piptools compile --generate-hashes requirements-dev.in -o requirements-dev.txt
python -m pip install --require-hashes -r requirements-dev.txt
python -m pip check
npm ci
npm test
```

Expected: dependencias consistentes y 130 pruebas frontend aprobadas sin flags específicos de Node 26.

- [ ] **Step 5: Commit**

```bash
git add .python-version src/backend/requirements*.in src/backend/requirements*.txt src/frontend/.nvmrc src/frontend/package.json src/frontend/package-lock.json
git commit -m "build: pin production runtimes and dependencies"
```

### Task 2: Settings por entorno y validación fail-fast

**Files:**
- Create: `src/backend/config/settings/__init__.py`
- Create: `src/backend/config/settings/base.py`
- Create: `src/backend/config/settings/development.py`
- Create: `src/backend/config/settings/test.py`
- Create: `src/backend/config/settings/test_postgres.py`
- Create: `src/backend/config/settings/production.py`
- Create: `src/backend/apps/core/__init__.py`
- Create: `src/backend/apps/core/apps.py`
- Create: `src/backend/apps/core/tests/__init__.py`
- Delete after migration: `src/backend/config/settings.py`
- Modify: `src/backend/manage.py`, `config/asgi.py`, `config/wsgi.py`
- Test: `src/backend/apps/core/tests/test_settings.py`

**Interfaces:**
- Consumes: variables documentadas en `docs/production-readiness.md`.
- Produces: `DJANGO_SETTINGS_MODULE=config.settings.<environment>` y arranque fallido ante secretos ausentes.

- [ ] **Step 1: Escribir pruebas de producción**

Comprobar `DEBUG is False`, claves no predeterminadas, hosts no vacíos, cookies seguras, HTTPS, HSTS, PostgreSQL y Redis. La prueba debe eliminar `DJANGO_SECRET_KEY` y verificar que importar production genera `ImproperlyConfigured`.

- [ ] **Step 2: Ejecutar las pruebas y confirmar fallo**

Run: `python manage.py test apps.core.tests.test_settings --settings=config.settings.test`

Expected: FAIL porque el paquete de settings todavía no existe.

- [ ] **Step 3: Implementar configuración base**

Usar `django-environ` y exigir en producción:

```python
SECRET_KEY = env("DJANGO_SECRET_KEY")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS")
DATABASES = {"default": env.db("DATABASE_URL")}
CACHES = {"default": env.cache("REDIS_URL")}
```

`development.py` conserva SQLite y consola; `test.py` usa hashing rápido únicamente durante pruebas; `test_postgres.py` hereda de test y exige `TEST_DATABASE_URL`; `production.py` fija todos los controles de `check --deploy`. Registrar `apps.core` en `INSTALLED_APPS`.

- [ ] **Step 4: Verificar cada entorno**

Run:

```powershell
python manage.py check --settings=config.settings.development
python manage.py test --settings=config.settings.test
python manage.py check --deploy --settings=config.settings.production
```

Expected: development y test pasan; production falla solamente cuando faltan variables y pasa con un entorno de prueba completo.

- [ ] **Step 5: Commit**

```bash
git add src/backend/config src/backend/apps/core/tests/test_settings.py
git commit -m "feat: split and validate environment settings"
```

### Task 3: Contenedor, PostgreSQL y migración ensayable

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `compose.yaml`
- Create: `scripts/migrate_sqlite_to_postgres.ps1`
- Create: `scripts/verify_migrated_data.ps1`
- Modify: `README.md`
- Test: `src/backend/apps/core/tests/test_database_contract.py`

**Interfaces:**
- Consumes: settings de Task 2.
- Produces: imagen WSGI inmutable y proceso documentado SQLite → PostgreSQL con reconciliación.

- [ ] **Step 1: Crear test de contrato PostgreSQL**

Validar que producción utiliza `django.db.backends.postgresql`, `CONN_HEALTH_CHECKS=True` y transacciones con zona UTC.

- [ ] **Step 2: Crear imagen multi-stage**

La imagen instala con hashes, ejecuta como usuario no root, contiene healthcheck y arranca:

```text
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --threads 2 --timeout 30 --graceful-timeout 30 --access-logfile - --error-logfile -
```

No ejecutar migraciones automáticamente en cada réplica.

- [ ] **Step 3: Crear compose de integración**

Incluir `web`, `postgres`, `redis`, `worker`, `clamav` y un bucket S3 compatible de desarrollo. Usar healthchecks y volúmenes nombrados, nunca rutas de producción.

- [ ] **Step 4: Implementar migración reproducible**

El script exporta con `dumpdata --natural-foreign --natural-primary`, migra PostgreSQL vacío, importa y compara conteos por modelo. `verify_migrated_data.ps1` compara `national_id_key`, versiones de odontograma, hashes de archivo y claves foráneas huérfanas.

- [ ] **Step 5: Verificar imagen y migración**

Run:

```powershell
docker compose build --pull
docker compose up -d postgres redis
docker compose run --rm web python manage.py migrate --settings=config.settings.production
docker compose run --rm web python manage.py test --settings=config.settings.test
```

Expected: imagen no-root, migraciones y 126+ pruebas aprobadas.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore compose.yaml scripts README.md src/backend/apps/core/tests/test_database_contract.py
git commit -m "build: add production container and postgres migration path"
```

---

## Hito 2: Seguridad clínica

### Task 4: Sesión con refresh cookie y access token en memoria

**Files:**
- Create: `src/backend/apps/users/session_cookies.py`
- Modify: `src/backend/apps/users/views.py`
- Modify: `src/backend/apps/users/urls.py`
- Modify: `src/backend/config/settings/base.py`
- Test: `src/backend/apps/users/tests/test_cookie_sessions.py`
- Create: `src/frontend/src/services/sessionStore.js`
- Modify: `src/frontend/src/services/api.js`
- Modify: `src/frontend/src/context/AuthContext.jsx`
- Test: `src/frontend/src/services/api.test.js`
- Test: `src/frontend/src/context/AuthContext.test.jsx`

**Interfaces:**
- Produces: cookie `dentalclinic_refresh`; `POST /api/auth/token/refresh/` devuelve `{access}`; contexto React conserva access solamente en memoria.

- [ ] **Step 1: Escribir pruebas backend de cookie**

Verificar flags `HttpOnly`, `Secure` en producción, `SameSite=Lax`, `Path=/api/auth/`, ausencia de refresh en JSON, rotación, CSRF, blacklist y eliminación en logout.

- [ ] **Step 2: Escribir pruebas frontend rojas**

Verificar que login no escribe `dentalclinic_session`, fetch usa `credentials: 'same-origin'`, refresh se deduplica y un refresh fallido notifica al contexto para cerrar sesión.

- [ ] **Step 3: Implementar backend**

Crear `set_refresh_cookie(response, refresh)` y `clear_refresh_cookie(response)`. Sustituir `TokenRefreshView` por una vista propia que lee exclusivamente la cookie y rota el token. Mantener `token_version` en access y refresh.

- [ ] **Step 4: Implementar frontend**

`sessionStore.js` expone `getAccessToken`, `setAccessToken`, `clearAccessToken` y `subscribeSessionExpired`. Ninguna función persiste tokens. Al recargar, `AuthProvider` intenta refresh y luego `/api/auth/me/` antes de renderizar rutas protegidas.

- [ ] **Step 5: Verificar sesiones**

Run:

```powershell
python manage.py test apps.users.tests.test_cookie_sessions --settings=config.settings.test
npm test -- src/services/api.test.js src/context/AuthContext.test.jsx src/App.test.jsx
```

Expected: cookies correctas, tokens ausentes de Web Storage y rutas protegidas estables después de recargar.

- [ ] **Step 6: Commit**

```bash
git add src/backend/apps/users src/backend/config/settings src/frontend/src/services src/frontend/src/context src/frontend/src/App.test.jsx
git commit -m "feat: secure refresh sessions with http-only cookies"
```

### Task 5: Throttling atómico, MFA administrativo y ciclo de sesión

**Files:**
- Create: `src/backend/apps/core/throttling.py`
- Create: `src/backend/apps/users/mfa.py`
- Modify: `src/backend/apps/users/models.py`, `views.py`, `urls.py`, `serializers.py`
- Create: `src/backend/apps/users/migrations/0010_user_mfa_policy.py`
- Test: `src/backend/apps/users/tests/test_login_throttling.py`
- Test: `src/backend/apps/users/tests/test_mfa.py`
- Modify: `src/frontend/src/pages/Auth/LoginPage.jsx`
- Create: `src/frontend/src/pages/Auth/MfaChallengePage.jsx`
- Create: `src/frontend/src/pages/Profile/MfaSettingsPanel.jsx`
- Test: corresponding `*.test.jsx`

**Interfaces:**
- Produces: `POST /api/auth/mfa/challenge/`, `/mfa/enroll/`, `/mfa/confirm/`, `/mfa/recovery/`; Redis keys no reversibles para límites.

- [ ] **Step 1: Escribir pruebas de abuso y MFA**

Cubrir límite por IP y hash normalizado de cuenta, respuesta 429 con `Retry-After`, MFA obligatorio para administrador, código expirado, replay, recovery code de un uso y revocación de sesiones al cambiar MFA.

- [ ] **Step 2: Implementar throttling Redis atómico**

Usar operación Lua o `INCR`/`EXPIRE` atómica. Aplicar ventanas de 5 intentos por 15 minutos por cuenta y 20 por 15 minutos por IP, además del límite de gateway. Nunca almacenar correo en claro dentro de la clave.

- [ ] **Step 3: Implementar TOTP y recuperación**

Persistir secreto cifrado por gestor de claves o campo cifrado aprobado; guardar recovery codes únicamente con hash. Login devuelve un challenge opaco de 5 minutos antes de emitir refresh cookie.

- [ ] **Step 4: Implementar interfaz**

Añadir desafío accesible, enrolamiento con confirmación y descarga única de recovery codes. No mostrar el secreto nuevamente después de confirmar.

- [ ] **Step 5: Ejecutar matriz completa de autenticación**

Run: `python manage.py test apps.users --settings=config.settings.test` y `npm test -- src/pages/Auth src/pages/Profile src/App.test.jsx`

Expected: límites, MFA y flujos anteriores aprobados.

- [ ] **Step 6: Commit**

```bash
git add src/backend/apps/core/throttling.py src/backend/apps/users src/frontend/src/pages/Auth src/frontend/src/pages/Profile src/frontend/src/App.jsx
git commit -m "feat: enforce login limits and administrator mfa"
```

### Task 6: Cabeceras, proxy confiable y validación de despliegue

**Files:**
- Modify: `src/backend/config/settings/production.py`
- Create: `src/backend/apps/core/tests/test_security_headers.py`
- Create: `deploy/nginx.conf`
- Modify: `src/frontend/index.html`
- Create: `docs/security/header-policy.md`

**Interfaces:**
- Produces: política CSP y cabeceras idénticas en CDN/proxy y respuestas Django.

- [ ] **Step 1: Escribir pruebas de cabeceras**

Comprobar HSTS, CSP sin `unsafe-eval`, `frame-ancestors 'none'`, nosniff, referrer, permissions policy, `Cache-Control: no-store` en autenticación y datos clínicos.

- [ ] **Step 2: Configurar proxy**

Aceptar `X-Forwarded-Proto` únicamente desde el balanceador, limitar cuerpo a 55 MB, timeouts explícitos y ocultar firma del servidor. Enrutar `/api/` a Django y fallback SPA únicamente para rutas no API.

- [ ] **Step 3: Documentar CSP**

La política inicial permite `default-src 'self'`, imágenes `self data: blob:`, conexiones `self`, objetos `none`, base `self` y frames `none`. Cualquier proveedor externo requiere dominio y justificación individual.

- [ ] **Step 4: Verificar**

Run: `python manage.py test apps.core.tests.test_security_headers --settings=config.settings.test` y `python manage.py check --deploy --settings=config.settings.production` con variables sintéticas.

Expected: pruebas aprobadas y cero advertencias de deployment sin justificación registrada.

- [ ] **Step 5: Commit**

```bash
git add src/backend/config/settings/production.py src/backend/apps/core/tests deploy src/frontend/index.html docs/security
git commit -m "feat: enforce production transport and browser security"
```

### Task 7: Auditoría append-only y enmiendas clínicas

**Files:**
- Create: `src/backend/apps/core/models.py`
- Create: `src/backend/apps/core/audit.py`
- Create: `src/backend/apps/core/middleware.py`
- Create: `src/backend/apps/core/migrations/0001_initial.py`
- Modify: views and serializers in `users`, `patients`, `appointments`, `clinics`
- Test: `src/backend/apps/core/tests/test_audit.py`
- Create: `docs/compliance/audit-events.md`

**Interfaces:**
- Produces: `record_audit_event(*, request, action, resource, outcome, changes=None)` y modelo `AuditEvent` sin endpoints de mutación.

- [ ] **Step 1: Escribir pruebas de auditoría**

Cubrir lectura, creación, edición, descarga, denegación, rol, login y borrado solicitado. Afirmar redacción de campos clínicos, imposibilidad de update/delete por manager y propagación de request ID.

- [ ] **Step 2: Implementar modelo**

Campos: UUID, occurred_at UTC, actor nullable, action, resource_type, resource_id, outcome, request_id, source_ip_hash, user_agent_hash, changes redactado y metadata permitida. El manager no expone `update()` ni `delete()`; producción aplica permisos SQL append-only.

- [ ] **Step 3: Instrumentar casos de uso**

Registrar explícitamente operaciones después de transacción exitosa con `transaction.on_commit`; registrar denegaciones sin contenido solicitado. Definir catálogo cerrado en `docs/compliance/audit-events.md`.

- [ ] **Step 4: Añadir enmiendas**

Consultas finalizadas y odontogramas siguen inmutables. Correcciones crean una revisión con autor, motivo, referencia anterior y fecha; no sobrescriben el registro médico-legal original.

- [ ] **Step 5: Verificar**

Run: `python manage.py test apps.core apps.users apps.patients apps.appointments apps.clinics --settings=config.settings.test`

Expected: todos los eventos obligatorios presentes y ningún dato sensible en payloads de auditoría.

- [ ] **Step 6: Commit**

```bash
git add src/backend/apps/core src/backend/apps/users src/backend/apps/patients src/backend/apps/appointments src/backend/apps/clinics docs/compliance/audit-events.md
git commit -m "feat: add immutable clinical audit trail"
```

### Task 8: Objetos privados, cuarentena y antimalware

**Files:**
- Modify: `src/backend/apps/users/storage.py`, `serializers.py`
- Modify: `src/backend/apps/patients/documents.py`, `models.py`, `views.py`, `serializers.py`
- Create: `src/backend/apps/patients/tasks.py`
- Create: `src/backend/apps/patients/migrations/0008_document_scan_state.py`
- Test: `src/backend/apps/patients/test_document_security.py`
- Create: `docs/runbooks/malware-detected.md`

**Interfaces:**
- Produces: estados `QUARANTINED`, `SCANNING`, `CLEAN`, `REJECTED`; tarea `scan_patient_document(document_id)` idempotente.

- [ ] **Step 1: Escribir pruebas de estados y acceso**

Un documento nuevo no puede descargarse; resultado limpio lo publica; malware lo rechaza y audita; timeout reintenta; usuario no autorizado nunca obtiene URL firmada. Incluir EICAR solamente como fixture de prueba aislado.

- [ ] **Step 2: Configurar storage privado**

Usar buckets/prefijos separados para cuarentena y publicados, cifrado, versión y ACL privada. Los nombres siguen siendo UUID y la metadata no contiene nombre del paciente.

- [ ] **Step 3: Implementar pipeline**

Crear metadata y archivo en cuarentena dentro de un flujo compensable; encolar por `transaction.on_commit`; worker descarga por stream, valida, analiza con ClamAV, copia a publicado y elimina cuarentena. Cada transición usa compare-and-set para idempotencia.

- [ ] **Step 4: Implementar descarga autorizada**

Después de permiso y estado `CLEAN`, emitir URL firmada de 60 segundos con disposición y tipo controlados. Registrar evento antes de responder. Mantener proxy autenticado como opción cuando la política prohíba URLs firmadas.

- [ ] **Step 5: Verificar**

Run: `python manage.py test apps.patients.test_document_security --settings=config.settings.test`

Expected: archivos inválidos, malware, concurrencia, reintentos y autorización aprobados.

- [ ] **Step 6: Commit**

```bash
git add src/backend/apps/users src/backend/apps/patients docs/runbooks/malware-detected.md
git commit -m "feat: quarantine and scan private clinical files"
```

---

## Hito 3: Integridad y escalabilidad

### Task 9: Serializadores mínimos, paginación y endpoints de opciones

**Files:**
- Create: `src/backend/apps/core/pagination.py`
- Modify: `src/backend/config/settings/base.py`
- Modify: `src/backend/apps/patients/serializers.py`, `views.py`, `urls.py`
- Modify: `src/backend/apps/appointments/views.py`
- Test: `src/backend/apps/patients/tests/test_patient_list_contract.py`
- Modify: `src/frontend/src/services/patientService.js`
- Modify: `DashboardPage.jsx`, `PatientsPage.jsx`, `AppointmentsPage.jsx`
- Test: corresponding frontend tests

**Interfaces:**
- Produces: `{count,next,previous,results}`; `/api/patients/options/?search=`; `/api/dashboard/summary/`; detalle conserva expediente completo.

- [ ] **Step 1: Escribir tests de minimización**

La lista no puede contener `clinical_record`, dirección, antecedentes, cédula completa ni contactos de emergencia. Detalle sí conserva contrato autorizado. Verificar tamaño 25, máximo 100, orden estable y query count constante.

- [ ] **Step 2: Implementar paginación y serializers**

Crear `StandardPageNumberPagination(page_size=25, max_page_size=100)` y `PatientSummarySerializer`. Aplicar `select_related` solamente a relaciones serializadas.

- [ ] **Step 3: Crear endpoints mínimos**

`patients/options` exige dos caracteres, devuelve máximo 20 `{id, code, full_name}`. `dashboard/summary` devuelve conteos autorizados y cuatro elementos recientes sin descargar colecciones completas.

- [ ] **Step 4: Adaptar frontend**

Servicios consumen `.results`; tablas muestran `count`; selectores buscan remotamente y cancelan solicitudes anteriores. Dashboard usa únicamente summary.

- [ ] **Step 5: Verificar contratos**

Run:

```powershell
python manage.py test apps.patients.tests.test_patient_list_contract --settings=config.settings.test
npm test -- src/pages/Dashboard src/pages/Patients src/pages/Appointments
```

Expected: minimización, paginación, permisos y frontend aprobados.

- [ ] **Step 6: Commit**

```bash
git add src/backend/apps/core/pagination.py src/backend/config/settings/base.py src/backend/apps/patients src/backend/apps/appointments src/frontend/src
git commit -m "perf: paginate and minimize clinical list contracts"
```

### Task 10: Integridad concurrente de citas

**Files:**
- Modify: `src/backend/apps/appointments/models.py`
- Modify: `src/backend/apps/appointments/serializers.py`
- Create: `src/backend/apps/appointments/migrations/0003_postgres_time_ranges.py`
- Test: `src/backend/apps/appointments/tests/test_concurrency.py`

**Interfaces:**
- Produces: `starts_at`, `ends_at` UTC y dos restricciones PostgreSQL de exclusión para odontólogo y paciente en estados activos.

- [ ] **Step 1: Escribir prueba concurrente roja**

Dos transacciones intentan crear citas solapadas para el mismo odontólogo y después para el mismo paciente. Exactamente una debe persistir; la otra responde 409. Citas adyacentes y canceladas permanecen permitidas.

- [ ] **Step 2: Expandir esquema**

Habilitar `btree_gist`; añadir campos datetime nullable e índice. Rellenar desde `date`, `start_time`, duración y zona de clínica con validación de horas ambiguas/inexistentes.

- [ ] **Step 3: Añadir restricciones**

Usar `ExclusionConstraint` con igualdad por odontólogo/paciente y solapamiento del rango, condicionado a `PROGRAMADA` o `CONFIRMADA`. Convertir `IntegrityError` identificable en error 409 estable.

- [ ] **Step 4: Contraer esquema**

Después de una versión completa escribiendo ambos formatos y verificar datos, hacer datetimes obligatorios y convertir fecha/hora legadas en propiedades de compatibilidad antes de retirarlas en un release posterior.

- [ ] **Step 5: Verificar bajo PostgreSQL**

Run: `python manage.py test apps.appointments.tests.test_concurrency --settings=config.settings.test_postgres`

Expected: una sola reserva activa bajo concurrencia y suite completa de citas aprobada.

- [ ] **Step 6: Commit**

```bash
git add src/backend/apps/appointments
git commit -m "fix: enforce appointment overlap integrity in postgres"
```

### Task 11: Índices, query budgets, Redis y tareas

**Files:**
- Modify: models and migrations in `patients`, `appointments`, `clinics`, `users`
- Create: `src/backend/apps/core/cache.py`
- Modify: `src/backend/apps/clinics/views.py`, `serializers.py`
- Create: `src/backend/config/celery.py`
- Modify: `src/backend/config/__init__.py`
- Test: `src/backend/apps/core/tests/test_query_budgets.py`
- Test: `src/backend/apps/clinics/tests/test_cache.py`

**Interfaces:**
- Produces: `clinic_cache.get_profile()`, `invalidate_clinic_cache()` y aplicación Celery `config.celery.app`.

- [ ] **Step 1: Escribir query budgets**

Sembrar 25 pacientes/documentos/citas y afirmar límites constantes por endpoint. Añadir prueba de invalidación para perfil, horarios, cierres y servicios.

- [ ] **Step 2: Añadir índices guiados por consultas**

Crear índices compuestos según filtros actuales y extensión `pg_trgm` para búsqueda. Documentar `EXPLAIN (ANALYZE, BUFFERS)` antes/después con dataset sintético.

- [ ] **Step 3: Implementar caché segura**

TTL de 5 minutos para configuración no clínica; invalidación inmediata tras commit. Las claves incluyen versión de esquema y entorno. No cachear expedientes ni respuestas por usuario.

- [ ] **Step 4: Configurar Celery**

JSON como único serializer, `task_acks_late`, timeout blando/duro, backoff, worker prefetch 1 para archivos y colas separadas `default`, `mail`, `files`. Payloads contienen IDs, no datos sensibles.

- [ ] **Step 5: Verificar**

Run: `python manage.py test apps.core.tests.test_query_budgets apps.clinics.tests.test_cache --settings=config.settings.test_postgres`

Expected: presupuestos constantes, caché invalidada y tareas serializables sin PII.

- [ ] **Step 6: Commit**

```bash
git add src/backend/apps src/backend/config
git commit -m "perf: add query budgets shared cache and task queues"
```

### Task 12: Rendimiento y resiliencia frontend

**Files:**
- Create: `src/frontend/src/services/queryClient.js`
- Modify: `src/frontend/src/App.jsx`
- Modify: pages that call services directly
- Replace: `src/frontend/src/assets/logo_login.svg`
- Modify: `src/frontend/index.html`
- Test: `src/frontend/src/services/queryClient.test.js`
- Test: route-level frontend tests

**Interfaces:**
- Produces: `queryClient.fetch(key, loader, {signal, ttl})`, invalidación por prefijo y rutas lazy.

- [ ] **Step 1: Escribir tests de deduplicación**

Dos consumidores simultáneos comparten una solicitud; una búsqueda obsoleta se aborta; un error no queda cacheado; cerrar sesión elimina caché; datos clínicos usan TTL cero salvo catálogo explícito.

- [ ] **Step 2: Implementar cliente y manejo central**

Usar `AbortController`, promesas en vuelo y caché limitada. El API client emite `session-expired`, distingue offline/timeout/4xx/5xx y solo reintenta GET idempotentes con backoff y jitter.

- [ ] **Step 3: Dividir bundle**

Convertir todas las páginas protegidas a imports dinámicos con boundaries por ruta. Precargar únicamente al hover/focus de navegación autorizada.

- [ ] **Step 4: Optimizar assets y metadatos**

Reemplazar el SVG de 535 kB por SVG vectorial real o WebP/PNG responsivo menor de 100 kB. Definir `lang="es"`, título clínico, descripción y favicon final.

- [ ] **Step 5: Verificar budgets**

Run: `npm test`, `npm run lint`, `npm run build`.

Expected: 130+ pruebas; chunk inicial gzip menor de 100 kB y ningún asset de branding mayor de 150 kB sin excepción registrada.

- [ ] **Step 6: Commit**

```bash
git add src/frontend
git commit -m "perf: harden client data fetching and route bundles"
```

---

## Hito 4: Operación y lanzamiento

### Task 13: Health checks, logs, métricas y alertas

**Files:**
- Create: `src/backend/apps/core/health.py`
- Create: `src/backend/apps/core/urls.py`
- Modify: `src/backend/config/urls.py`
- Create: `src/backend/apps/core/logging.py`
- Modify: `src/backend/config/settings/base.py`, `production.py`
- Test: `src/backend/apps/core/tests/test_health.py`
- Test: `src/backend/apps/core/tests/test_log_redaction.py`
- Create: `docs/operations/slo.md`
- Create: `docs/operations/alerts.md`

**Interfaces:**
- Produces: `/health/live`, `/health/ready`, `/health/version`, request/trace IDs y formato JSON documentado.

- [ ] **Step 1: Escribir pruebas operativas**

Liveness no consulta dependencias; readiness falla 503 por DB/Redis/bucket/cola con timeout; version no filtra secretos. El test de redacción inyecta token, cédula, correo, diagnóstico y comprueba ausencia.

- [ ] **Step 2: Implementar endpoints y middleware**

Generar o validar UUID `X-Request-ID`, devolverlo en respuesta y propagarlo a logs/tareas. Readiness ejecuta checks paralelos con presupuesto total inferior a 2 segundos.

- [ ] **Step 3: Configurar telemetría**

Logs JSON a stdout; errores y trazas a proveedor con `before_send` redactando request data, cookies, headers y usuario. Métricas etiquetan ruta normalizada, nunca IDs de paciente.

- [ ] **Step 4: Documentar SLO y alertas**

Copiar objetivos de `docs/production-readiness.md`; para cada alerta registrar umbral, ventana, severidad, responsable y runbook.

- [ ] **Step 5: Verificar**

Run: `python manage.py test apps.core.tests.test_health apps.core.tests.test_log_redaction --settings=config.settings.test`

Expected: degradación correcta y cero fixtures sensibles en logs capturados.

- [ ] **Step 6: Commit**

```bash
git add src/backend/apps/core src/backend/config/settings docs/operations
git commit -m "feat: add health telemetry and service objectives"
```

### Task 14: CI, seguridad de suministro y artefactos

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/security.yml`
- Create: `.github/dependabot.yml`
- Create: `scripts/ci_backend.ps1`
- Create: `scripts/ci_frontend.ps1`
- Create: `docs/runbooks/dependency-vulnerability.md`

**Interfaces:**
- Produces: checks requeridos `backend`, `frontend`, `security`, `container`, `migration` y SBOM por SHA.

- [ ] **Step 1: Crear scripts idénticos local/CI**

Backend ejecuta install con hashes, `check`, migraciones, tests y coverage; frontend ejecuta `npm ci`, tests, lint y build. Ningún workflow duplica comandos internos.

- [ ] **Step 2: Añadir servicios de integración**

CI usa PostgreSQL y Redis, aplica migraciones desde cero y desde un snapshot de esquema anterior sin PII.

- [ ] **Step 3: Añadir seguridad**

Ejecutar `pip-audit`, `npm audit`, secret scanning, CodeQL/SAST, escaneo de imagen, licencia y generación CycloneDX/SPDX. Fallar por vulnerabilidades críticas/altas explotables; excepciones tienen propietario y vencimiento.

- [ ] **Step 4: Proteger rama**

Exigir reviews, checks, commits firmados según política, resolución de conversaciones y prohibir push directo a `develop`/`main`.

- [ ] **Step 5: Verificar desde una copia limpia**

Run: scripts de CI, build de contenedor y validación YAML.

Expected: todos los checks verdes sin depender de `.venv` o `node_modules` locales.

- [ ] **Step 6: Commit**

```bash
git add .github scripts docs/runbooks/dependency-vulnerability.md
git commit -m "ci: enforce quality security and supply chain gates"
```

### Task 15: Infraestructura, backups y CD seguro

**Files:**
- Create: `infra/modules/` and `infra/environments/staging/`, `production/`
- Create: `.github/workflows/deploy.yml`
- Create: `scripts/smoke_test.ps1`
- Create: `docs/runbooks/deploy-rollback.md`
- Create: `docs/runbooks/database-restore.md`
- Create: `docs/runbooks/secret-rotation.md`
- Create: `docs/operations/backup-policy.md`

**Interfaces:**
- Produces: entornos declarativos, imagen promovible por digest y evidencia de restore RPO/RTO.

- [ ] **Step 1: Registrar decisión de proveedor y región**

Crear ADR aprobado que compare residencia, DPA, HA, PITR, KMS, soporte, egreso y costo. El resultado debe nombrar proveedor, región primaria, región/ubicación de backup y servicios exactos antes de escribir módulos.

- [ ] **Step 2: Declarar infraestructura**

Red privada, WAF/CDN, balanceador, dos réplicas API, workers, PostgreSQL HA/PITR, Redis, buckets privados/versionados, KMS, secretos, DNS, TLS, logs y presupuestos. Los outputs sensibles quedan marcados y el estado se cifra/bloquea.

- [ ] **Step 3: Implementar deploy por digest**

Staging automático después de CI; smoke tests; producción con aprobación. Migraciones corren como job único. Readiness recibe tráfico solamente después de aprobar.

- [ ] **Step 4: Implementar backups y restore drill**

PITR continuo, snapshots diarios y versionado de objetos; restaurar en cuenta/proyecto aislado, validar conteos y objetos, medir RPO/RTO y destruir de forma controlada el entorno de ensayo.

- [ ] **Step 5: Probar rollback y fallo**

Desplegar release sintético, volver al digest anterior, detener una réplica y validar continuidad. Ejecutar runbook de secreto rotado sin reinicio global.

- [ ] **Step 6: Commit**

```bash
git add infra .github/workflows/deploy.yml scripts/smoke_test.ps1 docs/runbooks docs/operations/backup-policy.md
git commit -m "ops: provision recoverable production delivery platform"
```

### Task 16: Carga, resiliencia y pruebas de seguridad de salida

**Files:**
- Create: `tests/load/seed_synthetic_data.py`
- Create: `tests/load/clinical_workload.js`
- Create: `tests/load/document_workload.js`
- Create: `tests/resilience/README.md`
- Create: `docs/operations/capacity-report.md`
- Create: `docs/security/asvs-assessment.md`
- Create: `docs/security/pentest-remediation.md`

**Interfaces:**
- Produces: evidencia reproducible de SLO, capacidad, ASVS, DAST, pentest y resiliencia.

- [ ] **Step 1: Crear sembrado sintético**

Generar 100 000 pacientes ficticios, 1 000 000 de citas/consultas y metadata de documentos sin copiar formatos o valores reales. Usar seed fijo y comando de limpieza limitado a la base de performance.

- [ ] **Step 2: Crear escenarios k6**

Distribución: 25 % dashboard, 20 % búsqueda/opciones, 20 % agenda, 15 % expediente, 10 % consultas/odontograma, 5 % metadata y 5 % escrituras. Ejecutar 50 RPS por 30 minutos, 100 RPS por 1 minuto y soak de 8 horas.

- [ ] **Step 3: Ejecutar resiliencia**

Durante carga reiniciar réplica, worker y Redis; simular correo/ClamAV caídos; comprobar reintentos, no pérdida de datos, degradación y recuperación.

- [ ] **Step 4: Ejecutar evaluación de seguridad**

Completar OWASP ASVS 5.0 nivel 2, DAST en staging y pentest independiente. Cada hallazgo registra severidad, evidencia, corrección, prueba y aprobación; crítico/alto bloquea salida.

- [ ] **Step 5: Publicar reporte de capacidad**

Incluir versión, infraestructura, dataset, p50/p95/p99, errores, saturación, consultas lentas, costo estimado y límite seguro. No publicar endpoints o detalles explotables fuera del repositorio privado.

- [ ] **Step 6: Commit**

```bash
git add tests docs/operations/capacity-report.md docs/security
git commit -m "test: validate production capacity resilience and security"
```

### Task 17: Cumplimiento, runbooks y aprobación go-live

**Files:**
- Create: `docs/compliance/data-inventory.md`
- Create: `docs/compliance/privacy-notice.md`
- Create: `docs/compliance/consent-records.md`
- Create: `docs/compliance/retention-schedule.md`
- Create: `docs/compliance/data-subject-requests.md`
- Create: `docs/compliance/vendors-and-transfers.md`
- Create: `docs/runbooks/security-incident.md`
- Create: `docs/runbooks/account-compromise.md`
- Create: `docs/runbooks/access-revocation.md`
- Create: `docs/go-live-checklist.md`
- Modify: `README.md`

**Interfaces:**
- Produces: expediente de aprobación con responsables nominales, fechas, evidencia y firmas.

- [ ] **Step 1: Completar inventario y flujos**

Cada dato registra finalidad, base, sensibilidad, origen, receptor, región, cifrado, acceso, auditoría, retención y eliminación. Incluir DB, objetos, logs, backups, correo, monitoreo, soporte y dispositivos del personal.

- [ ] **Step 2: Obtener revisión jurídica y clínica**

Validar Ley 787, Ley 423, Reglamento y Norma MINSA N-004 vigentes. El abogado y director médico firman privacidad, consentimiento, derechos, retención, enmiendas, exportación y eliminación.

- [ ] **Step 3: Ensayar runbooks**

Ejercicio de mesa para fuga, cuenta comprometida, ransomware, caída de proveedor y solicitud de titular. Registrar tiempos, decisiones, comunicaciones y mejoras cerradas.

- [ ] **Step 4: Ejecutar checklist go-live**

Adjuntar enlaces a CI, imagen, migración, restore, carga, ASVS, pentest, alertas, contratos, capacitación y rollback. Cada puerta tiene estado `PASS` o `FAIL`; no usar estados ambiguos.

- [ ] **Step 5: Aprobar y lanzar controladamente**

Requiere firma de producto, clínica, privacidad, seguridad y operaciones. Monitorear 72 horas con freeze de cambios no críticos y revisión diaria de SLO, errores, seguridad, cola, DB y costo.

- [ ] **Step 6: Commit**

```bash
git add docs README.md
git commit -m "docs: complete production governance and launch evidence"
```

---

## Verificación final requerida

Ejecutar desde clones limpios y conservar los artefactos:

```powershell
cd src/backend
python -m pip install --require-hashes -r requirements-dev.txt
python manage.py check --settings=config.settings.production
python manage.py check --deploy --settings=config.settings.production
python manage.py makemigrations --check --dry-run --settings=config.settings.test_postgres
python manage.py test --settings=config.settings.test_postgres
python -m pip_audit -r requirements.txt

cd ../frontend
npm ci
npm test
npm run lint
npm run build

cd ../..
docker build --pull --no-cache -t clinical-system:release-candidate .
```

Además se requiere evidencia externa de restore, carga, soak, resiliencia, DAST, ASVS y pentest. Que las pruebas unitarias pasen no autoriza el lanzamiento por sí solo.

## Self-review

- Cobertura: los 17 tasks cubren plataforma, secretos, sesiones, MFA, seguridad web, auditoría, archivos, minimización, paginación, concurrencia, rendimiento, observabilidad, CI/CD, infraestructura, recuperación, carga y gobierno.
- No se usan marcadores de trabajo indefinido; las decisiones humanas se expresan como puertas con responsable y evidencia.
- Los contratos compartidos se nombran en `Interfaces` y se consumen después de su tarea productora.
- Los cambios de base de datos destructivos se separan mediante expand/contract.
- Los controles de aplicación no se presentan como sustitutos de WAF, revisión jurídica, restauración o pentest.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-28-production-readiness-and-scalability.md`. Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task and review between tasks.
2. **Inline Execution** - Execute tasks in this session in milestone batches with checkpoints.
