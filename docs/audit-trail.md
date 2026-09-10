# Auditoría clínica y administrativa

Cada solicitud crítica genera un `AuditEvent` append-only con actor, rol, acción, resultado, recurso, paciente, IP normalizada, agente de usuario y `X-Request-ID`. Las escrituras de API y el evento comparten una transacción: si el registro de auditoría falla, la mutación se revierte.

No se almacenan contraseñas, tokens, cuerpos, nombres de archivos, diagnósticos, notas ni valores clínicos. `changed_fields` contiene únicamente nombres de campos no sensibles; `metadata` se limita a transiciones de estado/rol y resumen de archivos (MIME, tamaño total y cantidad).

`GET /api/audit/events/` está disponible sólo para Administración, pagina 50 resultados y acepta un máximo de 100. Filtros: `action`, `outcome`, `actor_id`, `patient_id`, `resource_type`, `resource_id`, `date_from` y `date_to`. No existen operaciones de creación, edición o eliminación. La retención es indefinida hasta definir una política legal.
