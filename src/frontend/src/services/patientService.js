import { apiRequest } from './api'

const authorization = (access) => ({ Authorization: `Bearer ${access}` })

export const listPatients = (access, search = '') => {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return apiRequest(`/api/patients/${query}`, { headers: authorization(access) })
}

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
