# HU-47 — Plan técnico para procedimientos planificados estructurados

## Alcance y decisiones de inspección

1. `ClinicService` vive en `apps.clinics`, pertenece por `PROTECT` a `ServiceCategory` y contiene `name`, `duration_minutes`, `price`, `position`, `is_active` y timestamps. Su API `/api/clinics/services/` permite lectura a cualquier usuario autenticado, escritura sólo a administración y filtro `active=true`; se reutilizará como catálogo único.
2. El odontograma usa FDI de dos dígitos: permanentes 11–18, 21–28, 31–38 y 41–48; temporales 51–55, 61–65, 71–75 y 81–85. `TreatmentItem` reutilizará esos conjuntos, sin depender de la dentición de una versión concreta.
3. Las superficies vigentes son `MESIAL`, `DISTAL`, `VESTIBULAR`, más `PALATAL` o `LINGUAL` según arcada y `INCISAL` u `OCCLUSAL` según posición. La validación se centralizará en los helpers existentes de `odontograms.py`.
4. Los permisos clínicos disponibles y adecuados son `consultations.view` para listar/consultar y `consultations.edit` para crear/editar. Recepción conserva sólo lectura cuando su preset contiene `consultations.view`; no se amplía su acceso clínico.
5. `Consultation` conserva actualmente `dental_service`, `treatment_plan`, `budget` y `treatment_performed` como campos textuales, mostrados como tarjetas narrativas en `ConsultationRecordPage`. Permanecerán intactos, sin sincronización ni backfill.

## Política de dominio

- Crear `TreatmentItem` dentro de `apps.patients`, sin nueva app y sin duplicar `patient`.
- `proposed_in` será obligatorio, inmutable y `PROTECT`; `service` será nullable y `PROTECT`, preservando la referencia histórica incluso si el servicio se desactiva.
- Todo ítem nace `PROPUESTO`. Se declaran también `ACEPTADO`, `REALIZADO` y `CANCELADO` para el dominio futuro, pero HU-47 no expone transiciones.
- Al seleccionar/cambiar servicio, backend toma siempre el precio actual como snapshot. La descripción será la personalizada explícita no vacía o, en su ausencia, el nombre actual del servicio. Al quitar servicio se conserva o exige una descripción no vacía y se limpia el precio.
- Cambiar nombre/precio/actividad del catálogo después no altera snapshots existentes. Editar otros campos tampoco los recalcula.
- `tooth_code` admite cualquier FDI reconocido por el odontograma. Sin pieza, `surfaces` debe ser `[]`; con pieza, cada superficie debe estar permitida por `allowed_surfaces`. `planned_finding` se valida contra el vocabulario planificado existente, pero sólo se almacena y nunca modifica el odontograma.
- No se implementa DELETE ni campos/acciones de ejecución, aceptación, cancelación, seguimiento o facturación.

## Ciclo de implementación

1. Añadir pruebas rojas de modelo/serializer/API para obligatoriedad, snapshots, FDI, superficies, estados, scopes anidados, permisos, inmutabilidad y auditoría.
2. Implementar modelo, migración `patients.0011_treatmentitem`, serializers, vistas anidadas, URLs y clasificación de auditoría mínima.
3. Añadir pruebas rojas del cliente frontend y `ConsultationRecordPage`: carga, vacío, formulario compacto, validaciones, éxito/error y sólo lectura.
4. Implementar servicios y sección de plan estructurado, usando servicios activos y mostrando snapshots históricos.
5. Ejecutar pruebas focalizadas; corregir sólo causas dentro de HU-47.
6. Verificar migración no destructiva y sin backfill. Aplicarla a `clinica_dental`, comparando conteos `Patient`, `Consultation`, `TreatmentItem`, `OdontogramVersion` y `ClinicService` antes/después.
7. Ejecutar suites completas backend/frontend, verificaciones Django, lint, build y controles Git. Documentar HU-47 y actualizar únicamente el resumen de historias implementadas requerido por `AGENTS.md`.

## Línea base PostgreSQL antes de `patients.0011`

- Patient: 3
- Consultation: 2
- TreatmentItem: 0 (el modelo aún no existe)
- OdontogramVersion: 5
- ClinicService: 1

La migración no inferirá tratamientos desde campos textuales, notas ni capas planificadas del odontograma.
