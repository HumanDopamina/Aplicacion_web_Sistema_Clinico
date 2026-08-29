import { apiBlobRequest, apiRequest } from './api'

const auth = (access) => ({ Authorization: `Bearer ${access}` })

const profileFormData = (values) => {
  const data = new FormData()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) data.append(key, value)
  })
  return data
}

export const listUsers = (access, page, pageSize) => {
  const query = new URLSearchParams()
  if (page) query.set('page', page)
  if (pageSize) query.set('page_size', pageSize)
  const suffix = query.size ? `?${query.toString()}` : ''
  return apiRequest(`/api/auth/users/${suffix}`, {
  headers: auth(access),
  })
}

export const createUser = (access, user) => apiRequest('/api/auth/users/', {
  method: 'POST',
  body: profileFormData(user),
  headers: auth(access),
})

export const updateUser = (access, id, changes) => apiRequest(`/api/auth/users/${id}/`, {
  method: 'PATCH',
  body: profileFormData(changes),
  headers: auth(access),
})

export const getCurrentUser = (access) => apiRequest('/api/auth/me/', {
  headers: auth(access),
})

export const updateCurrentProfile = (access, changes) => apiRequest('/api/auth/me/', {
  method: 'PATCH',
  body: profileFormData(changes),
  headers: auth(access),
})

export const getUserAvatarContent = (access, avatarUrl) => apiBlobRequest(avatarUrl, {
  headers: auth(access),
})

export const listRolePermissionPresets = (access) => apiRequest('/api/auth/role-permissions/', {
  headers: auth(access),
})

export const updateRolePermissionPreset = (access, role, permissions) => apiRequest(`/api/auth/role-permissions/${role}/`, {
  method: 'PATCH',
  body: JSON.stringify({ permissions }),
  headers: auth(access),
})
