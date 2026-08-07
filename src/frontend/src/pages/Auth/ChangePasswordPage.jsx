import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CustomButton from '../../components/CustomButton'
import { useAuth } from '../../context/authContextValue'
import { changePassword } from '../../services/authService'

const initialForm = { current: '', next: '', confirmation: '' }

export default function ChangePasswordPage() {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { accessToken, signOut } = useAuth()
  const navigate = useNavigate()

  const change = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!form.current || !form.next || !form.confirmation) return setError('Completa los tres campos de contraseña.')
    if (form.next !== form.confirmation) return setError('Las contraseñas no coinciden.')
    try {
      setLoading(true)
      const response = await changePassword({
        access: accessToken,
        current_password: form.current,
        new_password: form.next,
        confirm_password: form.confirmation,
      })
      sessionStorage.setItem('dentalclinic_auth_notice', response.detail)
      await signOut()
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'No fue posible actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl py-4">
      <div className="mb-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#1269ad]">Seguridad de la cuenta</p>
        <h1 className="m-0 text-3xl font-semibold tracking-[-.02em] text-[#1f2a33]">Cambiar contraseña</h1>
        <p className="mt-2 text-[#64717d]">Confirma tu contraseña actual antes de definir una nueva.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#dce4ea] bg-white shadow-[0_18px_45px_rgba(29,63,89,.09)] lg:grid lg:grid-cols-[1.25fr_.75fr]">
        <form onSubmit={submit} noValidate className="p-6 sm:p-8 lg:p-10">
          {error ? <div role="alert" className="mb-5 rounded-xl border border-[#f2caca] bg-[#fff1f1] px-4 py-3 text-sm leading-5 text-[#a51d1d]">{error}</div> : null}

          <label htmlFor="current-password" className="mb-2 block text-sm font-bold">Contraseña actual</label>
          <input id="current-password" name="current" type="password" autoComplete="current-password" value={form.current} onChange={change} className="mb-5 w-full rounded-xl border border-[#ccd6df] px-4 py-3 outline-none transition focus:border-[#1269ad] focus:ring-4 focus:ring-blue-100" />

          <div className="my-6 h-px bg-[#e5ebf0]" />

          <label htmlFor="new-account-password" className="mb-2 block text-sm font-bold">Nueva contraseña</label>
          <input id="new-account-password" name="next" type="password" autoComplete="new-password" value={form.next} onChange={change} className="mb-5 w-full rounded-xl border border-[#ccd6df] px-4 py-3 outline-none transition focus:border-[#1269ad] focus:ring-4 focus:ring-blue-100" />

          <label htmlFor="confirm-account-password" className="mb-2 block text-sm font-bold">Confirmar nueva contraseña</label>
          <input id="confirm-account-password" name="confirmation" type="password" autoComplete="new-password" value={form.confirmation} onChange={change} className="mb-7 w-full rounded-xl border border-[#ccd6df] px-4 py-3 outline-none transition focus:border-[#1269ad] focus:ring-4 focus:ring-blue-100" />

          <div className="max-w-xs">
            <CustomButton type="submit" disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar contraseña'}</CustomButton>
          </div>
        </form>

        <aside className="bg-[#eaf4fb] p-6 sm:p-8 lg:p-10" aria-label="Requisitos de seguridad">
          <div className="mb-6 grid h-11 w-11 place-items-center rounded-full bg-[#1269ad] text-xl text-white" aria-hidden="true">✓</div>
          <h2 className="m-0 text-xl font-semibold text-[#183c57]">Lista de resguardo</h2>
          <p className="mb-6 mt-2 text-sm leading-6 text-[#526b7d]">La nueva contraseña debe ser personal, difícil de adivinar y diferente a la actual.</p>
          <ul className="space-y-3 p-0 text-sm leading-5 text-[#294a61]">
            <li className="flex gap-3"><span aria-hidden="true">—</span><span>Usa al menos 8 caracteres.</span></li>
            <li className="flex gap-3"><span aria-hidden="true">—</span><span>Evita contraseñas comunes o completamente numéricas.</span></li>
            <li className="flex gap-3"><span aria-hidden="true">—</span><span>No uses información similar a tu correo o nombre.</span></li>
          </ul>
          <p className="mt-8 rounded-xl bg-white/75 p-4 text-xs leading-5 text-[#496579]">Al guardar, cerraremos esta sesión y cualquier otra sesión anterior para proteger tu cuenta.</p>
        </aside>
      </div>
    </div>
  )
}
