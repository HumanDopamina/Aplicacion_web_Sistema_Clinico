# HU-50 — Integrar el plan de tratamiento con el odontograma

**Estado:** Implementada y validada el 31 de agosto de 2026.

## Separación de responsabilidades

`TreatmentItem` continúa siendo la fuente de verdad del plan longitudinal y de
su estado. `OdontogramVersion` continúa siendo un snapshot inmutable del estado
dental observable. Crear, aceptar o cancelar un tratamiento no crea versiones.
Sólo la realización con un resultado odontográfico confirmado explícitamente
puede crear una versión.

El schema odontográfico permanece en versión 1. Cada pieza FDI conserva
`reviewed`, `note`, `current` y `planned`; las dos capas separan hallazgos de
pieza completa (`whole`) y de superficie (`surfaces`). La planificación manual
histórica permanece dentro de cada snapshot, sin backfill, borrado ni conversión
a tratamientos. Para la vista vigente, la capa planificada se deriva de
`TreatmentItem` y no persiste una segunda copia.

## Overlay derivado

`GET /api/patients/{patientId}/odontogram/planned-overlay/` requiere
`consultations.view` y devuelve un arreglo no paginado, mínimo y ordenado por
fecha de consulta de origen y PK. La consulta usa `select_related("proposed_in")`
y filtra por paciente, `PROPUESTO|ACEPTADO`, pieza no vacía y hallazgo
planificado no vacío. Expone ítem, estado, pieza, superficies, hallazgo,
descripción y el contexto mínimo `{id, date}` de la consulta de origen.

El frontend construye marcas visuales deduplicadas por hallazgo, pieza y
superficie, pero conserva todos los ítems en una lista inspeccionable; ningún
tratamiento “gana” ni se fusiona clínicamente con otro. La capa es de sólo
lectura y se distingue del estado actual mediante selector, leyenda y texto de
compatibilidad. Un fallo del overlay no impide abrir ni editar el estado actual.
Las páginas históricas no reciben el overlay vigente, evitando anacronismos.

## Realización y resultado

La acción existente `perform` admite opcionalmente:

```json
{
  "performed_in": 25,
  "odontogram_result": {
    "tooth_code": "16",
    "surfaces": ["OCCLUSAL"],
    "finding": "RESTORATION"
  }
}
```

Sin `odontogram_result`, el ítem pasa a `REALIZADO` sin crear versión. Con
resultado, el servicio bloquea ítem, consulta de ejecución y paciente; toma la
última versión global del paciente, copia el snapshot completo, aplica sólo el
hallazgo confirmado en `current`, normaliza el schema, crea una versión basada
en la anterior y enlaza ambas entidades dentro de una sola transacción.

No se copia automáticamente `planned_finding`. La pieza debe coincidir con el
ítem y pertenecer a la dentición vigente. Los findings de superficie requieren
al menos una superficie válida y los de pieza completa no admiten superficies.
Las superficies reales pueden diferir de las planificadas porque el resultado
es una confirmación clínica independiente.

`TreatmentItem.resulting_odontogram_version` es un `OneToOneField` nullable y
protegido. Permite atribución e idempotencia: una repetición para la misma
consulta devuelve el ítem existente, conserva `performed_at` y no crea otra
versión. La auditoría `TREATMENT_ITEM_PERFORM` añade el ID de versión y la señal
de resultado registrado. El catálogo actual usa el mismo permiso
`consultations.edit` para tratamientos y escritura odontográfica; por ello el
backend aplica una única frontera clínica común, además de validarla dentro del
servicio.

## Migración y preservación PostgreSQL

`patients.0013_treatmentitem_odontogram_result` añade únicamente el vínculo
nullable. No contiene `RunPython`, default ni backfill. Históricos permanecen
`NULL`. En `clinica_dental`, antes → después:

- Patient: 3 → 3;
- Consultation: 2 → 2;
- TreatmentItem: 0 → 0;
- OdontogramVersion: 5 → 5;
- versiones con planificación manual: 0 → 0;
- vínculos históricos no nulos: 0.

Las huellas SHA-256 de Patient, Consultation, OdontogramVersion y de todas las
columnas 0012 de TreatmentItem fueron idénticas antes y después. La migración
quedó aplicada y `migrate --check` no reporta pendientes.

TEC-07 queda **Hecho**: las expansiones estructurales de las fases 1–4 están
aplicadas y verificadas; las columnas nullable restantes representan estados
legítimamente opcionales del dominio, no una contracción pendiente necesaria.

## Evidencia automatizada

- Overlay: inclusión/exclusión por estado y contexto dental, aislamiento por
  paciente, contrato mínimo, permisos, multiplicidad y consultas constantes.
- Perform: camino sin resultado, validaciones clínicas, versión atribuida,
  snapshot previo intacto, rollback en ambas direcciones, auditoría e
  idempotencia.
- PostgreSQL real: 7/7 pruebas de locking; perform/perform crea una sola versión
  y perform/cancel produce un único estado terminal sin versión huérfana.
- Frontend: overlay derivado, detalles múltiples, error degradable, elección
  explícita, pieza bloqueada, finding/superficies y actualización local del
  ítem.
- Regresión: 285 pruebas Django y 205 Vitest; Oxlint y build de Vite correctos.

Comandos principales:

```powershell
python manage.py test --settings=config.settings.test --noinput
python manage.py check --settings=config.settings.test
python manage.py migrate --check --settings=config.settings.development
python manage.py makemigrations --check --dry-run --settings=config.settings.test
npm test
npm run lint
npm run build
git diff --check
```

No se implementaron HU-51, seguimiento, próxima cita, facturación, pagos,
inferencias por servicio ni backfills heurísticos.
