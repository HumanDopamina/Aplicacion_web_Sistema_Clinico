# Plan técnico — Odontogramas versionados por consulta

**Fecha:** 9 de agosto de 2026

**Rama:** `odontograma`

**Entrega:** `feat: add versioned consultation odontograms`

## Objetivo

Incorporar un odontograma clínico por consulta, mantener una secuencia histórica inmutable por paciente y permitir comparar revisiones sin acoplar el módulo al periodontograma ni a documentos clínicos.

## Backend

1. Crear `OdontogramVersion` con relación protegida a paciente, consulta, autor y versión anterior.
2. Crear la versión inicial de forma transaccional junto a `Consultation`, heredando el último snapshot del paciente o sugiriendo dentición por edad.
3. Validar snapshots FDI y normalizar piezas, superficies, capas y catálogos antes de persistir.
4. Crear revisiones con bloqueo del paciente, número global correlativo y cálculo de piezas modificadas.
5. Comparar `base_version_id` con la revisión vigente de la consulta y devolver `409` ante una base obsoleta.
6. Exponer lectura de la revisión actual, creación de revisiones, histórico liviano y detalle completo.
7. Aplicar `consultations.view/edit`, mantener acceso administrativo implícito y rechazar actualización/eliminación.
8. Migrar consultas existentes con una versión inicial enlazada y vacía.

## Frontend

1. Habilitar la pestaña del paciente y añadir navegación contextual dentro de una consulta guardada.
2. Construir un SVG segmentado con cinco superficies operables por mouse y teclado.
3. Separar **Estado actual** y **Plan de tratamiento**, con leyenda redundante por color, contorno y patrón.
4. Mantener `baselineChart`, borrador e indicador `isDirty`; guardar explícitamente con nube y descartar con X.
5. Conservar el borrador ante errores y ofrecer recarga explícita en conflictos `409`.
6. Renderizar el editor como solo lectura sin `consultations.edit`.
7. Mostrar histórico, metadatos, selección A/B, comparación sincronizada y resumen textual de diferencias.
8. Mantener arcadas desplazables y panel inferior en móvil.

## Verificación

- Backend: suite Django completa y `makemigrations --check --dry-run`.
- Frontend: Vitest, Oxlint y build de Vite.
- Navegador: escritorio y móvil, consola, overflow, interacción por superficie, dentición mixta y comparación histórica.
- Documentación: README y `docs/user-stories/odontogramas-por-consulta.md`.

## Decisiones

- El snapshot usa `schema_version=1` y códigos clínicos estables en inglés; las etiquetas visibles permanecen en español.
- No se exige odontograma completo y una pieza no presente continúa significando **No evaluada**.
- Las capas actual y planificada se versionan juntas.
- No se agrega una dependencia gráfica: los dientes y acciones se implementan con SVG local.
