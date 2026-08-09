import { useEffect, useRef, useState } from 'react'
import { formatClock, formatLongDate, statusTone } from './appointmentDisplay'

const actionLabels = {
  CONFIRMADA: 'Confirmar cita',
  COMPLETADA: 'Marcar completada',
  NO_ASISTIO: 'Marcar inasistencia',
}

export default function AppointmentDetailsPanel({ appointment, canEdit, onClose, onEdit, onStatus }) {
  const titleRef = useRef(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancellationReason, setCancellationReason] = useState(appointment.cancellation_reason || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCancelling(false)
    setCancellationReason(appointment.cancellation_reason || '')
  }, [appointment.cancellation_reason, appointment.status])

  useEffect(() => {
    titleRef.current?.focus()
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const transition = async (status, extra = {}) => {
    setSaving(true)
    setError('')
    try {
      await onStatus(status, extra)
      if (status === 'CANCELADA') setCancelling(false)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const scheduled = appointment.status === 'PROGRAMADA'
  const confirmed = appointment.status === 'CONFIRMADA'
  const editable = canEdit && (scheduled || confirmed)

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-0 backdrop-blur-[2px] sm:p-5">
    <section role="dialog" aria-modal="true" aria-label="Detalle de cita" className="h-full w-full overflow-y-auto bg-white shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-2xl sm:rounded-2xl">
      <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">Detalle de cita</p><h2 ref={titleRef} tabIndex="-1" id="appointment-detail-title" className="mt-1 font-serif text-3xl font-semibold text-slate-900 outline-none">{appointment.patient_name}</h2></div>
        <button type="button" onClick={onClose} aria-label="Cerrar detalle" className="grid h-10 w-10 place-items-center rounded-full text-xl text-slate-500 hover:bg-slate-100">×</button>
      </header>
      <div className="space-y-6 p-6">
        {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div className="rounded-2xl bg-blue-50 p-5">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone[appointment.status]}`}>{appointment.status_display}</span>
          <p className="mt-4 text-lg font-semibold text-slate-900">{formatLongDate(appointment.date)}</p>
          <p className="mt-1 text-sm font-semibold text-blue-800">{formatClock(appointment.start_time)}–{formatClock(appointment.end_time)} · {appointment.duration_minutes} minutos</p>
        </div>
        <dl className="grid gap-5 text-sm">
          <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Odontólogo</dt><dd className="mt-1 font-semibold text-slate-800">{appointment.dentist_name}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Motivo</dt><dd className="mt-1 text-slate-700">{appointment.reason}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Notas</dt><dd className="mt-1 whitespace-pre-wrap text-slate-700">{appointment.notes || 'Sin notas adicionales.'}</dd></div>
          {appointment.cancellation_reason ? <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Motivo de cancelación</dt><dd className="mt-1 text-slate-700">{appointment.cancellation_reason}</dd></div> : null}
        </dl>
        {cancelling ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4"><label className="block text-sm font-semibold text-red-800">Motivo de cancelación <span className="font-normal">(opcional)</span><textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} rows="3" className="mt-2 w-full rounded-xl border border-red-200 bg-white p-3 font-normal outline-none focus:ring-2 focus:ring-red-100" /></label><div className="mt-3 flex gap-2"><button type="button" onClick={() => setCancelling(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600">Volver</button><button disabled={saving} type="button" onClick={() => transition('CANCELADA', { cancellation_reason: cancellationReason.trim() })} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white">Confirmar cancelación</button></div></div> : null}
        {editable && !cancelling ? <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
          <button type="button" onClick={onEdit} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Editar</button>
          {scheduled ? <button disabled={saving} type="button" onClick={() => transition('CONFIRMADA')} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">{actionLabels.CONFIRMADA}</button> : null}
          {confirmed ? <><button disabled={saving} type="button" onClick={() => transition('COMPLETADA')} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">{actionLabels.COMPLETADA}</button><button disabled={saving} type="button" onClick={() => transition('NO_ASISTIO')} className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-800">{actionLabels.NO_ASISTIO}</button></> : null}
          <button type="button" onClick={() => setCancelling(true)} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">Cancelar cita</button>
        </div> : null}
      </div>
    </section>
  </div>
}
