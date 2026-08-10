import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../context/authContextValue'
import * as userService from '../../services/userService'
import * as clinicService from '../../services/clinicService'
import SettingsPage from './SettingsPage'

vi.mock('../../services/userService', () => ({
  createUser: vi.fn(),
  listRolePermissionPresets: vi.fn(),
  listUsers: vi.fn(),
  updateRolePermissionPreset: vi.fn(),
  updateUser: vi.fn(),
}))
vi.mock('../../services/clinicService', () => ({
  createClinicService: vi.fn(), createClosure: vi.fn(), createServiceCategory: vi.fn(),
  getBusinessHours: vi.fn(), getClinicOptions: vi.fn(), listClinicServices: vi.fn(),
  listClosures: vi.fn(), listServiceCategories: vi.fn(), updateBusinessHours: vi.fn(),
  updateClinicProfile: vi.fn(), updateClinicService: vi.fn(), updateClosure: vi.fn(),
  updateServiceCategory: vi.fn(),
}))

const renderPage = () => render(
  <MemoryRouter>
    <AuthContext.Provider value={{ accessToken: 'access-token' }}>
      <SettingsPage />
    </AuthContext.Provider>
  </MemoryRouter>,
)

const fillForm = () => {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Lucía' } })
  fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Méndez' } })
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'nuevo@dentalclinic.com' } })
  fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'ODONTOLOGO' } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ContraseñaSegura123!' } })
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'ContraseñaSegura123!' } })
}

const openStaff = () => {
  fireEvent.click(screen.getByRole('button', { name: /Gestión de Staff/ }))
}

