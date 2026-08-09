# HU-18 — Programación y gestión de citas

**Jira:** SCRUM-26

**Historia:** Como recepcionista, quiero programar una cita, para organizar la agenda de atención.

**Estado:** Implementada y validada el 9 de agosto de 2026.

## Criterio de aceptación

> Dado que selecciono fecha, hora, paciente y odontólogo disponibles, cuando guardo, entonces la cita queda asignada en el calendario.

## Alcance implementado

- La agenda ofrece vistas diaria, semanal y mensual. La vista diaria organiza por hora y odontólogo; semana muestra siete columnas y mes resume la ocupación por fecha, con acceso directo al detalle diario.
- Semana y mes se consultan como rangos inclusivos en una sola petición y mantienen desplazamiento horizontal accesible en pantallas estrechas.
- Recepción y administración pueden programar citas indicando paciente, odontólogo, fecha, hora, duración, motivo y notas.
- Las duraciones disponibles son 30, 45, 60 y 90 minutos.
- El selector profesional devuelve únicamente odontólogos activos disponibles para el intervalo elegido.
- El backend evita solapamientos tanto del odontólogo como del paciente; permite citas adyacentes y no considera las canceladas como bloqueos.
- El ciclo incluye programar, confirmar, completar, cancelar y marcar inasistencia. Las citas completadas, canceladas o con inasistencia son finales y permanecen visibles para auditoría.
- La cancelación permite registrar un motivo opcional y no existe eliminación por API.
- Los permisos `appointments.view`, `appointments.create` y `appointments.edit` controlan consulta, creación y modificación respectivamente.

## Interfaces afectadas

- `GET|POST /api/appointments/`
- `GET|PATCH /api/appointments/<id>/`
- `GET /api/appointments/dentists/availability/`
- `/citas`

## Evidencia de aceptación

- Las pruebas backend cubren autorización, referencias activas, filtros, disponibilidad, solapamientos, citas adyacentes y transiciones.
- Las pruebas frontend cubren agenda, navegación diaria/semanal/mensual, apertura de un día desde calendarios agregados, permisos, creación, errores conservando el formulario y confirmación.
- La interfaz ofrece estados de carga, error y vacío, foco visible, paneles accesibles y diseño responsive sin dependencias externas de calendario.
- Evidencia visual: [agenda diaria de escritorio](assets/HU-18-desktop.png), [agenda diaria móvil](assets/HU-18-mobile.png), [vista semanal](assets/HU-18-week.png), [vista mensual](assets/HU-18-month.png) y [vista semanal móvil](assets/HU-18-week-mobile.png).

## Verificación

```powershell
cd src/backend
.\.venv\Scripts\python.exe manage.py test

cd ..\frontend
npm test
npm run lint
npm run build
```

## Fuera de alcance

- Jornadas laborales, vacaciones o excepciones individuales por odontólogo.
- Recordatorios por correo, SMS o mensajería.
- Eliminación permanente de citas.
