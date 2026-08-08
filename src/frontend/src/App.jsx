import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/authContextValue'
import LoginPage from './pages/Auth/LoginPage'
import WelcomePage from './pages/Auth/WelcomePage'
import PasswordResetRequestPage from './pages/Auth/PasswordResetRequestPage'
import PasswordResetConfirmPage from './pages/Auth/PasswordResetConfirmPage'
import ChangePasswordPage from './pages/Auth/ChangePasswordPage'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'

function ProtectedLayout({ children, allowedRoles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/bienvenida" replace />
  }
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Navbar />
        <main className="p-5 sm:p-7 lg:p-10">{children}</main>
      </div>
    </div>
  )
}

function ModulePage({ title }) {
  return <h1>{title}</h1>
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/recuperar-contrasena" element={<PasswordResetRequestPage />} />
    <Route path="/restablecer-contrasena/:uid/:token" element={<PasswordResetConfirmPage />} />
    <Route path="/bienvenida" element={<ProtectedLayout><WelcomePage /></ProtectedLayout>} />
    <Route path="/cambiar-contrasena" element={<ProtectedLayout><ChangePasswordPage /></ProtectedLayout>} />
    <Route path="/usuarios" element={<ProtectedLayout allowedRoles={['ADMINISTRADOR']}><ModulePage title="Usuarios" /></ProtectedLayout>} />
    <Route path="/pacientes" element={<ProtectedLayout><ModulePage title="Pacientes" /></ProtectedLayout>} />
    <Route path="/clinicas" element={<ProtectedLayout allowedRoles={['ADMINISTRADOR']}><ModulePage title="Clínicas" /></ProtectedLayout>} />
    <Route path="/citas" element={<ProtectedLayout><ModulePage title="Citas" /></ProtectedLayout>} />
    <Route path="/configuracion" element={<ProtectedLayout><ModulePage title="Configuración" /></ProtectedLayout>} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
}
