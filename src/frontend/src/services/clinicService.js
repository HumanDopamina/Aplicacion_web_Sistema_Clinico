import { apiRequest } from './api'

const auth = (access) => ({ Authorization: `Bearer ${access}` })
const json = (access) => ({ ...auth(access), 'Content-Type': 'application/json' })
const query = (params = {}) => {
  const value = new URLSearchParams(
    Object.entries(params).filter(([, item]) => item !== '' && item !== undefined && item !== null),
  ).toString()
  return value ? `?${value}` : ''
}

export const getClinicProfile = (access) => apiRequest('/api/clinics/profile/', { headers: auth(access) })
export const getClinicOptions = (access) => apiRequest('/api/clinics/profile/options/', { headers: auth(access) })
export const updateClinicProfile = (access, values) => apiRequest('/api/clinics/profile/', {
  method: 'PATCH', body: values instanceof FormData ? values : JSON.stringify(values), headers: auth(access),
})
export const getBusinessHours = (access) => apiRequest('/api/clinics/business-hours/', { headers: auth(access) })
export const updateBusinessHours = (access, values) => apiRequest('/api/clinics/business-hours/', {
  method: 'PUT', body: JSON.stringify(values), headers: json(access),
})
export const listClosures = (access) => apiRequest('/api/clinics/closures/', { headers: auth(access) })
export const createClosure = (access, values) => apiRequest('/api/clinics/closures/', {
  method: 'POST', body: JSON.stringify(values), headers: json(access),
})
export const updateClosure = (access, id, values) => apiRequest(`/api/clinics/closures/${id}/`, {
  method: 'PATCH', body: JSON.stringify(values), headers: json(access),
})
export const listServiceCategories = (access) => apiRequest('/api/clinics/service-categories/', { headers: auth(access) })
export const createServiceCategory = (access, values) => apiRequest('/api/clinics/service-categories/', {
  method: 'POST', body: JSON.stringify(values), headers: json(access),
})
export const updateServiceCategory = (access, id, values) => apiRequest(`/api/clinics/service-categories/${id}/`, {
  method: 'PATCH', body: JSON.stringify(values), headers: json(access),
})
export const listClinicServices = (access, params) => apiRequest(`/api/clinics/services/${query(params)}`, { headers: auth(access) })
export const createClinicService = (access, values) => apiRequest('/api/clinics/services/', {
  method: 'POST', body: JSON.stringify(values), headers: json(access),
})
export const updateClinicService = (access, id, values) => apiRequest(`/api/clinics/services/${id}/`, {
  method: 'PATCH', body: JSON.stringify(values), headers: json(access),
})
