# HU-44 and HU-55 Appointment Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Iniciar o continuar una consulta clínica desde el detalle administrativo de una cita mediante una relación explícita, transaccional e idempotente.

**Architecture:** `Appointment` conservará la agenda y tendrá una relación nullable hacia la única `Consultation` iniciada explícitamente. Un servicio `start_attendance` bloqueará la cita, creará consulta y odontograma dentro de una transacción, actualizará el estado y será la única entrada al estado `EN_ATENCION`; React consumirá esa acción desde el detalle sin descargar el expediente.

**Tech Stack:** Django 5.2, Django REST Framework, PostgreSQL 18, React 19, React Router, Vitest y Testing Library.

## Global Constraints

- Completar únicamente HU-44 y HU-55.
- Avanzar HU-45 sólo para inicio/protección de estados, TEC-06 sólo con `start_attendance` y TEC-07 sólo con la migración segura de este bloque; los tres quedan parciales.
- No implementar HU-46, completar/cancelar Consultation, campos de cierre, `TreatmentItem`, plan, seguimiento, HU-52, HU-53, alta rápida, identificación flexible, tutores, consultorios, horarios individuales ni cambios del odontograma.
- No usar signals, heurísticas para históricos ni PATCH genérico para `EN_ATENCION`.
- Mantener consultas manuales/urgencias sin Appointment y reutilizar `ClinicalAlertsBanner` sin copiar alertas.
- Preservar todos los cambios preexistentes del árbol de trabajo y no modificar el Product Backlog.

---

## File Map

- `src/backend/apps/appointments/models.py`: estado, tiempo real y relación final OneToOne.
- `src/backend/apps/appointments/migrations/0005_expand_appointment_attendance.py`: expansión nullable sin backfill.
- `src/backend/apps/appointments/migrations/0006_validate_appointment_consultation.py`: validación y activación OneToOne.
- `src/backend/apps/appointments/services.py`: operación transaccional y errores estables.
- `src/backend/apps/appointments/serializers.py`: detalle administrativo ampliado y protección de PATCH.
- `src/backend/apps/appointments/views.py`, `urls.py`: endpoint explícito y contrato de respuesta.
- `src/backend/apps/appointments/tests.py`: servicio, API, permisos, estados, rollback y consulta manual.
- `src/backend/apps/appointments/test_migrations.py`: preservación de históricos y unicidad.
- `src/backend/apps/appointments/test_postgres.py`: concurrencia real.
- `src/backend/apps/audit/middleware.py`, `tests.py`: clasificación e identificadores del inicio.
- `src/frontend/src/services/appointmentService.js`: POST de inicio.
- `src/frontend/src/pages/Appointments/AppointmentsPage.jsx`: coordinación y navegación.
- `src/frontend/src/pages/Appointments/AppointmentDetailsPanel.jsx`: contexto y acciones válidas.
- `src/frontend/src/pages/Appointments/AppointmentsPage.test.jsx`: acciones, errores, navegación y alertas.
- `docs/user-stories/HU-44-start-attendance-from-appointment.md`, `docs/user-stories/HU-55-appointment-context-actions.md`, `README.md`: evidencia y estados finales.

### Task 1: Expand and validate the Appointment relationship

**Interfaces:** `Appointment.consultation` termina como `OneToOneField(Consultation, null=True, blank=True, on_delete=PROTECT, related_name="appointment")`; `attendance_started_at` es nullable; `Status.IN_ATTENDANCE` vale `EN_ATENCION`.

- [x] Añadir una prueba de migración que cree citas, consultas y odontogramas históricos, migre 0004→0006 y compruebe IDs/conteos idénticos, vínculos NULL y unicidad; ejecutarla y observar RED por nodos inexistentes.
- [x] Crear 0005 con FK nullable, timestamp nullable y choices ampliados sin `RunPython` de enlace; crear 0006 con validación de duplicados y `AlterField` a OneToOne; ejecutar la prueba hasta GREEN.
- [x] Añadir los campos finales al modelo, incluir `EN_ATENCION` en estados bloqueantes y ejecutar `makemigrations --check --dry-run` para verificar estado coherente.

### Task 2: Transactional `start_attendance`

**Interfaces:** `start_attendance(*, appointment_id: int, actor: User) -> AttendanceStartResult`; `AppointmentAttendanceError(code, detail)` representa estados inválidos; el resultado contiene appointment, consultation y `created`.

