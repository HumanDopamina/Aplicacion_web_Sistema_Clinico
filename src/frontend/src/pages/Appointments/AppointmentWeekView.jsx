import { formatClock, formatLongDate, shiftDate, startOfWeek, statusTone, todayValue } from './appointmentDisplay'

const shortDay = new Intl.DateTimeFormat('es-NI', { weekday: 'short', timeZone: 'UTC' })

export default function AppointmentWeekView({ appointments, selectedDate, onOpenDay, onSelect }) {
  const firstDay = startOfWeek(selectedDate)
  const days = Array.from({ length: 7 }, (_, index) => shiftDate(firstDay, index))

  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm" role="region" aria-label="Vista semanal" tabIndex="0">
    <div className="grid min-w-[980px] grid-cols-7 divide-x divide-slate-200">
      {days.map((day) => {
        const dayAppointments = appointments
          .filter((item) => item.date === day)
          .sort((a, b) => a.start_time.localeCompare(b.start_time))
        const isToday = day === todayValue()
        const date = new Date(`${day}T12:00:00Z`)
        const label = shortDay.format(date).replace('.', '')
        return <section key={day} className="min-h-[420px] bg-white">
          <button
            type="button"
            onClick={() => onOpenDay(day)}
            aria-label={`Abrir agenda del ${formatLongDate(day)}`}
            className={`flex w-full items-center justify-between border-b border-slate-200 px-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600 ${isToday ? 'bg-blue-50' : 'bg-slate-50/70 hover:bg-slate-50'}`}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
            <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${isToday ? 'bg-blue-700 text-white' : 'text-slate-800'}`}>{date.getUTCDate()}</span>
          </button>
          <div className="space-y-2 p-2.5">
            {dayAppointments.length === 0 ? <p className="px-2 py-5 text-center text-xs text-slate-400">Sin citas</p> : null}
            {dayAppointments.map((appointment) => <button
              key={appointment.id}
              type="button"
              onClick={() => onSelect(appointment)}
              aria-label={`${appointment.patient_name}, ${formatClock(appointment.start_time)} a ${formatClock(appointment.end_time)}`}
              className="w-full rounded-xl border border-blue-200 border-l-4 border-l-blue-700 bg-blue-50 p-3 text-left transition hover:-translate-y-px hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 motion-reduce:transition-none"
            >
              <span className="block text-[11px] font-extrabold text-blue-700">{formatClock(appointment.start_time)}–{formatClock(appointment.end_time)}</span>
              <strong className="mt-1 block truncate text-sm text-slate-900">{appointment.patient_name}</strong>
              <span className="mt-1 block truncate text-xs text-slate-600">{appointment.reason}</span>
              <span className="mt-2 block truncate text-[10px] font-semibold text-slate-500">{appointment.dentist_name}</span>
              <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${statusTone[appointment.status]}`}>{appointment.status_display}</span>
            </button>)}
          </div>
        </section>
      })}
    </div>
  </div>
}
