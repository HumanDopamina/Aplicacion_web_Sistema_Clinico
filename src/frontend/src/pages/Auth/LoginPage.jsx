import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logo from '../../assets/logo_login.svg'
import image from '../../assets/imagen_login.png'
import CustomButton from '../../components/CustomButton'
import { useAuth } from '../../context/authContextValue'
import { login } from '../../services/authService'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '', remember: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [notice] = useState(() => {
    const storedNotice = sessionStorage.getItem('dentalclinic_auth_notice')
    sessionStorage.removeItem('dentalclinic_auth_notice')
    return location.state?.notice || storedNotice || ''
  })
  const change = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.type === 'checkbox' ? target.checked : target.value }))
  const submit = async (event) => {
    event.preventDefault(); setError('')
    if (!form.email.trim() || !form.password) return setError('Ingresa tu correo electrónico y contraseña.')
    try { setLoading(true); const session = await login({ email: form.email.trim(), password: form.password }); signIn(session, form.remember); navigate('/bienvenida', { replace: true }) }
    catch (err) { setError(err.message || 'Correo electrónico o contraseña incorrectos.') }
    finally { setLoading(false) }
  }
  return (
    <main className="h-screen flex font-sans text-[#252525]">
      <section className="w-[40%] overflow-hidden">
        <img src={image} alt="" className="w-full h-full object-cover" />
      </section>
      <section className="flex-1 grid place-items-center px-6 py-10">
          <form onSubmit={submit} className="flex flex-col w-[min(100%,390px)]" noValidate>
            <img src={logo} className="w-[175px] self-center mb-2" alt="DentalClinic" />
            <p className="self-center text-[#888] text-sm mb-8">Sistema de Gestión Odontológica</p>
            <h1 className="m-0 text-[25px] font-medium">Bienvenido</h1>
            <p className="mt-1 mb-6 text-[#888] text-sm">Ingresa tus credenciales para acceder</p>
            {notice ? <div role="status" className="bg-[#eefaf4] text-[#17603e] px-3 py-2.5 mb-3.5 rounded-md text-sm">{notice}</div> : null}
            {error && <div role="alert" className="bg-[#fff0f0] text-[#a51d1d] px-3 py-2.5 mb-3.5 rounded-md text-sm">{error}</div>}
            <label htmlFor="email" className="text-sm font-bold mb-1.5">Correo Electronico</label>
            <input id="email" name="email" type="email" value={form.email} onChange={change} placeholder="Enter your email" autoComplete="email" className="px-3 py-3 mb-4 border border-[#d5d5d5] rounded-lg text-sm" />
            <label htmlFor="password" className="text-sm font-bold mb-1.5">Constraseña</label>
            <input id="password" name="password" type="password" value={form.password} onChange={change} placeholder="••••••••" autoComplete="current-password" className="px-3 py-3 mb-4 border border-[#d5d5d5] rounded-lg text-sm" />
            <div className="flex justify-between items-center mb-10 text-xs">
              <label className="font-normal flex items-center gap-1.5"><input name="remember" type="checkbox" checked={form.remember} onChange={change} /> Recuérdame</label>
              <Link to="/recuperar-contrasena" className="text-[#252525] no-underline font-semibold">¿Has olvidado tu contraseña?</Link>
            </div>
            <CustomButton type="submit" disabled={loading}>{loading ? 'Iniciando sesión…' : 'Iniciar sesión'}</CustomButton>
          </form>
        </section>
    </main>
  )
}