- [x] Escribir pruebas del servicio para PROGRAMADA/CONFIRMADA, mapeo de paciente/profesional/motivo/servicio, estado/tiempo real, odontograma, idempotencia secuencial y rollback por fallo del odontograma; observar RED por módulo inexistente.
- [x] Implementar `transaction.atomic`, `select_for_update`, capacidad `consultations.create`, alcance contextual y retorno idempotente.
- [x] Crear Consultation `EN_PROGRESO` con fecha/hora reales, tipo GENERAL, `summary` y `chief_complaint` desde motivo, `dental_service` desde servicio cuando exista; crear el odontograma antes de asociar/actualizar la cita.
- [x] Ejecutar las pruebas hasta GREEN y verificar que ningún error interno se convierte en dominio.

### Task 3: Explicit API and protected state transitions

**Interfaces:** `POST /api/appointments/{id}/start-attendance/` responde `{appointment, consultation, created}` con 201 en creación y 200 en repetición; estado inválido responde 409 con `code` y `detail`.

- [x] Escribir pruebas API de contrato, permiso, alcance, estados CANCELADA/NO_ASISTIO/COMPLETADA y repetición; escribir pruebas PATCH que rechacen entrada/salida clínica y cancelación/no-show con consulta; observar RED.
- [x] Añadir campos read-only `consultation` y `attendance_started_at` al serializer; quitar COMPLETADA de transiciones genéricas y bloquear `EN_ATENCION`/citas asociadas.
- [x] Añadir la vista/URL explícita que reutiliza scope existente, llama al servicio y sólo captura `AppointmentAttendanceError`.
- [x] Ejecutar pruebas de appointments y consultas manuales hasta GREEN.

### Task 4: PostgreSQL concurrency and audit

**Interfaces:** dos POST concurrentes terminan [200, 201] con el mismo ID; auditoría usa `APPOINTMENT_START_ATTENDANCE` y metadata `appointment_id`/`consultation_id`.

- [x] Añadir prueba PostgreSQL con dos clientes/hilos y barrera antes del POST; afirmar una consulta, un odontograma, un timestamp y cero huérfanas.
- [x] Añadir prueba de auditoría exitosa con actor, recurso Appointment, paciente y Consultation en metadata; observar RED por clasificación genérica.
- [x] Clasificar sólo `appointment-start-attendance` y permitir que la vista aporte metadata/paciente sin datos clínicos.
- [x] Ejecutar pruebas PostgreSQL y auditoría hasta GREEN.

### Task 5: HU-55 detail and attendance actions

**Interfaces:** el panel recibe `canViewPatient`, `canStartAttendance`, `onOpenPatient`, `onStartAttendance` y `onContinueAttendance`; `startAppointmentAttendance(access, id)` consume el endpoint.

- [x] Ampliar fixtures y escribir pruebas de paciente/servicio/inicio/consulta, Abrir expediente, Iniciar/Continuar, estados inválidos, loading/doble clic, 403/red y navegación; observar RED.
- [x] Implementar el servicio frontend, calcular capacidades desde permisos y navegar a rutas existentes con `useNavigate`.
- [x] Mostrar el contexto completo sin fetch de PatientDetail; retirar “Marcar completada” porque HU-46 será la única transición futura.
- [x] Mantener componentes fuera de otros componentes y condicionales explícitos; ejecutar pruebas afectadas hasta GREEN.

### Task 6: End-to-end alerts, PostgreSQL migration, and verification

**Interfaces:** el flujo agenda→inicio→consulta usa el ID devuelto y `ConsultationRecordPage` carga el detalle del paciente que contiene `ClinicalRecord`.

- [x] Añadir regresión integrada que inicia desde agenda, navega a la consulta y encuentra las alertas HU-28.
- [x] Registrar conteos y hashes de Appointment/Consultation/OdontogramVersion antes de PostgreSQL; aplicar 0005/0006 y verificar conteos, IDs, hashes y cero enlaces históricos.
- [x] Documentar HU-44/HU-55 como Hecho y HU-45/TEC-06/TEC-07 como Parcial; actualizar README sin declarar HU-46.
- [x] Ejecutar appointments, consultas, auditoría, PostgreSQL real, suite backend, agenda/consulta, suite frontend, lint, build, `check`, `migrate --check`, `makemigrations --check --dry-run` y `git diff --check`.
- [x] Revisar el diff completo y confirmar que no hay signals, cierre clínico, TreatmentItem ni cambios fuera del alcance.
