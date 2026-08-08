import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/authContextValue'
import { getPatient } from '../../services/patientService'

const dateFormatter = new Intl.DateTimeFormat('es-NI', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const valueOrEmpty = (value) => value || 'Sin información registrada'
const genderLabels = { FEMENINO: 'Femenino', MASCULINO: 'Masculino', OTRO: 'Otro' }

function DataItem({ label, value }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-700">{valueOrEmpty(value)}</dd></div>
}

function EmptyClinicalItem({ label }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0"><span className="text-xs font-medium text-slate-700">{label}</span><span className="text-right text-xs italic text-slate-400">Sin información registrada</span></div>
}

export default function PatientDetailPage() {
  const { id } = useParams()
  const { accessToken } = useAuth()
  const [patient, setPatient] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    getPatient(accessToken, id).then((data) => { if (active) setPatient(data) }).catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [accessToken, id])

  if (error) return <div className="mx-auto max-w-5xl"><Link to="/pacientes" className="text-sm text-blue-700">← Volver a pacientes</Link><p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p></div>
  if (!patient) return <p className="p-10 text-center text-sm text-slate-500">Cargando expediente…</p>
  const initials = `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase()

  return <div className="mx-auto w-full max-w-6xl">
    <div className="mb-5 flex items-center justify-between gap-4"><Link to="/pacientes" className="text-sm font-medium text-slate-600 no-underline hover:text-blue-700">← Volver a pacientes</Link><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Expediente clínico</span></div>
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-cyan-700 font-serif text-2xl font-semibold text-white">{initials}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-slate-500">{patient.code}</span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${patient.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{patient.is_active ? 'Paciente activo' : 'Paciente inactivo'}</span></div><h1 className="mt-1 font-serif text-3xl font-semibold text-slate-900">{patient.full_name}</h1><p className="mt-2 text-xs text-slate-500">{genderLabels[patient.gender]} · {dateFormatter.format(new Date(`${patient.date_of_birth}T00:00:00Z`))} · Cédula {patient.national_id}</p></div></div></header>
    <nav aria-label="Secciones del expediente" className="mt-1 flex gap-6 overflow-x-auto border-b border-slate-200 px-4"><span className="border-b-2 border-blue-600 py-3 text-xs font-semibold text-blue-700">Resumen clínico</span><span className="py-3 text-xs text-slate-500">Consultas</span><span className="py-3 text-xs text-slate-500">Odontograma</span><span className="py-3 text-xs text-slate-500">Documentos</span></nav>
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(250px,0.8fr)]"><div className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-serif text-xl font-semibold text-slate-900">Información personal</h2><dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2"><DataItem label="Nombre completo" value={patient.full_name} /><DataItem label="Fecha de nacimiento" value={dateFormatter.format(new Date(`${patient.date_of_birth}T00:00:00Z`))} /><DataItem label="Género" value={genderLabels[patient.gender]} /><DataItem label="Lugar de nacimiento" value={patient.birth_place} /><DataItem label="Cédula" value={patient.national_id} /><DataItem label="Dirección" value={patient.address} /><DataItem label="Teléfono" value={patient.phone} /><DataItem label="Correo electrónico" value={patient.email} /></dl></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-serif text-xl font-semibold text-slate-900">Resumen clínico</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><small className="text-slate-400">Alergias</small><p className="mt-1 text-sm font-semibold text-slate-700">Sin información registrada</p></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><small className="text-slate-400">Tipo de sangre</small><p className="mt-1 text-sm font-semibold text-slate-700">Sin información registrada</p></div></div></section></div><aside className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-serif text-lg font-semibold text-slate-900">Contacto de emergencia</h2><dl className="mt-5 grid gap-4"><DataItem label="Nombre" value={patient.emergency_contact_name} /><DataItem label="Parentesco" value={patient.emergency_relationship} /><DataItem label="Teléfono" value={patient.emergency_phone} /></dl></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-serif text-lg font-semibold text-slate-900">Antecedentes</h2><div className="mt-3"><EmptyClinicalItem label="Antecedentes familiares" /><EmptyClinicalItem label="Antecedentes personales" /><EmptyClinicalItem label="Procedimientos" /></div></section></aside></div>
  </div>
}
