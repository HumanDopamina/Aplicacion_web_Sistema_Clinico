import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as authService from '../../services/authService'
import PasswordResetRequestPage from './PasswordResetRequestPage'

vi.mock('../../services/authService')

const renderPage = () => render(
  <MemoryRouter><PasswordResetRequestPage /></MemoryRouter>,
)

describe('PasswordResetRequestPage', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('requires an email before requesting recovery', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ingresa tu correo electrónico.')
    expect(authService.requestPasswordReset).not.toHaveBeenCalled()
  })

  it('shows the generic confirmation after a successful request', async () => {
    authService.requestPasswordReset.mockResolvedValue({
      detail: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
    })
    renderPage()
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'user@test.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
    )
    expect(screen.getByRole('link', { name: /Volver al inicio de sesión/ })).toHaveAttribute('href', '/login')
  })

  it('keeps the form available when the API cannot process the request', async () => {
    authService.requestPasswordReset.mockRejectedValue(new Error('No fue posible enviar la solicitud.'))
    renderPage()
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'user@test.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible enviar la solicitud.')
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
  })
})
