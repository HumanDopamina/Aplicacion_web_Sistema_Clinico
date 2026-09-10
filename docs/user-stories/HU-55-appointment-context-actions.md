# HU-55 — Ver contexto y acciones válidas de una cita

**Estado:** Implementada y validada el 31 de agosto de 2026.

## Criterio de aceptación

Al abrir una cita, el usuario ve el contexto administrativo completo y sólo las
acciones permitidas por sus capacidades y por el estado real de la cita.

## Contexto presentado

El contrato existente de Appointment se amplió únicamente con
`consultation` y `attendance_started_at`. El panel muestra:

- paciente y código;
- fecha, hora y duración;
- odontólogo y servicio;
- motivo, notas y estado;
- consulta asociada e inicio real, cuando existen.

La agenda utiliza estos datos mínimos y no descarga el detalle del expediente.

## Acciones y permisos

- `Abrir expediente` requiere `patients.view` y reutiliza `/pacientes/:id`.
- `Iniciar atención` requiere `consultations.create`, rol clínico, estado
  programado/confirmado y ausencia de consulta.
- `Continuar atención` requiere `consultations.view`, `EN_ATENCION` y un enlace
  explícito; abre la ruta de consulta existente.
- Los estados cancelada, no asistió y completada no ofrecen inicio.
- La UI muestra loading, evita doble submit, conserva errores de backend y
  navega con el ID devuelto por la acción.

El botón administrativo para marcar una cita como completada fue retirado; esa
transición queda reservada para HU-46.

## Alertas clínicas

La navegación termina en `ConsultationRecordPage`, que ya reutiliza
`ClinicalAlertsBanner` desde `ClinicalRecord`. Una prueba integrada demuestra
agenda → iniciar atención → consulta → alertas visibles, sin copiar alertas a
`Consultation`.

## Verificación

Se cubren detalle completo, permisos de expediente, iniciar/continuar, estados
inválidos, loading, doble clic, error backend, navegación y alertas HU-28. La
suite completa, lint y build forman parte de la validación final del bloque.

No se implementaron HU-46, cierre clínico ni `TreatmentItem`.

