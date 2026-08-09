import { formatClock, formatLongDate, monthCalendarDays, todayValue } from './appointmentDisplay'

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function AppointmentMonthView({ appointments, selectedDate, onOpenDay, onSelect }) {
  const days = monthCalendarDays(selectedDate)
  const selectedMonth = selectedDate.slice(0, 7)

  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm" role="region" aria-label="Vista mensual" tabIndex="0">
    <div className="min-w-[820px]">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {weekDays.map((day) => <div key={day} className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayAppointments = appointments
            .filter((item) => item.date === day)
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
          const outsideMonth = day.slice(0, 7) !== selectedMonth
          const isToday = day === todayValue()
          return <section key={day} className={`min-h-32 border-b border-r border-slate-200 p-2 ${outsideMonth ? 'bg-slate-50/70' : 'bg-white'}`}>
            <button
              type="button"
              onClick={() => onOpenDay(day)}
              aria-label={`Abrir agenda del ${formatLongDate(day)}, ${dayAppointments.length} ${dayAppointments.length === 1 ? 'cita' : 'citas'}`}
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${isToday ? 'bg-blue-700 text-white' : outsideMonth ? 'text-slate-400 hover:bg-slate-200' : 'text-slate-700 hover:bg-blue-50'}`}
            >
              {Number(day.slice(-2))}
            </button>
            <div className="mt-1.5 space-y-1">
              {dayAppointments.slice(0, 3).map((appointment) => <button
                key={appointment.id}
                type="button"
                onClick={() => onSelect(appointment)}
                aria-label={`${appointment.patient_name}, ${formatClock(appointment.start_time)}`}
                className="block w-full truncate rounded-md border-l-2 border-blue-700 bg-blue-50 px-2 py-1.5 text-left text-[10px] text-slate-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <span className="font-extrabold text-blue-700">{formatClock(appointment.start_time)}</span> <span>{appointment.patient_name}</span>
              </button>)}
              {dayAppointments.length > 3 ? <button type="button" onClick={() => onOpenDay(day)} className="px-2 text-[10px] font-bold text-blue-700 hover:underline">+{dayAppointments.length - 3} más</button> : null}
            </div>
          </section>
        })}
      </div>
    </div>
  </div>
}
