import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/authContextValue'
import LoginPage from './pages/Auth/LoginPage'
import WelcomePage from './pages/Auth/WelcomePage'
import PasswordResetRequestPage from './pages/Auth/PasswordResetRequestPage'
import PasswordResetConfirmPage from './pages/Auth/PasswordResetConfirmPage'
import ChangePasswordPage from './pages/Auth/ChangePasswordPage'
import SettingsPage from './pages/Settings/SettingsPage'
import PatientsPage from './pages/Patients/PatientsPage'
import PatientDetailPage from './pages/Patients/PatientDetailPage'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'

function ProtectedLayout({ children, allowedRoles, requiredPermission }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/bienvenida" replace />
  }
  if (requiredPermission && user.role !== 'ADMINISTRADOR' && !user.permissions?.includes(requiredPermission)) {
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
    <Route path="/pacientes" element={<ProtectedLayout requiredPermission="patients.view"><PatientsPage /></ProtectedLayout>} />
    <Route path="/pacientes/:id" element={<ProtectedLayout requiredPermission="patients.view"><PatientDetailPage /></ProtectedLayout>} />
    <Route path="/clinicas" element={<ProtectedLayout allowedRoles={['ADMINISTRADOR']}><ModulePage title="Clínicas" /></ProtectedLayout>} />
    <Route path="/citas" element={<ProtectedLayout><ModulePage title="Citas" /></ProtectedLayout>} />
    <Route path="/configuracion" element={<ProtectedLayout allowedRoles={['ADMINISTRADOR']}><SettingsPage /></ProtectedLayout>} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
}
