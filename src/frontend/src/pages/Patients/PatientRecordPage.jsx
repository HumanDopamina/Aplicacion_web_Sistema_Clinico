import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/authContextValue'
import { createPatient, getPatient, updatePatient } from '../../services/patientService'
import { patientFields, recordFields } from './patientRecordSchema'

const dateFormatter = new Intl.DateTimeFormat('es-NI', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const genderLabels = { FEMENINO: 'Femenino', MASCULINO: 'Masculino', OTRO: 'Otro' }
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
const numericFields = new Set(['heart_rate', 'respiratory_rate', 'temperature', 'weight', 'height', 'body_surface_area', 'bmi'])
const emptyForm = Object.fromEntries([...patientFields, ...recordFields].map((field) => [field, '']))
emptyForm.is_active = true
emptyForm.infectious_diseases = {}
emptyForm.hereditary_diseases = {}

const infectiousLabels = {
  hepatitis: 'Hepatitis', syphilis: 'Sífilis', tuberculosis: 'Tuberculosis (TB)', cholera: 'Cólera', amebiasis: 'Amebiasis',
  pertussis: 'Tosferina', measles: 'Sarampión', varicella: 'Varicela', rubella: 'Rubéola', mumps: 'Parotiditis',
  meningitis: 'Meningitis', impetigo: 'Impétigo', typhoid_fever: 'Fiebre tifoidea', scarlet_fever: 'Escarlatina',
  malaria: 'Malaria', scabies: 'Escabiosis', pediculosis: 'Pediculosis', ringworm: 'Tiña',
}
const hereditaryLabels = {
  allergies: 'Alergias', diabetes_mellitus: 'Diabetes mellitus', hypertension: 'Hipertensión arterial',
  rheumatic_disease: 'Enfermedad reumática', kidney_diseases: 'Enfermedades renales', eye_diseases: 'Enfermedades oculares',
  heart_diseases: 'Enfermedades cardíacas', liver_disease: 'Enfermedad hepática', muscle_diseases: 'Enfermedades musculares',
  congenital_malformations: 'Malformaciones congénitas', mental_disorders: 'Desórdenes mentales',
  degenerative_cns_diseases: 'Enfermedades degenerativas del sistema nervioso central',
  growth_anomalies: 'Anomalías del crecimiento y desarrollo', inborn_metabolic_errors: 'Errores innatos del metabolismo',
}

function formFromPatient(patient) {
  const values = { ...emptyForm }
  const record = patient.clinical_record || {}
  patientFields.forEach((field) => { values[field] = patient[field] ?? emptyForm[field] })
  recordFields.forEach((field) => {
    const value = record[field]
    values[field] = Array.isArray(value) ? value.join('\n') : (value ?? '')
  })
  values.infectious_diseases = record.infectious_diseases || {}
  values.hereditary_diseases = record.hereditary_diseases || {}
  return values
}

function lines(value) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean)
}

function payloadFromForm(form) {
  const payload = Object.fromEntries(patientFields.map((field) => [field, form[field]]))
  payload.clinical_record = Object.fromEntries(recordFields.map((field) => {
    if (field === 'radiographic_exams' || field === 'clinical_photographs') return [field, lines(form[field])]
    if (numericFields.has(field)) return [field, form[field] === '' ? null : form[field]]
    return [field, form[field]]
  }))
  payload.clinical_record.infectious_diseases = form.infectious_diseases
  payload.clinical_record.hereditary_diseases = form.hereditary_diseases
  return payload
}

function ageFromBirthDate(value) {
  if (!value) return ''
  const birthDate = new Date(`${value}T00:00:00`)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age -= 1
  return age >= 0 ? `${age} años` : ''
}

function RecordValue({ label, value, field, form, isEditing, onChange, type = 'text', required = false }) {
  if (isEditing && field) {
    return <label className="grid content-start gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}{required ? <span className="text-blue-700"> *</span> : null}</span>
      {type === 'textarea' ? <textarea aria-label={label} name={field} value={form[field] ?? ''} onChange={onChange} rows="3" className={`${inputClass} resize-y`} /> : null}
      {type === 'select' ? <select aria-label={label} name={field} value={form[field] ?? ''} onChange={onChange} required={required} className={inputClass}><option value="">Selecciona una opción</option><option value="FEMENINO">Femenino</option><option value="MASCULINO">Masculino</option><option value="OTRO">Otro</option></select> : null}
      {type !== 'textarea' && type !== 'select' ? <input aria-label={label} name={field} value={form[field] ?? ''} onChange={onChange} type={type} step={type === 'number' ? 'any' : undefined} required={required} className={inputClass} /> : null}
    </label>
  }
  const display = value === '' || value === null || value === undefined ? 'Sin información registrada' : value
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt><dd className={`mt-1 text-sm font-medium ${display === 'Sin información registrada' ? 'italic text-slate-400' : 'text-slate-700'}`}>{display}</dd></div>
}

