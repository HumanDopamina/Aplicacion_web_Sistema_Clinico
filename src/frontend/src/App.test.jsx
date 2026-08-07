import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import * as authService from './services/authService'

vi.mock('./services/authService')

const session = (role) => ({
  access: 'access-token',
  refresh: 'refresh-token',
  user: { email: `${role.toLowerCase()}@test.com`, first_name: 'Usuario', role },
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
  afterEach(cleanup)

  it.each([
    ['ADMINISTRADOR', ['Usuarios', 'Pacientes', 'Clínicas', 'Citas']],
    ['RECEPCIONISTA', ['Pacientes', 'Citas']],
    ['ODONTOLOGO', ['Pacientes', 'Citas']],
  ])('shows only the menu allowed for %s', (role, expectedItems) => {
    renderAuthenticated(role)

    for (const item of expectedItems) {
      expect(screen.getByRole('link', { name: item })).toBeInTheDocument()
    }
    if (role !== 'ADMINISTRADOR') {
      expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Clínicas' })).not.toBeInTheDocument()
    }
  })

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

    expect(screen.getByRole('heading', { name: 'Bienvenido, Usuario' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Usuarios' })).not.toBeInTheDocument()
  })

  it('offers password change navigation to every authenticated role', () => {
    renderAuthenticated('ODONTOLOGO')

    expect(screen.getByRole('link', { name: 'Cambiar contraseña' })).toHaveAttribute(
      'href',
      '/cambiar-contrasena',
    )
  })
})
