import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AuthRecoveryShell from '../../components/AuthRecoveryShell'
import CustomButton from '../../components/CustomButton'
import { confirmPasswordReset } from '../../services/authService'

export default function PasswordResetConfirmPage() {
  const { uid, token } = useParams()
  const [passwords, setPasswords] = useState({ password: '', confirmation: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const change = ({ target }) => setPasswords((current) => ({ ...current, [target.name]: target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!passwords.password || !passwords.confirmation) return setError('Completa ambos campos de contraseña.')
    if (passwords.password !== passwords.confirmation) return setError('Las contraseñas no coinciden.')
    try {
      setLoading(true)
      const response = await confirmPasswordReset({
        uid,
        token,
        new_password: passwords.password,
        confirm_password: passwords.confirmation,
      })
      setMessage(response.detail)
    } catch (requestError) {
      setError(requestError.message || 'No fue posible restablecer la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthRecoveryShell
      currentStep={2}
      title="Crea una nueva contraseña"
      subtitle="Elige una contraseña distinta a las que usas en otros servicios y difícil de adivinar."
    >
      {message ? (
        <div>
          <div role="status" className="rounded-xl border border-[#b8dccb] bg-[#eefaf4] p-4 text-sm leading-6 text-[#17603e]">{message}</div>
          <Link to="/login" className="mt-7 inline-flex rounded-lg bg-[#1269ad] px-5 py-3 font-semibold text-white no-underline hover:bg-[#0d568f]">Iniciar sesión</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          {error ? <div role="alert" className="mb-4 rounded-xl bg-[#fff0f0] px-4 py-3 text-sm text-[#a51d1d]">{error}</div> : null}
          <label htmlFor="new-password" className="mb-2 block text-sm font-bold">Nueva contraseña</label>
          <input id="new-password" name="password" type="password" autoComplete="new-password" value={passwords.password} onChange={change} className="mb-2 w-full rounded-xl border border-[#ccd6df] bg-white px-4 py-3.5 outline-none focus:border-[#1269ad] focus:ring-4 focus:ring-blue-100" />
          <p className="mb-5 mt-0 text-xs leading-5 text-[#6b7782]">Usa al menos 8 caracteres y evita contraseñas comunes o completamente numéricas.</p>
          <label htmlFor="confirm-password" className="mb-2 block text-sm font-bold">Confirmar contraseña</label>
          <input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" value={passwords.confirmation} onChange={change} className="mb-6 w-full rounded-xl border border-[#ccd6df] bg-white px-4 py-3.5 outline-none focus:border-[#1269ad] focus:ring-4 focus:ring-blue-100" />
          <CustomButton type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Guardar nueva contraseña'}</CustomButton>
          <Link to="/recuperar-contrasena" className="mt-6 block text-center text-sm font-semibold text-[#52606c] no-underline hover:text-[#1269ad]">Solicitar otro enlace</Link>
        </form>
      )}
    </AuthRecoveryShell>
  )
}
