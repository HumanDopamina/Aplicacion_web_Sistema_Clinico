# HU-48 — Ciclo de vida de tratamientos

## Contrato vigente inspeccionado

- `TreatmentItem` pertenece a una consulta mediante `proposed_in`, conserva la definición clínica y económica de HU-47 y ya declara los estados `PROPUESTO`, `ACEPTADO`, `REALIZADO` y `CANCELADO`.
- El estado está protegido en `TreatmentItemSerializer`; actualmente no existe ninguna operación válida que lo cambie.
- La creación y edición ordinaria se bloquean cuando `proposed_in` no está `EN_PROGRESO`. Además, solo un ítem `PROPUESTO` admite edición ordinaria.
- Las vistas reutilizan `consultations.view` para lectura y `consultations.edit` para creación/edición. El rol de recepción no obtiene estas acciones por su acceso a agenda.
- Los cierres clínicos ya usan servicios de dominio con `transaction.atomic`, `select_for_update`, errores estables y operaciones explícitas; HU-48 seguirá ese patrón.
- Una consulta cerrada permanece inmutable. El ciclo de vida del tratamiento será independiente: aceptar o cancelar una propuesta seguirá siendo válido aunque `proposed_in` esté completada; realizar exigirá otra consulta (o la actual) activa del mismo paciente.

## Diseño de dominio

- Añadir de forma nullable y sin backfill `performed_in` (`Consultation`, `PROTECT`), `performed_at` y `status_reason`.
- Implementar `accept_treatment_item`, `perform_treatment_item` y `cancel_treatment_item` como servicios atómicos que bloquean el ítem con `select_for_update`.
- Máquina de estados: `PROPUESTO -> ACEPTADO|CANCELADO`; `ACEPTADO -> REALIZADO|CANCELADO`; `REALIZADO` y `CANCELADO` terminales.
- Aceptar y cancelar serán idempotentes respecto al mismo estado terminal. Una cancelación repetida nunca reemplazará el motivo original.
- Realizar será idempotente únicamente cuando el ítem ya realizado apunte a la misma consulta; nunca reemplazará `performed_in` ni `performed_at`.
- Realizar exige `performed_in` existente, del mismo paciente, `EN_PROGRESO` y editable por el actor. No se permitirá `PROPUESTO -> REALIZADO`.
- Los campos de transición serán de solo lectura y se rechazarán explícitamente si aparecen en un PATCH ordinario.
- Las transiciones no modificarán consulta, cita, odontograma, facturación ni definición del tratamiento.

## Plan de implementación y verificación

1. Capturar conteos y huellas previas en PostgreSQL real, incluido el desglose de tratamientos por estado.
2. Escribir primero pruebas backend rojas de servicios, API, permisos, validación, idempotencia, inmutabilidad, auditoría y migración.
3. Añadir la migración nullable y los servicios/endpoints mínimos; hacer pasar las pruebas backend enfocadas.
4. Escribir primero pruebas frontend rojas para visibilidad, estados, confirmaciones, doble clic, carga y errores.
5. Extender `TreatmentPlanSection`, `ConsultationRecordPage` y `patientService` sin consultas longitudinales ni funciones de HU-49.
6. Ejecutar pruebas de concurrencia en PostgreSQL real y demostrar que carreras aceptar/aceptar, realizar/realizar y cancelar/realizar no producen estados híbridos.
7. Aplicar la migración al esquema real y comparar conteos y huellas de entidades clínicas no afectadas.
8. Actualizar exclusivamente la documentación de HU-48 y el resumen de historias, manteniendo TEC-07 en estado Parcial.
9. Ejecutar suites completas backend/frontend, lint, build, `manage.py check`, `migrate --check`, `makemigrations --check --dry-run` y revisar `git diff` por alcance.

## Fuera de alcance

- HU-49 y cualquier listado longitudinal o búsqueda de tratamientos de otras consultas.
- HU-50, cambios funcionales o inferencias en el odontograma.
- Seguimientos, pagos, facturación, cantidades, moneda, ejecutor duplicado, reaperturas y una entidad separada de ejecución.
