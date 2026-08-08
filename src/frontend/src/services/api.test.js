import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiRequest } from './api'

const session = {
  access: 'expired-access',
  refresh: 'valid-refresh',
  user: { email: 'admin@dentalclinic.local', role: 'ADMINISTRADOR' },
}

describe('apiRequest session renewal', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('renews an expired access token and repeats the protected request', async () => {
    sessionStorage.setItem('dentalclinic_session', JSON.stringify(session))
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'Token inválido' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access: 'renewed-access' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 1, email: session.user.email }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 1, email: session.user.email }]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const users = await apiRequest('/api/auth/users/', {
      headers: { Authorization: `Bearer ${session.access}` },
    })

    expect(users).toEqual([{ id: 1, email: session.user.email }])
    expect(JSON.parse(sessionStorage.getItem('dentalclinic_session')).access).toBe('renewed-access')
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer renewed-access')

    await apiRequest('/api/auth/users/', {
      headers: { Authorization: `Bearer ${session.access}` },
    })
    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe('Bearer renewed-access')
  })
})
