import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/authContextValue'
import { getPatient } from '../../services/patientService'
import PatientConsultationsPanel from './PatientConsultationsPanel'
import { patientIdentity, patientInitials } from './patientDisplay'
import { PatientHeader, PatientTabs } from './PatientRecordShell'

export default function PatientConsultationsPage() {
  const { patientId } = useParams()
  const { accessToken } = useAuth()
  const [patient, setPatient] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getPatient(accessToken, patientId)
      .then((data) => { if (active) setPatient(data) })
      .catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [accessToken, patientId])

  if (error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
  if (!patient) return <p className="p-10 text-center text-sm text-slate-500">Cargando consultas…</p>

  return <div className="mx-auto w-full max-w-6xl">
    <Link to="/pacientes" className="mb-5 inline-flex text-sm font-medium text-slate-600 no-underline hover:text-blue-700">← Volver a pacientes</Link>
    <PatientHeader patient={patient} title={patient.full_name} initials={patientInitials(patient)} isActive={patient.is_active} identityText={patientIdentity(patient)} />
    <PatientTabs patientId={patient.id} active="consultations" />
    <PatientConsultationsPanel accessToken={accessToken} patientId={patient.id} patientActive={patient.is_active} />
  </div>
}
