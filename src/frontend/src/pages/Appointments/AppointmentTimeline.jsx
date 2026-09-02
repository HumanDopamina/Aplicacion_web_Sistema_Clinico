import { currentClockMinutes, formatClock, minutesFromClock, statusTone, todayValue } from './appointmentDisplay'
import './appointments.css'

const HOUR_HEIGHT = 72

export default function AppointmentTimeline({ appointments, selectedDate, onSelect, timeZone }) {
  if (appointments.length === 0) return null
  const dentistMap = new Map()
  appointments.forEach((item) => {
    const current = dentistMap.get(item.dentist)
    dentistMap.set(item.dentist, {
      id: item.dentist,
      name: item.dentist_name,
      appointmentCount: (current?.appointmentCount || 0) + 1,
    })
  })
  const dentists = [...dentistMap.values()].sort((left, right) => (
    left.name.localeCompare(right.name, 'es')
  ))
  const laneByDentist = new Map(dentists.map((dentist, index) => [dentist.id, index]))
  const starts = appointments.map((item) => minutesFromClock(item.start_time))
  const ends = appointments.map((item) => minutesFromClock(item.end_time))
  const startHour = Math.min(7, Math.floor(Math.min(...starts) / 60))
  const endHour = Math.max(19, Math.ceil(Math.max(...ends) / 60))
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index)
  const stageHeight = (endHour - startHour) * HOUR_HEIGHT
  const nowMinutes = currentClockMinutes(timeZone)
  const showNow = selectedDate === todayValue(timeZone) && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60

  return <section aria-label="Agenda diaria" className="appointment-timeline overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="timeline-heading" style={{ '--lane-count': dentists.length }}>
      <span aria-hidden="true" />
      {dentists.map((dentist) => <div key={dentist.id} className="dentist-heading"><span className="dentist-dot" aria-hidden="true" />{dentist.name} · {dentist.appointmentCount} {dentist.appointmentCount === 1 ? 'cita' : 'citas'}</div>)}
    </div>
    <div className="timeline-body" style={{ '--timeline-height': `${stageHeight}px`, '--lane-count': dentists.length }}>
      <div className="time-axis" aria-hidden="true">{hours.map((hour) => <span key={hour} style={{ top: `${(hour - startHour) * HOUR_HEIGHT}px` }}>{String(hour).padStart(2, '0')}:00</span>)}</div>
      <div className="timeline-stage">
        {hours.map((hour) => <span aria-hidden="true" className="hour-line" key={hour} style={{ top: `${(hour - startHour) * HOUR_HEIGHT}px` }} />)}
        {showNow ? <span aria-label="Hora actual" className="now-line" style={{ top: `${((nowMinutes - startHour * 60) / 60) * HOUR_HEIGHT}px` }}><i /></span> : null}
        {appointments.map((item) => {
          const top = ((minutesFromClock(item.start_time) - startHour * 60) / 60) * HOUR_HEIGHT
          const height = Math.max((item.duration_minutes / 60) * HOUR_HEIGHT, 44)
          return <button
            type="button"
            key={item.id}
            aria-label={`${item.patient_name}, ${formatClock(item.start_time)} a ${formatClock(item.end_time)}`}
            onClick={() => onSelect(item)}
            className={`appointment-card status-${item.status.toLowerCase()} ${item.duration_minutes <= 45 ? 'compact' : ''}`}
            style={{ '--card-top': `${top}px`, '--card-height': `${height}px`, '--lane-index': laneByDentist.get(item.dentist) }}
          >
            <span className="appointment-time">{formatClock(item.start_time)}–{formatClock(item.end_time)}</span>
            <strong>{item.patient_name}</strong>
            <span className="appointment-reason">{item.reason}</span>
            <span className={`appointment-status ring-1 ${statusTone[item.status]}`}>{item.status_display}</span>
            <small>{item.dentist_name}</small>
          </button>
        })}
      </div>
    </div>
  </section>
}
