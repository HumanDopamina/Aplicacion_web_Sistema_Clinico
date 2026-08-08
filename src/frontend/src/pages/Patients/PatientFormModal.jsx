import { cloneElement, useState } from 'react'
import { createPatient } from '../../services/patientService'

const emptyPatient = {
  first_name: '', last_name: '', second_last_name: '', birth_place: '', address: '',
  national_id: '', phone: '', email: '', emergency_contact_name: '',
  emergency_relationship: '', emergency_phone: '', gender: '', date_of_birth: '', is_active: true,
}

const fieldClass = 'rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100'

function Field({ children, label, required = false, wide = false }) {
  return <label className={`grid gap-1.5 text-sm font-medium text-slate-700 ${wide ? 'sm:col-span-2' : ''}`}>
    <span>{label}{required ? <span aria-hidden="true"> *</span> : null}</span>
    {cloneElement(children, { 'aria-label': label })}
  </label>
}

export default function PatientFormModal({ accessToken, onClose, onCreated }) {
  const [form, setForm] = useState(emptyPatient)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const update = ({ target }) => setForm((current) => ({
    ...current,
    [target.name]: target.type === 'checkbox' ? target.checked : target.value,
  }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      onCreated(await createPatient(accessToken, form))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="patient-form-title" className="my-4 max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="flex items-start justify-between px-6 pt-6 sm:px-8">
        <div>
          <h2 id="patient-form-title" className="font-serif text-2xl font-semibold text-slate-900">Añadir nuevo paciente</h2>
          <p className="mt-1 text-xs text-slate-500">Los campos con * son obligatorios</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar formulario" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">×</button>
      </div>
      <form onSubmit={submit} className="mt-6 grid gap-4 px-6 pb-6 sm:grid-cols-2 sm:px-8">
        <Field label="Código"><input className={`${fieldClass} bg-slate-50 text-slate-500`} value="Se genera automáticamente" readOnly /></Field>
        <Field label="Nombres" required><input className={fieldClass} required autoFocus name="first_name" value={form.first_name} onChange={update} /></Field>
        <Field label="Primer apellido" required><input className={fieldClass} required name="last_name" value={form.last_name} onChange={update} /></Field>
        <Field label="Segundo apellido"><input className={fieldClass} name="second_last_name" value={form.second_last_name} onChange={update} /></Field>
        <Field label="Lugar de nacimiento" required><input className={fieldClass} required name="birth_place" value={form.birth_place} onChange={update} /></Field>
        <Field label="Dirección"><input className={fieldClass} name="address" value={form.address} onChange={update} /></Field>
        <Field label="Cédula" required><input className={fieldClass} required name="national_id" value={form.national_id} onChange={update} /></Field>
        <Field label="Teléfono"><input className={fieldClass} type="tel" name="phone" value={form.phone} onChange={update} /></Field>
        <Field label="Correo electrónico"><input className={fieldClass} type="email" name="email" value={form.email} onChange={update} /></Field>
        <Field label="Contacto de emergencia"><input className={fieldClass} name="emergency_contact_name" value={form.emergency_contact_name} onChange={update} /></Field>
        <Field label="Parentesco"><input className={fieldClass} name="emergency_relationship" value={form.emergency_relationship} onChange={update} /></Field>
        <Field label="Teléfono de emergencia"><input className={fieldClass} type="tel" name="emergency_phone" value={form.emergency_phone} onChange={update} /></Field>
        <Field label="Género" required><select className={`${fieldClass} bg-white`} required name="gender" value={form.gender} onChange={update}><option value="">Selecciona una opción</option><option value="FEMENINO">Femenino</option><option value="MASCULINO">Masculino</option><option value="OTRO">Otro</option></select></Field>
        <Field label="Fecha de nacimiento" required><input className={fieldClass} required type="date" max={new Date().toISOString().slice(0, 10)} name="date_of_birth" value={form.date_of_birth} onChange={update} /></Field>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-blue-700" name="is_active" checked={form.is_active} onChange={update} />Paciente activo</label>
        {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p> : null}
        <div className="-mx-6 -mb-6 mt-2 flex justify-end gap-2 border-t border-slate-100 px-6 py-5 sm:col-span-2 sm:-mx-8 sm:px-8">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button disabled={saving} type="submit" aria-label="Añadir paciente" className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{saving ? 'Guardando…' : '＋ Añadir paciente'}</button>
        </div>
      </form>
    </section>
  </div>
}
