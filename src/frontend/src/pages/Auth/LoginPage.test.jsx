import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../context/AuthContext'
import LoginPage from './LoginPage'
import * as authService from '../../services/authService'

vi.mock('../../services/authService')

const renderPage = () => render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>)

describe('LoginPage', () => {
  afterEach(cleanup)
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })
  it('validates empty credentials', async () => {
    renderPage(); fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ingresa tu correo electrónico y contraseña.')
  })
  it('persists a remembered session', async () => {
    authService.login.mockResolvedValue({ access: 'access', refresh: 'refresh', user: { email: 'admin@test.com', role: 'ADMINISTRADOR' } })
    renderPage()
    fireEvent.change(screen.getByLabelText('Correo Electronico'), { target: { value: 'admin@test.com' } })
    fireEvent.change(screen.getByLabelText('Constraseña'), { target: { value: 'secreto' } })
    fireEvent.click(screen.getByLabelText('Recuérdame'))
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await waitFor(() => expect(authService.login).toHaveBeenCalled())
    expect(localStorage.getItem('dentalclinic_session')).toContain('admin@test.com')
  })
  it('links to the password recovery flow', () => {
    renderPage()

    expect(screen.getByRole('link', { name: '¿Has olvidado tu contraseña?' })).toHaveAttribute(
      'href',
      '/recuperar-contrasena',
    )
  })
  it('shows the generic API error for invalid credentials', async () => {
    authService.login.mockRejectedValue(new Error('Correo electrónico o contraseña incorrectos.'))
    renderPage()
    fireEvent.change(screen.getByLabelText('Correo Electronico'), { target: { value: 'unknown@test.com' } })
    fireEvent.change(screen.getByLabelText('Constraseña'), { target: { value: 'incorrecta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo electrónico o contraseña incorrectos.')
    expect(localStorage.getItem('dentalclinic_session')).toBeNull()
    expect(sessionStorage.getItem('dentalclinic_session')).toBeNull()
  })
})
