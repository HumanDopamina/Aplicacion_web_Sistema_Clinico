import { apiBlobRequest, apiRequest } from './api'

const authorization = (access) => ({ Authorization: `Bearer ${access}` })

export const listPatients = (access, search = '') => {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return apiRequest(`/api/patients/${query}`, { headers: authorization(access) })
}

export const listPatientDashboardSummary = (access) => apiRequest(
  '/api/patients/dashboard-summary/',
  { headers: authorization(access) },
)

export const createPatient = (access, patient) => apiRequest('/api/patients/', {
  method: 'POST',
  body: JSON.stringify(patient),
  headers: authorization(access),
})

export const getPatient = (access, id) => apiRequest(`/api/patients/${id}/`, {
  headers: authorization(access),
})

export const listPatientConsultations = (access, id) => apiRequest(`/api/patients/${id}/consultations/`, {
  headers: authorization(access),
})

export const listRecentConsultations = (access) => apiRequest('/api/patients/consultations/recent/', {
  headers: authorization(access),
})

export const getPatientConsultation = (access, patientId, consultationId) => apiRequest(
  `/api/patients/${patientId}/consultations/${consultationId}/`,
  { headers: authorization(access) },
)

export const createPatientConsultation = (access, patientId, consultation) => apiRequest(
  `/api/patients/${patientId}/consultations/`,
  {
    method: 'POST',
    body: JSON.stringify(consultation),
    headers: authorization(access),
  },
)

export const updatePatientConsultation = (access, patientId, consultationId, changes) => apiRequest(
  `/api/patients/${patientId}/consultations/${consultationId}/`,
  {
    method: 'PATCH',
    body: JSON.stringify(changes),
    headers: authorization(access),
  },
)

export const getConsultationOdontogram = (access, patientId, consultationId) => apiRequest(
  `/api/patients/${patientId}/consultations/${consultationId}/odontogram/`,
  { headers: authorization(access) },
)

export const createOdontogramVersion = (access, patientId, consultationId, version) => apiRequest(
  `/api/patients/${patientId}/consultations/${consultationId}/odontogram/versions/`,
  {
    method: 'POST',
    body: JSON.stringify(version),
    headers: authorization(access),
  },
)

export const listPatientOdontogramVersions = (access, patientId) => apiRequest(
  `/api/patients/${patientId}/odontogram-versions/`,
  { headers: authorization(access) },
)

export const getPatientOdontogramVersion = (access, patientId, versionId) => apiRequest(
  `/api/patients/${patientId}/odontogram-versions/${versionId}/`,
  { headers: authorization(access) },
)

export const updatePatient = (access, id, changes) => apiRequest(`/api/patients/${id}/`, {
  method: 'PATCH',
  body: JSON.stringify(changes),
  headers: authorization(access),
})

export const listPatientDocuments = (access, patientId, filters = {}) => {
  const query = new URLSearchParams()
  if (filters.search?.trim()) query.set('search', filters.search.trim())
  if (filters.category?.trim()) query.set('category', filters.category.trim())
  const suffix = query.size ? `?${query.toString().replaceAll('+', '%20')}` : ''
  return apiRequest(`/api/patients/${patientId}/documents/${suffix}`, {
    headers: authorization(access),
  })
}

export const listDocumentCategories = (access) => apiRequest('/api/patients/document-categories/', {
  headers: authorization(access),
})

export const uploadPatientDocuments = (access, patientId, payload) => {
  const body = new FormData()
  payload.files.forEach((file) => body.append('files', file))
  body.append('category', payload.category)
  body.append('document_date', payload.documentDate)
  body.append('notes', payload.notes || '')
  return apiRequest(`/api/patients/${patientId}/documents/`, {
    method: 'POST', body, headers: authorization(access),
  })
}

export const getPatientDocumentContent = (access, patientId, documentId, download = false) => (
  apiBlobRequest(
    `/api/patients/${patientId}/documents/${documentId}/content/${download ? '?download=true' : ''}`,
    { headers: authorization(access) },
  )
)

export const deletePatientDocument = (access, patientId, documentId) => apiRequest(
  `/api/patients/${patientId}/documents/${documentId}/`,
  { method: 'DELETE', headers: authorization(access) },
)
