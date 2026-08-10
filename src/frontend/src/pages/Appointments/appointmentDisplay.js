const clockFormatter = new Intl.DateTimeFormat('es-NI', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
})

export const todayValue = (timeZone = 'America/Managua') => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone,
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export const currentClockMinutes = (timeZone = 'America/Managua') => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone,
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return Number(values.hour) * 60 + Number(values.minute)
}

export const shiftDate = (value, days) => {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export const startOfWeek = (value) => {
  const date = new Date(`${value}T12:00:00`)
  const weekday = date.getDay()
  date.setDate(date.getDate() + (weekday === 0 ? -6 : 1 - weekday))
  return date.toISOString().slice(0, 10)
}

export const shiftMonth = (value, months) => {
  const date = new Date(`${value}T12:00:00`)
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return date.toISOString().slice(0, 10)
}

export const calendarRange = (view, value) => {
  if (view === 'day') return { date: value }
  if (view === 'week') {
    const dateFrom = startOfWeek(value)
    return { date_from: dateFrom, date_to: shiftDate(dateFrom, 6) }
  }
  const date = new Date(`${value}T12:00:00`)
  const dateFrom = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
  const dateTo = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12).toISOString().slice(0, 10)
  return { date_from: dateFrom, date_to: dateTo }
}

export const dateBelongsToView = (date, view, selectedDate) => {
  const range = calendarRange(view, selectedDate)
  return range.date ? date === range.date : date >= range.date_from && date <= range.date_to
}

export const calendarTitle = (view, value) => {
  if (view === 'day') return formatLongDate(value)
  if (view === 'month') {
    const formatted = new Intl.DateTimeFormat('es-NI', {
      month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(`${value}T12:00:00Z`))
    return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`
  }
  const from = startOfWeek(value)
  const to = shiftDate(from, 6)
  const fromDate = new Date(`${from}T12:00:00Z`)
  const toDate = new Date(`${to}T12:00:00Z`)
  const sameMonth = fromDate.getUTCMonth() === toDate.getUTCMonth()
    && fromDate.getUTCFullYear() === toDate.getUTCFullYear()
  const first = new Intl.DateTimeFormat('es-NI', sameMonth
    ? { day: 'numeric', timeZone: 'UTC' }
    : { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(fromDate)
  const last = new Intl.DateTimeFormat('es-NI', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(toDate)
  return `Semana del ${first} al ${last}`
}

export const monthCalendarDays = (value) => {
  const range = calendarRange('month', value)
  const firstGridDay = startOfWeek(range.date_from)
  return Array.from({ length: 42 }, (_, index) => shiftDate(firstGridDay, index))
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
