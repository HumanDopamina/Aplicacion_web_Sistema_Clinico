import { useEffect, useRef, useState } from 'react'
import {
  FINDING_LABELS,
  PERMANENT_ARCHES,
  PRIMARY_ARCHES,
  SURFACE_LABELS,
  toothSurfaces,
} from './odontogramSchema'
import LongitudinalTreatmentPlan from './LongitudinalTreatmentPlan'
import TreatmentResultDialog from './TreatmentResultDialog'
import { treatmentConsultationId } from './treatmentPlanUtils'

const fieldClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100'
const toothOptions = [
  ...PERMANENT_ARCHES.upper,
  ...PERMANENT_ARCHES.lower,
  ...PRIMARY_ARCHES.upper,
  ...PRIMARY_ARCHES.lower,
]
const plannedFindings = ['RESTORATION', 'SEALANT', 'CROWN', 'IMPLANT', 'ROOT_CANAL', 'EXTRACTION']

const emptyForm = () => ({
  serviceId: '',
  description: '',
  diagnosisText: '',
  toothCode: '',
  surfaces: [],
  plannedFinding: '',
  notes: '',
})

const displaySurface = (surface) => {
  const label = SURFACE_LABELS[surface] || surface.toLowerCase()
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
}

export default function TreatmentPlanSection({
  items,
  services,
  canEdit,
  canTransition = false,
  canPerform = false,
  currentConsultationId = null,
  loading = false,
  error = '',
  pendingHasMore = false,
  historyHasMore = false,
  loadingMoreScope = '',
  onLoadMore = () => {},
  onItemChanged = () => {},
  onCreate,
  onAccept = async (itemId) => itemId,
  onPerform = async (itemId) => itemId,
  onCancel = async (itemId) => itemId,
}) {
  const submittingRef = useRef(false)
  const pendingItemsRef = useRef(new Set())
  const [displayItems, setDisplayItems] = useState(items)
  const [form, setForm] = useState(emptyForm)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [pending, setPending] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [performTarget, setPerformTarget] = useState(null)

  useEffect(() => setDisplayItems(items), [items])

  const selectedService = services.find(({ id }) => String(id) === form.serviceId)
  const availableSurfaces = form.toothCode ? toothSurfaces(form.toothCode) : []
  const update = ({ target }) => {
    const { name, value } = target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'toothCode' ? { surfaces: [] } : {}),
    }))
  }
  const toggleSurface = ({ target }) => setForm((current) => ({
    ...current,
    surfaces: target.checked
      ? [...current.surfaces, target.value]
      : current.surfaces.filter((surface) => surface !== target.value),
  }))
  const closeForm = () => {
    setForm(emptyForm())
    setFormError('')
    setFormOpen(false)
  }
  const submit = async () => {
    if (submittingRef.current) return
    if (!form.serviceId && !form.description.trim()) {
      setFormError('Selecciona un servicio o escribe un procedimiento.')
      return
    }
    submittingRef.current = true
    setSaving(true)
    setFormError('')
    try {
      const created = await onCreate({
        service_id: form.serviceId ? Number(form.serviceId) : null,
        description: form.description.trim(),
        diagnosis_text: form.diagnosisText.trim(),
        tooth_code: form.toothCode || null,
        surfaces: form.surfaces,
        planned_finding: form.plannedFinding,
        notes: form.notes.trim(),
      })
      setDisplayItems((current) => [...current, created])
      onItemChanged(created)
      closeForm()
    } catch (requestError) {
      setFormError(requestError.message)
    } finally {
      submittingRef.current = false
      setSaving(false)
    }
  }

  const transition = async (item, action, operation) => {
    if (pendingItemsRef.current.has(item.id)) return
    pendingItemsRef.current.add(item.id)
    setPending({ itemId: item.id, action })
    setActionError('')
    try {
      const updated = await operation()
      setDisplayItems((current) => current.map((candidate) => (
        candidate.id === updated.id ? updated : candidate
      )))
      onItemChanged(updated)
      if (action === 'cancel') {
        setCancelTarget(null)
        setCancelReason('')
      }
      if (action === 'perform') setPerformTarget(null)
    } catch (requestError) {
      setActionError(requestError.message)
    } finally {
      pendingItemsRef.current.delete(item.id)
      setPending(null)
    }
  }

  const accept = (item) => transition(
    item,
    'accept',
    () => onAccept(item.id, treatmentConsultationId(item.proposed_in)),
  )
  const perform = (odontogramResult) => transition(
    performTarget,
    'perform',
    () => onPerform(
      performTarget.id,
      treatmentConsultationId(performTarget.proposed_in),
      Number(currentConsultationId),
      odontogramResult,
    ),
  )
  const openPerform = (item) => {
    setActionError('')
    setPerformTarget(item)
  }
  const openCancellation = (item) => {
    setActionError('')
    setCancelReason('')
    setCancelTarget(item)
  }
  const cancel = () => {
    if (!cancelTarget) return
    const reason = cancelReason.trim()
    transition(
      cancelTarget,
      'cancel',
      () => onCancel(
        cancelTarget.id,
        treatmentConsultationId(cancelTarget.proposed_in),
        reason,
      ),
    )
  }

  return <LongitudinalTreatmentPlan
    items={displayItems}
    loading={loading}
    error={error}
    currentConsultationId={currentConsultationId}
    canTransition={canTransition}
    canPerform={canPerform}
    pendingAction={pending}
    onAccept={accept}
    onPerform={openPerform}
    onCancel={openCancellation}
    pendingHasMore={pendingHasMore}
    historyHasMore={historyHasMore}
    loadingMoreScope={loadingMoreScope}
    onLoadMore={onLoadMore}
    headerAction={canEdit && !formOpen ? <button type="button" onClick={() => setFormOpen(true)} className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">Agregar tratamiento</button> : null}
  >
    {actionError ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p> : null}

    {formOpen ? <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/50 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">Servicio
          <select name="serviceId" value={form.serviceId} onChange={update} className={fieldClass}>
            <option value="">Procedimiento personalizado</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.category_name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">Procedimiento personalizado
          <input name="description" value={form.description} onChange={update} maxLength="255" className={fieldClass} placeholder="Opcional si seleccionas un servicio" />
        </label>
        {selectedService ? <p className="text-sm font-medium text-cyan-900 sm:col-span-2">Precio de referencia: C$ {selectedService.price}</p> : null}
        <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Diagnóstico o justificación
          <textarea name="diagnosisText" value={form.diagnosisText} onChange={update} rows="2" className={fieldClass} />
        </label>
        <label className="text-xs font-semibold text-slate-700">Pieza dental
          <select name="toothCode" value={form.toothCode} onChange={update} className={fieldClass}>
            <option value="">Tratamiento general</option>
            {toothOptions.map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">Hallazgo planificado
          <select name="plannedFinding" value={form.plannedFinding} onChange={update} className={fieldClass}>
            <option value="">Sin hallazgo asociado</option>
            {plannedFindings.map((finding) => <option key={finding} value={finding}>{FINDING_LABELS[finding]}</option>)}
          </select>
        </label>
        {availableSurfaces.length ? <fieldset aria-label="Superficies" className="sm:col-span-2">
          <legend className="text-xs font-semibold text-slate-700">Superficies</legend>
          <div className="mt-2 flex flex-wrap gap-2">{availableSurfaces.map((surface) => <label key={surface} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"><input type="checkbox" value={surface} checked={form.surfaces.includes(surface)} onChange={toggleSurface} />{displaySurface(surface)}</label>)}</div>
        </fieldset> : null}
        <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Notas
          <textarea name="notes" value={form.notes} onChange={update} rows="2" className={fieldClass} />
        </label>
      </div>
      {formError ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={closeForm} disabled={saving} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancelar formulario</button>
        <button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar tratamiento'}</button>
      </div>
    </div> : null}

    {cancelTarget ? <section aria-labelledby="treatment-cancel-title" className="mt-5 rounded-2xl border border-red-200 bg-red-50/60 p-4">
      <h3 id="treatment-cancel-title" className="font-semibold text-slate-900">Cancelar {cancelTarget.description}</h3>
      <label className="mt-3 block text-xs font-semibold text-slate-700">Motivo de cancelación
        <textarea value={cancelReason} onChange={({ target }) => setCancelReason(target.value)} maxLength="1000" rows="2" className={fieldClass} />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={() => setCancelTarget(null)} disabled={pending?.action === 'cancel'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Volver</button>
        <button type="button" onClick={cancel} disabled={pending?.action === 'cancel'} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60">{pending?.action === 'cancel' ? 'Cancelando…' : 'Confirmar cancelación'}</button>
      </div>
    </section> : null}

    {performTarget ? <TreatmentResultDialog
      key={performTarget.id}
      item={performTarget}
      pending={pending?.action === 'perform'}
      requestError={actionError}
      onCancel={() => setPerformTarget(null)}
      onConfirm={perform}
    /> : null}

  </LongitudinalTreatmentPlan>
}
