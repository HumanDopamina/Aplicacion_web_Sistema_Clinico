import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../context/authContextValue'
import * as userService from '../../services/userService'
import SettingsPage from './SettingsPage'

vi.mock('../../services/userService')

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

describe('SettingsPage staff management', () => {
  beforeEach(() => {
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
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows an empty state when no staff users exist', async () => {
    renderPage()

    expect(await screen.findByText('Aún no hay miembros registrados.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Añadir miembro' })).toBeInTheDocument()
  })

  it('registers a member and adds it to the staff list', async () => {
    renderPage()
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
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Editar a Elena Méndez' }))
    expect(screen.getByRole('dialog', { name: 'Editar miembro' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Vargas' } })
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'elena.editada@dentalclinic.com' } })
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'ODONTOLOGO' } })
    fireEvent.click(screen.getByLabelText('Usuario activo'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('elena.editada@dentalclinic.com')).toBeInTheDocument()
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
    expect(userService.updateUser).toHaveBeenCalledWith('access-token', 7, {
      email: 'elena.editada@dentalclinic.com',
      first_name: 'Elena',
      last_name: 'Vargas',
      role: 'ODONTOLOGO',
      is_active: false,
    })
  })
})
