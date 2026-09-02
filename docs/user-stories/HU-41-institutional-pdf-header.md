# HU-41 — Identidad institucional dinámica en el PDF

Estado: Implementada y verificada.

## Alcance implementado

- Cada exportación consulta el `ClinicProfile` vigente y compone el encabezado con nombre, lema y datos de contacto disponibles.
- El logotipo se lee mediante el almacenamiento configurado, se valida con Pillow y se entrega a ReportLab en memoria; no se exponen rutas del sistema de archivos.
- Un logotipo ausente, eliminado o corrupto activa un fallback textual y no bloquea la exportación.
- Los cambios posteriores al perfil institucional aparecen en nuevas exportaciones sin alterar bytes ya generados ni guardar snapshots.
- El encabezado, la identificación del paciente, la fecha de generación y el pie numerado se repiten en todas las páginas.

## Interfaces afectadas

- Encabezado y pie del PDF producido por `GET /api/patients/{patient_id}/clinical-record/export/`.
- Campos existentes de `ClinicProfile`; no se amplió su contrato ni su esquema.

## Persistencia

- No se agregaron modelos, campos ni migraciones.
- La ausencia de un `ClinicProfile` persistido usa valores institucionales de fallback sin crear una fila.

## Evidencia de aceptación

- Pruebas con perfil y logotipo A, actualización al perfil y logotipo B y conservación de la primera exportación en memoria.
- Pruebas de fallback con logotipo ausente, archivo faltante y contenido corrupto.
- Inspección de un PDF A4 multipágina para verificar repetición del encabezado, márgenes, identificación, fecha y paginación.
- Verificación de que no se filtran rutas ni nombres internos del archivo de logotipo.

## Comandos de verificación

- `.venv\Scripts\python.exe manage.py test apps.patients.test_clinical_record_export --settings=config.settings.test`
- `.venv\Scripts\python.exe manage.py check`
- `.venv\Scripts\python.exe manage.py migrate --check`
- `.venv\Scripts\python.exe manage.py makemigrations --check --dry-run`
- `git diff --check`
