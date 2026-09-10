# HU-51 — Programar la próxima cita desde una consulta completada

**Estado:** Implementada y validada el 31 de agosto de 2026.

## Situación previa y decisión de diseño

`complete_consultation` ya cerraba la consulta y, cuando correspondía,
sincronizaba la cita de origen. Su respuesta continúa siendo el contrato
existente `{consultation, appointment}`: HU-51 no crea una cita durante el
cierre ni incorpora el expediente o el plan longitudinal a esa respuesta.

Los pendientes se siguen obteniendo una sola vez mediante HU-49:

```text
GET /api/patients/{patientId}/treatment-items/?scope=pending
```

La proyección longitudinal se amplió únicamente con el servicio nullable y su
duración para poder ofrecer una sugerencia. `TreatmentItem` continúa siendo la
fuente clínica y `Appointment` la fuente de agenda. No existe entidad
`FollowUp`, modelo adicional, copia de tratamiento ni vínculo persistente
`Appointment`↔`TreatmentItem`.

## Flujo implementado

Una consulta `COMPLETADA` muestra la sección **Atención completada** y sus ítems
`PROPUESTO`/`ACEPTADO`. `REALIZADO` y `CANCELADO` no se consideran pendientes.
Si no hay ítems se informa **No hay tratamientos pendientes**, pero un usuario
con `appointments.create` todavía puede programar un control general. El CTA no
aparece en consultas `EN_PROGRESO` o `CANCELADA`, ni para usuarios sin el
permiso de creación.

El usuario puede elegir opcionalmente un pendiente o seguimiento general. La
navegación a `/citas` usa `location.state` de una sola vez y lleva sólo:

- paciente en la forma mínima compatible con HU-54;
- profesional de la consulta;
- id y descripción operativa del tratamiento seleccionado;
- id y nombre del servicio asociado, si existe.

No se transportan diagnóstico, notas, alertas, antecedentes ni expediente. El
estado de navegación no es una frontera de seguridad: las APIs conservan sus
permisos. `AppointmentsPage` consume y elimina el state con `replace`; un
refresh degrada de forma segura a la agenda/formulario normal.

## Prefill y creación

Se reutiliza `AppointmentFormPanel`, extendido con valores iniciales opcionales.
El paciente y odontólogo quedan visibles sin repetir la búsqueda remota de
pacientes. Fecha y hora permanecen vacías y requieren decisión explícita. Si el
servicio histórico sigue activo en el catálogo actual, se sugieren ese servicio
y su duración actual. Si fue desactivado, sólo se conserva el contexto visible,
no se selecciona ni bloquea el flujo. Cambiar de servicio actualiza la duración
con el catálogo vigente. El motivo sugerido es la descripción operativa breve y
sigue siendo editable.

Guardar usa exclusivamente:

```text
POST /api/appointments/
```

con el payload normal `{patient, dentist, service, date, start_time,
duration_minutes, reason, notes}`. Se mantienen disponibilidad, horarios,
cierres, respuestas 409 y las ExclusionConstraint de paciente y odontólogo.
Tras crear se conserva la UX actual de agenda y confirmación; no se reabre la
consulta. La cita genera únicamente la auditoría normal de `Appointment`.

Una consulta manual completada también puede iniciar el flujo con su paciente y
profesional. La regresión backend demuestra Consulta A → TreatmentItem aceptado
→ cierre → Appointment B normal → inicio de B → Consulta B del mismo paciente →
el pendiente original continúa visible en HU-49 y sin `performed_in`.

## Interfaces afectadas

- HU-49 agrega `service` mínimo al serializer longitudinal y lo carga con
  `select_related`.
- `ConsultationRecordPage` ofrece la decisión post-cierre reutilizando los
  pendientes ya cargados.
- `AppointmentsPage` resuelve el servicio contra el catálogo activo y consume
  el prefill una sola vez.
- `AppointmentFormPanel` admite valores iniciales sin duplicar formulario,
  estado, validaciones ni endpoint.

## Evidencia de aceptación

```powershell
# Backend focalizado y completo
python manage.py test apps.appointments apps.patients.tests.ConsultationApiTests apps.patients.test_treatment_plan apps.patients.test_follow_up_continuity --settings=config.settings.test --noinput
python manage.py test --settings=config.settings.test --noinput

# PostgreSQL real en esquema temporal aislado
python <runner aislado> apps.appointments.test_postgres apps.patients.test_postgres apps.patients.test_treatment_plan apps.patients.test_follow_up_continuity

# Integridad Django
python manage.py check --settings=config.settings.test
python manage.py migrate --check --settings=config.settings.development
python manage.py makemigrations --check --dry-run --settings=config.settings.test

# Frontend
npm test -- src/pages/Patients/ConsultationFollowUpSection.test.jsx src/pages/Appointments/AppointmentFormPanel.test.jsx src/pages/Appointments/AppointmentsPage.test.jsx src/App.test.jsx
npm test
npm run lint
npm run build
git diff --check
```

Resultados: 75 pruebas backend focalizadas correctas (20 omitidas por condición
de entorno), 286 pruebas backend completas correctas (27 omitidas), 33 pruebas
PostgreSQL correctas en un esquema temporal eliminado al finalizar, 81 pruebas
frontend focalizadas correctas, 218 pruebas frontend completas correctas, lint
y build correctos, chequeos Django correctos y ninguna migración nueva.

No se implementaron HU-52, HU-53, recordatorios, recurrencia, pagos,
facturación, cambios de odontograma ni reglas clínicas nuevas.
