import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/authContextValue'
import { createPatient, getPatient, updatePatient } from '../../services/patientService'
import ClinicalRecordFields from './ClinicalRecordFields'
import { patientFields, recordFields } from './patientRecordSchema'

const numericRecordFields = new Set(['heart_rate', 'respiratory_rate', 'temperature', 'weight', 'height', 'body_surface_area', 'bmi'])
const emptyForm = Object.fromEntries([...patientFields, ...recordFields].map((field) => [field, '']))
emptyForm.is_active = true
emptyForm.infectious_diseases = {}
emptyForm.hereditary_diseases = {}

function formFromPatient(patient) {
  const record = patient.clinical_record || {}
  const values = { ...emptyForm }
  patientFields.forEach((field) => { values[field] = patient[field] ?? emptyForm[field] })
  recordFields.forEach((field) => {
    const value = record[field]
    values[field] = Array.isArray(value) ? value.join('\n') : (value ?? '')
  })
  values.infectious_diseases = record.infectious_diseases || {}
  values.hereditary_diseases = record.hereditary_diseases || {}
  return values
}

function ageFromBirthDate(value) {
  if (!value) return 'Se calcula automáticamente'
  const birthDate = new Date(`${value}T00:00:00`)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age -= 1
  return age >= 0 ? `${age} años` : 'Fecha no válida'
}

function lines(value) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean)
}

export default function PatientRecordFormPage() {
  const { id } = useParams()
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return undefined
    let active = true
    getPatient(accessToken, id)
      .then((patient) => { if (active) setForm(formFromPatient(patient)) })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [accessToken, id])

  const update = ({ target }) => setForm((current) => ({
    ...current,
    [target.name]: target.type === 'checkbox' ? target.checked : target.value,
  }))

  const updateDisease = (group, name, value) => setForm((current) => ({
    ...current,
    [group]: { ...current[group], [name]: value },
  }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = Object.fromEntries(patientFields.map((field) => [field, form[field]]))
    payload.clinical_record = Object.fromEntries(recordFields.map((field) => {
      if (field === 'radiographic_exams' || field === 'clinical_photographs') return [field, lines(form[field])]
      if (numericRecordFields.has(field)) return [field, form[field] === '' ? null : form[field]]
      return [field, form[field]]
    }))
    payload.clinical_record.infectious_diseases = form.infectious_diseases
    payload.clinical_record.hereditary_diseases = form.hereditary_diseases
    try {
      const saved = isEditing
        ? await updatePatient(accessToken, id, payload)
        : await createPatient(accessToken, payload)
      navigate(`/pacientes/${saved.id}`, { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="p-12 text-center text-sm text-slate-500">Cargando expediente…</p>

  return <div className="mx-auto w-full max-w-6xl">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <Link to={id ? `/pacientes/${id}` : '/pacientes'} className="text-sm font-medium text-slate-600 no-underline hover:text-blue-700">← {id ? 'Volver al expediente' : 'Volver a pacientes'}</Link>
      <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">{isEditing ? 'Edición clínica' : 'Expediente nuevo'}</span>
    </div>
    <header className="mb-6 overflow-hidden rounded-2xl bg-slate-900 px-6 py-7 text-white shadow-sm sm:px-8">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Historia clínica odontológica</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">{isEditing ? 'Editar expediente clínico' : 'Nuevo expediente clínico'}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Completa la ficha de identidad y las secciones clínicas disponibles. Los campos marcados con * son obligatorios para crear el paciente.</p>
    </header>

    <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
      <ClinicalRecordFields form={form} age={ageFromBirthDate(form.date_of_birth)} onChange={update} onDiseaseChange={updateDisease} />
      <aside className="space-y-4 lg:sticky lg:top-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Paciente</p>
          <p className="mt-2 font-serif text-xl font-semibold text-slate-900">{`${form.first_name} ${form.last_name}`.trim() || 'Sin nombre todavía'}</p>
          <p className="mt-1 text-xs text-slate-500">{form.national_id || 'Cédula pendiente'}</p>
          <label className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700"><input type="checkbox" name="is_active" checked={form.is_active} onChange={update} className="h-4 w-4 accent-blue-700" />Paciente activo</label>
        </section>
        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
        <div className="grid gap-2">
          <button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar expediente'}</button>
          <button type="button" onClick={() => navigate(id ? `/pacientes/${id}` : '/pacientes')} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
        </div>
      </aside>
    </form>
  </div>
}
