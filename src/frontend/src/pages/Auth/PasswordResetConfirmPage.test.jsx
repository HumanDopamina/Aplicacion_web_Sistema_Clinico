import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as authService from '../../services/authService'
import PasswordResetConfirmPage from './PasswordResetConfirmPage'

vi.mock('../../services/authService')

const renderPage = () => render(
  <MemoryRouter initialEntries={['/restablecer-contrasena/uid-value/token-value']}>
    <Routes>
      <Route path="/restablecer-contrasena/:uid/:token" element={<PasswordResetConfirmPage />} />
    </Routes>
  </MemoryRouter>,
)

function fillPasswords(password, confirmation) {
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: confirmation } })
}

describe('PasswordResetConfirmPage', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('rejects different passwords before calling the API', async () => {
    renderPage()
    fillPasswords('NuevaContraseña123!', 'OtraContraseña123!')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.')
    expect(authService.confirmPasswordReset).not.toHaveBeenCalled()
  })

  it('shows a login action after resetting the password', async () => {
    authService.confirmPasswordReset.mockResolvedValue({
      detail: 'Tu contraseña fue restablecida correctamente.',
    })
    renderPage()
    fillPasswords('NuevaContraseña123!', 'NuevaContraseña123!')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Tu contraseña fue restablecida correctamente.',
    )
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
  })

  it('explains when the reset link is invalid or expired', async () => {
    authService.confirmPasswordReset.mockRejectedValue(new Error('El enlace no es válido o ha expirado.'))
    renderPage()
    fillPasswords('NuevaContraseña123!', 'NuevaContraseña123!')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El enlace no es válido o ha expirado.')
    expect(screen.getByRole('link', { name: 'Solicitar otro enlace' })).toHaveAttribute(
      'href',
      '/recuperar-contrasena',
    )
  })
})
