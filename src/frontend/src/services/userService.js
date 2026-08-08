import { apiRequest } from './api'

export const listUsers = (access) => apiRequest('/api/auth/users/', {
  headers: { Authorization: `Bearer ${access}` },
})

export const createUser = (access, user) => apiRequest('/api/auth/users/', {
  method: 'POST',
  body: JSON.stringify(user),
  headers: { Authorization: `Bearer ${access}` },
})

export const updateUser = (access, id, changes) => apiRequest(`/api/auth/users/${id}/`, {
  method: 'PATCH',
  body: JSON.stringify(changes),
  headers: { Authorization: `Bearer ${access}` },
})
