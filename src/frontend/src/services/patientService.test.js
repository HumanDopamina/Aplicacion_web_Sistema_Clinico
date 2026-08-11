import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPatient,
  createPatientConsultation,
  deletePatientDocument,
  getPatientDocumentContent,
  getPatient,
  getPatientConsultation,
  listDocumentCategories,
  listPatientDocuments,
  listPatientConsultations,
  listRecentConsultations,
  listPatients,
  uploadPatientDocuments,
  updatePatientConsultation,
} from './patientService'
import * as patientService from './patientService'
import { apiBlobRequest, apiRequest } from './api'

vi.mock('./api', () => ({ apiRequest: vi.fn(), apiBlobRequest: vi.fn() }))

describe('patientService', () => {
  beforeEach(() => {
    apiRequest.mockReset()
    apiBlobRequest.mockReset()
  })

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

  it('loads the recent consultation summary with authentication', () => {
    listRecentConsultations('token')
    expect(apiRequest).toHaveBeenCalledWith('/api/patients/consultations/recent/', {
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

  it('lists patient documents with encoded filters and category suggestions', () => {
    listPatientDocuments('token', 7, { search: 'rayos X', category: 'Radiografía dental' })
    listDocumentCategories('token')

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      '/api/patients/7/documents/?search=rayos%20X&category=Radiograf%C3%ADa%20dental',
      { headers: { Authorization: 'Bearer token' } },
    )
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/api/patients/document-categories/', {
      headers: { Authorization: 'Bearer token' },
    })
  })

  it('uploads repeated files as multipart without setting a content type', () => {
    const files = [new File(['a'], 'frontal.png', { type: 'image/png' }), new File(['b'], 'rx.pdf', { type: 'application/pdf' })]
    uploadPatientDocuments('token', 7, {
      files, category: 'Radiografías', documentDate: '2026-08-09', notes: 'Ingreso',
    })

    const [path, options] = apiRequest.mock.calls[0]
    expect(path).toBe('/api/patients/7/documents/')
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ Authorization: 'Bearer token' })
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.getAll('files')).toEqual(files)
    expect(options.body.get('document_date')).toBe('2026-08-09')
  })

  it('loads authenticated content and deletes within the patient scope', () => {
    getPatientDocumentContent('token', 7, 4, true)
    deletePatientDocument('token', 7, 4)

    expect(apiBlobRequest).toHaveBeenCalledWith(
      '/api/patients/7/documents/4/content/?download=true',
      { headers: { Authorization: 'Bearer token' } },
    )
    expect(apiRequest).toHaveBeenCalledWith('/api/patients/7/documents/4/', {
      method: 'DELETE', headers: { Authorization: 'Bearer token' },
    })
  })
})
