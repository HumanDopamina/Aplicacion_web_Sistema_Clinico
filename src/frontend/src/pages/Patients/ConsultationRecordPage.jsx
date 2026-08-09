import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBeforeUnload, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/authContextValue'
import {
  createPatientConsultation,
  getPatient,
  getPatientConsultation,
  updatePatientConsultation,
} from '../../services/patientService'
import {
  consultationPayload,
  consultationTitle,
  consultationToForm,
  examinationFields,
  generalFields,
  makeEmptyConsultationForm,
  narrativeCards,
  systemsFields,
  vitalFields,
} from './consultationSchema'
import { patientIdentity, patientInitials } from './patientDisplay'
import { PatientHeader, PatientTabs } from './PatientRecordShell'

const inputClass = '-mx-2 w-[calc(100%+1rem)] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-slate-700 outline-none transition placeholder:italic placeholder:text-slate-400 hover:border-slate-200 hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100'

function CloudSaveIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18h10a4 4 0 0 0 .7-7.94A6 6 0 0 0 6.3 8.3 4.5 4.5 0 0 0 7 18Z" /><path d="m9 13 3-3 3 3M12 10v7" /></svg>
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
}

function SectionCard({ title, children, wide = false }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${wide ? 'lg:col-span-2' : ''}`}><h2 className="font-serif text-2xl font-semibold text-slate-900">{title}</h2><div className="mt-5">{children}</div></section>
}

function ConsultationField({ descriptor, value, canModify, onChange }) {
  const { field, label, type = 'text', options = [], required = false, readOnly = false } = descriptor
  if (!canModify) {
    const display = options.find(([code]) => code === value)?.[1] || value
    return <div className={type === 'textarea' ? 'min-h-16' : ''}><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${display ? 'font-medium text-slate-700' : 'italic text-slate-400'}`}>{display || 'Sin información registrada'}</p></div>
  }

  const common = { id: `consultation-${field}`, 'aria-label': label, name: field, value, onChange, required, readOnly, className: `${inputClass} ${readOnly ? 'cursor-default text-slate-500 hover:border-transparent hover:bg-transparent' : ''}` }
  return <label htmlFor={common.id} className={type === 'textarea' ? 'min-h-16' : ''}>
    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}{required ? ' *' : ''}</span>
    {type === 'select'
      ? <select {...common}><option value="">Selecciona una opción</option>{options.map(([code, text]) => <option key={code} value={code}>{text}</option>)}</select>
      : type === 'textarea'
        ? <textarea {...common} rows="2" placeholder="Sin información registrada" />
        : <input {...common} type={type} step={type === 'number' ? 'any' : undefined} placeholder="Sin información registrada" />}
  </label>
}

function FieldsGrid({ fields, form, canModify, onChange, columns = 'sm:grid-cols-2' }) {
  return <div className={`grid gap-x-8 gap-y-5 ${columns}`}>{fields.map((descriptor) => <ConsultationField key={descriptor.field} descriptor={descriptor} value={form[descriptor.field] ?? ''} canModify={canModify} onChange={onChange} />)}</div>
}

function UnsavedDialog({ blocker, allowNavigationRef }) {
  if (blocker.state !== 'blocked') return null
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-[1px]">
    <section role="dialog" aria-modal="true" aria-labelledby="consultation-unsaved-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
      <h2 id="consultation-unsaved-title" className="font-serif text-2xl font-semibold text-slate-900">Cambios sin guardar</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Hay información de la consulta que todavía no se ha guardado. Si sales ahora, esos cambios se perderán.</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => blocker.reset()} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200">Seguir editando</button>
        <button type="button" onClick={() => { allowNavigationRef.current = true; blocker.proceed() }} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200">Descartar y salir</button>
      </div>
    </section>
  </div>
}

