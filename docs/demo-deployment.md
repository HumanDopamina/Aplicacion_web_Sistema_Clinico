# Demo de una clínica en Vercel y Render

Este perfil admite únicamente datos ficticios. Se entrega la preparación del repositorio; no se han creado servicios externos ni publicado la aplicación.

## Configuración entregada

- `config.settings.demo`: PostgreSQL separado (nombre con `demo`), Redis, HTTPS, cookies seguras, origen CSRF exacto, `DEBUG=False`, edición con versión obligatoria y Django Admin deshabilitado.
- `deployment/render.demo.yaml`: backend Docker, PostgreSQL 18 y Key Value, todos con plan gratuito explícito. No importa el archivo sobre servicios existentes con los mismos nombres sin revisar primero la coincidencia.
- `deployment/vercel.demo.json.template`: proxy `/api/` antes del fallback de la SPA. La dirección del backend se completa cuando Render asigne el hostname.
- `GET /api/system/features/`: únicamente `demo`, `uploads` y `password_reset`. La interfaz espera una respuesta válida antes de mostrar la aplicación.
- Muestras empaquetadas en `src/backend/demo_samples/`. No se sirven como archivos públicos; su consulta exige autenticación y `documents.view`.
- `seed_demo`: cinco pacientes, cinco consultas con odontograma y propuesta de tratamiento, cinco documentos de muestra y cinco citas. Las fechas fijas son 7 y 8 de septiembre de 2026 para que la reconstrucción sea reproducible.

## Preparar las plataformas

1. Importar el Blueprint de `deployment/render.demo.yaml`. Los nombres son propuestas: deben ser únicos dentro de la cuenta. El primer inicio puede quedar pendiente de migraciones; la imagen no las ejecuta al iniciar cada proceso.
2. Configurar en Render `ALLOWED_HOSTS` con el hostname exacto asignado, sin `https://`, y `FRONTEND_URL` con el origen HTTPS estable del proyecto Vercel. No usar comodines de previews.
3. Configurar `DJANGO_SECRET_KEY` con al menos 50 caracteres aleatorios. Puede generarse localmente mediante `python -c "import secrets; print(secrets.token_urlsafe(64))"`. Guardarlo como secreto; no incluirlo en Git ni compartir su salida.
4. En Vercel seleccionar `src/frontend` como raíz. Copiar la plantilla como `src/frontend/vercel.json`, reemplazar `REPLACE_WITH_RENDER_HOST` y configurar `VITE_API_URL=/`. La plantilla debe completarse **antes** del despliegue; Vercel no interpola variables dentro de `vercel.json`.
5. Usar exclusivamente el hostname estable de Vercel para navegar. El navegador enviará las solicitudes a `/api/` en ese mismo origen. Conservar cookies host-only, `Secure`, `HttpOnly` para el refresh y `SameSite=Lax`.

## Migraciones y datos ficticios

El workflow manual `.github/workflows/demo-database.yml` ejecuta una sola preparación a la vez. No se ha ejecutado contra ninguna base externa.

Crear el environment `demo` de GitHub con:

| Tipo | Nombre | Valor |
|---|---|---|
| Secreto | `DEMO_DJANGO_SECRET_KEY` | La clave configurada en Render |
| Secreto | `DEMO_DATABASE_URL` | URL **externa** de la base demo, con TLS (`sslmode=require`) y permisos de migración |
| Secreto | `DEMO_ADMIN_PASSWORD` | Contraseña inicial del administrador ficticio |
| Secreto | `DEMO_DENTIST_PASSWORD` | Contraseña inicial del odontólogo ficticio |
| Secreto | `DEMO_RECEPTION_PASSWORD` | Contraseña inicial de recepción ficticia |
| Variable | `DEMO_RENDER_HOST` | Hostname exacto de Render |
| Variable | `DEMO_FRONTEND_URL` | Origen HTTPS estable de Vercel |

Revisar el acceso de red de la base para el runner de GitHub. El backend usa la conexión interna suministrada por Render; el workflow necesita la externa. Nunca sustituirla por una base de pacientes reales.

Después de aprobar CI, ejecutar **Prepare demo database** sobre el mismo commit que se desplegará. El flujo aplica migraciones, verifica su estado, carga muestras si se eligió esa opción y limpia tokens vencidos. Luego desplegar manualmente el backend de ese commit y el frontend con el proxy completo.

Las cuentas ficticias son `admin@demo.example.test`, `dentist@demo.example.test` y `reception@demo.example.test`. No hay contraseñas predeterminadas. Repetir `seed_demo` conserva las contraseñas y los registros existentes; cambiar los secretos después no restablece esas cuentas. Un administrador puede cambiar contraseñas desde Gestión de Staff.

## Comprobaciones del despliegue real

- `/health/live/` y `/health/ready/` deben responder correctamente; verificar además que el login utiliza Redis.
- El frontend debe mostrar el aviso DEMO, impedir cargas de avatar/logo/documentos y explicar que el administrador cambia las contraseñas.
- Verificar login, refresh tras caducar el access token, logout sin access token y logout seguido de recarga sin conexión. Al recuperar conexión, la marca local de logout debe impedir restaurar la cookie anterior.
- En las herramientas del navegador, comprobar los atributos de cookies, CSRF y `Cache-Control: private, no-store`. Confirmar que no se almacenan tokens en WebStorage y que `/api/` no devuelve `index.html` ante errores.
- Probar rutas profundas mediante recarga, acceso por cada rol, exportación sin permiso de documentos y retirada/restauración de una muestra.
- Reiniciar o volver a desplegar el backend y comprobar que los documentos empaquetados siguen disponibles. Revisar los estados de espera durante el arranque en frío.

## Límites del plan gratuito

Render suspende el servicio web tras inactividad; el arranque puede tardar alrededor de un minuto. El disco del servicio es temporal. PostgreSQL gratuito caduca a los 30 días y no incorpora copias de seguridad; Key Value gratuito pierde contenido al reiniciarse. El envío SMTP está restringido, por lo que la recuperación por correo se deshabilita explícitamente. Véase la [documentación de Render Free](https://render.com/docs/free).

La demo se reconstruye con una base demo nueva, migraciones y `seed_demo`; no se utiliza como respaldo. No se recomienda introducir datos reales ni presentar estos recursos como infraestructura de producción.

Referencias de configuración: [Blueprints de Render](https://render.com/docs/blueprint-spec), [rewrites externos de Vercel](https://vercel.com/docs/routing/rewrites) y [configuración estática de Vercel](https://vercel.com/docs/project-configuration/vercel-json).
