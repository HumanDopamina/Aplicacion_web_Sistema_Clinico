# HU-45 — Sincronización de estados cita-consulta

**Estado:** Implementada y validada el 31 de agosto de 2026.

## Máquina de estados

- Inicio: `Appointment PROGRAMADA/CONFIRMADA → EN_ATENCION` y creación de
  `Consultation EN_PROGRESO`, exclusivamente por `start_attendance` (HU-44).
- Cierre: `Consultation EN_PROGRESO → COMPLETADA` y `Appointment EN_ATENCION →
  COMPLETADA`, exclusivamente por `complete_consultation` (HU-46).
- Una consulta manual se completa sin crear ni modificar Appointment.
- Citas CANCELADA/NO_ASISTIO no pueden entrar al cierre clínico.

Los serializers rechazan entrada/salida de los estados clínicos por PATCH. El
cierre vinculado bloquea ambas filas y las actualiza atómicamente; rollback y
concurrencia se validaron sobre PostgreSQL real. La agenda vuelve a consultar al
backend y muestra la cita completada con una acción de sólo lectura para abrir
la consulta asociada.

No se usan signals ni sincronización duplicada en React.
