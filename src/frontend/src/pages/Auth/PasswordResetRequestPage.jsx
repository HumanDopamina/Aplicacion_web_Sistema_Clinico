import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthRecoveryShell from '../../components/AuthRecoveryShell'
import CustomButton from '../../components/CustomButton'
import { requestPasswordReset } from '../../services/authService'

export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!email.trim()) return setError('Ingresa tu correo electrónico.')
    try {
      setLoading(true)
      const response = await requestPasswordReset({ email: email.trim() })
      setMessage(response.detail)
    } catch (requestError) {
      setError(requestError.message || 'No fue posible enviar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthRecoveryShell
      currentStep={0}
      title="Recupera tu contraseña"
      subtitle="Escribe el correo asociado a tu cuenta. Te enviaremos un enlace que estará disponible durante 60 minutos."
    >
      {message ? (
        <div>
          <div role="status" className="rounded-xl border border-[#b8dccb] bg-[#eefaf4] p-4 text-sm leading-6 text-[#17603e]">{message}</div>
          <Link to="/login" className="mt-7 inline-flex font-semibold text-[#1269ad] no-underline hover:underline">← Volver al inicio de sesión</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          {error ? <div role="alert" className="mb-4 rounded-xl bg-[#fff0f0] px-4 py-3 text-sm text-[#a51d1d]">{error}</div> : null}
          <label htmlFor="reset-email" className="mb-2 block text-sm font-bold">Correo electrónico</label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nombre@clinica.com"
            className="mb-6 w-full rounded-xl border border-[#ccd6df] bg-white px-4 py-3.5 outline-none transition focus:border-[#1269ad] focus:ring-4 focus:ring-blue-100"
          />
          <CustomButton type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Enviar enlace de recuperación'}</CustomButton>
          <Link to="/login" className="mt-6 block text-center text-sm font-semibold text-[#52606c] no-underline hover:text-[#1269ad]">Volver al inicio de sesión</Link>
        </form>
      )}
    </AuthRecoveryShell>
  )
}
