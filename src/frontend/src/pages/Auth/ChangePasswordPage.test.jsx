import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { AuthProvider } from '../../context/AuthContext'
import * as authService from '../../services/authService'

vi.mock('../../services/authService')

const session = {
  access: 'access-token',
  refresh: 'refresh-token',
  user: { email: 'recepcion@test.com', first_name: 'Marta', role: 'RECEPCIONISTA' },
}

function renderPage(authenticated = true) {
  if (authenticated) sessionStorage.setItem('dentalclinic_session', JSON.stringify(session))
  return render(
    <MemoryRouter initialEntries={['/cambiar-contrasena']}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  )
}

function fillPasswords(current, next, confirmation) {
  fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: current } })
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: next } })
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: confirmation } })
}

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
    authService.logout.mockResolvedValue(undefined)
  })
  afterEach(cleanup)

  it('is protected from unauthenticated access', () => {
    renderPage(false)

    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument()
  })

  it('rejects mismatched new passwords before submitting', async () => {
    renderPage()
    fillPasswords('Actual123!', 'Nueva456!', 'Otra789!')
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.')
    expect(authService.changePassword).not.toHaveBeenCalled()
  })

  it('shows the password policy error returned by the API', async () => {
    authService.changePassword.mockRejectedValue(new Error('Esta contraseña es demasiado corta.'))
    renderPage()
    fillPasswords('Actual123!', '123', '123')
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta contraseña es demasiado corta.')
    expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument()
  })

  it('clears the session and confirms the successful change on login', async () => {
    authService.changePassword.mockResolvedValue({
      detail: 'Tu contraseña fue actualizada correctamente.',
    })
    renderPage()
    fillPasswords('Actual123!', 'NuevaContraseña456!', 'NuevaContraseña456!')
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Tu contraseña fue actualizada correctamente.')
    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    expect(localStorage.getItem('dentalclinic_session')).toBeNull()
    expect(sessionStorage.getItem('dentalclinic_session')).toBeNull()
  })
})
