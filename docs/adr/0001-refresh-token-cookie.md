# ADR-0001: refresh JWT en cookie HttpOnly

- Estado: aceptado
- Fecha: 2026-08-28

## Contexto

Persistir access y refresh tokens en Web Storage permite que cualquier script ejecutado en el origen los lea. El sistema tratará datos clínicos y necesita revocación y expiración predecibles.

## Decisión

El access token dura cinco minutos y vive sólo en memoria. El refresh dura como máximo ocho horas, rota en cada uso y se almacena en `dentalclinic_refresh`, una cookie `HttpOnly`, `SameSite=Lax`, limitada a `/api/auth/` y `Secure` en producción.

Login, refresh y logout requieren CSRF. La aplicación obtiene la cookie CSRF con `GET /api/auth/csrf/`. Al recargar, intenta renovar mediante la cookie y luego consulta `/api/auth/me/`; mientras tanto mantiene las rutas protegidas en inicialización. Los refresh concurrentes se deduplican y cada solicitud se reintenta una sola vez.

Logout y cambios de contraseña incrementan `token_version`; los access y refresh anteriores dejan de ser válidos. No existe opción «Recuérdame» ni JWT en `localStorage` o `sessionStorage`.

## Consecuencias

Frontend y API deben operar bajo el mismo sitio y enviar credenciales. La protección CSRF pasa a formar parte del contrato de autenticación. Cerrar una pestaña no finaliza automáticamente la sesión, pero el límite absoluto sigue siendo ocho horas.
