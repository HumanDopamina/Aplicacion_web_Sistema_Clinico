import { Link } from 'react-router-dom'

export function ConsultationTabs({ patientId, consultationId, active = 'clinical', isNew = false }) {
  const baseClass = 'rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200'
  return <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Secciones de la consulta">
    <Link
      to={isNew ? `/pacientes/${patientId}/consultas/nueva` : `/pacientes/${patientId}/consultas/${consultationId}`}
      aria-current={active === 'clinical' ? 'page' : undefined}
      className={`${baseClass} ${active === 'clinical' ? 'bg-cyan-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-800'}`}
    >Ficha clínica</Link>
    {isNew
      ? <button type="button" disabled aria-label="Odontograma de la consulta" className={`${baseClass} cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400`}>Odontograma</button>
      : <Link
          to={`/pacientes/${patientId}/consultas/${consultationId}/odontograma`}
          aria-label="Odontograma de la consulta"
          aria-current={active === 'odontogram' ? 'page' : undefined}
          className={`${baseClass} ${active === 'odontogram' ? 'bg-cyan-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-800'}`}
        >Odontograma</Link>}
    {isNew ? <span className="text-xs text-slate-500">Guarda la consulta para abrir el odontograma</span> : null}
  </div>
}
