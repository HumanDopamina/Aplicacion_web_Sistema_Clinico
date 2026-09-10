# HU-23 — Registrar llegada del paciente

**Estado:** Implementada y validada el 1 de septiembre de 2026.

## Contrato y transición

La acción operativa se expone como:

```text
POST /api/appointments/{id}/check-in/
```

`PROGRAMADA` y `CONFIRMADA` pasan a `PRESENTE`. La primera transición responde
`201` con `changed: true`; repetirla sobre `PRESENTE` responde `200` con
`changed: false`. `CANCELADA`, `NO_ASISTIO`, `COMPLETADA` y `EN_ATENCION` se
rechazan con un error de dominio estable. El `PATCH` directo a `PRESENTE` o
`EN_ATENCION` se rechaza para que las transiciones sólo ocurran mediante sus
acciones operativas.

El servicio usa una transacción y bloqueo `select_for_update`. Revalida permiso,
alcance del odontólogo y paciente activo dentro de la operación. La recepción
puede registrar llegada con `appointments.edit`, sin recibir permisos clínicos.
El check-in sólo actualiza estado: no crea `Consultation`, odontograma ni
`attendance_started_at`. El inicio clínico existente acepta también `PRESENTE`
y mantiene todas sus protecciones.

`PRESENTE` forma parte de los estados que bloquean el intervalo para paciente y
odontólogo en las restricciones PostgreSQL de HU-20.

## Auditoría e interfaz

- La acción se registra como `APPOINTMENT_CHECK_IN`, vinculada al paciente y a
  la cita.
- La ficha de una cita elegible ofrece **Registrar llegada**.
- Un usuario clínico puede iniciar atención desde `PRESENTE`; recepción no ve el
  CTA clínico si carece del permiso correspondiente.

## Evidencia de aceptación

- Casos API cubren ambos estados iniciales, idempotencia, estados inválidos,
  paciente inactivo, permisos, alcance, auditoría y ausencia de registros
  clínicos durante check-in.
- PostgreSQL real: check-in concurrente produce exactamente una transición, con
  respuestas `201/200`, y `PRESENTE` continúa bloqueando paciente y odontólogo.
- 9/9 pruebas backend específicas, 51/51 frontend de agenda, 20/20 PostgreSQL,
  359 pruebas backend completas y 274 pruebas frontend completas correctas.

## Fuera de alcance

No se cambió el contenido clínico, el cierre de consultas, los permisos
clínicos ni ninguna historia fuera del bloque solicitado.
