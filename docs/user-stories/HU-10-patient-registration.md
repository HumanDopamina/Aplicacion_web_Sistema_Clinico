# HU-10 — Registro de pacientes y apertura de expediente

**Jira:** SCRUM-18

**Historia:** Como recepcionista, quiero registrar nuevos pacientes, para crear su expediente clínico.

**Estado:** Implementada y validada el 8 de agosto de 2026.

## Criterio de aceptación

> Dado que completo los datos personales del paciente, cuando guardo, entonces se almacenan correctamente y se abre su expediente automáticamente.

## Alcance implementado

- La recepcionista con el permiso `patients.create` puede abrir **Nuevo paciente** desde `/pacientes` o el dashboard; ambas acciones navegan a `/pacientes/nuevo`.
- Alta, visualización y edición usan una sola vista principal inspirada en Odoo: conservan el encabezado, las tarjetas, la distribución y las tabs **Resumen clínico**, **Consultas**, **Odontograma** y **Documentos**.
- `/pacientes/nuevo` activa `isNew=true`; `/pacientes/{id}` carga el mismo componente con un borrador basado en la última versión persistida.
- El dashboard consulta el mismo listado persistido que `/pacientes`, actualiza el total y muestra hasta los cuatro registros más recientes con acceso directo a su expediente.
- El formulario reúne en doce secciones los datos personales, consulta inicial, motivo, enfermedad actual, interrogatorio por sistemas, antecedentes familiares, enfermedades infectocontagiosas y hereditarias, examen físico, observaciones, diagnóstico, plan, presupuesto y tratamiento.
- **Resumen clínico** no muestra ni edita una tarjeta de archivos clínicos. Radiografías, fotografías y demás adjuntos se gestionarán exclusivamente desde la pestaña **Documentos**.
- Son obligatorios: nombres, primer apellido, lugar de nacimiento, cédula, género y fecha de nacimiento.
- La fecha y la hora de la consulta inicial son opcionales; si quedan vacías, el frontend las envía como `null`, de acuerdo con el contrato del expediente clínico.
- La API rechaza fechas futuras y cédulas duplicadas sin distinguir mayúsculas/minúsculas.
- El sistema genera el código inmutable `PAC-00001` a partir del identificador interno.
- Después de guardar, la interfaz navega a `/pacientes/{id}` y muestra el expediente inicial.
- El expediente de lectura conserva el diseño de tarjetas existente y presenta todos los valores persistidos; los opcionales vacíos se identifican como **Sin información registrada**.
- No existe un interruptor global de edición. Con `patients.edit`, los valores son controles en línea con apariencia de texto; el borde se revela al pasar el cursor o enfocar el campo.
- La nube **Guardar cambios** y la X **Descartar cambios** aparecen solo cuando el borrador cambia. Guardar actualiza la línea base; descartar restaura el expediente existente o abandona un alta nueva.
- Si se intenta navegar, recargar o cerrar con cambios pendientes, el sistema advierte antes de perderlos. Un error de API conserva el borrador para reintentar.
- Los errores de validación, incluso cuando pertenecen al objeto anidado `clinical_record`, muestran el mensaje específico de la API en lugar de ocultarlo tras un aviso genérico.

## Modelo y seguridad

- `Patient` conserva identidad, contacto y datos demográficos permanentes; `ClinicalRecord` mantiene una relación uno-a-uno con la consulta clínica inicial.
- La creación anidada de ambos modelos se ejecuta dentro de una transacción para evitar expedientes parciales.
- `code`, `registered_by`, `created_at` y `updated_at` son campos de solo lectura en la API.
- `GET /api/patients/` y `GET /api/patients/{id}/` requieren `patients.view`.
- `POST /api/patients/` requiere `patients.create`.
- `PATCH /api/patients/{id}/` requiere `patients.edit`; ocultar **Editar** sin permiso es solamente una protección adicional de interfaz.
- El administrador mantiene acceso implícito; los demás roles heredan los presets configurados en HU-09.
- La autorización se valida en backend, independientemente de que la interfaz oculte el botón de creación.

## Interfaces públicas

| Método | Endpoint | Capacidad | Resultado |
|---|---|---|---|
| `GET` | `/api/patients/` | `patients.view` | Lista y búsqueda con `?search=`. |
| `POST` | `/api/patients/` | `patients.create` | Registra `Patient` y su objeto anidado `clinical_record`. |
| `GET` | `/api/patients/{id}/` | `patients.view` | Devuelve la identidad y el expediente clínico completo. |
| `PATCH` | `/api/patients/{id}/` | `patients.edit` | Actualiza datos permanentes y el objeto `clinical_record`. |

## Evidencia automatizada

- Backend `[HU-10]`: creación transaccional del paciente y expediente completo, apertura del detalle, código automático, persistencia, búsqueda, permisos editables, acceso administrativo, fecha futura, duplicidad de cédula y campos internos de solo lectura.
- Frontend `[HU-10]`: una sola vista cubre `isNew`, edición inmediata por permiso, detección de cambios, `POST`, `PATCH`, descarte, errores y protección de navegación conservando estructura y tabs. La creación prueba además la normalización a `null` de fecha/hora opcionales vacías.
- Cliente API: una prueba de regresión comprueba que los errores anidados del expediente se presentan de forma legible.
- Dashboard: la acción rápida abre `/pacientes/nuevo` y queda protegida por `patients.create`; el total y los pacientes recientes se cargan desde `GET /api/patients/`.
- Servicio frontend: listado/búsqueda, creación y detalle con autenticación Bearer.
- Edición: permiso configurable, rechazo `403`, campos técnicos inmutables, formulario precargado, `PATCH` y actualización visible.

## Decisiones de alcance

- La edad se deriva de la fecha de nacimiento y no se almacena como dato duplicado.
- Las enfermedades se guardan como selecciones estructuradas. Los campos heredados de referencias radiográficas y fotográficas se conservan temporalmente en el backend para no perder datos existentes, pero quedan fuera del formulario hasta su migración al módulo documental.
- Los apartados excluidos expresamente por la fuente no forman parte del modelo.
- Consultas posteriores, odontograma y carga binaria de documentos requieren historias posteriores.
- La separación por clínica deberá incorporarse cuando exista la relación operativa entre usuarios, clínicas y pacientes.
