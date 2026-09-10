# HU-20 — Horarios disponibles sin citas solapadas

**Estado:** Implementada y validada el 30 de agosto de 2026.

## Criterio de aceptación

> Dado un intervalo solicitado, cuando se crea o reprograma una cita, entonces
> el sistema impide que el odontólogo o el paciente tengan otra cita solapada.

## Alcance implementado

- La validación anticipada de aplicación se conserva para jornada, cierres,
  duración, referencias activas y disponibilidad.
- `scheduled_range` representa cada reserva como `tstzrange` semiabierto `[inicio, fin)`.
- Las exclusiones `appointment_dentist_schedule_excl` y
  `appointment_patient_schedule_excl` garantizan la integridad en PostgreSQL.
- `PROGRAMADA`, `CONFIRMADA`, `PRESENTE`, `EN_ATENCION`, `COMPLETADA` y
  `NO_ASISTIO` bloquean; `CANCELADA` libera el intervalo.
- Las escrituras sobre el mismo paciente u odontólogo se coordinan dentro de la
  transacción PostgreSQL; la exclusión conocida se traduce a un contrato HTTP 409.
- El backfill valida duraciones y solapamientos antes de activar constraints y
  detiene la migración con los IDs implicados sin modificar citas en conflicto.

## Interfaces afectadas

- `POST /api/appointments/`
- `PATCH /api/appointments/<id>/`
- Persistencia PostgreSQL de `appointments.Appointment`

## Evidencia de aceptación

- Pruebas directas cubren mismo inicio, solapamiento parcial, contención,
  adyacencia, paciente/odontólogo distintos y la política de estados.
- Pruebas API cubren creación, reprogramación, contrato 409 por tipo de conflicto
  y propagación de errores de integridad desconocidos.
- Dos pruebas con conexiones y transacciones PostgreSQL reales fuerzan escrituras
  concurrentes y comprueban un único `201`, un único `409` y una sola fila.
- Pruebas de migración comprueban el backfill sin pérdida de campos y el aborto
  diagnóstico ante solapamientos históricos.

## Verificación

```powershell
cd src/backend
python manage.py test --settings=config.settings.test
$env:TEST_DATABASE_URL='postgresql://clinic_test:<contraseña>@127.0.0.1:5432/clinic_test'
python manage.py test apps.appointments --settings=config.settings.postgres_test --noinput
python manage.py makemigrations --check --dry-run --settings=config.settings.test
```

## Fuera de alcance

- Estado `EN_ATENCION`, relación cita-consulta e historial de reprogramaciones.
- Horarios individuales por odontólogo, consultorios o sillones.
- Cualquier alcance de TEC-04, HU-54, HU-28 o HU-44.
