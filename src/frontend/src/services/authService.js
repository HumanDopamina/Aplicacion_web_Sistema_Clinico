import { apiRequest, csrfRequest, refreshAccessToken, setAccessToken } from './api'

export async function login(credentials) {
  const session = await csrfRequest('/api/auth/login/', {
    method: 'POST', body: JSON.stringify(credentials),
  })
  setAccessToken(session.access)
  return session
}

export const logout = ({ access }) => csrfRequest('/api/auth/logout/', {
  method: 'POST',
  body: JSON.stringify({}),
  headers: { Authorization: `Bearer ${access}` },
})

export async function restoreSession() {
  const access = await refreshAccessToken()
  const user = await getCurrentSessionUser(access)
  return { access, user }
}

export const getCurrentSessionUser = (access) => apiRequest('/api/auth/me/', {
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
