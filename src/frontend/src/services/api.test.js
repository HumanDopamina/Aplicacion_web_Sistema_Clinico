import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as apiModule from './api'
import {
  apiBlobRequest,
  apiFileRequest,
  apiRequest,
  clearAccessToken,
  ensureCsrfCookie,
  setAccessToken,
  setForbiddenHandler,
} from './api'

const response = ({ status = 200, data = {}, blob = null, headers = {} } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  blob: () => Promise.resolve(blob),
  headers: { get: (name) => headers[name.toLowerCase()] || null },
})

describe('API session renewal', () => {
  beforeEach(() => {
    clearAccessToken()
    document.cookie = 'csrftoken=csrf-test; path=/'
  })

  afterEach(() => {
    clearAccessToken()
    setForbiddenHandler(null)
    vi.unstubAllGlobals()
  })

  it('normalizes an explicit production API URL', () => {
    const result = apiModule.resolveApiUrl?.({
      configured: 'https://api.clinic.example/',
      isDevelopment: false,
      location: { protocol: 'https:', hostname: 'clinic.example' },
    })

    expect(result).toBe('https://api.clinic.example')
  })

  it.each(['localhost', '127.0.0.1'])(
    'keeps the same-host port-8000 fallback for %s development',
    (hostname) => {
      const result = apiModule.resolveApiUrl?.({
        configured: '',
        isDevelopment: true,
        location: { protocol: 'http:', hostname },
      })

      expect(result).toBe(`http://${hostname}:8000`)
    },
  )

  it('fails fast when production has no explicit API URL', () => {
    expect(() => apiModule.resolveApiUrl?.({
      configured: '',
      isDevelopment: false,
      location: { protocol: 'https:', hostname: 'clinic.example' },
    })).toThrow('VITE_API_URL')
  })

  it('requests the development CSRF cookie from the same hostname as the frontend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await ensureCsrfCookie()

    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.protocol}//${window.location.hostname}:8000/api/auth/csrf/`,
      { credentials: 'include' },
    )
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

  it('notifies capability state after a protected 403 without swallowing the API error', async () => {
    const forbidden = vi.fn()
    setForbiddenHandler(forbidden)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      status: 403,
      data: { detail: 'Permiso revocado.' },
    })))

    await expect(apiRequest('/api/patients/', {
      headers: { Authorization: 'Bearer token' },
    })).rejects.toThrow('Permiso revocado.')

    expect(forbidden).toHaveBeenCalledTimes(1)
  })

  it('does not treat a public 403 as a capability refresh signal', async () => {
    const forbidden = vi.fn()
    setForbiddenHandler(forbidden)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ status: 403 })))

    await expect(apiRequest('/public')).rejects.toThrow()

    expect(forbidden).not.toHaveBeenCalled()
  })

  it('returns a protected file with its RFC 5987 response filename', async () => {
    const file = new Blob(['clinical-record'], { type: 'application/pdf' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      blob: file,
      headers: {
        'content-disposition': "attachment; filename*=UTF-8''expediente-clinico-PAC-00007.pdf",
      },
    })))

    await expect(apiFileRequest('/api/patients/7/clinical-record/export/', {
      headers: { Authorization: 'Bearer token' },
    })).resolves.toEqual({
      blob: file,
      filename: 'expediente-clinico-PAC-00007.pdf',
    })
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
