import { NavLink } from 'react-router-dom'
import logo from '../assets/logo_login.svg'
import { useAuth } from '../context/authContextValue'
import { useClinic } from '../context/clinicContextValue'
import { hasAnyCapability, hasCapability } from '../utils/capabilities'

const menuItems = [
  { to: '/bienvenida', label: 'Dashboard', icon: 'dashboard' },
  { to: '/pacientes', label: 'Pacientes', icon: 'patients', capability: 'patients.view' },
  { to: '/citas', label: 'Citas', icon: 'appointments', capability: 'appointments.view' },
  {
    to: '/configuracion',
    label: 'Configuración',
    icon: 'settings',
    anyCapabilities: ['clinic.manage', 'users.manage'],
  },
]

function MenuIcon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    patients: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    appointments: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.17.36.38.7.6 1 .3.3.7.4 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7.6Z" /></>,
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill={name === 'dashboard' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

export default function Sidebar() {
  const { profile } = useClinic()
  const { user } = useAuth()
  const visibleItems = menuItems.filter(({ capability, anyCapabilities }) => (
    (!capability || hasCapability(user, capability))
    && (!anyCapabilities || hasAnyCapability(user, anyCapabilities))
  ))
  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white px-4 py-4 md:min-h-screen md:w-56 md:border-b-0 md:border-r md:px-5 md:py-6">
      <div className="mb-4 flex items-center justify-between md:mb-7 md:block">
        <img src={profile.logo_url || logo} alt="Dental Clinic" className="h-14 w-auto object-contain object-left md:h-20 md:max-w-40" />
        <strong className="hidden truncate font-serif text-lg text-slate-900 md:mt-1 md:block">{profile.name}</strong>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 md:mt-1 md:block">Panel clínico</span>
      </div>
      <nav aria-label="Navegación principal">
        <ul className="m-0 flex list-none gap-1 overflow-x-auto p-0 md:block md:space-y-1.5">
          {visibleItems.map(({ to, label, icon }) => (
            <li key={to} className="shrink-0">
              <NavLink
                to={to}
                className={({ isActive }) => `flex items-center gap-3 rounded-md px-2.5 py-2.5 text-[13px] font-medium no-underline transition-colors ${isActive ? 'bg-[#e5eff8] text-[#0068b5]' : 'text-[#354052] hover:bg-slate-50 hover:text-slate-950'}`}
              >
                <MenuIcon name={icon} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