describe('SettingsPage staff management', () => {
  beforeEach(() => {
    clinicService.getClinicOptions.mockResolvedValue({
      currencies: [{ value: 'NIO', label: 'Córdoba' }],
      timezones: ['America/Managua'],
    })
    clinicService.getBusinessHours.mockResolvedValue({ days: Array.from({ length: 7 }, (_, weekday) => ({ weekday, is_open: false, opens_at: null, closes_at: null, breaks: [] })) })
    clinicService.listClosures.mockResolvedValue([])
    clinicService.listServiceCategories.mockResolvedValue([])
    clinicService.listClinicServices.mockResolvedValue([])
    clinicService.updateClinicProfile.mockResolvedValue({ name: 'Clínica Argüello', tagline: '', phone: '', email: '', address: '', logo_url: '', currency: 'NIO', timezone: 'America/Managua' })
    userService.listUsers.mockResolvedValue([])
    userService.createUser.mockResolvedValue({
      id: 2,
      email: 'nuevo@dentalclinic.com',
      first_name: 'Lucía',
      last_name: 'Méndez',
      role: 'ODONTOLOGO',
      is_active: true,
    })
    userService.updateUser.mockResolvedValue({
      id: 7,
      email: 'elena.editada@dentalclinic.com',
      first_name: 'Elena',
      last_name: 'Vargas',
      role: 'ODONTOLOGO',
      is_active: false,
    })
    userService.listRolePermissionPresets.mockResolvedValue({
      available_permissions: [
        { code: 'patients.view', label: 'Ver pacientes', group: 'Pacientes' },
        { code: 'patients.create', label: 'Registrar pacientes', group: 'Pacientes' },
        { code: 'patients.edit', label: 'Editar pacientes', group: 'Pacientes' },
        { code: 'consultations.view', label: 'Ver consultas', group: 'Consultas' },
        { code: 'consultations.view_all', label: 'Ver consultas de todo el equipo', group: 'Consultas' },
        { code: 'appointments.view', label: 'Ver citas', group: 'Citas' },
        { code: 'appointments.view_all', label: 'Ver citas de todo el equipo', group: 'Citas' },
        { code: 'appointments.create', label: 'Crear citas', group: 'Citas' },
        { code: 'appointments.edit', label: 'Editar citas', group: 'Citas' },
      ],
      presets: [
        { role: 'RECEPCIONISTA', permissions: ['patients.view', 'patients.create', 'patients.edit', 'appointments.view', 'appointments.view_all', 'appointments.create', 'appointments.edit'] },
        { role: 'ODONTOLOGO', permissions: ['patients.view', 'appointments.view'] },
      ],
    })
    userService.updateRolePermissionPreset.mockResolvedValue({
      role: 'ODONTOLOGO',
      permissions: ['patients.view', 'patients.create', 'appointments.view'],
    })
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens with the clinic profile selected', async () => {
    renderPage()

    expect(screen.getByRole('button', { name: /Perfil de la clínica/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: /Gestión de Staff/ })).not.toHaveAttribute('aria-current')
    expect(await screen.findByRole('heading', { name: 'Perfil de la clínica' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Gestión de Staff' })).not.toBeInTheDocument()
  })

  it('shows an empty state when no staff users exist', async () => {
    renderPage()
    openStaff()

    expect(await screen.findByText('Aún no hay miembros registrados.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Añadir miembro' })).toBeInTheDocument()
  })

  it('opens operational panels only when selected and saves the clinic profile', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Perfil de la clínica' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nombre de la clínica'), { target: { value: 'Clínica Argüello' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(clinicService.updateClinicProfile).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: /Horarios de atención/ }))
    expect(await screen.findByRole('heading', { name: 'Horarios de atención' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Servicios y tarifas/ }))
    expect(await screen.findByRole('heading', { name: 'Servicios y tarifas' })).toBeInTheDocument()
    expect(screen.getByText('Aún no hay categorías.')).toBeInTheDocument()
  })

  it('[HU-09] shows every registered user with role and active status', async () => {
    userService.listUsers.mockResolvedValue([
      {
        id: 2,
        email: 'ana@dentalclinic.com',
        first_name: 'Ana',
        last_name: 'Pérez',
        role: 'ODONTOLOGO',
        is_active: true,
      },
      {
        id: 3,
        email: 'bruno@dentalclinic.com',
        first_name: 'Bruno',
        last_name: 'López',
        role: 'RECEPCIONISTA',
        is_active: false,
      },
    ])
    renderPage()
    openStaff()

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Bruno López')).toBeInTheDocument()
    expect(screen.getByText('Odontólogo')).toBeInTheDocument()
    expect(screen.getByText('Recepcionista')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
  })

  it('[HU-09] lets an administrator update the permissions preset for a role', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Permisos por rol/ }))
    expect(await screen.findByRole('heading', { name: 'Permisos por rol' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recepcionista' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Editar pacientes')).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Odontólogo' }))
    expect(screen.getByLabelText('Registrar pacientes')).not.toBeChecked()
    expect(screen.getByLabelText('Editar pacientes')).not.toBeChecked()

    fireEvent.click(screen.getByLabelText('Registrar pacientes'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar permisos' }))

    await waitFor(() => expect(userService.updateRolePermissionPreset).toHaveBeenCalledWith(
      'access-token',
      'ODONTOLOGO',
      ['patients.view', 'patients.create', 'appointments.view'],
    ))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Permisos de Odontólogo actualizados.',
    )
  })

  it('removes team appointment visibility when base appointment access is disabled', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Permisos por rol/ }))
    expect(await screen.findByLabelText('Ver citas de todo el equipo')).toBeChecked()

    fireEvent.click(screen.getByLabelText('Ver citas'))

    expect(screen.getByLabelText('Ver citas')).not.toBeChecked()
    expect(screen.getByLabelText('Ver citas de todo el equipo')).not.toBeChecked()
  })

  it('keeps team consultation visibility dependent on base consultation access', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Permisos por rol/ }))
    expect(await screen.findByLabelText('Ver consultas de todo el equipo')).not.toBeChecked()

    fireEvent.click(screen.getByLabelText('Ver consultas de todo el equipo'))
    expect(screen.getByLabelText('Ver consultas')).toBeChecked()
    expect(screen.getByLabelText('Ver consultas de todo el equipo')).toBeChecked()

    fireEvent.click(screen.getByLabelText('Ver consultas'))
    expect(screen.getByLabelText('Ver consultas')).not.toBeChecked()
    expect(screen.getByLabelText('Ver consultas de todo el equipo')).not.toBeChecked()
  })

  it('registers a member and adds it to the staff list', async () => {
    renderPage()
    openStaff()
    fireEvent.click(await screen.findByRole('button', { name: 'Añadir miembro' }))
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: 'Guardar usuario' }))

    expect(await screen.findByText('Lucía Méndez')).toBeInTheDocument()
    expect(screen.getByText('nuevo@dentalclinic.com')).toBeInTheDocument()
    expect(userService.createUser).toHaveBeenCalledWith('access-token', {
      email: 'nuevo@dentalclinic.com',
      first_name: 'Lucía',
      last_name: 'Méndez',
      role: 'ODONTOLOGO',
      password: 'ContraseñaSegura123!',
      confirm_password: 'ContraseñaSegura123!',
    })
  })

  it('shows the duplicate warning returned by the API', async () => {
    userService.createUser.mockRejectedValue(
      new Error('Ya existe un usuario con este correo electrónico.'),
    )
    renderPage()
    openStaff()
    fireEvent.click(await screen.findByRole('button', { name: 'Añadir miembro' }))
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: 'Guardar usuario' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe un usuario con este correo electrónico.',
    )
    await waitFor(() => expect(userService.createUser).toHaveBeenCalledTimes(1))
  })

  it('[HU-06/HU-08] edits information and role without sending a password', async () => {
    userService.listUsers.mockResolvedValue([{
      id: 7,
      email: 'elena@dentalclinic.com',
      first_name: 'Elena',
      last_name: 'Méndez',
      role: 'RECEPCIONISTA',
      is_active: true,
    }])
    userService.updateUser.mockResolvedValue({
      id: 7,
      email: 'elena.editada@dentalclinic.com',
      first_name: 'Elena',
      last_name: 'Vargas',
      role: 'ODONTOLOGO',
      is_active: true,
    })
    renderPage()
    openStaff()

    fireEvent.click(await screen.findByRole('button', { name: 'Editar a Elena Méndez' }))
    expect(screen.getByRole('dialog', { name: 'Editar miembro' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Vargas' } })
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'elena.editada@dentalclinic.com' } })
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'ODONTOLOGO' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('elena.editada@dentalclinic.com')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(userService.updateUser).toHaveBeenCalledWith('access-token', 7, {
      email: 'elena.editada@dentalclinic.com',
      first_name: 'Elena',
      last_name: 'Vargas',
      role: 'ODONTOLOGO',
      is_active: true,
    })
  })

  it('[HU-07] deactivates a member and updates the visible status', async () => {
    userService.listUsers.mockResolvedValue([{
      id: 7,
      email: 'elena@dentalclinic.com',
      first_name: 'Elena',
      last_name: 'Méndez',
      role: 'RECEPCIONISTA',
      is_active: true,
    }])
    renderPage()
    openStaff()

    fireEvent.click(await screen.findByRole('button', { name: 'Editar a Elena Méndez' }))
    fireEvent.click(screen.getByLabelText('Usuario activo'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Inactivo')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Editar miembro' })).not.toBeInTheDocument()
    expect(userService.updateUser).toHaveBeenCalledWith('access-token', 7, {
      email: 'elena@dentalclinic.com',
      first_name: 'Elena',
      last_name: 'Méndez',
      role: 'RECEPCIONISTA',
      is_active: false,
    })
  })
})
