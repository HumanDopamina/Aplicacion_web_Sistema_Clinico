const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const SESSION_KEY = 'dentalclinic_session'

let refreshPromise = null

function errorMessage(data) {
  if (Array.isArray(data.detail)) return data.detail[0]
  if (typeof data.detail === 'string') return data.detail
  const fieldError = Object.values(data).find((value) => Array.isArray(value) && value.length)
  return fieldError?.[0] || 'No fue posible procesar la solicitud.'
}

export async function apiRequest(path, options = {}) {
  const { _retried, ...requestOptions } = options
  const currentAccess = options.headers?.Authorization && storedSession()?.session?.access
  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(currentAccess ? { Authorization: `Bearer ${currentAccess}` } : {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 401 && options.headers?.Authorization && !_retried) {
    const access = await renewAccessToken()
    return apiRequest(path, {
      ...options,
      _retried: true,
      headers: { ...options.headers, Authorization: `Bearer ${access}` },
    })
  }
  if (!response.ok) {
    throw new Error(errorMessage(data))
  }
  return data
}

function storedSession() {
  const local = localStorage.getItem(SESSION_KEY)
  if (local) return { storage: localStorage, session: JSON.parse(local) }
  const current = sessionStorage.getItem(SESSION_KEY)
  return current ? { storage: sessionStorage, session: JSON.parse(current) } : null
}

async function renewAccessToken() {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const stored = storedSession()
    if (!stored?.session?.refresh) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')
    const response = await fetch(`${API_URL}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: stored.session.refresh }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.access) {
      localStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(SESSION_KEY)
      throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')
    }
    stored.session.access = data.access
    stored.storage.setItem(SESSION_KEY, JSON.stringify(stored.session))
    return data.access
  })()
  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}
