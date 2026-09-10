import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import { useAuth } from './authContextValue'

vi.mock('../services/authService', () => ({
  getCurrentSessionUser: vi.fn(),
  logout: vi.fn(),
  restoreSession: vi.fn(),
}))

import { getCurrentSessionUser, restoreSession } from '../services/authService'

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

function CapabilityProbe() {
  const { user } = useAuth()
  return <span>{user?.permissions?.join(',') || 'Sin capacidades'}</span>
}

function SessionCapabilityProbe() {
  const { signIn, user } = useAuth()
  return (
    <>
      <span>{user?.permissions?.join(',') || 'Sin capacidades'}</span>
      <button type="button" onClick={() => signIn({
        access: 'second-access-token',
        user: { id: 9, role: 'RECEPCIONISTA', permissions: ['appointments.view'] },
      })}>
        Cambiar sesión
      </button>
    </>
  )
}

describe('AuthProvider profile synchronization', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    restoreSession.mockRejectedValue(new Error('Sin cookie'))
    getCurrentSessionUser.mockReset()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('updates the active user only in memory', () => {
    render(<AuthProvider><ProfileUpdater /></AuthProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar sesión' }))

    expect(screen.getByText('Elena María')).toBeInTheDocument()
    expect(localStorage.getItem('dentalclinic_session')).toBeNull()
    expect(sessionStorage.getItem('dentalclinic_session')).toBeNull()
  })

  it('revalidates effective capabilities on focus without logout or login', async () => {
    getCurrentSessionUser.mockResolvedValue({
      id: 4,
      first_name: 'Elena',
      role: 'ODONTOLOGO',
      permissions: ['appointments.view'],
    })
    render(
      <AuthProvider initialSession={{
        access: 'access-token',
        user: { id: 4, role: 'ODONTOLOGO', permissions: ['patients.view'] },
      }}>
        <CapabilityProbe />
      </AuthProvider>,
    )

    window.dispatchEvent(new Event('focus'))

    expect(await screen.findByText('appointments.view')).toBeInTheDocument()
    expect(getCurrentSessionUser).toHaveBeenCalledWith('access-token')
    expect(localStorage.getItem('dentalclinic_session')).toBeNull()
  })

  it('deduplicates simultaneous focus revalidation triggers', async () => {
    let resolveProfile
    getCurrentSessionUser.mockReturnValue(new Promise((resolve) => { resolveProfile = resolve }))
    render(
      <AuthProvider initialSession={{
        access: 'access-token',
        user: { id: 4, role: 'ODONTOLOGO', permissions: ['patients.view'] },
      }}>
        <CapabilityProbe />
      </AuthProvider>,
    )

    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('focus'))
    expect(getCurrentSessionUser).toHaveBeenCalledTimes(1)

    resolveProfile({ id: 4, role: 'ODONTOLOGO', permissions: ['patients.view'] })
    expect(await screen.findByText('patients.view')).toBeInTheDocument()
  })

  it('does not copy a stale capability response into a different session', async () => {
    let resolveFirstSession
    getCurrentSessionUser.mockReturnValue(new Promise((resolve) => {
      resolveFirstSession = resolve
    }))
    render(
      <AuthProvider initialSession={{
        access: 'first-access-token',
        user: { id: 4, role: 'ODONTOLOGO', permissions: ['patients.view'] },
      }}>
        <SessionCapabilityProbe />
      </AuthProvider>,
    )

    window.dispatchEvent(new Event('focus'))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar sesión' }))
    resolveFirstSession({
      id: 4,
      role: 'ODONTOLOGO',
      permissions: ['consultations.view'],
    })

    expect(await screen.findByText('appointments.view')).toBeInTheDocument()
    expect(screen.queryByText('consultations.view')).not.toBeInTheDocument()
  })

  it('does not poll for capabilities while the session is idle', () => {
    vi.useFakeTimers()
    render(
      <AuthProvider initialSession={{
        access: 'access-token',
        user: { id: 4, role: 'ODONTOLOGO', permissions: ['patients.view'] },
      }}>
        <CapabilityProbe />
      </AuthProvider>,
    )

    vi.advanceTimersByTime(10 * 60 * 1000)

    expect(getCurrentSessionUser).not.toHaveBeenCalled()
  })
})
