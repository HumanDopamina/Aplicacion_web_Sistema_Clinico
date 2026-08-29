import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiBlobRequest, apiRequest, clearAccessToken, setAccessToken } from './api'

const response = ({ status = 200, data = {}, blob = null } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  blob: () => Promise.resolve(blob),
})

describe('API session renewal', () => {
  beforeEach(() => {
    clearAccessToken()
    document.cookie = 'csrftoken=csrf-test; path=/'
  })

  afterEach(() => {
    clearAccessToken()
    vi.unstubAllGlobals()
  })

  it('renews an expired JWT through the HttpOnly cookie and retries a blob once', async () => {
    setAccessToken('expired-token')
    const file = new Blob(['clinical-file'], { type: 'application/pdf' })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ status: 401, data: { detail: 'Token expirado.' } }))
      .mockResolvedValueOnce(response({ status: 204 }))
      .mockResolvedValueOnce(response({ data: { access: 'renewed-token' } }))
      .mockResolvedValueOnce(response({ blob: file }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiBlobRequest('/api/patients/1/documents/2/content/', {
      headers: { Authorization: 'Bearer expired-token' },
    })).resolves.toBe(file)

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[2][1]).toMatchObject({
      credentials: 'include',
      body: '{}',
    })
    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe('Bearer renewed-token')
    expect(localStorage.getItem('dentalclinic_session')).toBeNull()
    expect(sessionStorage.getItem('dentalclinic_session')).toBeNull()
  })

  it('deduplicates refresh for simultaneous unauthorized responses', async () => {
    setAccessToken('expired-token')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ status: 401 }))
      .mockResolvedValueOnce(response({ status: 401 }))
      .mockResolvedValueOnce(response({ status: 204 }))
      .mockResolvedValueOnce(response({ data: { access: 'renewed-token' } }))
      .mockResolvedValue(response({ data: { ok: true } }))
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([
      apiRequest('/one', { headers: { Authorization: 'Bearer expired-token' } }),
      apiRequest('/two', { headers: { Authorization: 'Bearer expired-token' } }),
    ])

    const refreshCalls = fetchMock.mock.calls.filter(([url]) => url.endsWith('/token/refresh/'))
    expect(refreshCalls).toHaveLength(1)
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

  it('reports nested API validation errors instead of a generic message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      status: 400,
      data: { clinical_record: { consultation_date: ['La fecha de consulta no tiene un formato válido.'] } },
    })))

    await expect(apiRequest('/api/patients/', { method: 'POST' })).rejects.toThrow(
      'La fecha de consulta no tiene un formato válido.',
    )
  })
})
