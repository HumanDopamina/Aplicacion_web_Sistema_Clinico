import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import * as authService from './services/authService'

vi.mock('./services/authService')

const rolePermissions = {
  ADMINISTRADOR: ['patients.view', 'patients.create', 'patients.edit', 'appointments.view', 'appointments.create'],
  RECEPCIONISTA: ['patients.view', 'patients.create', 'patients.edit', 'appointments.view', 'appointments.create'],
  ODONTOLOGO: ['patients.view', 'appointments.view'],
}

const patientFixture = {
  id: 1,
  code: 'PAC-00001',
  first_name: 'María Fernanda',
  last_name: 'García',
  second_last_name: 'López',
  full_name: 'María Fernanda García López',
  birth_place: 'Managua',
  address: 'Colonia Roma Norte',
  national_id: '001-160498-0001A',
  phone: '+505 8888 1111',
  email: 'maria@example.com',
  emergency_contact_name: 'Carlos García',
  emergency_relationship: 'Hermano',
  emergency_phone: '+505 8888 2222',
  gender: 'FEMENINO',
  date_of_birth: '1998-04-16',
  is_active: true,
  created_at: '2026-08-08T12:00:00Z',
  updated_at: '2026-08-08T12:00:00Z',
  registered_by: 2,
}

const session = (role) => ({
  access: 'access-token',
  refresh: 'refresh-token',
  user: {
    email: `${role.toLowerCase()}@test.com`,
    first_name: 'Usuario',
    role,
    permissions: rolePermissions[role],
  },
})

const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
})

function BackControl() {
  const navigate = useNavigate()
  return <button type="button" onClick={() => navigate(-1)}>Atrás</button>
}

function renderAuthenticated(role, withBackControl = false, path = '/bienvenida') {
  sessionStorage.setItem('dentalclinic_session', JSON.stringify(session(role)))
  return render(
    <MemoryRouter initialEntries={['/login', path]} initialIndex={1}>
      <AuthProvider>
        {withBackControl ? <BackControl /> : null}
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('authenticated routes', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    authService.logout.mockResolvedValue(undefined)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it.each(['ADMINISTRADOR', 'RECEPCIONISTA', 'ODONTOLOGO'])(
    'shows the reference menu for %s',
    (role) => {
    renderAuthenticated(role)

    const navigation = within(screen.getByRole('navigation', { name: 'Navegación principal' }))
    const links = navigation.getAllByRole('link')
    expect(links.map((link) => link.textContent.trim())).toEqual([
      'Dashboard',
      'Pacientes',
      'Citas',
      'Configuración',
    ])
    expect(navigation.getByRole('link', { name: 'Configuración' })).toHaveAttribute(
      'href',
      '/configuracion',
    )
    expect(navigation.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
    expect(navigation.queryByRole('link', { name: 'Clínicas' })).not.toBeInTheDocument()
    }
  )

  it('clears the session and protects history after logout', async () => {
    renderAuthenticated('ADMINISTRADOR', true)

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    expect(localStorage.getItem('dentalclinic_session')).toBeNull()
    expect(sessionStorage.getItem('dentalclinic_session')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument())
    expect(screen.queryByText('Panel principal')).not.toBeInTheDocument()
  })

  it('prevents a receptionist from opening an administrator route directly', () => {
    renderAuthenticated('RECEPCIONISTA', false, '/usuarios')

    expect(screen.getByRole('heading', { name: 'Bienvenido, Dr. Usuario' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Usuarios' })).not.toBeInTheDocument()
  })

  it('prevents a receptionist from opening staff configuration directly', () => {
    renderAuthenticated('RECEPCIONISTA', false, '/configuracion')

    expect(screen.getByRole('heading', { name: 'Bienvenido, Dr. Usuario' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Configuración' })).not.toBeInTheDocument()
  })

  it('offers password change navigation to every authenticated role', () => {
    renderAuthenticated('ODONTOLOGO')

    expect(screen.getByRole('link', { name: 'Cambiar contraseña' })).toHaveAttribute(
      'href',
      '/cambiar-contrasena',
    )
  })

  it('uses the clinic logo in the main navigation and opens on the dashboard', () => {
    renderAuthenticated('ODONTOLOGO')

    expect(screen.getByRole('img', { name: 'Dental Clinic' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/bienvenida')
    expect(screen.getByRole('heading', { name: 'Bienvenido, Dr. Usuario' })).toBeInTheDocument()
  })

  it('[HU-10] registers a patient and opens the new clinical record', async () => {
    const fetchMock = vi.fn((url, options = {}) => {
      if (url.endsWith('/api/patients/') && options.method === 'POST') {
        return Promise.resolve(jsonResponse(patientFixture, 201))
      }
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      if (url.endsWith('/api/patients/')) return Promise.resolve(jsonResponse([]))
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAuthenticated('RECEPCIONISTA', false, '/pacientes')

    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo paciente' }))
    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'María Fernanda' } })
    fireEvent.change(screen.getByLabelText('Primer apellido'), { target: { value: 'García' } })
    fireEvent.change(screen.getByLabelText('Segundo apellido'), { target: { value: 'López' } })
    fireEvent.change(screen.getByLabelText('Lugar de nacimiento'), { target: { value: 'Managua' } })
    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: '001-160498-0001A' } })
    fireEvent.change(screen.getByLabelText('Género'), { target: { value: 'FEMENINO' } })
    fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '1998-04-16' } })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir paciente' }))

    expect(await screen.findByRole('heading', { name: 'María Fernanda García López' })).toBeInTheDocument()
    expect(screen.getByText('PAC-00001')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/patients/',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('[HU-10] edits patient information from the clinical record when permitted', async () => {
    const updatedPatient = {
      ...patientFixture,
      address: 'Residencial Las Colinas',
      emergency_phone: '+505 7777 3333',
      updated_at: '2026-08-08T13:00:00Z',
    }
    const fetchMock = vi.fn((url, options = {}) => {
      if (url.endsWith('/api/patients/1/') && options.method === 'PATCH') {
        return Promise.resolve(jsonResponse(updatedPatient))
      }
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAuthenticated('RECEPCIONISTA', false, '/pacientes/1')

    fireEvent.click(await screen.findByRole('button', { name: 'Editar información personal' }))
    expect(screen.getByRole('dialog', { name: 'Editar paciente' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nombres')).toHaveValue('María Fernanda')
    fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: 'Residencial Las Colinas' } })
    fireEvent.change(screen.getByLabelText('Teléfono de emergencia'), { target: { value: '+505 7777 3333' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Residencial Las Colinas')).toBeInTheDocument()
    expect(screen.getByText('+505 7777 3333')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Editar paciente' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar contacto de emergencia' })).toBeInTheDocument()
  })

  it('[HU-10] hides patient editing actions without the configured permission', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(patientFixture)))
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1')

    expect(await screen.findByRole('heading', { name: 'María Fernanda García López' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar información personal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar contacto de emergencia' })).not.toBeInTheDocument()
  })
})
