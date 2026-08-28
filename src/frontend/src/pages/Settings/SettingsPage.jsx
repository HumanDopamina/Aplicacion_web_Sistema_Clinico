import { lazy, Suspense, useEffect, useState } from 'react'
import { useAuth } from '../../context/authContextValue'
import { createUser, listUsers, updateUser } from '../../services/userService'
import AuthenticatedAvatar from '../../components/AuthenticatedAvatar'
import RolePermissionsPanel from './RolePermissionsPanel'

const ClinicProfilePanel = lazy(() => import('./ClinicProfilePanel'))
const BusinessHoursPanel = lazy(() => import('./BusinessHoursPanel'))
const ServicesPanel = lazy(() => import('./ServicesPanel'))

const settingsSections = [
  ['▤', 'Perfil de la clínica', 'Datos básicos y logo'],
  ['◷', 'Horarios de atención', 'Días y horas laborales'],
  ['✚', 'Servicios y tarifas', 'Tratamientos y precios'],
  ['▣', 'Gestión de Staff', 'Doctores y asistentes'],
  ['◈', 'Permisos por rol', 'Accesos por perfil'],
  ['●', 'Notificaciones', 'Recordatorios SMS/Email'],
]

const roleLabels = {
  ADMINISTRADOR: 'Administrador',
  RECEPCIONISTA: 'Recepcionista',
  ODONTOLOGO: 'Odontólogo',
}

const emptyForm = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  role: 'ODONTOLOGO',
  password: '',
  confirm_password: '',
}

