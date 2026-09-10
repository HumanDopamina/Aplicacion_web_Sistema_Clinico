# HU-54 — Búsqueda remota de pacientes desde la agenda

**Estado:** Implementada y validada el 30 de agosto de 2026.

## Criterio de aceptación

> Dado que se programa o reprograma una cita, cuando se escriben al menos dos
> caracteres para identificar al paciente, entonces la agenda consulta opciones
> activas y mínimas sin descargar expedientes completos.

## Contratos de paciente

- `PatientSummary` se usa en `GET /api/patients/` y contiene únicamente ID,
  código, nombres, nombre completo, teléfono, correo, fecha de nacimiento,
  estado activo y fecha de registro.
- `PatientDetail` mantiene el contrato administrativo y clínico completo para
  creación, edición y `GET /api/patients/<id>/`.
- `PatientOption` contiene únicamente ID, código, nombre completo, teléfono y
  fecha de nacimiento.

## Búsqueda de opciones

- Endpoint: `GET /api/patients/options/?search=<texto>`.
- Menos de dos caracteres devuelve `[]`.
- Busca por nombre, código, teléfono e identificación existente, pero nunca
  devuelve la identificación.
- Devuelve sólo pacientes activos, ordenados y limitados a 20 resultados.
- Requiere `appointments.create`; este permiso no concede acceso al listado o
  al detalle clínico protegido por `patients.view`.

## Agenda

- La carga del calendario dejó de invocar `listAllPatients()` y ya no recorre
  todas las páginas de pacientes.
- El formulario aplica un debounce de 300 ms y cancela la solicitud anterior
  mediante `AbortController` cuando cambia la búsqueda o se cierra el modal.
- La selección se conserva aunque la siguiente búsqueda no la incluya.
- Se muestran estados explícitos de instrucción, carga, resultados vacíos y
  error. HU-52 extiende el estado vacío con alta rápida cuando el usuario tiene
  `patients.create`, sin alterar la búsqueda remota.

## Evidencia

- Las pruebas backend verifican contratos exactos, ausencia de expediente y
  cédula en Summary/Option, búsqueda, activos, límite, permisos y ausencia de
  N+1 sobre `ClinicalRecord`.
- Las pruebas frontend verifican que la agenda no carga todos los pacientes,
  el mínimo de caracteres, debounce, cancelación, loading, vacío, error,
  selección persistente y envío numérico de `patient`.

## Verificación

```powershell
cd src/backend
python manage.py test apps.patients --settings=config.settings.test --noinput
python manage.py test apps.appointments --settings=config.settings.test --noinput
python manage.py test --settings=config.settings.test --noinput
python manage.py check --settings=config.settings.test
python manage.py makemigrations --check --dry-run --settings=config.settings.test

cd ../frontend
npm test
npm run lint
npm run build
```

## Fuera de alcance

- Identificación flexible, tutor o alertas clínicas dentro del selector remoto.
- Inicio de atención, cita-consulta, `TreatmentItem` o cambios de odontograma.
- HU-28, HU-44, TEC-06 y TEC-07.
