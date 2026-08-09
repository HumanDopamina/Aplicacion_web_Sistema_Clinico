import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBeforeUnload, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/authContextValue'
import { createPatient, getPatient, updatePatient } from '../../services/patientService'
import { PatientHeader, PatientTabs } from './PatientRecordShell'
import { patientFields, recordFields } from './patientRecordSchema'

const dateFormatter = new Intl.DateTimeFormat('es-NI', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const genderLabels = { FEMENINO: 'Femenino', MASCULINO: 'Masculino', OTRO: 'Otro' }
const inputClass = '-mx-2 w-[calc(100%+1rem)] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-slate-700 outline-none transition placeholder:italic placeholder:text-slate-400 hover:border-slate-200 hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100'

function makeEmptyForm() {
  return {
    ...Object.fromEntries([...patientFields, ...recordFields].map((field) => [field, ''])),
    is_active: true,
    infectious_diseases: {},
    hereditary_diseases: {},
  }
}

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
  const values = makeEmptyForm()
  const record = patient.clinical_record || {}
  patientFields.forEach((field) => {
    const value = patient[field]
    values[field] = field === 'is_active' ? Boolean(value) : (value === null || value === undefined ? '' : String(value))
  })
  recordFields.forEach((field) => {
    const value = record[field]
    values[field] = Array.isArray(value) ? value.join('\n') : (value === null || value === undefined ? '' : String(value))
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

function RecordValue({ label, value, field, form, canModify, onChange, type = 'text', required = false }) {
  if (canModify && field) {
    return <label className="grid content-start gap-1 text-slate-700">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}{required ? <span className="text-blue-700"> *</span> : null}</span>
      {type === 'textarea' ? <textarea aria-label={label} name={field} value={form[field] ?? ''} onChange={onChange} rows="2" placeholder="Sin información registrada" className={`${inputClass} resize-none focus:resize-y`} /> : null}
      {type === 'select' ? <select aria-label={label} name={field} value={form[field] ?? ''} onChange={onChange} required={required} className={inputClass}><option value="">Sin información registrada</option><option value="FEMENINO">Femenino</option><option value="MASCULINO">Masculino</option><option value="OTRO">Otro</option></select> : null}
      {type !== 'textarea' && type !== 'select' ? <input aria-label={label} name={field} value={form[field] ?? ''} onChange={onChange} type={type} step={type === 'number' ? 'any' : undefined} required={required} placeholder={type === 'date' || type === 'time' ? undefined : 'Sin información registrada'} className={inputClass} /> : null}
    </label>
  }
  const display = value === '' || value === null || value === undefined ? 'Sin información registrada' : value
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt><dd className={`mt-1 text-sm font-medium ${display === 'Sin información registrada' ? 'italic text-slate-400' : 'text-slate-700'}`}>{display}</dd></div>
}

function DataGrid({ items, form, canModify, onChange, columns = 'sm:grid-cols-2' }) {
  return <dl className={`grid gap-x-8 gap-y-5 ${columns}`}>{items.map((item) => <RecordValue key={item.label} {...item} form={form} canModify={canModify} onChange={onChange} />)}</dl>
}

function SectionCard({ title, children, wide = false }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${wide ? 'lg:col-span-2' : ''}`}><h2 className="font-serif text-xl font-semibold text-slate-900">{title}</h2><div className="mt-5">{children}</div></section>
}

function CloudSaveIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18a4 4 0 0 1-.4-7.98A6 6 0 0 1 18.5 11H19a3.5 3.5 0 0 1 0 7H7Z" /><path d="m9 14 3-3 3 3M12 11v7" /></svg>
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
}

function DiseaseGroup({ title, values, labels, canModify, onChange }) {
  const [open, setOpen] = useState(false)
  const active = Object.entries(values || {}).filter(([name, selected]) => name !== 'other' && selected).map(([name]) => labels[name] || name)
  if (values?.other) active.push(values.other)
  const summary = active.length > 0 ? <span className="flex flex-wrap gap-2">{active.map((label) => <span key={label} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">{label}</span>)}</span> : <span className="text-sm italic text-slate-400">Sin información registrada</span>
  return <div><h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>{canModify ? <><button type="button" aria-label={`Editar ${title}`} aria-expanded={open} onClick={() => setOpen((current) => !current)} className="-m-2 w-[calc(100%+1rem)] rounded-lg border border-transparent p-2 text-left transition hover:border-slate-200 hover:bg-slate-50 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100">{summary}</button>{open ? <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">{Object.entries(labels).map(([name, label]) => <label key={name} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={Boolean(values?.[name])} onChange={(event) => onChange(name, event.target.checked)} className="h-4 w-4 accent-blue-700" />{label}</label>)}<label className="grid gap-1 text-xs font-medium text-slate-700 sm:col-span-2">Otros<input aria-label={`${title}: otros`} value={values?.other || ''} onChange={(event) => onChange('other', event.target.value)} className={inputClass} /></label></div> : null}</> : summary}</div>
}

export default function PatientRecordPage({ isNew = false }) {
  const { id } = useParams()
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()
  const allowNavigationRef = useRef(false)
  const [patient, setPatient] = useState(null)
  const [form, setForm] = useState(makeEmptyForm)
  const [baselineForm, setBaselineForm] = useState(makeEmptyForm)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew || !id) return undefined
    let active = true
    getPatient(accessToken, id).then((data) => {
      if (active) {
        const loadedForm = formFromPatient(data)
        setPatient(data)
        setForm(loadedForm)
        setBaselineForm(loadedForm)
      }
    }).catch((requestError) => { if (active) setError(requestError.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [accessToken, id, isNew])

  useEffect(() => { allowNavigationRef.current = false }, [id, isNew])

  const update = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.type === 'checkbox' ? target.checked : target.value }))
  const updateDisease = (group, name, value) => setForm((current) => ({ ...current, [group]: { ...current[group], [name]: value } }))
  const canCreate = user.role === 'ADMINISTRADOR' || user.permissions?.includes('patients.create')
  const canEdit = user.role === 'ADMINISTRADOR' || user.permissions?.includes('patients.edit')
  const canModify = isNew ? canCreate : canEdit
  const isDirty = canModify && JSON.stringify(form) !== JSON.stringify(baselineForm)
  const blocker = useBlocker(useCallback(() => isDirty && !saving && !allowNavigationRef.current, [isDirty, saving]))
  useBeforeUnload(useCallback((event) => {
    if (isDirty && !saving) {
      event.preventDefault()
      event.returnValue = ''
    }
  }, [isDirty, saving]))
  const record = patient?.clinical_record || {}
  const currentName = `${form.first_name} ${form.last_name} ${form.second_last_name}`.replace(/\s+/g, ' ').trim()
  const title = canModify ? (currentName || (isNew ? 'Nuevo paciente' : 'Paciente sin nombre')) : (patient?.full_name || 'Paciente')
  const initials = canModify ? (currentName ? `${form.first_name?.[0] || ''}${form.last_name?.[0] || ''}`.toUpperCase() : 'NP') : `${patient?.first_name?.[0] || ''}${patient?.last_name?.[0] || ''}`.toUpperCase()

  const discard = () => {
    if (isNew) {
      allowNavigationRef.current = true
      navigate('/pacientes')
      return
    }
    setForm(baselineForm)
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const saved = isNew ? await createPatient(accessToken, payloadFromForm(form)) : await updatePatient(accessToken, id, payloadFromForm(form))
      const savedForm = formFromPatient(saved)
      setPatient(saved)
      setForm(savedForm)
      setBaselineForm(savedForm)
      if (isNew) {
        allowNavigationRef.current = true
        navigate(`/pacientes/${saved.id}`, { replace: true })
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="p-10 text-center text-sm text-slate-500">Cargando expediente…</p>
  if (error && !patient && !isNew) return <div className="mx-auto max-w-5xl"><Link to="/pacientes" className="text-sm text-blue-700">← Volver a pacientes</Link><p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p></div>

  const personalSource = canModify ? form : (patient || form)
  const recordSource = canModify ? form : record
  const identityParts = []
  if (personalSource.gender) identityParts.push(genderLabels[personalSource.gender] || personalSource.gender)
  if (personalSource.date_of_birth) identityParts.push(dateFormatter.format(new Date(`${personalSource.date_of_birth}T00:00:00Z`)))
  if (personalSource.national_id) identityParts.push(`Cédula ${personalSource.national_id}`)
  return <form onSubmit={submit} className="mx-auto w-full max-w-6xl">
    <div className="mb-5 flex items-center justify-between gap-4"><Link to="/pacientes" className="text-sm font-medium text-slate-600 no-underline hover:text-blue-700">← Volver a pacientes</Link>{isDirty ? <div aria-label="Acciones de cambios" className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"><button type="submit" disabled={saving} aria-label="Guardar cambios" title="Guardar cambios" className="grid h-9 w-9 place-items-center rounded-lg text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:opacity-50">{saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" /> : <CloudSaveIcon />}</button><button type="button" onClick={discard} disabled={saving} aria-label="Descartar cambios" title="Descartar cambios" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:opacity-50"><CloseIcon /></button></div> : null}</div>
    <PatientHeader patient={patient} title={title} initials={initials} isActive={form.is_active} identityText={identityParts.length > 0 ? identityParts.join(' · ') : 'Completa los datos para crear el expediente clínico.'} />
    <PatientTabs patientId={patient?.id} active="summary" isNew={isNew} />
    {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <SectionCard title="Datos personales" wide><DataGrid form={form} canModify={canModify} onChange={update} items={[
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
      <SectionCard title="Antecedentes familiares patológicos" wide><RecordValue label="Antecedentes familiares" value={recordSource.family_history} field="family_history" type="textarea" form={form} canModify={canModify} onChange={update} /><div className="mt-5 grid gap-5 sm:grid-cols-2"><DiseaseGroup title="Enfermedades infectocontagiosas" values={canModify ? form.infectious_diseases : record.infectious_diseases} labels={infectiousLabels} canModify={canModify} onChange={(name, value) => updateDisease('infectious_diseases', name, value)} /><DiseaseGroup title="Enfermedades hereditarias" values={canModify ? form.hereditary_diseases : record.hereditary_diseases} labels={hereditaryLabels} canModify={canModify} onChange={(name, value) => updateDisease('hereditary_diseases', name, value)} /></div></SectionCard>
    </div>
    {blocker.state === 'blocked' ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-[1px]"><section role="dialog" aria-modal="true" aria-labelledby="unsaved-changes-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><h2 id="unsaved-changes-title" className="font-serif text-2xl font-semibold text-slate-900">Cambios sin guardar</h2><p className="mt-2 text-sm leading-6 text-slate-600">Hay información del expediente que todavía no se ha guardado. Si sales ahora, esos cambios se perderán.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => blocker.reset()} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200">Seguir editando</button><button type="button" onClick={() => { allowNavigationRef.current = true; blocker.proceed() }} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200">Descartar y salir</button></div></section></div> : null}
  </form>
}
