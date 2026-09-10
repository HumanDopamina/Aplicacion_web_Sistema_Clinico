# HU-43 — Cambios de permisos en sesiones abiertas

Estado: Implementada y verificada el 2 de septiembre de 2026.

## Mecanismo implementado

- El contexto de autenticación centraliza las capacidades y vuelve a consultar
  el perfil autenticado mediante `GET /api/auth/me/` al recuperar el foco o al
  volver visible la pestaña.
- Las revalidaciones simultáneas del mismo token se deduplican y no existe
  polling periódico.
- Un `403` final de una petición protegida dispara la misma revalidación sin
  ocultar ni sustituir el error original de la API.
- Si se revoca una capacidad, React desmonta el módulo no autorizado y la ruta
  protegida redirige a Bienvenida. Si se concede, el enlace aparece tras la
  siguiente revalidación, sin cerrar la sesión.
- Una respuesta atrasada sólo puede actualizar la sesión que conserve el mismo
  access token, evitando contaminar una sesión posterior.

## Evidencia de aceptación

- Revocación y concesión integradas sobre la ruta y navegación de Pacientes.
- Refresco por foco, deduplicación de eventos, ausencia de polling y manejo de
  `403` protegido.
- La API continúa autorizando cada operación; el estado frontend nunca es una
  segunda fuente de verdad.

## Riesgo aceptado del MVP

- No hay notificación push: un cambio administrativo se refleja al recuperar
  foco/visibilidad o al recibir un `403`, conforme al mecanismo solicitado.

