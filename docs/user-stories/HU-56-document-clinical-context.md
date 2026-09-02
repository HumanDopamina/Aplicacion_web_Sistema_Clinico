# HU-56 — Contexto clínico opcional de documentos

Estado: Implementada y verificada.

## Alcance implementado

- `PatientDocument.patient` continúa siendo obligatorio.
- Se agregaron `consultation` y `tooth_code` opcionales; los documentos históricos conservan ambos valores en `NULL` sin inferencias ni backfill.
- La consulta debe pertenecer al mismo paciente y está protegida frente a eliminación con `PROTECT`.
- La pieza dental se valida contra los códigos FDI permanentes y temporales ya definidos por el dominio.
- La API expone solamente `{id, date}` de la consulta y oculta todo el contexto a usuarios sin `consultations.view`.
- El repositorio permite filtrar por consulta, cargar el contexto y editarlo sobre el documento existente. Los pacientes inactivos permanecen en solo lectura.

## Interfaces afectadas

- `GET/POST /api/patients/{patient_id}/documents/`
- `PATCH /api/patients/{patient_id}/documents/{document_id}/`
- `GET /api/patients/{patient_id}/consultations/?compact=true&page_size=100`
- Repositorio y diálogo de detalle documental.

## Migración

- `patients.0016_patientdocument_consultation_and_tooth_code` es exclusivamente de esquema: campos anulables e índice `(patient, consultation)`, sin valores por defecto ni migración de datos.

## Evidencia de aceptación

- Pruebas de las cuatro combinaciones de contexto, consulta de otro paciente, FDI inválido, filtro, PATCH, privacidad, auditoría segura y `PROTECT`.
- Prueba de migración que preserva cuatro documentos históricos y deja el contexto en `NULL`.
- Pruebas frontend del selector mínimo, carga, filtro, presentación compacta y edición.
- Suite completa, lint, build y comprobaciones de Django ejecutadas al cerrar el bloque.

## Comandos de verificación

- `.venv\Scripts\python.exe manage.py test apps.patients.test_migrations.PatientDocumentContextMigrationTests --settings=config.settings.test`
- `.venv\Scripts\python.exe manage.py test --settings=config.settings.test`
- `npm test -- --reporter=dot`
- `npm run lint`
- `npm run build`
- `.venv\Scripts\python.exe manage.py check`
- `.venv\Scripts\python.exe manage.py migrate --check`
- `.venv\Scripts\python.exe manage.py makemigrations --check --dry-run`
- `git diff --check`