function DataGrid({ items, form, isEditing, onChange, columns = 'sm:grid-cols-2' }) {
  return <dl className={`grid gap-x-8 gap-y-5 ${columns}`}>{items.map((item) => <RecordValue key={item.label} {...item} form={form} isEditing={isEditing} onChange={onChange} />)}</dl>
}

function SectionCard({ title, children, wide = false }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${wide ? 'lg:col-span-2' : ''}`}><h2 className="font-serif text-xl font-semibold text-slate-900">{title}</h2><div className="mt-5">{children}</div></section>
}

function DiseaseGroup({ title, values, labels, isEditing, onChange }) {
  const active = Object.entries(values || {}).filter(([name, selected]) => name !== 'other' && selected).map(([name]) => labels[name] || name)
  if (values?.other) active.push(values.other)
  return <div><h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>{isEditing ? <div className="grid gap-2 sm:grid-cols-2">{Object.entries(labels).map(([name, label]) => <label key={name} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={Boolean(values?.[name])} onChange={(event) => onChange(name, event.target.checked)} className="h-4 w-4 accent-blue-700" />{label}</label>)}<label className="grid gap-1 text-xs font-medium text-slate-700 sm:col-span-2">Otros<input aria-label={`${title}: otros`} value={values?.other || ''} onChange={(event) => onChange('other', event.target.value)} className={inputClass} /></label></div> : active.length > 0 ? <ul className="flex flex-wrap gap-2">{active.map((label) => <li key={label} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">{label}</li>)}</ul> : <p className="text-sm italic text-slate-400">Sin información registrada</p>}</div>
}

export default function PatientRecordPage({ isNew = false }) {
  const { id } = useParams()
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isEditing, setIsEditing] = useState(isNew)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew || !id) return undefined
    let active = true
    getPatient(accessToken, id).then((data) => { if (active) { setPatient(data); setForm(formFromPatient(data)) } }).catch((requestError) => { if (active) setError(requestError.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [accessToken, id, isNew])

  const update = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.type === 'checkbox' ? target.checked : target.value }))
  const updateDisease = (group, name, value) => setForm((current) => ({ ...current, [group]: { ...current[group], [name]: value } }))
  const canEdit = user.role === 'ADMINISTRADOR' || user.permissions?.includes('patients.edit')
  const record = patient?.clinical_record || {}
  const currentName = `${form.first_name} ${form.last_name} ${form.second_last_name}`.replace(/\s+/g, ' ').trim()
  const title = patient?.full_name || currentName || 'Nuevo paciente'
  const initials = patient ? `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase() : (currentName ? `${form.first_name?.[0] || ''}${form.last_name?.[0] || ''}`.toUpperCase() : 'NP')

  const cancel = () => {
    if (isNew) { navigate('/pacientes'); return }
    setForm(formFromPatient(patient))
    setError('')
    setIsEditing(false)
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const saved = isNew ? await createPatient(accessToken, payloadFromForm(form)) : await updatePatient(accessToken, id, payloadFromForm(form))
      setPatient(saved)
      setForm(formFromPatient(saved))
      setIsEditing(false)
      if (isNew) navigate(`/pacientes/${saved.id}`, { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="p-10 text-center text-sm text-slate-500">Cargando expediente…</p>
  if (error && !isEditing) return <div className="mx-auto max-w-5xl"><Link to="/pacientes" className="text-sm text-blue-700">← Volver a pacientes</Link><p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p></div>

  const personalSource = patient || form
  const recordSource = patient ? record : form
  return <form onSubmit={submit} className="mx-auto w-full max-w-6xl">
    <div className="mb-5 flex items-center justify-between gap-4"><Link to="/pacientes" className="text-sm font-medium text-slate-600 no-underline hover:text-blue-700">← Volver a pacientes</Link><div className="flex flex-wrap justify-end gap-2">{isEditing ? <><button type="button" onClick={cancel} aria-label={isNew ? 'Cancelar' : 'Cancelar edición'} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar expediente'}</button></> : canEdit ? <button type="button" onClick={() => setIsEditing(true)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Editar expediente</button> : null}</div></div>
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-cyan-700 font-serif text-2xl font-semibold text-white">{initials}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-slate-500">{patient?.code || 'Código pendiente'}</span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${(patient?.is_active ?? form.is_active) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{(patient?.is_active ?? form.is_active) ? 'Paciente activo' : 'Paciente inactivo'}</span></div><h1 className="mt-1 font-serif text-3xl font-semibold text-slate-900">{title}</h1><p className="mt-2 text-xs text-slate-500">{patient ? `${genderLabels[patient.gender]} · ${dateFormatter.format(new Date(`${patient.date_of_birth}T00:00:00Z`))} · Cédula ${patient.national_id}` : 'Completa los datos para crear el expediente clínico.'}</p></div></div></header>
    <nav aria-label="Secciones del expediente" className="mt-1 flex gap-6 overflow-x-auto border-b border-slate-200 px-4"><span className="border-b-2 border-blue-600 py-3 text-xs font-semibold text-blue-700">Resumen clínico</span><span className="py-3 text-xs text-slate-500">Consultas</span><span className="py-3 text-xs text-slate-500">Odontograma</span><span className="py-3 text-xs text-slate-500">Documentos</span></nav>
    {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <SectionCard title="Datos generales de la consulta"><DataGrid form={form} isEditing={isEditing} onChange={update} items={[
        { label: 'Doctor que examina', value: recordSource.examiner_name, field: 'examiner_name' }, { label: 'N.º de cédula del doctor', value: recordSource.examiner_national_id, field: 'examiner_national_id' },
        { label: 'N.º INSS', value: recordSource.inss_number, field: 'inss_number' }, { label: 'N.º CEMA', value: recordSource.cema_number, field: 'cema_number' },
        { label: 'Fecha', value: recordSource.consultation_date, field: 'consultation_date', type: 'date' }, { label: 'Hora', value: recordSource.consultation_time, field: 'consultation_time', type: 'time' },
        { label: 'Servicio odontológico', value: recordSource.dental_service, field: 'dental_service' },
      ]} /></SectionCard>
      <SectionCard title="Datos personales"><DataGrid form={form} isEditing={isEditing} onChange={update} items={[
        { label: 'Nombres', value: personalSource.first_name, field: 'first_name', required: true }, { label: 'Primer apellido', value: personalSource.last_name, field: 'last_name', required: true },
        { label: 'Segundo apellido', value: personalSource.second_last_name, field: 'second_last_name' }, { label: 'Edad', value: ageFromBirthDate(personalSource.date_of_birth) },
        { label: 'Fecha de nacimiento', value: personalSource.date_of_birth, field: 'date_of_birth', type: 'date', required: true }, { label: 'Lugar de nacimiento', value: personalSource.birth_place, field: 'birth_place', required: true },
        { label: 'Género', value: genderLabels[personalSource.gender], field: 'gender', type: 'select', required: true }, { label: 'Procedencia', value: personalSource.origin, field: 'origin' },
        { label: 'Religión', value: personalSource.religion, field: 'religion' }, { label: 'Escolaridad', value: personalSource.education, field: 'education' },
        { label: 'Profesión u oficio', value: personalSource.profession, field: 'profession' }, { label: 'Cédula', value: personalSource.national_id, field: 'national_id', required: true },
        { label: 'Dirección habitual', value: personalSource.address, field: 'address' }, { label: 'Nombre del padre', value: personalSource.father_name, field: 'father_name' },
        { label: 'Nombre de la madre', value: personalSource.mother_name, field: 'mother_name' }, { label: 'Fuente de información', value: personalSource.information_source, field: 'information_source' },
        { label: 'Confiabilidad', value: personalSource.information_reliability, field: 'information_reliability' }, { label: 'Teléfono', value: personalSource.phone, field: 'phone', type: 'tel' },
        { label: 'Correo electrónico', value: personalSource.email, field: 'email', type: 'email' }, { label: 'Contacto de emergencia', value: personalSource.emergency_contact_name, field: 'emergency_contact_name' },
        { label: 'Parentesco', value: personalSource.emergency_relationship, field: 'emergency_relationship' }, { label: 'Teléfono de emergencia', value: personalSource.emergency_phone, field: 'emergency_phone', type: 'tel' },
      ]} /></SectionCard>
      <SectionCard title="Motivo de consulta"><RecordValue label="Motivo de consulta" value={recordSource.chief_complaint} field="chief_complaint" type="textarea" form={form} isEditing={isEditing} onChange={update} /></SectionCard>
      <SectionCard title="Historia de la enfermedad actual"><RecordValue label="Historia de la enfermedad actual" value={recordSource.present_illness_history} field="present_illness_history" type="textarea" form={form} isEditing={isEditing} onChange={update} /></SectionCard>
      <SectionCard title="Interrogatorio por aparatos y sistemas" wide><DataGrid form={form} isEditing={isEditing} onChange={update} items={[
        ['Respiratorio', 'respiratory'], ['Cardiovascular', 'cardiovascular'], ['Hepático y renal', 'hepatic_renal'], ['Gastrointestinal', 'gastrointestinal'], ['Neurológico', 'neurological'], ['Sistema sanguíneo', 'blood_system'], ['Órganos reproductivos', 'reproductive_organs'],
      ].map(([label, field]) => ({ label, field, value: recordSource[field], type: 'textarea' }))} /></SectionCard>
      <SectionCard title="Antecedentes familiares patológicos" wide><RecordValue label="Antecedentes familiares" value={recordSource.family_history} field="family_history" type="textarea" form={form} isEditing={isEditing} onChange={update} /><div className="mt-5 grid gap-5 sm:grid-cols-2"><DiseaseGroup title="Enfermedades infectocontagiosas" values={isEditing ? form.infectious_diseases : record.infectious_diseases} labels={infectiousLabels} isEditing={isEditing} onChange={(name, value) => updateDisease('infectious_diseases', name, value)} /><DiseaseGroup title="Enfermedades hereditarias" values={isEditing ? form.hereditary_diseases : record.hereditary_diseases} labels={hereditaryLabels} isEditing={isEditing} onChange={(name, value) => updateDisease('hereditary_diseases', name, value)} /></div></SectionCard>
      <SectionCard title="Examen físico" wide><DataGrid form={form} isEditing={isEditing} onChange={update} columns="sm:grid-cols-2 lg:grid-cols-4" items={[
        ['Frecuencia cardíaca', 'heart_rate'], ['Frecuencia respiratoria', 'respiratory_rate'], ['Presión arterial', 'blood_pressure'], ['Temperatura', 'temperature'], ['Peso', 'weight'], ['Talla', 'height'], ['Área de superficie corporal', 'body_surface_area'], ['IMC', 'bmi'],
      ].map(([label, field]) => ({ label, field, value: recordSource[field], type: numericFields.has(field) ? 'number' : 'text' }))} /><div className="mt-6"><DataGrid form={form} isEditing={isEditing} onChange={update} items={[
        ['Aspecto general', 'general_appearance'], ['Piel y mucosas', 'skin_and_mucosa'], ['Tórax', 'thorax'], ['Caja torácica', 'rib_cage'], ['Mamas', 'breasts'], ['Campos pulmonares', 'lung_fields'], ['Cardíaco', 'cardiac'], ['Abdomen y pelvis', 'abdomen_pelvis'], ['Tacto rectal, cuando aplique', 'rectal_exam'], ['Musculoesquelético', 'musculoskeletal'], ['Extremidades superiores', 'upper_extremities'], ['Extremidades inferiores', 'lower_extremities'], ['Genitourinario, cuando aplique', 'genitourinary'], ['Examen ginecológico', 'gynecological_exam'], ['Examen neurológico', 'neurological_exam'],
      ].map(([label, field]) => ({ label, field, value: recordSource[field], type: 'textarea' }))} /></div></SectionCard>
      {[
        ['Observaciones y análisis', 'Observaciones y análisis', 'observations_analysis'], ['Diagnósticos o problemas odontológicos', 'Diagnóstico / problemas odontológicos', 'dental_diagnoses'],
        ['Plan de tratamiento odontológico', 'Plan de tratamiento', 'treatment_plan'], ['Presupuesto', 'Presupuesto / descripción', 'budget'], ['Tratamiento realizado', 'Tratamiento realizado', 'treatment_performed'],
      ].map(([titleText, label, field]) => <SectionCard key={field} title={titleText}><RecordValue label={label} value={recordSource[field]} field={field} type="textarea" form={form} isEditing={isEditing} onChange={update} /></SectionCard>)}
    </div>
  </form>
}
