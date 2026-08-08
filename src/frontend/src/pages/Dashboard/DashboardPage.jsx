import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listPatients } from '../../services/patientService'

const initials = (patient) => `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase()

function StatCard({ label, value, icon, tone }) {
  return (
    <article aria-label={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="mt-1 font-serif text-3xl text-slate-900">{value}</p>
      </div>
      <span aria-hidden="true" className={`grid h-11 w-11 place-items-center rounded-xl text-lg ${tone}`}>{icon}</span>
    </article>
  )
}

export default function DashboardPage({ user, accessToken }) {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [patientsError, setPatientsError] = useState('')
  const name = user?.first_name || 'Arguello'
  const canCreatePatient = user?.role === 'ADMINISTRADOR' || user?.permissions?.includes('patients.create')
  const canViewPatients = user?.role === 'ADMINISTRADOR' || user?.permissions?.includes('patients.view')

  useEffect(() => {
    if (!canViewPatients) {
      setPatientsLoading(false)
      return undefined
    }

    let active = true
    setPatientsLoading(true)
    setPatientsError('')
    listPatients(accessToken)
      .then((data) => { if (active) setPatients(data) })
      .catch((requestError) => { if (active) setPatientsError(requestError.message) })
      .finally(() => { if (active) setPatientsLoading(false) })

    return () => { active = false }
  }, [accessToken, canViewPatients])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Resumen del día</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">Bienvenido, Dr. {name}</h1>
          <p className="mt-1 text-sm text-slate-500">Viernes, 31 de julio</p>
        </div>
        <div className="flex gap-2">
          {canCreatePatient ? <button type="button" aria-label="Nuevo paciente" onClick={() => navigate('/pacientes/nuevo')} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">+ Nuevo paciente</button> : null}
          <button type="button" aria-label="Nueva cita" className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">+ Nueva cita</button>
        </div>
      </section>

      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total pacientes" value={patientsLoading ? '—' : String(patients.length)} icon="♟" tone="bg-blue-50 text-blue-700" />
        <StatCard label="Citas de hoy" value="0" icon="▣" tone="bg-emerald-50 text-emerald-700" />
      </section>

      <section className="grid min-h-80 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h2 className="font-semibold text-slate-900">Citas de hoy</h2><p className="text-xs text-slate-400">Agenda del día</p></div>
            <a href="/citas" className="text-xs font-semibold text-blue-700 no-underline hover:underline">Ver todas →</a>
          </div>
          <div className="grid min-h-56 place-content-center px-6 py-10 text-center">
            <span aria-hidden="true" className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-xl text-blue-700">▣</span>
            <p className="text-sm font-semibold text-slate-700">No hay citas programadas para hoy.</p>
            <p className="mt-1 text-xs text-slate-400">Las nuevas citas aparecerán aquí.</p>
          </div>
        </article>

        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h2 className="font-semibold text-slate-900">Pacientes recientes</h2><p className="text-xs text-slate-400">Últimos registros</p></div>
            <Link to="/pacientes" className="text-xs font-semibold text-blue-700 no-underline hover:underline">Ver todos →</Link>
          </div>
          {patientsLoading ? <div className="grid min-h-56 place-content-center px-6 py-10 text-center"><p className="text-sm text-slate-500">Cargando pacientes…</p></div> : null}
          {!patientsLoading && patientsError ? <div className="grid min-h-56 place-content-center px-6 py-10 text-center"><p role="alert" className="text-sm text-red-700">{patientsError}</p></div> : null}
          {!patientsLoading && !patientsError && patients.length === 0 ? <div className="grid min-h-56 place-content-center px-6 py-10 text-center">
            <span aria-hidden="true" className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-xl text-slate-500">♟</span>
            <p className="text-sm font-semibold text-slate-700">Aún no hay pacientes registrados.</p>
            <p className="mt-1 text-xs text-slate-400">Registra el primer paciente para comenzar.</p>
          </div> : null}
          {!patientsLoading && !patientsError && patients.length > 0 ? <ul className="divide-y divide-slate-100">
            {patients.slice(0, 4).map((patient) => <li key={patient.id}>
              <Link to={`/pacientes/${patient.id}`} aria-label={`Ver expediente de ${patient.full_name}`} className="flex items-center gap-3 px-5 py-4 no-underline transition hover:bg-slate-50">
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">{initials(patient)}</span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm text-slate-800">{patient.full_name}</strong>
                  <small className="block text-xs text-slate-500">{patient.code}</small>
                </span>
                <span aria-hidden="true" className="ml-auto text-sm text-blue-700">›</span>
              </Link>
            </li>)}
          </ul> : null}
        </article>
      </section>
    </div>
  )
}
