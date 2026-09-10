# HU-46 and HU-45 Clinical Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar una consulta `EN_PROGRESO` mediante una acción clínica explícita, transaccional e idempotente, sincronizando atómicamente la cita enlazada y haciendo inmutable el registro completado.

**Architecture:** Un servicio de dominio en `patients` bloqueará en orden consistente la cita enlazada y la consulta, validará el contrato clínico ya existente y persistirá el cierre en una única transacción. Las rutas anidadas de paciente expondrán acciones `complete` y `cancel`; React consumirá `complete` desde la ficha clínica y volverá el formulario de solo lectura usando la respuesta del backend. No habrá signals ni transición genérica de estado.

**Tech Stack:** Django 5.2, Django REST Framework, PostgreSQL 18, React 19, React Router, Vitest y Testing Library.

## Inspected Current Contract

- `Consultation` contiene identificación del paciente/profesional, fecha/hora/tipo/resumen/estado, identificadores administrativos clínicos, motivo e historia actual, interrogatorio por sistemas, signos vitales y antropometría, examen físico, análisis, diagnósticos odontológicos, plan, presupuesto y tratamiento realizado.
- El contrato actual exige únicamente `date`, `time`, `consultation_type`, `summary` no vacío y `status`; los campos odontológicos y médicos restantes son opcionales. No existe documentación, validador ni prueba que defina un mínimo clínico adicional para cerrar.
- La edición ordinaria actual es `PATCH /api/patients/{patientId}/consultations/{consultationId}/` con `consultations.edit`; el estado es escribible y una consulta completada todavía puede editarse.
- Una consulta procedente de agenda se identifica exclusivamente por la relación inversa OneToOne `Consultation.appointment`; una consulta manual/urgente no tiene esa relación. No se inferirán vínculos por fecha, paciente ni profesional.
- No existen `completed_at`, `completed_by` ni equivalentes. Los históricos `COMPLETADA` se conservarán con ambos valores NULL, sin backfill heurístico.
- `Appointment.start_attendance` ya es transaccional e idempotente, crea `Consultation EN_PROGRESO`, enlaza la OneToOne y mueve la cita a `EN_ATENCION`; los serializers genéricos protegen los estados clínicos de Appointment.
- El frontend permite editar cualquier consulta con `consultations.edit`, incluso `COMPLETADA`; HU-28 se renderiza desde `Patient.clinical_record` y debe permanecer sin duplicación.
- Auditoría ya clasifica CRUD de Consultation y `APPOINTMENT_START_ATTENDANCE`, pero aún no las acciones de cierre/cancelación.

## Global Constraints

- Implementar únicamente HU-46 y el cierre pendiente de HU-45; completar TEC-06 sólo si la cancelación segura queda como servicio explícito.
- Aplicar como mínimo de cierre únicamente los requisitos ya obligatorios: fecha, hora, tipo y resumen no vacío. La suficiencia odontológica sustantiva queda pendiente de validación con odontología.
- No implementar `TreatmentItem`, HU-47 o posteriores, adendas, reapertura, correcciones, seguimiento, signals ni cambios no relacionados del odontograma.
- Una consulta completada queda inmutable provisionalmente; TEC-13 permanece pendiente.
- Cancelar de forma segura sólo consultas manuales `EN_PROGRESO`; rechazar con 409 una consulta vinculada sin alterar la cita ni borrar el vínculo, porque no existe el estado anterior requerido para una reversión fiable.
- Preservar todos los cambios preexistentes del árbol de trabajo y no modificar el Product Backlog.

---

## File Map

