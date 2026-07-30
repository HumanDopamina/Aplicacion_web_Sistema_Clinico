import { useAuth } from '../context/AuthContext'

const roleLabels = {
  ADMINISTRADOR: 'Administrador',
  RECEPCIONISTA: 'Recepcionista',
  ODONTOLOGO: 'Odontólogo',
}

export default function Navbar() {
  const { user, signOut } = useAuth()
  return (
    <header className="flex items-center gap-4 px-5 py-2.5 bg-[#1269ad] text-white text-sm">
      <span className="font-bold text-base mr-auto">Sistema Clínico Dental</span>
      <span className="bg-white/20 px-2.5 py-1 rounded">{roleLabels[user?.role] || user?.role}</span>
      <span className="font-semibold">{user?.first_name || user?.email}</span>
      <button type="button" onClick={signOut} className="bg-transparent border border-white text-white px-3.5 py-1 rounded-md cursor-pointer text-xs hover:bg-white/20">Cerrar sesión</button>
    </header>
  )
}
