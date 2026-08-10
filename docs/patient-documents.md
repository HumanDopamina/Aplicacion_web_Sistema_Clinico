# Documentos clínicos del paciente

La pestaña **Documentos** administra adjuntos privados vinculados exclusivamente al paciente. No reutiliza `radiographic_exams` ni `clinical_photographs`, y no relaciona archivos con consultas.

## Permisos y reglas

- `documents.view`: lista, previsualización y descarga.
- `documents.create`: carga de nuevos documentos.
- `documents.delete`: borrado físico definitivo.
- Administración tiene acceso implícito completo. Los presets iniciales de Recepción y Odontología incluyen vista y creación, pero no borrado.
- Los pacientes inactivos mantienen lectura y descarga; carga y borrado quedan bloqueados tanto en la interfaz como en la API.
- La comprobación del paciente forma parte de cada consulta y evita acceder a un documento usando el identificador de otro expediente.

## Archivos y almacenamiento

El contenido se guarda bajo `PRIVATE_MEDIA_ROOT`, que no se publica mediante las rutas de medios de Django. El nombre físico es un UUID dentro de `patients/<id>/documents/`; el nombre original sólo se conserva como metadato y se sanea antes de usarlo en `Content-Disposition`.

Formatos admitidos: PDF, JPG/JPEG, PNG y WebP. La validación contrasta extensión, MIME declarado y contenido real. Los límites son 10 MB por archivo, 10 archivos y 50 MB por lote. El lote completo se valida antes de crear registros; si la persistencia falla, los archivos ya escritos se limpian.

En producción, `PRIVATE_MEDIA_ROOT` debe apuntar a almacenamiento persistente y mantenerse fuera del servidor web público. Esta versión no incorpora antivirus, OCR, DICOM, versionado ni recuperación de archivos eliminados.

## API

| Método | Ruta | Capacidad | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/patients/<patient_id>/documents/?category=&search=` | `documents.view` | Lista documentos por fecha descendente. |
| `POST` | `/api/patients/<patient_id>/documents/` | `documents.create` | Carga multipart con `files`, `category`, `document_date` y `notes`. |
| `GET` | `/api/patients/<patient_id>/documents/<id>/content/` | `documents.view` | Entrega contenido autenticado para vista previa. |
| `GET` | `/api/patients/<patient_id>/documents/<id>/content/?download=true` | `documents.view` | Descarga usando el nombre original. |
| `DELETE` | `/api/patients/<patient_id>/documents/<id>/` | `documents.delete` | Borra registro y archivo físico. |
| `GET` | `/api/patients/document-categories/` | `documents.view` | Sugiere categorías globales normalizadas. |

Las respuestas de metadatos incluyen una URL relativa autenticada, nunca una ruta de almacenamiento. El contenido responde con `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff` y `Content-Disposition` apropiado.

## Interfaz

La ruta `/pacientes/:patientId/documentos` se carga de forma diferida. Presenta tabla en escritorio, tarjetas compactas en móvil, estados de carga/error/vacío y filtros remotos. La carga y el detalle se muestran en modales centrados —pantalla completa en móvil— con Escape, retorno de foco y foco visible.

Las imágenes usan una URL de objeto temporal y los PDF un visor embebido generado desde un blob autenticado. Las URLs se revocan al cerrar. Si la API rechaza una carga, los archivos y metadatos permanecen en el formulario para corregir el problema.

## Verificación

```powershell
cd src/backend
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run

cd ..\frontend
npm test
npm run lint
npm run build
```
