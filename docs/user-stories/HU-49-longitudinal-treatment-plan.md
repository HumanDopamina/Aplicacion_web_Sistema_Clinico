# HU-49 — Visualizar el plan longitudinal y los tratamientos pendientes

**Estado:** Implementada y validada el 31 de agosto de 2026.

## Alcance implementado

El plan longitudinal se deriva directamente de `TreatmentItem` filtrando por
`proposed_in__patient_id`. No se creó `TreatmentPlan`, tabla agregadora, copia,
snapshot adicional ni backfill. Los campos textuales históricos de las
consultas permanecen separados y el odontograma no fue modificado.

El endpoint de lectura clínica es:

```text
GET /api/patients/{patientId}/treatment-items/
```

Requiere `consultations.view`, valida que el paciente exista y devuelve sólo
ítems de ese paciente. Admite los cuatro valores de `status`, además de
`scope=pending` (`PROPUESTO`, `ACEPTADO`) y `scope=history` (`REALIZADO`,
`CANCELADO`). Combinar `status` y `scope`, o enviar un valor inválido, produce
400. Conserva la paginación estándar con `page` y `page_size`.

## Contrato y rendimiento

Cada resultado expone la definición snapshot, estado, pieza/superficies,
hallazgo planificado, notas, motivo, fecha de realización y contextos mínimos
`{id, date}` para `proposed_in` y `performed_in`. No incluye la consulta
completa, expediente, antecedentes, documentos ni odontograma. También expone
la proyección nullable `service` con `id`, `name`, `category_name`,
`duration_minutes`, `price` e `is_active`; HU-51 usa estos datos sólo como
sugerencia operativa y contrasta el servicio con el catálogo actual antes de
prellenarlo. Un servicio desactivado no impide listar el ítem: la presentación
usa prioritariamente `description` y `unit_price_snapshot`.

La consulta usa `select_related("proposed_in", "performed_in", "service",
"service__category")`. Pendientes se ordenan por ACEPTADO antes de PROPUESTO,
fecha de propuesta y PK; historial por evento más reciente (`performed_at`,
`updated_at` o `created_at`), fecha de origen y PK. La prueba de rendimiento
confirma un número constante de queries al pasar de uno a varios ítems y
verifica que no se consultan ClinicalRecord, OdontogramVersion ni
PatientDocument.

## Interfaces

`LongitudinalTreatmentPlan` y su tarjeta se reutilizan en el expediente y la
consulta. La ficha del paciente separa Pendientes e Historial y es de solo
lectura. Ambos grupos tienen estados vacíos y paginación independientes.

Una consulta existente carga en paralelo la primera página de ambos grupos,
independientemente de la carga principal. Los ítems se deduplican por PK. La
consulta de origen queda visible y los originados en la consulta actual se
identifican como tales.

Las acciones siguen usando exclusivamente los endpoints HU-48. Aceptar y
cancelar se dirigen a la consulta de origen. Realizar también se dirige al ítem
en su origen y envía la consulta actual EN_PROGRESO como `performed_in`. La
respuesta reemplaza localmente el ítem, por lo que un realizado o cancelado
pasa de Pendientes a Historial sin recargar la aplicación. Una consulta
COMPLETADA nunca se ofrece como consulta de realización.

## Verificación

```powershell
python manage.py test apps.patients.test_treatment_plan --settings=config.settings.test --noinput
python manage.py test --settings=config.settings.test --noinput
python manage.py test apps.patients.test_treatment_plan --settings=<PostgreSQL aislado> --keepdb --noinput
python manage.py check --settings=config.settings.test
python manage.py migrate --check --settings=config.settings.development
python manage.py makemigrations --check --dry-run --settings=config.settings.test
npm test -- --run
npm run lint
npm run build
git diff --check
```

Resultados: 7/7 pruebas HU-49 en SQLite y PostgreSQL real, 272/272 pruebas
backend (25 omitidas por condición de entorno), 199/199 pruebas frontend, lint
sin advertencias, build correcto, chequeos Django correctos y ninguna migración
nueva. HU-47 y HU-48 continúan cubiertas por las suites completas.

El alcance original de HU-49 no creó agenda, seguimiento ni relaciones nuevas.
HU-50 y HU-51 reutilizan posteriormente este contrato sin cambiar esa fuente
longitudinal. No se incluyeron pagos, facturación ni conversión de tratamientos
legados.
