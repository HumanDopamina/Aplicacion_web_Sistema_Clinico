# HU-28 — Alertas clínicas relevantes del paciente

**Estado:** Implementada y validada el 30 de agosto de 2026.

## Criterio de aceptación

> Dado que un usuario autorizado abre el expediente o una consulta, cuando el
> paciente tiene información clínica longitudinal relevante, entonces puede
> identificar alergias, medicamentos, condiciones y otras alertas de forma
> destacada sin duplicar esa información en la consulta.

## Diseño implementado

`ClinicalRecord` es la fuente vigente y conserva cuatro campos simples de texto
multilínea, opcionales y con límite técnico de 2000 caracteres:

- `allergies`;
- `current_medications`;
- `relevant_conditions`;
- `other_clinical_alerts`.

No se creó una entidad, catálogo médico, diagnóstico codificado ni snapshot en
`Consultation`. `hereditary_diseases` permanece por compatibilidad histórica,
pero su clave legado `allergies` ya no se presenta como alerta activa en la UI.

## Migración y conservación histórica

La migración `patients.0009_clinical_record_alerts` añade los campos con valores
vacíos y recorre los expedientes en lotes de 500. Sólo cuando
`hereditary_diseases.allergies` contiene el booleano JSON exacto `true`, escribe:

`Alergia registrada previamente; completar detalle`

Los valores `false`, ausentes o strings como `"true"` no producen alertas. La
migración no modifica el JSON legado ni `updated_at`; su prueba conserva además
otros antecedentes preexistentes.

## Contratos y permisos

- `PatientDetail` devuelve y permite editar los campos dentro de
  `clinical_record` mediante el flujo existente.
- `PatientSummary`, `PatientOption` y `/api/patients/options/` mantienen sus
  contratos mínimos exactos, sin alertas ni expediente.
- El detalle continúa protegido por `patients.view` y la edición por
  `patients.edit`; no se añadieron permisos.
- Un usuario con únicamente `appointments.view` no entra al expediente ni
  solicita el detalle del paciente. La agenda no recibe ni muestra alertas.

## Presentación clínica

`ClinicalAlertsBanner` distingue tres estados: alertas registradas, ausencia de
alertas e información histórica pendiente de completar. El expediente lo muestra
inmediatamente bajo la identidad del paciente y mantiene la edición en su
formulario existente. La consulta reutiliza el mismo componente leyendo
`patient.clinical_record`, sin copiar campos al modelo `Consultation`.

## Evidencia PostgreSQL de desarrollo

Antes y después de aplicar la migración:

- pacientes: 3 → 3;
- expedientes clínicos: 2 → 2;
- señales históricas booleanas de alergia: 0 → 0;
- notas pendientes migradas: 0;
- expedientes con alertas estructuradas: 0;
- SHA-256 de todos los campos clínicos preexistentes:
  `99fbf40d1e03fcd68daaf48b8704985b9b3d76377c0f01bf9cebbc827fa53dec`
  antes y después.

No se reconstruyó ni eliminó información. La ausencia de señales históricas en
estos datos implicó correctamente no crear alergias.

## Evidencia automatizada

- Backend: creación, PATCH, vacío permitido, límite técnico, detalle, contratos
  Summary/Option, permisos y migración con señales `true`, `false`, string y
  ausente.
- Frontend: cuatro categorías, estado vacío, estado pendiente, expediente,
  consulta, edición/guardado y bloqueo de acceso sin permiso clínico.

## Verificación

```powershell
cd src/backend
.venv/Scripts/python.exe manage.py test apps.patients --settings=config.settings.test --noinput
.venv/Scripts/python.exe manage.py test apps.patients.tests.ConsultationApiTests apps.patients.tests.RecentConsultationApiTests --settings=config.settings.test --noinput
.venv/Scripts/python.exe manage.py test --settings=config.settings.test --noinput
.venv/Scripts/python.exe manage.py check --settings=config.settings.test
.venv/Scripts/python.exe manage.py migrate --check --settings=config.settings.development
.venv/Scripts/python.exe manage.py makemigrations --check --dry-run --settings=config.settings.test

cd ../frontend
npm test -- src/components/ClinicalAlertsBanner.test.jsx src/App.test.jsx
npm test
npm run lint
npm run build
```

## Integración posterior validada

HU-44 reutiliza el mismo componente en el flujo agenda → iniciar atención →
consulta. La prueba integrada confirma que las alertas siguen visibles desde
`ClinicalRecord` y no se copian a `Consultation`.

Continúan fuera de alcance el cierre clínico de HU-46, `TreatmentItem`, alta
rápida, identificación flexible, tutores, catálogos médicos, HU-52 y HU-53.
