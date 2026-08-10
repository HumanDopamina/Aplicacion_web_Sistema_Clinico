import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ClinicProvider } from './context/ClinicContext.jsx'

const router = createBrowserRouter([{ path: '*', element: <App /> }])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider><ClinicProvider><RouterProvider router={router} /></ClinicProvider></AuthProvider>
  </StrictMode>,
)
