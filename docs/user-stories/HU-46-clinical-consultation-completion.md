# HU-46 — Cerrar clínicamente una consulta

**Estado:** Implementada y validada el 31 de agosto de 2026.

## Contrato clínico inspeccionado

`Consultation` conserva fecha/hora/tipo/resumen, profesional y snapshot de nombre,
anamnesis, interrogatorio por sistemas, signos vitales, examen físico, análisis,
diagnóstico odontológico, plan, presupuesto, tratamiento y odontograma versionado.
Antes de HU-46 sólo eran obligatorios `date`, `time`, `consultation_type`,
`summary` no vacío y `status`; no existía un mínimo odontológico sustantivo en
validadores, formularios, documentación ni pruebas.

El cierre reutiliza únicamente fecha, hora, tipo y resumen. Los demás campos
continúan opcionales y la suficiencia clínica definitiva queda pendiente de
validación con odontología; no se inventaron requisitos médicos.

## Diseño implementado

`complete_consultation` exige `consultations.edit`, usa `transaction.atomic` y
`select_for_update`. Una consulta de agenda se reconoce sólo por la relación
inversa OneToOne de `Appointment`; las manuales no tienen cita y nunca se buscan
coincidencias históricas.

Cuando hay cita, el orden de bloqueo es Appointment → Consultation. El servicio
exige `EN_PROGRESO`/`EN_ATENCION`, registra hora real y actor, y persiste ambos
estados `COMPLETADA` en una sola transacción. Repetir el POST devuelve 200 con
los mismos `completed_at` y `completed_by`. Un fallo al guardar la cita revierte
también el cierre clínico.

La acción es
`POST /api/patients/{patientId}/consultations/{consultationId}/complete/` y
devuelve `{consultation, appointment}`; `appointment` es NULL para consultas
manuales. Los conflictos de dominio usan HTTP 409 con `code` y `detail`.

## Inmutabilidad y cancelación

El PATCH genérico ya no cambia estados. `COMPLETADA` y `CANCELADA` rechazan toda
edición ordinaria; React muestra cierre, actor y contenido en modo lectura. No
se implementaron reapertura, corrección ni adenda: TEC-13 permanece pendiente.

`cancel_consultation` es explícito, transaccional e idempotente para consultas
manuales `EN_PROGRESO → CANCELADA`. Una consulta vinculada responde 409
`consultation_linked_cancellation_unsupported` y deja intactos estado/vínculo,
porque el modelo no conserva si la cita era PROGRAMADA o CONFIRMADA. Por esta
limitación deliberada, TEC-06 permanece Parcial.

## Migración y evidencia

`patients.0010_consultation_completion` añade `completed_at` y `completed_by`
nullable, sin backfill. En `clinica_dental`, antes → después:

- Appointment: 5 → 5;
- Consultation: 2 → 2;
- OdontogramVersion: 5 → 5;
- consultas: 1 COMPLETADA y 1 EN_PROGRESO, sin cambios;
- metadatos de cierre históricos NULL: 2 → 2.

Los hashes SHA-256 se conservaron: Appointment
`df79b47b6941df36a3c53463b50744b3da1097abfa8ed9d4fcb461afb1c9ee75`,
Consultation `c2756367525f7eb2ee86a22e72c724b599906dfb87b760f52aa9375f917c0f0d`
y OdontogramVersion
`2d4399225ed3e38dd95a6eaac0f54cddb2aee168a21e3fe02223ed922340aca5`.

## Evidencia automatizada

- Cierre vinculado/manual, regla mínima, permiso, errores e idempotencia.
- Inmutabilidad API y UI; lectura de históricos permitida.
- Rollback total y dos cierres simultáneos reales PostgreSQL.
- Carrera start repetido/cierre sin estados imposibles.
- Auditoría `CONSULTATION_COMPLETE`/`CONSULTATION_CANCEL` con actor, paciente,
  consulta y cita cuando existe.
- Confirmación, loading, doble submit, 403/409 y navegación desde agenda.

No se implementaron `TreatmentItem`, HU-47+, adendas ni reapertura.
