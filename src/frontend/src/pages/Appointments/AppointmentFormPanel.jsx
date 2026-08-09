import { useEffect, useMemo, useRef, useState } from 'react'
import { getAvailableDentists } from '../../services/appointmentService'

const EMPTY_FORM = {
  patient: '', dentist: '', date: '', start_time: '09:00', duration_minutes: '60', reason: '', notes: '',
}

export default function AppointmentFormPanel({
  accessToken, appointment, patients, selectedDate, onClose, onSave,
}) {
  const titleRef = useRef(null)
  const [values, setValues] = useState(EMPTY_FORM)
  const [patientSearch, setPatientSearch] = useState('')
  const [dentists, setDentists] = useState([])
  const [loadingDentists, setLoadingDentists] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setValues(appointment ? {
      patient: String(appointment.patient),
      dentist: String(appointment.dentist),
      date: appointment.date,
      start_time: appointment.start_time.slice(0, 5),
      duration_minutes: String(appointment.duration_minutes),
      reason: appointment.reason,
      notes: appointment.notes || '',
    } : { ...EMPTY_FORM, date: selectedDate })
    setPatientSearch('')
    setError('')
    titleRef.current?.focus()
  }, [appointment, selectedDate])

  useEffect(() => {
    let active = true
    setLoadingDentists(true)
    getAvailableDentists(accessToken, {
      date: values.date,
      startTime: values.start_time,
      durationMinutes: values.duration_minutes,
      excludeId: appointment?.id,
    })
      .then((data) => {
        if (!active) return
        setDentists(data)
        setValues((current) => (
          current.dentist && !data.some((dentist) => String(dentist.id) === current.dentist)
            ? { ...current, dentist: '' }
            : current
        ))
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoadingDentists(false) })
    return () => { active = false }
  }, [accessToken, appointment?.id, values.date, values.duration_minutes, values.start_time])

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const filteredPatients = useMemo(() => {
    const search = patientSearch.trim().toLocaleLowerCase('es')
    if (!search) return patients
    return patients.filter((patient) => (
      `${patient.full_name} ${patient.code} ${patient.phone || ''}`.toLocaleLowerCase('es').includes(search)
    ))
  }, [patientSearch, patients])

  const change = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        patient: Number(values.patient),
        dentist: Number(values.dentist),
        date: values.date,
        start_time: values.start_time,
        duration_minutes: Number(values.duration_minutes),
        reason: values.reason.trim(),
        notes: values.notes.trim(),
      })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px]">
    <section role="dialog" aria-modal="true" aria-labelledby="appointment-form-title" className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">Agenda clínica</p>
          <h2 ref={titleRef} tabIndex="-1" id="appointment-form-title" className="mt-1 font-serif text-3xl font-semibold text-slate-900 outline-none">{appointment ? 'Editar cita' : 'Nueva cita'}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar panel" className="grid h-10 w-10 place-items-center rounded-full text-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-700">×</button>
      </header>
      <form onSubmit={submit} className="space-y-5 p-6">
        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Fecha<input required type="date" value={values.date} onChange={change('date')} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-semibold text-slate-700">Hora<input required type="time" value={values.start_time} onChange={change('start_time')} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        </div>
        <label className="block text-sm font-semibold text-slate-700">Duración<select value={values.duration_minutes} onChange={change('duration_minutes')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">60 minutos</option><option value="90">90 minutos</option></select></label>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <label className="block text-sm font-semibold text-slate-700">Buscar paciente<input type="search" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Nombre, código o teléfono" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="mt-4 block text-sm font-semibold text-slate-700">Paciente<select required value={values.patient} onChange={change('patient')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="">Selecciona un paciente</option>{filteredPatients.map((patient) => <option key={patient.id} value={patient.id}>{patient.full_name} · {patient.code}</option>)}</select></label>
        </div>
        <label className="block text-sm font-semibold text-slate-700">Odontólogo<select required disabled={loadingDentists} value={values.dentist} onChange={change('dentist')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none disabled:bg-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="">{loadingDentists ? 'Consultando disponibilidad…' : dentists.length ? 'Selecciona un odontólogo disponible' : 'No hay odontólogos disponibles'}</option>{dentists.map((dentist) => <option key={dentist.id} value={dentist.id}>{dentist.full_name}</option>)}</select></label>
        <label className="block text-sm font-semibold text-slate-700">Motivo<input required maxLength="240" value={values.reason} onChange={change('reason')} placeholder="Ej. Valoración de ortodoncia" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <label className="block text-sm font-semibold text-slate-700">Notas <span className="font-normal text-slate-400">(opcional)</span><textarea rows="4" value={values.notes} onChange={change('notes')} placeholder="Indicaciones o contexto para la atención" className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button disabled={saving || loadingDentists} type="submit" className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Guardando…' : appointment ? 'Guardar cambios' : 'Programar cita'}</button>
        </div>
      </form>
    </section>
  </div>
}
