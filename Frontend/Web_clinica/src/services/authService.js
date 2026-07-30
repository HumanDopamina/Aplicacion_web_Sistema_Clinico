import { apiRequest } from './api'

export const login = (credentials) => apiRequest('/api/auth/login/', {
  method: 'POST', body: JSON.stringify(credentials),
})
