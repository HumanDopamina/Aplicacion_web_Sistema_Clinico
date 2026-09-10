# HU-28 Clinical Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar y mostrar alertas clínicas longitudinales del paciente en su expediente y en la consulta, sin duplicarlas ni exponerlas en contratos minimizados.

**Architecture:** `ClinicalRecord` conservará cuatro campos de texto explícitos como fuente vigente. Una migración idempotente copiará únicamente la señal booleana histórica de alergia a un texto pendiente de completar; un componente React reutilizable mostrará esos campos desde el detalle ya protegido del paciente.

**Tech Stack:** Django 5.2, Django REST Framework, PostgreSQL, React 19, Vitest y Testing Library.

## Global Constraints

- Implementar exclusivamente HU-28.
- No implementar HU-44, TEC-06, TEC-07, HU-52, HU-53, relación cita-consulta, `EN_ATENCION`, cierre clínico, `TreatmentItem`, alta rápida, identificación flexible, tutores, cambios de agenda, nuevos permisos ni catálogos médicos.
- Mantener `PatientSummary`, `PatientOption` y `/api/patients/options/` sin datos clínicos.
- Mantener `hereditary_diseases` por compatibilidad, pero usar los nuevos campos como fuente vigente y no duplicar alergias en pantalla.
- Conservar todos los cambios preexistentes del usuario.

---

## File Map

- `src/backend/apps/patients/models.py`: cuatro campos longitudinales con límite técnico de 2000 caracteres.
- `src/backend/apps/patients/migrations/0009_clinical_record_alerts.py`: esquema y backfill booleano exacto.
- `src/backend/apps/patients/test_migrations.py`: conservación histórica y ausencia de falsos positivos.
- `src/backend/apps/patients/tests.py`: creación, edición, vacío, detalle y minimización.
- `src/frontend/src/components/ClinicalAlertsBanner.jsx`: presentación reutilizable de estados con/sin/pending.
- `src/frontend/src/components/ClinicalAlertsBanner.test.jsx`: pruebas unitarias del banner.
- `src/frontend/src/pages/Patients/patientRecordSchema.js`: campos editables del expediente.
- `src/frontend/src/pages/Patients/PatientRecordPage.jsx`: banner visible, editor y eliminación de la duplicidad legado.
- `src/frontend/src/pages/Patients/ConsultationRecordPage.jsx`: banner de sólo lectura desde `patient.clinical_record`.
- `src/frontend/src/App.test.jsx`: integración de expediente, consulta, guardado y permisos/agenda.
- `docs/user-stories/HU-28-clinical-alerts.md`: evidencia de aceptación.
- `README.md`: resumen de historia implementada.

### Task 1: Backend contract and validation

**Interfaces:** Produce `allergies`, `current_medications`, `relevant_conditions` y `other_clinical_alerts` como strings vacíos o de hasta 2000 caracteres dentro de `clinical_record` del detalle.

- [ ] Añadir pruebas de creación, PATCH, vacío, longitud máxima y contratos Summary/Option; ejecutarlas con `src/backend/.venv/Scripts/python.exe manage.py test apps.patients.tests.PatientApiTests apps.patients.tests.PatientOptionApiTests --settings=config.settings.test --noinput` y comprobar que fallan por ausencia de campos.
- [ ] Añadir los cuatro campos al modelo y ejecutar nuevamente las pruebas hasta dejarlas en verde.

### Task 2: Safe historical migration

**Interfaces:** `0009_clinical_record_alerts` escribe exactamente `Alergia registrada previamente; completar detalle` sólo cuando `hereditary_diseases` es un objeto cuyo `allergies` es el booleano `True`; conserva el JSON y los demás registros.

- [ ] Añadir una prueba de migración con señales `True`, `False`, string y JSON no relacionado; ejecutarla y comprobar el fallo por migración inexistente.
- [ ] Crear la migración con cuatro `AddField` y `RunPython` reversible mediante no-op; ejecutar la prueba hasta dejarla en verde.

### Task 3: Reusable clinical banner

**Interfaces:** `ClinicalAlertsBanner({ clinicalRecord })` muestra las cuatro categorías no vacías, el estado neutral cuando todas están vacías y el aviso pendiente para el texto histórico.

- [ ] Crear pruebas unitarias para alertas, vacío y pendiente; ejecutarlas con `npm test -- src/components/ClinicalAlertsBanner.test.jsx` y comprobar el fallo por componente inexistente.
- [ ] Implementar el componente con estructura semántica y visual de alta legibilidad; ejecutar las pruebas hasta dejarlas en verde.

### Task 4: Patient record and consultation integration

**Interfaces:** el expediente edita y persiste los cuatro campos; expediente y consulta renderizan `ClinicalAlertsBanner` desde el detalle del paciente; la agenda y los contratos minimizados no reciben alertas.

- [ ] Añadir alertas a la fixture e integrar pruebas de banner en expediente/consulta, guardado y no exposición en agenda; ejecutarlas y comprobar los fallos esperados.
- [ ] Incorporar los campos al esquema/formulario, ocultar `hereditary_diseases.allergies` de la presentación legado e insertar el banner en ambas páginas; ejecutar pruebas afectadas hasta dejarlas en verde.

### Task 5: PostgreSQL migration, documentation, and verification

**Interfaces:** evidencia reproducible de conteos/digest antes/después, migración aplicada sin reconstrucción y verificación completa.

- [ ] Registrar conteos de `Patient`, `ClinicalRecord`, señal histórica y digest de campos preexistentes en PostgreSQL de desarrollo.
- [ ] Aplicar `python manage.py migrate --settings=config.settings.development --noinput`; repetir conteos y digest, y confirmar que sólo los registros elegibles recibieron el texto pendiente.
- [ ] Crear `docs/user-stories/HU-28-clinical-alerts.md` y actualizar el resumen de README.
- [ ] Ejecutar tests backend patients, consultas afectadas y suite completa; tests frontend afectados y suite completa; lint, build, `check`, `migrate --check`, `makemigrations --check --dry-run` y `git diff --check`.
- [ ] Revisar `git diff` para confirmar el alcance exclusivo y que no se incluyeron modificaciones ajenas.
