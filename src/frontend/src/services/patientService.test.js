import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPatient,
  createPatientConsultation,
  getPatient,
  getPatientConsultation,
  listPatientConsultations,
  listPatients,
  updatePatientConsultation,
} from './patientService'
import * as patientService from './patientService'
import { apiRequest } from './api'

vi.mock('./api', () => ({ apiRequest: vi.fn() }))

describe('patientService', () => {
  beforeEach(() => apiRequest.mockReset())

  it('lists and searches patient records with authentication', () => {
    listPatients('token', 'María García')
    expect(apiRequest).toHaveBeenCalledWith('/api/patients/?search=Mar%C3%ADa%20Garc%C3%ADa', {
      headers: { Authorization: 'Bearer token' },
    })
  })

  it('creates a patient without exposing technical fields', () => {
    const patient = { first_name: 'María', national_id: '001-A' }
    createPatient('token', patient)
    expect(apiRequest).toHaveBeenCalledWith('/api/patients/', {
      method: 'POST', body: JSON.stringify(patient), headers: { Authorization: 'Bearer token' },
    })
  })

  it('loads the generated clinical record', () => {
    getPatient('token', 7)
    expect(apiRequest).toHaveBeenCalledWith('/api/patients/7/', {
      headers: { Authorization: 'Bearer token' },
    })
  })

  it('loads the consultations scoped to a patient', () => {
    listPatientConsultations('token', 7)
    expect(apiRequest).toHaveBeenCalledWith('/api/patients/7/consultations/', {
      headers: { Authorization: 'Bearer token' },
    })
  })

  it('loads one consultation scoped to its patient', () => {
    getPatientConsultation('token', 7, 12)
    expect(apiRequest).toHaveBeenCalledWith('/api/patients/7/consultations/12/', {
      headers: { Authorization: 'Bearer token' },
    })
  })

  it('creates a consultation for a patient', () => {
    const consultation = { date: '2026-08-08', summary: 'Valoración clínica.' }
    createPatientConsultation('token', 7, consultation)
    expect(apiRequest).toHaveBeenCalledWith('/api/patients/7/consultations/', {
      method: 'POST', body: JSON.stringify(consultation), headers: { Authorization: 'Bearer token' },
    })
  })

  it('updates a patient consultation', () => {
    const changes = { summary: 'Control actualizado.' }
    updatePatientConsultation('token', 7, 12, changes)
    expect(apiRequest).toHaveBeenCalledWith('/api/patients/7/consultations/12/', {
      method: 'PATCH', body: JSON.stringify(changes), headers: { Authorization: 'Bearer token' },
    })
  })

  it('updates only the submitted patient fields with authentication', () => {
    const changes = { address: 'Residencial Las Colinas' }

    patientService.updatePatient('token', 7, changes)

    expect(apiRequest).toHaveBeenCalledWith('/api/patients/7/', {
      method: 'PATCH', body: JSON.stringify(changes), headers: { Authorization: 'Bearer token' },
    })
  })
})
