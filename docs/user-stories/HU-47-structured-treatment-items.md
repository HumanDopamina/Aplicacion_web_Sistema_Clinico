# HU-47 — Procedimientos planificados estructurados

**Estado:** Implementada y validada el 31 de agosto de 2026.

## Alcance implementado

`TreatmentItem` vive en `apps.patients` y representa una propuesta nacida en una
`Consultation`. No duplica paciente: la pertenencia se deriva mediante
`proposed_in.patient`. La consulta y el servicio usan `PROTECT`; el servicio es
opcional para admitir procedimientos personalizados.

El modelo conserva snapshots históricos de descripción y precio, diagnóstico o
justificación, pieza FDI opcional, superficies del vocabulario del odontograma,
hallazgo planificado, notas y timestamps. Los estados previstos son `PROPUESTO`,
`ACEPTADO`, `REALIZADO` y `CANCELADO`, pero HU-47 sólo crea `PROPUESTO` y la API
genérica rechaza cambios de estado u origen.

## Reglas clínicas

- Sólo `consultations.edit` crea o modifica propuestas, y únicamente mientras
  la consulta está `EN_PROGRESO` y el ítem sigue `PROPUESTO`.
- `consultations.view` permite lectura anidada y las consultas cerradas muestran
  los ítems en sólo lectura.
- Servicio activo o descripción personalizada identifican el procedimiento. El
  backend toma nombre/precio del catálogo al crear o cambiar realmente el
  servicio; reenviar la misma referencia no recalcula snapshots.
- FDI reutiliza los conjuntos permanente/temporal del odontograma. Sin pieza no
  se admiten superficies; con pieza sólo se aceptan las superficies calculadas
  por `allowed_surfaces`.
- `planned_finding` sólo se almacena. No crea versiones ni altera capas del
  odontograma.
- No existe DELETE ni acciones para aceptar, realizar o cancelar tratamientos.

## Interfaces

- `GET|POST /api/patients/{patientId}/consultations/{consultationId}/treatment-items/`
- `GET|PATCH /api/patients/{patientId}/consultations/{consultationId}/treatment-items/{itemId}/`
- `ConsultationRecordPage` incluye **Plan de tratamiento**, catálogo activo,
  procedimiento personalizado, diagnóstico, pieza, superficies, hallazgo,
  notas y precio de referencia; los snapshots persistidos siempre vienen del
  backend.

Los campos legados `dental_service`, `treatment_plan`, `budget` y
`treatment_performed` permanecen intactos y sin sincronización bidireccional.

## Migración y PostgreSQL

`patients.0011_treatmentitem` es una expansión de esquema que sólo crea la tabla.
No contiene `RunPython` ni backfill desde texto u odontograma. En
`clinica_dental`, antes → después:

- Patient: 3 → 3;
- Consultation: 2 → 2;
- TreatmentItem: 0 → 0;
- OdontogramVersion: 5 → 5;
- ClinicService: 1 → 1.

Los hashes SHA-256 completos de Patient, Consultation, OdontogramVersion y
ClinicService fueron idénticos antes/después. TEC-07 avanza con esta migración
segura y permanece Parcial.

## Auditoría y evidencia

Creación y edición generan `TREATMENT_ITEM_CREATE/UPDATE` con actor, paciente,
consulta e ítem. Se validaron modelo, snapshots, FDI, superficies, scopes,
permisos, estados cerrados, inmutabilidad, catálogo inactivo, migración sin
inferencias, UI editable/sólo lectura y ausencia de controles HU-48.

Comandos principales:

```powershell
python manage.py test --settings=config.settings.test
python manage.py test <tests HU-47> --settings=<PostgreSQL aislado>
python manage.py check
python manage.py migrate --check
python manage.py makemigrations --check --dry-run --settings=config.settings.test
npm test
npm run lint
npm run build
git diff --check
```

No se implementaron HU-48, HU-49, HU-50, transiciones longitudinales,
actualización del odontograma, seguimiento, cobros ni facturación.
