import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContextValue'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const initials = (user?.first_name || user?.email || 'U').slice(0, 2).toUpperCase()

  return (
    <header className="flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <label className="relative hidden max-w-sm flex-1 sm:block">
        <span className="sr-only">Buscar pacientes o citas</span>
        <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
        <input type="search" placeholder="Buscar pacientes, citas..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
      </label>
      <div className="ml-auto flex items-center gap-1.5">
        <button type="button" aria-label="Notificaciones" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">●</button>
        <Link to="/cambiar-contrasena" className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 no-underline hover:bg-slate-100">Cambiar contraseña</Link>
        <button type="button" onClick={signOut} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cerrar sesión</button>
        <div aria-label={user?.first_name || user?.email} className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{initials}</div>
      </div>
    </header>
  )
}
