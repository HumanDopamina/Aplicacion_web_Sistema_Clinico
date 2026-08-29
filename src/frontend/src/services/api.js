const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

let accessToken = null
let refreshPromise = null
let sessionExpiredHandler = null
let sessionGeneration = 0

export function setAccessToken(token) {
  accessToken = token || null
  sessionGeneration += 1
}

export function clearAccessToken() {
  accessToken = null
  sessionGeneration += 1
}

export function setSessionExpiredHandler(handler) {
  sessionExpiredHandler = handler
}

function firstError(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstError(item)
      if (message) return message
    }
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const message = firstError(item)
      if (message) return message
    }
  }
  return ''
}

function errorMessage(data) {
  if (Array.isArray(data.detail)) return data.detail[0]
  if (typeof data.detail === 'string') return data.detail
  return firstError(data) || 'No fue posible procesar la solicitud.'
}

function csrfToken() {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith('csrftoken='))
  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : ''
}

export async function ensureCsrfCookie() {
  await fetch(`${API_URL}/api/auth/csrf/`, { credentials: 'include' })
  return csrfToken()
}

export async function csrfRequest(path, options = {}) {
  const csrf = await ensureCsrfCookie()
  return apiRequest(path, {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      ...(csrf ? { 'X-CSRFToken': csrf } : {}),
    },
  })
}

async function authenticatedResponse(path, options = {}) {
  const { _retried, ...requestOptions } = options
  const isProtected = Boolean(options.headers?.Authorization)
  const contentHeaders = options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }
  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    credentials: options.credentials || 'include',
    headers: {
      ...contentHeaders,
      ...options.headers,
      ...(isProtected && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
  if (response.status === 401 && isProtected && !_retried) {
    const renewedAccess = await refreshAccessToken()
    return authenticatedResponse(path, {
      ...options,
      _retried: true,
      headers: { ...options.headers, Authorization: `Bearer ${renewedAccess}` },
    })
  }
  return response
}

export async function apiRequest(path, options = {}) {
  const response = await authenticatedResponse(path, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(errorMessage(data))
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}

export async function apiBlobRequest(path, options = {}) {
  const response = await authenticatedResponse(path, options)
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const error = new Error(errorMessage(data))
    error.status = response.status
    error.data = data
    throw error
  }
  return response.blob()
}

export async function refreshAccessToken() {
  const generation = sessionGeneration
  if (refreshPromise?.generation === generation) return refreshPromise.promise
  const promise = (async () => {
    const csrf = await ensureCsrfCookie()
    const response = await fetch(`${API_URL}/api/auth/token/refresh/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { 'X-CSRFToken': csrf } : {}),
      },
      body: JSON.stringify({}),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.access) {
      if (generation === sessionGeneration) {
        clearAccessToken()
        sessionExpiredHandler?.()
      }
      throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')
    }
    if (generation !== sessionGeneration) {
      throw new Error('La sesión cambió durante la renovación.')
    }
    setAccessToken(data.access)
    return data.access
  })()
  refreshPromise = { generation, promise }
  try {
    return await promise
  } finally {
    if (refreshPromise?.promise === promise) refreshPromise = null
  }
}