export default function ConsultationRecordPage({ isNew = false }) {
  const { patientId, consultationId } = useParams()
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()
  const allowNavigationRef = useRef(false)
  const initialFormRef = useRef(null)
  if (initialFormRef.current === null) initialFormRef.current = makeEmptyConsultationForm()
  const [patient, setPatient] = useState(null)
  const [consultation, setConsultation] = useState(null)
  const [form, setForm] = useState(initialFormRef.current)
  const [baselineForm, setBaselineForm] = useState(initialFormRef.current)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const requests = [getPatient(accessToken, patientId)]
    if (!isNew) requests.push(getPatientConsultation(accessToken, patientId, consultationId))
    Promise.all(requests)
      .then(([loadedPatient, loadedConsultation]) => {
        if (!active) return
        setPatient(loadedPatient)
        if (loadedConsultation) {
          const loadedForm = consultationToForm(loadedConsultation)
          setConsultation(loadedConsultation)
          setForm(loadedForm)
          setBaselineForm(loadedForm)
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [accessToken, consultationId, isNew, patientId])

  useEffect(() => { allowNavigationRef.current = false }, [consultationId, isNew, patientId])

  const canCreate = user.role === 'ADMINISTRADOR' || user.permissions?.includes('consultations.create')
  const canEdit = user.role === 'ADMINISTRADOR' || user.permissions?.includes('consultations.edit')
  const canModify = isNew ? canCreate : canEdit
  const isDirty = canModify && JSON.stringify(form) !== JSON.stringify(baselineForm)
  const blocker = useBlocker(useCallback(() => isDirty && !saving && !allowNavigationRef.current, [isDirty, saving]))
  useBeforeUnload(useCallback((event) => {
    if (isDirty && !saving) {
      event.preventDefault()
      event.returnValue = ''
    }
  }, [isDirty, saving]))

  const update = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))
  const professionalName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email

  const discard = () => {
    setError('')
    if (isNew) {
      allowNavigationRef.current = true
      navigate(`/pacientes/${patientId}/consultas`)
      return
    }
    setForm(baselineForm)
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = consultationPayload(form)
      const saved = isNew
        ? await createPatientConsultation(accessToken, patientId, payload)
        : await updatePatientConsultation(accessToken, patientId, consultationId, payload)
      const savedForm = consultationToForm(saved)
      setConsultation(saved)
      setForm(savedForm)
      setBaselineForm(savedForm)
      if (isNew) {
        allowNavigationRef.current = true
        navigate(`/pacientes/${patientId}/consultas/${saved.id}`, { replace: true })
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="p-10 text-center text-sm text-slate-500">Cargando consulta…</p>
  if (!patient) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || 'No fue posible cargar el paciente.'}</p>

  const title = isNew ? 'Nueva consulta' : consultationTitle(consultation)
  return <form onSubmit={submit} className="mx-auto w-full max-w-6xl">
    <div className="mb-5 flex items-center justify-between gap-4">
      <Link to={`/pacientes/${patientId}/consultas`} className="text-sm font-medium text-slate-600 no-underline hover:text-blue-700">← Volver a consultas</Link>
      {isDirty ? <div aria-label="Acciones de cambios" className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button type="submit" disabled={saving} aria-label="Guardar cambios" title="Guardar cambios" className="grid h-9 w-9 place-items-center rounded-lg text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:opacity-50">{saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" /> : <CloudSaveIcon />}</button>
        <button type="button" onClick={discard} disabled={saving} aria-label="Descartar cambios" title="Descartar cambios" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:opacity-50"><CloseIcon /></button>
      </div> : null}
    </div>
    <PatientHeader patient={patient} title={patient.full_name} initials={patientInitials(patient)} isActive={patient.is_active} identityText={patientIdentity(patient)} />
    <PatientTabs patientId={patient.id} active="consultations" />
    {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

    <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 px-5 py-4">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">Historial médico</p><h2 className="mt-1 font-serif text-2xl font-semibold text-slate-900">{title}</h2></div>
      {!isNew && consultation?.status_display ? <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800 shadow-sm">{consultation.status_display}</span> : null}
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <SectionCard title="Datos generales de la consulta" wide>
        <div className="mb-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <ConsultationField descriptor={{ label: 'Profesional', field: 'professional_name', readOnly: true }} value={isNew ? professionalName : consultation?.professional_name || ''} canModify={canModify} onChange={() => {}} />
        </div>
        <FieldsGrid fields={generalFields} form={form} canModify={canModify} onChange={update} />
      </SectionCard>
      {narrativeCards.slice(0, 2).map(([cardTitle, label, field]) => <SectionCard key={field} title={cardTitle}><ConsultationField descriptor={{ label, field, type: 'textarea' }} value={form[field]} canModify={canModify} onChange={update} /></SectionCard>)}
      <SectionCard title="Interrogatorio por aparatos y sistemas" wide><FieldsGrid fields={systemsFields} form={form} canModify={canModify} onChange={update} /></SectionCard>
      <SectionCard title="Examen físico" wide>
        <FieldsGrid fields={vitalFields} form={form} canModify={canModify} onChange={update} columns="sm:grid-cols-2 lg:grid-cols-4" />
        <div className="mt-7"><FieldsGrid fields={examinationFields} form={form} canModify={canModify} onChange={update} /></div>
      </SectionCard>
      {narrativeCards.slice(2).map(([cardTitle, label, field]) => <SectionCard key={field} title={cardTitle}><ConsultationField descriptor={{ label, field, type: 'textarea' }} value={form[field]} canModify={canModify} onChange={update} /></SectionCard>)}
    </div>
    <UnsavedDialog blocker={blocker} allowNavigationRef={allowNavigationRef} />
  </form>
}
