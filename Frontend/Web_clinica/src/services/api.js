const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(Array.isArray(data.detail) ? data.detail[0] : (data.detail || 'No fue posible iniciar sesión.'))
  }
  return data
}
