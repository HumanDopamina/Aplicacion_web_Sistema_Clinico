import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const menuByRole = {
  ADMINISTRADOR: [
    { to: '/usuarios', label: 'Usuarios' },
    { to: '/pacientes', label: 'Pacientes' },
    { to: '/clinicas', label: 'Clínicas' },
    { to: '/citas', label: 'Citas' },
  ],
  RECEPCIONISTA: [
    { to: '/pacientes', label: 'Pacientes' },
    { to: '/citas', label: 'Citas' },
  ],
  ODONTOLOGO: [
    { to: '/pacientes', label: 'Pacientes' },
    { to: '/citas', label: 'Citas' },
  ],
}

export default function Sidebar() {
  const { user } = useAuth()
  const items = menuByRole[user?.role] || []
  return (
    <nav className="w-[220px] bg-[#f4f4f4] border-r border-[#ddd] py-4">
      <ul className="list-none p-0 m-0">
        {items.map(({ to, label }) => (
          <li key={to}>
            <NavLink to={to} className={({ isActive }) => `block px-5 py-2.5 text-sm no-underline transition-colors duration-150 ${isActive ? 'bg-[#1269ad] text-white font-semibold' : 'text-[#333] hover:bg-[#ddd]'}`}>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
