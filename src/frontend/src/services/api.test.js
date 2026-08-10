import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiBlobRequest, apiRequest } from './api'

const response = ({ status = 200, data = {}, blob = null, headers = {} } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  blob: () => Promise.resolve(blob),
  headers: { get: (name) => headers[name.toLowerCase()] || null },
})

describe('apiBlobRequest', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.setItem('dentalclinic_session', JSON.stringify({
      access: 'expired-token', refresh: 'refresh-token', user: {},
    }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('renews an expired JWT and returns the binary response without parsing it as JSON', async () => {
    const file = new Blob(['clinical-file'], { type: 'application/pdf' })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ status: 401, data: { detail: 'Token expirado.' } }))
      .mockResolvedValueOnce(response({ data: { access: 'renewed-token' } }))
      .mockResolvedValueOnce(response({ blob: file }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiBlobRequest('/api/patients/1/documents/2/content/', {
      headers: { Authorization: 'Bearer expired-token' },
    })).resolves.toBe(file)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer renewed-token')
  })

  it('surfaces a JSON API error instead of returning an error blob', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      status: 403,
      data: { detail: 'No tienes permiso para ver documentos.' },
    })))

    await expect(apiBlobRequest('/private', {
      headers: { Authorization: 'Bearer token' },
    })).rejects.toThrow('No tienes permiso para ver documentos.')
  })
})

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

  it('reports nested API validation errors instead of a generic message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      clinical_record: {
        consultation_date: ['La fecha de consulta no tiene un formato válido.'],
      },
    }), { status: 400 })))

    await expect(apiRequest('/api/patients/', { method: 'POST' })).rejects.toThrow(
      'La fecha de consulta no tiene un formato válido.',
    )
  })
})
