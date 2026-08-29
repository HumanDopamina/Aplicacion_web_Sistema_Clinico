import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/authContextValue'
import LoginPage from './pages/Auth/LoginPage'
import WelcomePage from './pages/Auth/WelcomePage'
import PasswordResetRequestPage from './pages/Auth/PasswordResetRequestPage'
import PasswordResetConfirmPage from './pages/Auth/PasswordResetConfirmPage'
import ChangePasswordPage from './pages/Auth/ChangePasswordPage'
import SettingsPage from './pages/Settings/SettingsPage'
import PatientsPage from './pages/Patients/PatientsPage'
import PatientRecordPage from './pages/Patients/PatientRecordPage'
import PatientConsultationsPage from './pages/Patients/PatientConsultationsPage'
import ConsultationRecordPage from './pages/Patients/ConsultationRecordPage'
import ConsultationOdontogramPage from './pages/Patients/ConsultationOdontogramPage'
import PatientOdontogramHistoryPage from './pages/Patients/PatientOdontogramHistoryPage'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'

const AppointmentsPage = lazy(() => import('./pages/Appointments/AppointmentsPage'))
const PatientDocumentsPage = lazy(() => import('./pages/Patients/PatientDocumentsPage'))
const MyProfilePage = lazy(() => import('./pages/Profile/MyProfilePage'))

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
  const { initializing } = useAuth()
  if (initializing) {
    return <main className="grid min-h-screen place-items-center text-sm text-slate-500" role="status">Inicializando sesión…</main>
  }
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/recuperar-contrasena" element={<PasswordResetRequestPage />} />
    <Route path="/restablecer-contrasena/:uid/:token" element={<PasswordResetConfirmPage />} />
    <Route path="/bienvenida" element={<ProtectedLayout><WelcomePage /></ProtectedLayout>} />
    <Route path="/cambiar-contrasena" element={<ProtectedLayout><ChangePasswordPage /></ProtectedLayout>} />
    <Route path="/mi-perfil" element={<ProtectedLayout><Suspense fallback={<p className="text-sm text-slate-500">Cargando perfil…</p>}><MyProfilePage /></Suspense></ProtectedLayout>} />
    <Route path="/usuarios" element={<ProtectedLayout allowedRoles={['ADMINISTRADOR']}><ModulePage title="Usuarios" /></ProtectedLayout>} />
    <Route path="/pacientes" element={<ProtectedLayout requiredPermission="patients.view"><PatientsPage /></ProtectedLayout>} />
    <Route path="/pacientes/nuevo" element={<ProtectedLayout requiredPermission="patients.create"><PatientRecordPage isNew /></ProtectedLayout>} />
    <Route path="/pacientes/:patientId/consultas/nueva" element={<ProtectedLayout requiredPermission="consultations.create"><ConsultationRecordPage isNew /></ProtectedLayout>} />
    <Route path="/pacientes/:patientId/consultas/:consultationId/odontograma" element={<ProtectedLayout requiredPermission="consultations.view"><ConsultationOdontogramPage /></ProtectedLayout>} />
    <Route path="/pacientes/:patientId/consultas/:consultationId" element={<ProtectedLayout requiredPermission="consultations.view"><ConsultationRecordPage /></ProtectedLayout>} />
    <Route path="/pacientes/:patientId/consultas" element={<ProtectedLayout requiredPermission="consultations.view"><PatientConsultationsPage /></ProtectedLayout>} />
    <Route path="/pacientes/:patientId/odontogramas" element={<ProtectedLayout requiredPermission="consultations.view"><PatientOdontogramHistoryPage /></ProtectedLayout>} />
    <Route path="/pacientes/:patientId/documentos" element={<ProtectedLayout requiredPermission="documents.view"><Suspense fallback={<p className="text-sm text-slate-500">Cargando documentos…</p>}><PatientDocumentsPage /></Suspense></ProtectedLayout>} />
    <Route path="/pacientes/:id" element={<ProtectedLayout requiredPermission="patients.view"><PatientRecordPage /></ProtectedLayout>} />
    <Route path="/clinicas" element={<ProtectedLayout allowedRoles={['ADMINISTRADOR']}><ModulePage title="Clínicas" /></ProtectedLayout>} />
    <Route path="/citas" element={<ProtectedLayout requiredPermission="appointments.view"><Suspense fallback={<p className="text-sm text-slate-500">Cargando agenda…</p>}><AppointmentsPage /></Suspense></ProtectedLayout>} />
    <Route path="/configuracion" element={<ProtectedLayout allowedRoles={['ADMINISTRADOR']}><SettingsPage /></ProtectedLayout>} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
}
