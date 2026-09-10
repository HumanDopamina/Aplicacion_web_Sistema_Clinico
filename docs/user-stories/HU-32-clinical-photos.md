# HU-32 — Fotografías clínicas en el repositorio documental

Estado: Implementada y verificada.

## Alcance implementado

- Las fotografías clínicas usan `PatientDocument`, el almacenamiento privado y los endpoints documentales existentes; no se creó una galería ni una entidad paralela.
- `Fotografía clínica` está disponible como categoría explícita para carga y filtro.
- El repositorio identifica estas imágenes como `FOTO` y conserva la vista previa autenticada mediante el endpoint privado de contenido.
- La categoría rechaza archivos que no sean imágenes, manteniendo las validaciones existentes de extensión, MIME, tamaño y contenido con Pillow.
- Los pacientes inactivos conservan acceso de lectura, pero no admiten cargas ni edición.

## Interfaces afectadas

- `GET/POST /api/patients/{patient_id}/documents/`
- `PATCH /api/patients/{patient_id}/documents/{document_id}/`
- Repositorio documental del expediente del paciente.

## Evidencia de aceptación

- Pruebas backend de carga, clasificación, archivos corruptos, límites, permisos, privacidad y vista previa.
- Pruebas frontend de etiqueta, filtro por categoría y vista previa autenticada.
- Suite completa, lint, build y comprobaciones de Django ejecutadas al cerrar el bloque.

## Comandos de verificación

- `.venv\Scripts\python.exe manage.py test --settings=config.settings.test`
- `npm test -- --reporter=dot`
- `npm run lint`
- `npm run build`
- `.venv\Scripts\python.exe manage.py check`
- `.venv\Scripts\python.exe manage.py migrate --check`
- `.venv\Scripts\python.exe manage.py makemigrations --check --dry-run`
- `git diff --check`