function MemberForm({ onClose, onSaved, accessToken, editingUser }) {
  const isEditing = Boolean(editingUser)
  const [form, setForm] = useState(() => editingUser ? {
    email: editingUser.email,
    first_name: editingUser.first_name,
    last_name: editingUser.last_name,
    phone: editingUser.phone || '',
    role: editingUser.role,
    is_active: editingUser.is_active,
  } : emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false)

  useEffect(() => {
    if (!avatar) {
      setAvatarPreview('')
      return undefined
    }
    const objectUrl = URL.createObjectURL(avatar)
    setAvatarPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [avatar])

  const update = (event) => {
    const { checked, name, type, value } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const togglePasswordChange = () => {
    setError('')
    setForm((current) => {
      if (!passwordChangeOpen) {
        return { ...current, new_password: '', confirm_password: '' }
      }
      const next = { ...current }
      delete next.new_password
      delete next.confirm_password
      return next
    })
    setPasswordChangeOpen((current) => !current)
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (isEditing && passwordChangeOpen) {
      if (!form.new_password || !form.confirm_password) {
        setError('Completa ambos campos de contraseña.')
        return
      }
      if (form.new_password !== form.confirm_password) {
        setError('Las contraseñas no coinciden.')
        return
      }
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (avatar) payload.avatar = avatar
      if (removeAvatar) payload.remove_avatar = true
      const saved = isEditing
        ? await updateUser(accessToken, editingUser.id, payload)
        : await createUser(accessToken, payload)
      onSaved(saved)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="member-form-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="member-form-title" className="font-serif text-2xl font-semibold text-slate-900">{isEditing ? 'Editar miembro' : 'Añadir miembro'}</h2>
            <p className="mt-1 text-sm text-slate-500">{isEditing ? 'Actualiza los datos y el acceso de esta cuenta.' : 'Crea las credenciales para el personal autorizado.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar formulario" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">×</button>
        </div>

        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">Nombre
            <input required name="first_name" value={form.first_name} onChange={update} autoFocus className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">Apellidos
            <input required name="last_name" value={form.last_name} onChange={update} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Correo electrónico
            <input required type="email" name="email" value={form.email} onChange={update} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Teléfono
            <input name="phone" value={form.phone} onChange={update} placeholder="+505 8888 8888" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
            <div className="flex flex-wrap items-center gap-4">
              {avatarPreview ? <span className="grid h-14 w-14 overflow-hidden rounded-full bg-blue-100"><img src={avatarPreview} alt="Vista previa de la foto del miembro" className="h-full w-full object-cover" /></span> : <AuthenticatedAvatar user={removeAvatar ? { ...editingUser, avatar_url: '' } : editingUser} accessToken={accessToken} alt={editingUser ? `Foto de ${`${editingUser.first_name} ${editingUser.last_name}`.trim()}` : 'Foto del nuevo miembro'} className="h-14 w-14" />}
              <div className="min-w-0 flex-1">
                <label className="inline-flex cursor-pointer rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Foto de perfil<input type="file" aria-label="Foto de perfil" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { setAvatar(event.target.files?.[0] || null); setRemoveAvatar(false) }} /></label>
                <p className="mt-1 text-[11px] text-slate-400">PNG, JPEG o WebP · máximo 2 MB</p>
              </div>
              {isEditing && editingUser.avatar_url && !removeAvatar ? <button type="button" onClick={() => { setAvatar(null); setRemoveAvatar(true) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Quitar foto</button> : null}
            </div>
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Rol
            <select name="role" value={form.role} onChange={update} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
              <option value="ODONTOLOGO">Odontólogo</option>
              <option value="RECEPCIONISTA">Recepcionista</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </label>
          {isEditing ? (
            <>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 sm:col-span-2">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={update} className="h-4 w-4 accent-blue-700" />
                Usuario activo
              </label>
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Acceso</p>
                    <p className="mt-0.5 text-xs text-slate-500">La contraseña actual se conserva si no solicitas un cambio.</p>
                  </div>
                  <button type="button" aria-expanded={passwordChangeOpen} aria-controls="staff-password-fields" onClick={togglePasswordChange} className="self-start rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                    {passwordChangeOpen ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}
                  </button>
                </div>
                {passwordChangeOpen ? (
                  <div id="staff-password-fields" className="mt-4 grid gap-3 border-t border-blue-100 pt-4 sm:grid-cols-2">
                    <p id="staff-password-warning" className="text-xs leading-5 text-slate-600 sm:col-span-2">Al guardar la nueva contraseña, se cerrarán las sesiones activas de este usuario.</p>
                    <label className="grid gap-1.5 text-sm font-medium text-slate-700">Nueva contraseña
                      <input required type="password" name="new_password" value={form.new_password || ''} onChange={update} autoComplete="new-password" aria-describedby="staff-password-warning" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium text-slate-700">Confirmar nueva contraseña
                      <input required type="password" name="confirm_password" value={form.confirm_password || ''} onChange={update} autoComplete="new-password" aria-describedby="staff-password-warning" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                    </label>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">Contraseña
                <input required type="password" name="password" value={form.password} onChange={update} autoComplete="new-password" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">Confirmar contraseña
                <input required type="password" name="confirm_password" value={form.confirm_password} onChange={update} autoComplete="new-password" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
            </>
          )}
          {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p> : null}
          <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button disabled={saving} type="submit" className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Guardar usuario'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default function SettingsPage() {
  const { accessToken } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [activeSection, setActiveSection] = useState('Perfil de la clínica')

  useEffect(() => {
    let active = true
    listUsers(accessToken)
      .then((data) => { if (active) setUsers(data) })
      .catch((error) => { if (active) setLoadError(error.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [accessToken])

  const saveUser = (user) => {
    setUsers((current) => editingUser
      ? current.map((item) => item.id === user.id ? user : item)
      : [...current, user])
    setFormOpen(false)
    setEditingUser(null)
  }

  const openCreateForm = () => {
    setEditingUser(null)
    setFormOpen(true)
  }

  const openEditForm = (user) => {
    setEditingUser(user)
    setFormOpen(true)
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Administración</p>
        <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight text-slate-900">Configuración</h1>
        <p className="mt-2 text-sm text-slate-500">Administra los parámetros de la clínica, servicios y personal.</p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label="Secciones de configuración" className="flex gap-2 overflow-x-auto lg:block lg:space-y-3">
          {settingsSections.map(([icon, title, description]) => {
            const active = title === activeSection
            const available = title !== 'Notificaciones'
            return (
              <button key={title} type="button" disabled={!available} onClick={() => { if (available) setActiveSection(title) }} aria-current={active ? 'page' : undefined} className={`flex min-w-60 items-center gap-3 rounded-xl border p-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'border-2 border-blue-700 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{icon}</span>
                <span><strong className="block text-sm">{title}</strong><small className="block text-[11px] opacity-70">{description}</small></span>
              </button>
            )
          })}
        </nav>

        {activeSection === 'Gestión de Staff' ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="staff-title">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div><h2 id="staff-title" className="font-serif text-xl font-semibold text-slate-900">Gestión de Staff</h2><p className="mt-1 text-xs text-slate-500">Administra los profesionales y asistentes de la clínica.</p></div>
            <button type="button" aria-label="Añadir miembro" onClick={openCreateForm} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">＋ Añadir miembro</button>
          </div>

          {loading ? <p className="p-8 text-center text-sm text-slate-500">Cargando miembros…</p> : null}
          {loadError ? <p role="alert" className="m-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p> : null}
          {!loading && !loadError && users.length === 0 ? (
            <div className="grid min-h-64 place-content-center px-6 py-12 text-center">
              <span aria-hidden="true" className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-700">♙</span>
              <p className="text-sm font-semibold text-slate-700">Aún no hay miembros registrados.</p>
              <p className="mt-1 text-xs text-slate-400">Añade al primer integrante del equipo.</p>
            </div>
          ) : null}
          {!loading && users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Usuario</th><th className="px-5 py-3">Rol</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3 text-right">Acciones</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><AuthenticatedAvatar user={user} accessToken={accessToken} alt={`Foto de ${`${user.first_name} ${user.last_name}`.trim() || user.email}`} className="h-9 w-9" /><span><strong className="block text-sm text-slate-800">{`${user.first_name} ${user.last_name}`.trim() || user.email}</strong><small className="text-xs text-slate-500">{user.email}</small></span></div></td>
                      <td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">{roleLabels[user.role] || user.role}</span></td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.is_active ? 'Activo' : 'Inactivo'}</span></td>
                      <td className="px-5 py-4 text-right"><button type="button" onClick={() => openEditForm(user)} aria-label={`Editar a ${`${user.first_name} ${user.last_name}`.trim() || user.email}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:border-blue-200 hover:bg-blue-50">Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section> : <Suspense fallback={<div className="grid min-h-80 place-items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">Cargando configuración…</div>}>
          {activeSection === 'Perfil de la clínica' ? <ClinicProfilePanel accessToken={accessToken} /> : null}
          {activeSection === 'Horarios de atención' ? <BusinessHoursPanel accessToken={accessToken} /> : null}
          {activeSection === 'Servicios y tarifas' ? <ServicesPanel accessToken={accessToken} /> : null}
          {activeSection === 'Permisos por rol' ? <RolePermissionsPanel accessToken={accessToken} /> : null}
        </Suspense>}
      </div>
      {formOpen ? <MemberForm onClose={() => setFormOpen(false)} onSaved={saveUser} accessToken={accessToken} editingUser={editingUser} /> : null}
    </div>
  )
}