- `src/backend/apps/patients/models.py`: metadatos nullable de cierre.
- `src/backend/apps/patients/migrations/0010_consultation_completion.py`: expansión nullable sin backfill.
- `src/backend/apps/patients/services.py`: `complete_consultation`, `cancel_consultation`, errores estables y orden de locks.
- `src/backend/apps/patients/serializers.py`: metadatos read-only y protección de estados/registros cerrados.
- `src/backend/apps/patients/views.py`, `urls.py`: acciones explícitas anidadas y contratos 200/409.
- `src/backend/apps/patients/tests.py`: servicios, API, permisos, estados, rollback, inmutabilidad y consultas manuales.
- `src/backend/apps/patients/test_migrations.py`: preservación de históricos y campos NULL.
- `src/backend/apps/patients/test_postgres.py`: idempotencia concurrente real y estados consistentes.
- `src/backend/apps/audit/middleware.py`, `tests.py`: `CONSULTATION_COMPLETE`/`CONSULTATION_CANCEL` e identificadores.
- `src/frontend/src/services/patientService.js`, `patientService.test.js`: acciones HTTP explícitas.
- `src/frontend/src/pages/Patients/ConsultationRecordPage.jsx`, `src/frontend/src/App.test.jsx`: confirmación, loading, error, cierre y solo lectura.
- `src/frontend/src/pages/Appointments/AppointmentDetailsPanel.jsx`, `AppointmentsPage.jsx`, `AppointmentsPage.test.jsx`: abrir una consulta completada desde agenda.
- `docs/user-stories/HU-46-clinical-consultation-completion.md`, `docs/user-stories/HU-45-appointment-consultation-state-sync.md`, `README.md`: contratos, evidencia y estados.

### Task 1: Expand nullable completion metadata safely

**Interfaces:** `Consultation.completed_at: DateTimeField(null=True, blank=True)` y `completed_by: ForeignKey(User, PROTECT, null=True, blank=True, related_name="completed_consultations")`.

- [x] Escribir una prueba de migración 0009→0010 con consultas en los tres estados; comprobar IDs, contenidos y conteos intactos, y cierre NULL para todos los históricos; observar RED por nodo inexistente.
- [x] Añadir campos al modelo y crear 0010 sólo con expansión nullable, sin `RunPython` ni inferencia histórica; ejecutar la prueba hasta GREEN.
- [x] Ejecutar `makemigrations --check --dry-run` y revisar las operaciones de la migración.

### Task 2: Transactional domain services

**Interfaces:** `complete_consultation(*, consultation_id: int, actor: User) -> ConsultationCompletionResult`; `cancel_consultation(*, consultation_id: int, actor: User) -> ConsultationCancellationResult`; `ConsultationOperationError(code, detail)` representa conflictos de dominio.

- [x] Escribir pruebas unitarias de cierre manual/vinculado, metadatos, contrato mínimo, permiso, estado inválido, idempotencia y rollback; escribir cancelación manual, repetición, completada y vinculada 409; observar RED por módulo inexistente.
- [x] Implementar permiso `consultations.edit`, `transaction.atomic` y locks PostgreSQL en orden Appointment→Consultation cuando hay vínculo, validando nuevamente la relación después de bloquear.
- [x] Completar con hora real/actor; exigir Appointment `EN_ATENCION`, sincronizarla a `COMPLETADA` y no modificar metadatos al repetir.
- [x] Cancelar sólo manual `EN_PROGRESO`; mantener vinculadas intactas con `consultation_linked_cancellation_unsupported` 409; ejecutar pruebas hasta GREEN.

### Task 3: Explicit API and immutable generic contract

**Interfaces:** `POST /api/patients/{patientId}/consultations/{consultationId}/complete/` y `/cancel/` responden 200 con `{consultation, appointment}`; conflictos responden 409 con `{code, detail}`.

- [x] Escribir pruebas API para respuesta vinculada/manual, idempotencia, permiso/alcance, estados inválidos y cancelación; escribir regresiones que rechacen PATCH de estado y cualquier contenido de `COMPLETADA`, manteniendo GET permitido; observar RED.
- [x] Exponer `completed_at`, `completed_by` y nombre operativo como read-only; bloquear toda transición por serializer y toda edición ordinaria de `COMPLETADA`/`CANCELADA`; forzar nuevas consultas manuales a `EN_PROGRESO`.
- [x] Añadir vistas/URLs que reutilicen el scope de paciente, serialicen Appointment o NULL y traduzcan sólo errores de dominio a 409.
- [x] Ejecutar consultas y appointments hasta GREEN, confirmando que Appointment no puede completarse directamente.

