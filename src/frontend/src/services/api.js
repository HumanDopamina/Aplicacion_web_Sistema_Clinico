const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function errorMessage(data) {
  if (Array.isArray(data.detail)) return data.detail[0]
  if (typeof data.detail === 'string') return data.detail
  const fieldError = Object.values(data).find((value) => Array.isArray(value) && value.length)
  return fieldError?.[0] || 'No fue posible procesar la solicitud.'
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(errorMessage(data))
  }
  return data
}
