# HU-10 — Registro de pacientes y apertura de expediente

**Jira:** SCRUM-18

**Historia:** Como recepcionista, quiero registrar nuevos pacientes, para crear su expediente clínico.

**Estado:** Implementada y validada el 8 de agosto de 2026.

## Criterio de aceptación

> Dado que completo los datos personales del paciente, cuando guardo, entonces se almacenan correctamente y se abre su expediente automáticamente.

## Alcance implementado

- La recepcionista con el permiso `patients.create` puede abrir **Nuevo paciente** desde `/pacientes`.
- **Nuevo paciente** en el dashboard abre el mismo formulario reutilizable y también navega al expediente después del alta.
- El formulario registra nombres, apellidos, lugar y fecha de nacimiento, género, cédula, contacto, dirección y contacto de emergencia.
- Son obligatorios: nombres, primer apellido, lugar de nacimiento, cédula, género y fecha de nacimiento.
- La API rechaza fechas futuras y cédulas duplicadas sin distinguir mayúsculas/minúsculas.
- El sistema genera el código inmutable `PAC-00001` a partir del identificador interno.
- Después de guardar, la interfaz navega a `/pacientes/{id}` y muestra el expediente inicial.
- El expediente conserva datos personales y contacto de emergencia. Resumen clínico, antecedentes, consultas, odontograma y documentos muestran estados vacíos hasta sus historias correspondientes.
- Los botones **Editar** de información personal y contacto de emergencia abren el formulario precargado y refrescan el expediente con la respuesta guardada.

## Modelo y seguridad

- `Patient` constituye la identidad base del expediente; el usuario que lo registró queda preservado mediante `registered_by` con eliminación protegida.
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
| `POST` | `/api/patients/` | `patients.create` | Registra un paciente y devuelve su expediente base. |
| `GET` | `/api/patients/{id}/` | `patients.view` | Devuelve el expediente base. |
| `PATCH` | `/api/patients/{id}/` | `patients.edit` | Actualiza los campos editables del expediente base. |

## Evidencia automatizada

- Backend `[HU-10]`: creación por recepcionista, apertura del detalle, código automático, persistencia, búsqueda, permisos editables, acceso administrativo, fecha futura, duplicidad de cédula y campos internos de solo lectura.
- Frontend `[HU-10]`: listado vacío → formulario → `POST` → navegación automática → nombre y código visibles en el expediente.
- Dashboard: la acción rápida abre el diálogo real de registro y queda protegida por `patients.create`.
- Servicio frontend: listado/búsqueda, creación y detalle con autenticación Bearer.
- Edición: permiso configurable, rechazo `403`, campos técnicos inmutables, formulario precargado, `PATCH` y actualización visible.

## Decisiones de alcance

- HU-10 crea el expediente base, no datos clínicos ficticios.
- Registrar consultas, antecedentes, signos vitales, odontograma y documentos requiere historias posteriores.
- La separación por clínica deberá incorporarse cuando exista la relación operativa entre usuarios, clínicas y pacientes.