### Task 4: PostgreSQL concurrency, rollback, and audit

**Interfaces:** dos POST concurrentes reciben 200, conservan idénticos `completed_at`/`completed_by` y dejan un único par `COMPLETADA`; auditoría usa Consultation como recurso y `appointment_id` en metadata si aplica.

- [x] Añadir pruebas PostgreSQL con dos conexiones/hilos para cierre simultáneo y un caso realista start/complete que nunca observe un par imposible.
- [x] Añadir prueba explícita de rollback por fallo al guardar Appointment y verificar ambos estados originales.
- [x] Añadir pruebas de auditoría complete/cancel con actor, consulta, paciente y cita relacionada; observar RED por clasificación genérica.
- [x] Clasificar sólo los nuevos nombres de URL y aportar metadata segura desde las vistas; ejecutar PostgreSQL y auditoría hasta GREEN.

### Task 5: Consultation completion frontend

**Interfaces:** `completePatientConsultation(access, patientId, consultationId)`; ficha `EN_PROGRESO` editable con acción **Completar consulta**, diálogo de confirmación y resultado `COMPLETADA` de solo lectura.

- [x] Escribir pruebas de servicio y UI para acción visible por permiso/estado, confirmación, loading, guard contra doble submit, éxito, 403, validación 409, fecha/usuario y ausencia de Guardar/Completar después del cierre; observar RED.
- [x] Implementar el POST explícito, diálogo a nivel de módulo, estado de operación y `useRef` transitorio para impedir solicitudes duplicadas.
- [x] Actualizar consulta/form/baseline desde la respuesta y derivar `canModify` sólo para `EN_PROGRESO`; preservar `ClinicalAlertsBanner` y el flujo de borrador.
- [x] Ejecutar pruebas focalizadas hasta GREEN sin componentes inline ni condicionales ambiguos.

### Task 6: Completed appointment navigation

**Interfaces:** una cita `COMPLETADA` con Consultation muestra **Ver consulta** y navega al detalle existente; no muestra iniciar/continuar.

- [x] Añadir prueba de agenda para estado completado devuelto por backend y apertura de la consulta; observar RED.
- [x] Generalizar la acción de navegación del panel/página para `EN_ATENCION` y `COMPLETADA`, conservando etiquetas y permisos apropiados.
- [x] Ejecutar pruebas de agenda/consulta hasta GREEN y confirmar que no existe sincronización duplicada en React.

### Task 7: PostgreSQL migration, documentation, and complete verification

**Interfaces:** desarrollo conserva Appointment/Consultation/OdontogramVersion y consultas por estado antes/después; HU-46/HU-45 quedan Hecho, TEC-06 Parcial por cancelación vinculada no resuelta, TEC-07 Parcial y TEC-13 Pendiente.

- [x] Registrar conteos e integridad de datos en PostgreSQL antes; aplicar 0010 a `clinica_dental`; volver a registrar conteos/estados y confirmar históricos intactos con metadatos NULL.
- [x] Documentar HU-46/HU-45, la regla mínima existente, la decisión odontológica pendiente, la cancelación vinculada 409 y la inmutabilidad temporal TEC-13; actualizar README.
- [x] Ejecutar consultas/pacientes/appointments/audit, PostgreSQL específico, suite backend completa, frontend focalizado/completo, lint, build, `check`, `migrate --check`, `makemigrations --check --dry-run` y `git diff --check`.
- [x] Revisar `git status`/`git diff`, actualizar checkboxes con evidencia y confirmar que no se implementó `TreatmentItem`, HU-47+, adendas ni cambios fuera del alcance.
