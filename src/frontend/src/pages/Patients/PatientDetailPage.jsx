import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/authContextValue'
import { getPatient } from '../../services/patientService'

const dateFormatter = new Intl.DateTimeFormat('es-NI', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const genderLabels = { FEMENINO: 'Femenino', MASCULINO: 'Masculino', OTRO: 'Otro' }

const infectiousLabels = {
  hepatitis: 'Hepatitis', syphilis: 'Sífilis', tuberculosis: 'Tuberculosis (TB)', cholera: 'Cólera',
  amebiasis: 'Amebiasis', pertussis: 'Tosferina', measles: 'Sarampión', varicella: 'Varicela',
  rubella: 'Rubéola', mumps: 'Parotiditis', meningitis: 'Meningitis', impetigo: 'Impétigo',
  typhoid_fever: 'Fiebre tifoidea', scarlet_fever: 'Escarlatina', malaria: 'Malaria', scabies: 'Escabiosis',
  pediculosis: 'Pediculosis', ringworm: 'Tiña',
}
const hereditaryLabels = {
  allergies: 'Alergias', diabetes_mellitus: 'Diabetes mellitus', hypertension: 'Hipertensión arterial',
  rheumatic_disease: 'Enfermedad reumática', kidney_diseases: 'Enfermedades renales', eye_diseases: 'Enfermedades oculares',
  heart_diseases: 'Enfermedades cardíacas', liver_disease: 'Enfermedad hepática', muscle_diseases: 'Enfermedades musculares',
  congenital_malformations: 'Malformaciones congénitas', mental_disorders: 'Desórdenes mentales',
  degenerative_cns_diseases: 'Enfermedades degenerativas del sistema nervioso central',
  growth_anomalies: 'Anomalías del crecimiento y desarrollo', inborn_metabolic_errors: 'Errores innatos del metabolismo',
}

function DataItem({ label, value }) {
  const display = value === '' || value === null || value === undefined ? 'Sin información registrada' : value
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt><dd className={`mt-1 text-sm font-medium ${display === 'Sin información registrada' ? 'italic text-slate-400' : 'text-slate-700'}`}>{display}</dd></div>
}

function SectionCard({ title, children, wide = false }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${wide ? 'lg:col-span-2' : ''}`}><h2 className="font-serif text-xl font-semibold text-slate-900">{title}</h2><div className="mt-5">{children}</div></section>
}

function DataGrid({ items }) {
  return <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{items.map(([label, value]) => <DataItem key={label} label={label} value={value} />)}</dl>
}

function DiseaseTags({ values, labels }) {
  const active = Object.entries(values || {}).filter(([name, selected]) => name !== 'other' && selected).map(([name]) => labels[name] || name)
  if (values?.other) active.push(values.other)
  return active.length > 0 ? <ul className="flex flex-wrap gap-2">{active.map((label) => <li key={label} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">{label}</li>)}</ul> : <p className="text-sm italic text-slate-400">Sin información registrada</p>
}

function FileReferences({ values }) {
  return values?.length > 0 ? <ul className="space-y-2">{values.map((value) => <li key={value} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{value}</li>)}</ul> : <p className="text-sm italic text-slate-400">Sin información registrada</p>
}

export default function PatientDetailPage() {
  const { id } = useParams()
  const { user, accessToken } = useAuth()
  const [patient, setPatient] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getPatient(accessToken, id).then((data) => { if (active) setPatient(data) }).catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [accessToken, id])

  if (error) return <div className="mx-auto max-w-5xl"><Link to="/pacientes" className="text-sm text-blue-700">← Volver a pacientes</Link><p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p></div>
  if (!patient) return <p className="p-10 text-center text-sm text-slate-500">Cargando expediente…</p>

  const record = patient.clinical_record || {}
  const initials = `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase()
  const canEdit = user.role === 'ADMINISTRADOR' || user.permissions?.includes('patients.edit')

  return <div className="mx-auto w-full max-w-6xl">
    <div className="mb-5 flex items-center justify-between gap-4"><Link to="/pacientes" className="text-sm font-medium text-slate-600 no-underline hover:text-blue-700">← Volver a pacientes</Link>{canEdit ? <Link to={`/pacientes/${patient.id}/editar`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 no-underline shadow-sm hover:bg-slate-50">Editar expediente</Link> : null}</div>
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-cyan-700 font-serif text-2xl font-semibold text-white">{initials}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-slate-500">{patient.code}</span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${patient.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{patient.is_active ? 'Paciente activo' : 'Paciente inactivo'}</span></div><h1 className="mt-1 font-serif text-3xl font-semibold text-slate-900">{patient.full_name}</h1><p className="mt-2 text-xs text-slate-500">{genderLabels[patient.gender]} · {dateFormatter.format(new Date(`${patient.date_of_birth}T00:00:00Z`))} · Cédula {patient.national_id}</p></div></div></header>
    <nav aria-label="Secciones del expediente" className="mt-1 flex gap-6 overflow-x-auto border-b border-slate-200 px-4"><span className="border-b-2 border-blue-600 py-3 text-xs font-semibold text-blue-700">Resumen clínico</span><span className="py-3 text-xs text-slate-500">Consultas</span><span className="py-3 text-xs text-slate-500">Odontograma</span><span className="py-3 text-xs text-slate-500">Documentos</span></nav>

    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <SectionCard title="Datos generales de la consulta"><DataGrid items={[
        ['Doctor que examina', record.examiner_name], ['Cédula del doctor', record.examiner_national_id],
        ['N.º INSS', record.inss_number], ['N.º CEMA', record.cema_number], ['Fecha', record.consultation_date],
        ['Hora', record.consultation_time], ['Servicio odontológico', record.dental_service],
      ]} /></SectionCard>
      <SectionCard title="Datos personales"><DataGrid items={[
        ['Fecha de nacimiento', dateFormatter.format(new Date(`${patient.date_of_birth}T00:00:00Z`))], ['Lugar de nacimiento', patient.birth_place],
        ['Sexo', genderLabels[patient.gender]], ['Procedencia', patient.origin], ['Religión', patient.religion],
        ['Escolaridad', patient.education], ['Profesión u oficio', patient.profession], ['Dirección habitual', patient.address],
        ['Nombre del padre', patient.father_name], ['Nombre de la madre', patient.mother_name], ['Fuente de información', patient.information_source],
        ['Confiabilidad', patient.information_reliability], ['Teléfono', patient.phone], ['Correo electrónico', patient.email],
        ['Contacto de emergencia', patient.emergency_contact_name], ['Parentesco', patient.emergency_relationship], ['Teléfono de emergencia', patient.emergency_phone],
      ]} /></SectionCard>
      <SectionCard title="Motivo de consulta"><DataItem label="Motivo de consulta" value={record.chief_complaint} /></SectionCard>
      <SectionCard title="Historia de la enfermedad actual"><DataItem label="Historia de la enfermedad actual" value={record.present_illness_history} /></SectionCard>
      <SectionCard title="Interrogatorio por aparatos y sistemas" wide><DataGrid items={[
        ['Respiratorio', record.respiratory], ['Cardiovascular', record.cardiovascular], ['Hepático y renal', record.hepatic_renal],
        ['Gastrointestinal', record.gastrointestinal], ['Neurológico', record.neurological], ['Sistema sanguíneo', record.blood_system],
        ['Órganos reproductivos', record.reproductive_organs],
      ]} /></SectionCard>
      <SectionCard title="Antecedentes familiares patológicos" wide><DataItem label="Descripción general" value={record.family_history} /><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><h3 className="mb-3 text-sm font-semibold text-slate-800">Enfermedades infectocontagiosas</h3><DiseaseTags values={record.infectious_diseases} labels={infectiousLabels} /></div><div><h3 className="mb-3 text-sm font-semibold text-slate-800">Enfermedades hereditarias</h3><DiseaseTags values={record.hereditary_diseases} labels={hereditaryLabels} /></div></div></SectionCard>
      <SectionCard title="Examen físico" wide><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        ['Frecuencia cardíaca', record.heart_rate], ['Frecuencia respiratoria', record.respiratory_rate], ['Presión arterial', record.blood_pressure],
        ['Temperatura', record.temperature], ['Peso', record.weight], ['Talla', record.height], ['Área de superficie corporal', record.body_surface_area], ['IMC', record.bmi],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-4"><DataItem label={label} value={value} /></div>)}</div><div className="mt-6"><DataGrid items={[
        ['Aspecto general', record.general_appearance], ['Piel y mucosas', record.skin_and_mucosa], ['Tórax', record.thorax], ['Caja torácica', record.rib_cage],
        ['Mamas', record.breasts], ['Campos pulmonares', record.lung_fields], ['Cardíaco', record.cardiac], ['Abdomen y pelvis', record.abdomen_pelvis],
        ['Tacto rectal', record.rectal_exam], ['Musculoesquelético', record.musculoskeletal], ['Extremidades superiores', record.upper_extremities],
        ['Extremidades inferiores', record.lower_extremities], ['Genitourinario', record.genitourinary], ['Examen ginecológico', record.gynecological_exam],
        ['Examen neurológico', record.neurological_exam],
      ]} /></div></SectionCard>
      <SectionCard title="Observaciones y análisis"><DataItem label="Observaciones y análisis" value={record.observations_analysis} /></SectionCard>
      <SectionCard title="Diagnósticos o problemas odontológicos"><DataItem label="Diagnóstico" value={record.dental_diagnoses} /></SectionCard>
      <SectionCard title="Plan de tratamiento odontológico"><DataItem label="Plan de tratamiento" value={record.treatment_plan} /></SectionCard>
      <SectionCard title="Presupuesto"><DataItem label="Presupuesto / descripción" value={record.budget} /></SectionCard>
      <SectionCard title="Tratamiento realizado"><DataItem label="Tratamiento realizado" value={record.treatment_performed} /></SectionCard>
      <SectionCard title="Archivos clínicos"><div className="grid gap-5 sm:grid-cols-2"><div><h3 className="mb-3 text-sm font-semibold text-slate-800">Exámenes radiográficos</h3><FileReferences values={record.radiographic_exams} /></div><div><h3 className="mb-3 text-sm font-semibold text-slate-800">Fotografías clínicas</h3><FileReferences values={record.clinical_photographs} /></div></div></SectionCard>
    </div>
  </div>
}
