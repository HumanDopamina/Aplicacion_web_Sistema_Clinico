import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import { useAuth } from './authContextValue'

vi.mock('../services/authService', () => ({ logout: vi.fn() }))

function ProfileUpdater() {
  const { updateUser, user } = useAuth()
  return (
    <>
      <span>{user.first_name}</span>
      <button type="button" onClick={() => updateUser({ ...user, first_name: 'Elena María' })}>
        Actualizar sesión
      </button>
    </>
  )
}

describe('AuthProvider profile synchronization', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    sessionStorage.setItem('dentalclinic_session', JSON.stringify({
      access: 'access-token',
      refresh: 'refresh-token',
      user: { id: 4, first_name: 'Elena', role: 'ODONTOLOGO' },
    }))
  })
  afterEach(() => cleanup())

  it('updates the active user without changing the chosen session storage', () => {
    render(<AuthProvider><ProfileUpdater /></AuthProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar sesión' }))

    expect(screen.getByText('Elena María')).toBeInTheDocument()
    expect(JSON.parse(sessionStorage.getItem('dentalclinic_session')).user.first_name).toBe('Elena María')
    expect(localStorage.getItem('dentalclinic_session')).toBeNull()
  })
})
