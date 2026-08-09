# Odontogramas versionados por consulta

**Estado:** Implementado y validado el 9 de agosto de 2026.

## Objetivo funcional

Cada consulta persistida posee un odontograma. El profesional puede registrar hallazgos por pieza y superficie, diferenciar el estado actual del plan de tratamiento y guardar revisiones sin sobrescribir el historial clínico.

No se asigna número HU a esta funcionalidad.

## Alcance implementado

- Al crear una consulta, la API crea su primera versión del odontograma dentro de la misma transacción.
- Si el paciente tiene un odontograma anterior, la nueva consulta copia exactamente su dentición y piezas. Si no existe, parte sin piezas evaluadas.
- La dentición inicial sugerida es temporal para menores de 6 años, mixta entre 6 y 12, y permanente desde los 13 años.
- La numeración FDI distingue piezas permanentes y temporales y valida las superficies permitidas según arcada y tipo de pieza.
- Una pieza ausente del snapshot significa **No evaluada**. Una pieza marcada como evaluada sin hallazgos significa **Sano**.
- El editor admite registros parciales; el progreso informa cuántas piezas se han evaluado sin exigir completar la dentición.
- La capa **Estado actual** admite caries, restauración, sellante y fractura por superficie; y ausencia, no erupción, corona, implante y endodoncia por pieza.
- La capa **Plan de tratamiento** admite restauración y sellante por superficie; y corona, implante, endodoncia y extracción por pieza.
- La ficha de consulta incorpora la navegación contextual **Ficha clínica / Odontograma**. Una consulta nueva debe guardarse antes de abrir el odontograma.
- La edición sigue el patrón Odoo del expediente: nube para guardar, X para descartar, borrador conservado ante errores y advertencia antes de abandonar cambios.
- Un usuario sin `consultations.edit` recibe la misma representación en modo **Solo lectura**.
- La pestaña **Odontograma** del paciente abre una línea temporal y permite comparar dos versiones arbitrarias en `/pacientes/{id}/odontogramas`.

## Versionado e integridad

- `OdontogramVersion` conserva paciente, consulta, número global por paciente, versión del esquema, dentición, snapshot de piezas, piezas modificadas, nota, versión base, autor y fecha.
- Las revisiones son inmutables: no existe API de actualización o eliminación, el modelo rechaza `save()` y `delete()` sobre una versión persistida y Django Admin es de solo lectura.
- Guardar requiere `base_version_id`. Si otro profesional guardó primero, la API responde `409` con el identificador vigente. La interfaz conserva el borrador y permite cargar la última versión.
- Una nota sin cambios de dentición o piezas no crea una revisión.
- Paciente, consulta, autor, fecha y número de versión se determinan en backend.
- La migración `0006_odontogramversion` crea versiones iniciales vacías para las consultas existentes, enlazadas en orden por paciente.

## Estructura clínica

Cada pieza utiliza una estructura estable como esta:

```json
{
  "14": {
    "reviewed": true,
    "note": "Sensibilidad referida",
    "current": {
      "whole": ["CROWN"],
      "surfaces": {"MESIAL": ["CARIES"]}
    },
    "planned": {
      "whole": [],
      "surfaces": {"MESIAL": ["RESTORATION"]}
    }
  }
}
```

La respuesta de versión acompaña el mapa `teeth` con `schema_version`, `dentition`, metadatos de consulta, autor y trazabilidad.

## Interfaces públicas

| Método | Endpoint | Capacidad | Resultado |
|---|---|---|---|
| `GET` | `/api/patients/{patientId}/consultations/{consultationId}/odontogram/` | `consultations.view` | Última revisión de esa consulta. |
| `POST` | `/api/patients/{patientId}/consultations/{consultationId}/odontogram/versions/` | `consultations.edit` | Crea una revisión inmutable a partir de `base_version_id`. |
| `GET` | `/api/patients/{patientId}/odontogram-versions/` | `consultations.view` | Resumen del histórico, sin snapshots pesados. |
| `GET` | `/api/patients/{patientId}/odontogram-versions/{versionId}/` | `consultations.view` | Snapshot completo de una versión del paciente. |

`PATCH` y `DELETE` no están disponibles y responden `405 Method Not Allowed` para usuarios autorizados.

## Evidencia automatizada

- Creación automática, sugerencia por edad, copia exacta, numeración por paciente y migración de consultas existentes.
- Validación de dentición, FDI, arcada, superficies, capas y catálogos con registros parciales permitidos.
- Inmutabilidad, autoría, diferencias, nota, alcance por paciente/consulta, permisos y conflicto `409`.
- Navegación contextual, bloqueo previo al alta, edición por teclado, capas, nube/X, descarte, error concurrente y modo lectura.
- Histórico, selectores A/B, resumen textual y comparación responsiva con piezas modificadas destacadas.

## Fuera de alcance

- Periodontograma, sondaje, movilidad, recesión y sangrado.
- Radiografías o fotografías, que pertenecen a **Documentos**.
- Fusión de versiones, edición retroactiva, eliminación y resolución automática de concurrencia.
