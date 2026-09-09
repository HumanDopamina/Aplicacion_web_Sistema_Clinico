# Gestión de documentos clínicos del paciente

**Estado:** Implementada y validada el 9 de agosto de 2026.

## Alcance aceptado

- La pestaña **Documentos** está habilitada en expedientes persistidos y protegida por `documents.view`.
- La carga multipart acepta lotes atómicos de PDF e imágenes con categoría, fecha y notas compartidas.
- Extensión, MIME, firma/contenido y límites de tamaño se validan antes de persistir.
- Los archivos se almacenan privadamente con UUID y sólo se entregan mediante un endpoint autenticado y acotado al paciente.
- Búsqueda, filtros y sugerencias de categoría funcionan sin duplicados por diferencias de espacios o mayúsculas.
- Imagen y PDF se previsualizan desde blobs autenticados; también pueden descargarse con su nombre original.
- `documents.delete` habilita el retiro lógico con motivo obligatorio. Se conserva el archivo; Administración puede listar retirados y restaurarlos desde la interfaz.
- Los expedientes inactivos conservan consulta y descarga en modo de sólo lectura.
- La interfaz incluye tabla de escritorio, tarjetas móviles, estados vacío/error/carga y modales centrados accesibles.

## Evidencia automatizada

- Backend: permisos por rol, aislamiento entre pacientes, atomicidad, validación de contenido/tamaño/lote, categorías, cabeceras seguras, inactividad y borrado físico.
- Frontend: ruta y pestaña, filtros, multipart, renovación JWT binaria, persistencia ante errores, vista previa y acciones por permiso/estado.

## Interfaces

- `/pacientes/:patientId/documentos`
- `GET|POST /api/patients/<patient_id>/documents/`
- `DELETE /api/patients/<patient_id>/documents/<id>/`
- `GET /api/patients/<patient_id>/documents/<id>/content/`
- `GET /api/patients/document-categories/`

Evidencia visual: [lista de escritorio](assets/patient-documents-desktop.png), [preview autenticado](assets/patient-documents-preview.png) y [tarjetas móviles](assets/patient-documents-mobile.png).

## Revisión de seguridad — septiembre de 2026

Se valida la estructura de PDF, se recodifican imágenes, se limpian cargas al revertir y se evita la filtración de metadatos en exportaciones sin permiso. Regresión: `python manage.py test apps.patients.test_documents apps.patients.test_production_safety apps.common.test_file_safety --settings=config.settings.test`. Frontend: `npm test -- src/pages/Patients/PatientDocumentsPage.test.jsx`.

El alcance y los pendientes de producción están en [el informe de correcciones](../production-readiness-improvements.md).
