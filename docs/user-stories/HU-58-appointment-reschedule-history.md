# HU-58 — Historial de reprogramaciones de citas

**Estado:** Implementada y validada el 1 de septiembre de 2026.

## Persistencia y atomicidad

`AppointmentRescheduleEvent` conserva de forma ligera e inmutable el intervalo
anterior y nuevo (`date`, `start_time`, `duration_minutes`), actor, fecha del
cambio y un motivo opcional. No se realizó backfill ni se infirió historia para
las citas existentes; tras la migración el historial comenzó vacío.

La actualización de cita y la creación del evento comparten una transacción y
un bloqueo de fila. Se crea exactamente un evento sólo cuando cambia el
intervalo. Cambios no temporales no generan historial. Si PostgreSQL rechaza un
solapamiento, se revierten tanto la cita como el evento. El modelo, queryset y
administración impiden modificar o eliminar eventos existentes.

El campo de entrada `reschedule_reason` es opcional y sólo de escritura durante
una edición; se recorta antes de persistir y se rechaza de forma controlada si
se intenta enviar al crear una cita.

## Lectura, auditoría e interfaz

```text
GET /api/appointments/{id}/reschedule-history/
```

El endpoint es paginado, de sólo lectura y reutiliza el alcance de visualización
de citas. La ficha solicita el historial únicamente al abrir una cita y muestra
intervalos anterior/nuevo, motivo, actor y momento del cambio. Una
reprogramación real usa la acción de auditoría `APPOINTMENT_RESCHEDULE`; una
edición no temporal conserva la auditoría normal de actualización.

## Migración y evidencia

- La migración `appointments.0007` crea el historial y amplía las restricciones
  de HU-20 para incluir `PRESENTE`, sin modificar los datos clínicos existentes.
- Conteos PostgreSQL antes/después: pacientes 3/3, expedientes 2/2, consultas
  2/2, citas 5/5 y odontogramas 5/5; eventos nuevos: 0.
- Pruebas cubren múltiples eventos ordenados, permisos/alcance, API de sólo
  lectura, inmutabilidad, cambio no temporal y rollback por solapamiento.
- Resultado: 9/9 pruebas backend específicas, 20/20 PostgreSQL, 359 pruebas
  backend completas y 274 pruebas frontend completas correctas.

## Fuera de alcance

No se añadieron restauración de versiones, edición de historial, backfill,
recordatorios, recurrencia ni cambios funcionales ajenos al bloque.
