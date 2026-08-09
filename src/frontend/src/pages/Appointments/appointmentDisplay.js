const clockFormatter = new Intl.DateTimeFormat('es-NI', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
})

export const todayValue = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export const shiftDate = (value, days) => {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export const formatClock = (value) => clockFormatter.format(new Date(`2000-01-01T${value}Z`))

export const formatLongDate = (value) => {
  const formatted = new Intl.DateTimeFormat('es-NI', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`))
  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`
}

export const minutesFromClock = (value) => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export const statusTone = {
  PROGRAMADA: 'bg-blue-50 text-blue-700 ring-blue-200',
  CONFIRMADA: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  COMPLETADA: 'bg-slate-100 text-slate-700 ring-slate-200',
  CANCELADA: 'bg-red-50 text-red-700 ring-red-200',
  NO_ASISTIO: 'bg-amber-50 text-amber-800 ring-amber-200',
}
