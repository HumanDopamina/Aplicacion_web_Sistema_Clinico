import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/authContextValue'
import { listPatients } from '../../services/patientService'
import PatientFormModal from './PatientFormModal'

const dateFormatter = new Intl.DateTimeFormat('es-NI', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const formatDate = (value) => value ? dateFormatter.format(new Date(`${value}T00:00:00Z`)) : 'Sin registrar'
const initials = (patient) => `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase()

export default function PatientsPage() {
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const canCreate = user.role === 'ADMINISTRADOR' || user.permissions?.includes('patients.create')

  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      setLoading(true)
      setError('')
      listPatients(accessToken, search)
        .then((data) => { if (active) setPatients(data) })
        .catch((requestError) => { if (active) setError(requestError.message) })
        .finally(() => { if (active) setLoading(false) })
    }, search ? 250 : 0)
    return () => { active = false; clearTimeout(timer) }
  }, [accessToken, search])

  return <div className="mx-auto w-full max-w-6xl">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Gestión clínica</p><h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight text-slate-900">Pacientes</h1><p className="mt-2 text-sm text-slate-500">Gestiona los registros y expedientes de tus pacientes.</p></div>
      {canCreate ? <button type="button" aria-label="Nuevo paciente" onClick={() => setFormOpen(true)} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800">＋ Nuevo paciente</button> : null}
    </header>

    <label className="relative mt-8 block rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><span className="sr-only">Buscar pacientes</span><span aria-hidden="true" className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, cédula, teléfono o correo…" className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>

    <section aria-label="Lista de pacientes" className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? <p className="p-10 text-center text-sm text-slate-500">Cargando pacientes…</p> : null}
      {error ? <p role="alert" className="m-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {!loading && !error && patients.length === 0 ? <div className="grid min-h-64 place-content-center px-6 py-12 text-center"><span aria-hidden="true" className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-700">♙</span><p className="text-sm font-semibold text-slate-700">{search ? 'No encontramos pacientes con esa búsqueda.' : 'Aún no hay pacientes registrados.'}</p><p className="mt-1 text-xs text-slate-400">{search ? 'Prueba con otro nombre, cédula o teléfono.' : 'Registra al primer paciente para abrir su expediente.'}</p></div> : null}
      {!loading && !error && patients.length > 0 ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Paciente</th><th className="px-5 py-3">Contacto</th><th className="px-5 py-3">Fecha de nacimiento</th><th className="px-5 py-3">Registro</th><th className="px-5 py-3"><span className="sr-only">Acciones</span></th></tr></thead><tbody className="divide-y divide-slate-100">{patients.map((patient) => <tr key={patient.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">{initials(patient)}</span><span><strong className="block text-sm text-slate-800">{patient.full_name}</strong><small className="text-xs text-slate-500">{patient.code}</small></span></div></td><td className="px-5 py-4 text-xs text-slate-600"><span className="block">{patient.phone || 'Sin teléfono'}</span><span className="mt-1 block">{patient.email || 'Sin correo'}</span></td><td className="px-5 py-4 text-xs text-slate-600">{formatDate(patient.date_of_birth)}</td><td className="px-5 py-4 text-xs text-slate-600">{dateFormatter.format(new Date(patient.created_at))}</td><td className="px-5 py-4 text-right"><Link to={`/pacientes/${patient.id}`} className="text-xs font-semibold text-blue-700 no-underline hover:underline">Ver ›</Link></td></tr>)}</tbody></table></div> : null}
    </section>
    {formOpen ? <PatientFormModal accessToken={accessToken} onClose={() => setFormOpen(false)} onSaved={(patient) => { setFormOpen(false); navigate(`/pacientes/${patient.id}`) }} /> : null}
  </div>
}
