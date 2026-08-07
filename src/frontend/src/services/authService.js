import { apiRequest } from './api'

export const login = (credentials) => apiRequest('/api/auth/login/', {
  method: 'POST', body: JSON.stringify(credentials),
})

export const logout = ({ access, refresh }) => apiRequest('/api/auth/logout/', {
  method: 'POST',
  body: JSON.stringify({ refresh }),
  headers: { Authorization: `Bearer ${access}` },
})

export const requestPasswordReset = ({ email }) => apiRequest('/api/auth/password-reset/', {
  method: 'POST',
  body: JSON.stringify({ email }),
})

export const confirmPasswordReset = (payload) => apiRequest('/api/auth/password-reset/confirm/', {
  method: 'POST',
  body: JSON.stringify(payload),
})

export const changePassword = ({ access, ...passwords }) => apiRequest('/api/auth/password-change/', {
  method: 'POST',
  body: JSON.stringify(passwords),
  headers: { Authorization: `Bearer ${access}` },
})
