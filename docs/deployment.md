# Despliegue seguro

## Arquitectura objetivo

Producción usa `config.settings.production`, PostgreSQL, Redis, SMTP y almacenamiento S3-compatible. SQLite, `LocMemCache`, correo por consola y filesystem privado quedan limitados a desarrollo y pruebas. Django Admin y media local están deshabilitados en producción salvo activación explícita del admin.

El frontend y la API deben publicarse bajo el mismo sitio. El proxy termina TLS, reemplaza `X-Real-IP`, envía `X-Forwarded-Proto` y sólo su IP se declara en `LOGIN_TRUSTED_PROXY_IPS`. Nunca se debe exponer Django directamente a Internet.

Las variables obligatorias están enumeradas con valores ficticios en `src/backend/.env.example`. Los secretos reales deben provenir del gestor de secretos de la plataforma.

## Procedimiento de despliegue

1. Crear un backup consistente de PostgreSQL y comprobar que puede restaurarse. Conservar también una versión previa de los objetos S3.
2. Construir una imagen o artefacto inmutable desde un commit aprobado.
3. Revisar las operaciones pendientes:

   ```bash
   python manage.py migrate --plan
   ```

4. Aplicar migraciones en una única tarea de despliegue, antes de ampliar las réplicas:

   ```bash
   python manage.py migrate --noinput
   python manage.py migrate --check
   ```

5. Ejecutar `python manage.py check --deploy` con la configuración real y publicar backend/frontend.
6. Ejecutar el smoke test: `/api/auth/csrf/` devuelve `204`; login establece `dentalclinic_refresh`; `/api/auth/me/` responde; se puede abrir un paciente sintético; listar citas; cargar y recuperar un archivo sintético; logout devuelve `204`; el evento aparece en `/api/audit/events/`.
7. Vigilar errores 5xx, latencia, fallos de Redis/S3/SMTP, bloqueos de login y crecimiento de auditoría.

## Reversión

Detener nuevas escrituras, volver al artefacto anterior y restaurar base/objetos sólo si la migración no es compatible hacia atrás. No ejecutar migraciones inversas destructivas sin una copia verificada. La auditoría no debe truncarse ni editarse durante la reversión.

## Criterio previo a datos reales

No cargar información clínica real hasta validar en staging: aprovisionamiento, migración desde backup, restauración, rotación JWT, permisos, almacenamiento privado, auditoría, alertas y el smoke test completo.
