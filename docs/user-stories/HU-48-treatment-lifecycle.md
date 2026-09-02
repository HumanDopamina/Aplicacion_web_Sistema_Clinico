# HU-48 — Aceptar, realizar o cancelar un tratamiento

**Estado:** Implementada y validada el 31 de agosto de 2026.

## Alcance implementado

`TreatmentItem` conserva la definición clínica de HU-47 y añade únicamente
metadatos de ciclo de vida: `performed_in` (`Consultation`, nullable, `PROTECT`),
`performed_at` (hora del servidor, nullable) y `status_reason` (texto opcional,
máximo 1000 caracteres). No se duplican paciente, ejecutor, cantidad, moneda ni
facturación.

La máquina de estados explícita es:

- `PROPUESTO -> ACEPTADO | CANCELADO`;
- `ACEPTADO -> REALIZADO | CANCELADO`;
- `REALIZADO` y `CANCELADO` son terminales.

No existe reapertura ni transición directa `PROPUESTO -> REALIZADO`.

## Servicios y reglas clínicas

`accept_treatment_item`, `perform_treatment_item` y `cancel_treatment_item`
viven en la capa de dominio. Los tres exigen `consultations.edit`, ejecutan
`transaction.atomic` y bloquean el ítem con `select_for_update`.

- Aceptar es idempotente si el ítem ya está aceptado y funciona aunque la
  consulta de origen esté completada.
- Cancelar acepta propuestas o ítems aceptados, recorta un motivo opcional y
  una repetición nunca sobrescribe el motivo original.
- Realizar exige un ítem aceptado y una consulta `EN_PROGRESO` del mismo
  paciente. Registra una sola vez `performed_in` y `performed_at`; repetir
  contra la misma consulta devuelve el resultado existente.
- La definición de un ítem aceptado queda congelada. Los estados terminales son
  inmutables. El PATCH ordinario rechaza `status`, `performed_in`,
  `performed_at` y `status_reason`.
- Ninguna transición modifica consulta, cita, servicio, precio, odontograma ni
  datos legados.

Errores de dominio estables: `treatment_invalid_transition`,
`treatment_patient_mismatch` y
`treatment_perform_requires_active_consultation`. Payload inválido devuelve
400, falta de permiso 403, scope/recurso inexistente 404 y conflicto de estado
409.

## Interfaces

- `POST .../treatment-items/{itemId}/accept/`
- `POST .../treatment-items/{itemId}/perform/` con `performed_in`
- `POST .../treatment-items/{itemId}/cancel/` con `reason` opcional

`TreatmentPlanSection` muestra controles según estado y permiso, bloquea doble
envío, conserva errores controlados y reemplaza el ítem con la respuesta del
backend. Una propuesta de una consulta completada aún puede aceptarse o
cancelarse. Realizar solo aparece para un ítem aceptado cuando la consulta
actual está en progreso; no se cargan tratamientos de otras consultas.

## Migración y preservación

`patients.0012_treatmentitem_lifecycle` es una expansión nullable sin
`RunPython` ni backfill. En `clinica_dental`, antes → después:

- Patient: 3 → 3;
- Consultation: 2 → 2;
- TreatmentItem: 0 → 0;
- OdontogramVersion: 5 → 5;
- ClinicService: 1 → 1;
- TreatmentItem por estado: vacío → vacío.

TEC-07 avanza con otra migración expandir/verificar/activar y permanece
**Parcial**.

## Concurrencia, auditoría y evidencia

Las acciones generan `TREATMENT_ITEM_ACCEPT`, `TREATMENT_ITEM_PERFORM` y
`TREATMENT_ITEM_CANCEL` con actor, paciente, ítem, consulta de origen, consulta
de realización y transición.

En PostgreSQL real se validó:

- aceptar/aceptar: ambas respuestas 200 y un único estado aceptado;
- realizar/realizar: ambas respuestas 200 y un único par
  `performed_in`/`performed_at`;
- cancelar/realizar: exactamente una transición terminal y un conflicto 409,
  nunca una combinación híbrida.

Comandos principales:

```powershell
python manage.py test apps.patients.test_treatment_lifecycle --settings=config.settings.test
python manage.py test apps.patients.test_postgres.PostgresConsultationCompletionTests --settings=<PostgreSQL aislado>
python manage.py test --settings=config.settings.test
python manage.py check
python manage.py migrate --check
python manage.py makemigrations --check --dry-run --settings=config.settings.test
npm test
npm run lint
npm run build
git diff --check
```

No se implementaron HU-49, HU-50, listados longitudinales, sincronización con
odontograma, seguimiento, cobros, facturación ni reapertura.
