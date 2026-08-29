import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import { useAuth } from './authContextValue'

vi.mock('../services/authService', () => ({
  logout: vi.fn(),
  restoreSession: vi.fn(),
}))

import { restoreSession } from '../services/authService'

function ProfileUpdater() {
  const { signIn, updateUser, user } = useAuth()
  return (
    <>
      <span>{user?.first_name || 'Sin usuario'}</span>
      <button type="button" onClick={() => signIn({ access: 'access-token', user: { id: 4, first_name: 'Elena', role: 'ODONTOLOGO' } })}>
        Iniciar sesión
      </button>
      <button type="button" onClick={() => updateUser({ ...user, first_name: 'Elena María' })} disabled={!user}>
        Actualizar sesión
      </button>
    </>
  )
}

describe('AuthProvider profile synchronization', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    restoreSession.mockRejectedValue(new Error('Sin cookie'))
  })
  afterEach(() => cleanup())

  it('updates the active user only in memory', () => {
    render(<AuthProvider><ProfileUpdater /></AuthProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar sesión' }))

    expect(screen.getByText('Elena María')).toBeInTheDocument()
    expect(localStorage.getItem('dentalclinic_session')).toBeNull()
    expect(sessionStorage.getItem('dentalclinic_session')).toBeNull()
  })
})
