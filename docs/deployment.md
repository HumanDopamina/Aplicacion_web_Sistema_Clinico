# Despliegue reproducible y observabilidad básica

## Arquitectura objetivo

Producción usa `config.settings.production`, PostgreSQL, Redis, SMTP y almacenamiento S3-compatible. La imagen contiene Django, Gunicorn y static versionado; no contiene secretos ni media clínico. SQLite queda limitado al perfil de pruebas y `DEBUG` permanece desactivado obligatoriamente.

El frontend y la API deben publicarse bajo el mismo sitio. El proxy termina TLS, reemplaza `X-Real-IP`, envía `X-Forwarded-Proto` y sólo su IP se declara en `LOGIN_TRUSTED_PROXY_IPS`. Nunca se debe exponer Django directamente a Internet.

Las variables obligatorias están enumeradas con valores ficticios en `src/backend/.env.example`. Los secretos reales deben provenir del gestor de secretos de la plataforma. `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` y `FRONTEND_URL` son explícitos; producción rechaza comodines y orígenes sin HTTPS. Si frontend y API comparten origen, `CORS_ALLOWED_ORIGINS` puede quedar vacío.

## Build

Backend:

```bash
docker build --tag dentalclinic-backend:release src/backend
```

La imagen fija Python 3.13.15 slim-bookworm por digest, instala el cierre completo de dependencias desde `requirements.lock`, ejecuta `collectstatic` con WhiteNoise y termina como el usuario no privilegiado `10001:10001`. `requirements.txt` conserva las dependencias directas mantenidas por el proyecto; el lock incluye además sus transitivas exactas. `.dockerignore` excluye `.env`, SQLite, virtualenvs, media, backups y temporales.

Frontend:

```bash
cd src/frontend
VITE_API_URL=https://api.clinic.example.com npm run build
```

`VITE_API_URL` es obligatoria para producción. El fallback basado en el hostname y puerto 8000 existe únicamente durante desarrollo, conservando la corrección CSRF para `localhost` y `127.0.0.1`.

## Variables de runtime

Además de base, correo, Redis y buckets, Gunicorn acepta `PORT`, `WEB_CONCURRENCY`, `GUNICORN_TIMEOUT`, `GUNICORN_GRACEFUL_TIMEOUT`, `GUNICORN_KEEPALIVE` y `GUNICORN_LOG_LEVEL`. `FORWARDED_ALLOW_IPS` identifica los proxies cuyas cabeceras de esquema acepta Gunicorn; `LOGIN_TRUSTED_PROXY_IPS` controla separadamente la IP usada por la protección de login. `HEALTHCHECK_HOST` debe pertenecer a `ALLOWED_HOSTS` y puede omitirse cuando el primer host permitido es apto para la sonda.

## Migraciones y arranque

Las migraciones se ejecutan una sola vez como release command o job, nunca desde cada réplica web:

```bash
docker run --rm --env-file production.env dentalclinic-backend:release \
  python manage.py migrate --noinput
docker run --rm --env-file production.env dentalclinic-backend:release \
  python manage.py migrate --check
```

Después se inicia Gunicorn; su proceso principal recibe `SIGTERM` y no daemoniza:

```bash
docker run --rm --env-file production.env -p 8000:8000 \
  dentalclinic-backend:release
```

El comando de la imagen es `gunicorn config.wsgi:application --config gunicorn.conf.py`. No se usa `runserver`.

## Static y media

`collectstatic` genera static comprimido y con manifiesto dentro de la imagen; WhiteNoise lo sirve desde `STATIC_ROOT`. Los documentos, avatares y demás media usan los buckets S3-compatible externos configurados. Nunca deben escribirse como estado efímero de la imagen; reiniciar o reemplazar el contenedor no puede eliminar archivos clínicos.

## Salud

```bash
curl --fail https://api.clinic.example.com/health/live/
curl --fail https://api.clinic.example.com/health/ready/
```

`/health/live/` sólo confirma que Django responde y no consulta PostgreSQL. `/health/ready/` ejecuta `SELECT 1`: devuelve 200 cuando la base responde y 503 con una respuesta constante cuando no. Ninguna sonda exige autenticación ni revela configuración. Las migraciones pendientes se comprueban en el release job mediante `migrate --check`, no desde readiness.

## Logs y observación

Producción escribe JSON a stdout/stderr. Cada petición incluye `timestamp`, nivel, logger, `request_id`, método, plantilla de ruta sin identificadores ni query string, status y `duration_ms`; `X-Request-ID` se valida o se reemplaza y se devuelve en la respuesta. El logger redundante `django.request`, que incluye rutas literales controladas por el cliente, queda silenciado en producción. Los registros no incluyen body, parámetros clínicos, cookies, tokens, cabeceras de autorización ni datos de paciente. Un 500 devuelve contenido genérico al cliente y registra internamente el tipo de excepción y frames de stack sin mensaje, valores locales o payload.

Para esta etapa, status, latencia, 5xx y ambas sondas se observan desde logs y healthchecks. Se deben configurar alertas de plataforma sobre 5xx, picos de latencia y readiness 503. `SENTRY_DSN` queda reservado para una integración futura opcional; no existe dependencia obligatoria de SaaS. Celery/Redis Queue no se añaden: el procesamiento asíncrono se evaluará con TEC-10 (antimalware) y HU-60 (recordatorios).

## Procedimiento operativo

1. Crear un backup consistente de PostgreSQL y comprobar que puede restaurarse. Conservar también una versión previa de los objetos S3.
2. Construir la imagen inmutable y el frontend con `VITE_API_URL` explícita.
3. Revisar las operaciones pendientes:

   ```bash
   python manage.py migrate --plan
   ```

4. Aplicar migraciones en una única tarea de despliegue, antes de ampliar las réplicas:

   ```bash
   python manage.py migrate --noinput
   python manage.py migrate --check
   ```

5. Ejecutar `python manage.py check --deploy` con la configuración real.
6. Arrancar Gunicorn y comprobar `/health/live/` y `/health/ready/`.
7. Ejecutar el smoke funcional con datos sintéticos: CSRF, login, perfil, paciente, citas, archivo sintético, logout y auditoría.
8. Vigilar logs JSON, 5xx, latencia, readiness, Redis/S3/SMTP, bloqueos de login y crecimiento de auditoría.

## Reversión

Detener nuevas escrituras, volver al artefacto anterior y restaurar base/objetos sólo si la migración no es compatible hacia atrás. No ejecutar migraciones inversas destructivas sin una copia verificada. La auditoría no debe truncarse ni editarse durante la reversión.

## Criterio previo a datos reales

No cargar información clínica real hasta validar en staging: aprovisionamiento, migración desde backup, restauración, rotación JWT, permisos, almacenamiento privado, auditoría, alertas y el smoke test completo.
