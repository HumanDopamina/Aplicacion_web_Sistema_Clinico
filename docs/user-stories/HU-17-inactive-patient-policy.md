# HU-17 — Inactivación uniforme de Patient

**Estado:** Implementada y validada el 1 de septiembre de 2026.

## Semántica final

Un paciente inactivo conserva su expediente y toda lectura histórica permitida,
pero no puede iniciar nuevas operaciones clínicas o administrativas bloqueadas.
El estado `Paciente inactivo` se presenta separado de `Perfil incompleto`.

El guardia de dominio reutilizable devuelve `409` con código estable
`patient_inactive` antes de mutar datos en estos flujos:

- inicio de atención desde una cita;
- creación manual de una consulta;
- creación de una nueva propuesta `TreatmentItem`.

La creación forzada de una cita para un paciente inactivo continúa rechazada
por validación de campo (`400`), y `PatientOption` continúa excluyéndolo. La
búsqueda de duplicados HU-13 sí lo conserva como coincidencia, lo identifica
como inactivo y no lo reactiva ni selecciona automáticamente.

## Historia, permisos y frontend

- Expediente, consultas, odontogramas, tratamientos, documentos y citas
  históricas mantienen sus permisos de lectura existentes.
- Los documentos existentes siguen visibles y descargables; una carga nueva
  permanece bloqueada para el paciente inactivo.
- Inactivar o reactivar usa la edición existente y exige `patients.edit`.
- La agenda recibe `patient_is_active` como dato administrativo de la cita y
  oculta `Iniciar atención` sin cargar el expediente.
- El expediente ofrece un control administrativo simple; consultas y planes
  conservan navegación e historia, pero ocultan las acciones de creación y de
  seguimiento prohibidas.

No se ampliaron permisos de recepción a información clínica.

## Evidencia

Las pruebas automatizadas cubren cambio de estado y autorización, opción y cita
forzada, atención sin mutaciones, consulta manual, propuesta de tratamiento,
lectura longitudinal, documentos, duplicados, diferencia frente a perfil
incompleto y continuidad del paciente activo. La prueba PostgreSQL se ejecutó
dentro de una transacción revertida: orden válido `200`, orden inválido `400`,
cita forzada `400`, las tres operaciones clínicas `409 patient_inactive` e
historial de tratamientos `200`.

Conteos antes y después del rollback:

- Patient: 3
- ClinicalRecord: 2
- Consultation: 2
- Appointment: 5
- OdontogramVersion: 5

## Verificación

```powershell
cd src/backend
.venv\Scripts\python manage.py test apps.patients.test_hu16_hu17 apps.patients.test_hu13_duplicates apps.patients.test_hu52_quick_create apps.patients.test_documents apps.patients.test_treatment_items apps.appointments.tests --settings=config.settings.test --noinput
.venv\Scripts\python manage.py test --settings=config.settings.test --noinput
.venv\Scripts\python manage.py check
.venv\Scripts\python manage.py migrate --check
.venv\Scripts\python manage.py makemigrations --check --dry-run

cd ../frontend
npm test -- --reporter=dot
npm run lint
npm run build
```

## Modelos y fuera de alcance

Se añadieron cero modelos, cero campos y cero migraciones. No se implementaron
fusión, borrado físico, gestión avanzada del ciclo de vida ni una arquitectura
nueva de permisos.
