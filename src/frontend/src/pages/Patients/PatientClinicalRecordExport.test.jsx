import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportPatientClinicalRecord, getPatient } from '../../services/patientService'
import PatientRecordPage from './PatientRecordPage'

const state = vi.hoisted(() => ({
  user: {
    role: 'ODONTOLOGO',
    permissions: ['patients.view', 'consultations.view'],
  },
}))

vi.mock('../../context/authContextValue', () => ({
  useAuth: () => ({ accessToken: 'access-token', user: state.user }),
}))
vi.mock('../../services/patientService', () => ({
  checkPatientDuplicates: vi.fn(),
  createPatient: vi.fn(),
  exportPatientClinicalRecord: vi.fn(),
  getPatient: vi.fn(),
  updatePatient: vi.fn(),
}))
vi.mock('./useLongitudinalTreatmentPlan', () => ({
  default: () => ({
    items: [], loading: false, error: '', pendingHasMore: false, historyHasMore: false,
    loadingMoreScope: '', loadMore: vi.fn(),
  }),
}))

const patient = {
  id: 7,
  code: 'PAC-00007',
  first_name: 'Ana',
  last_name: 'López',
  second_last_name: '',
  full_name: 'Ana López',
  birth_place: 'Managua',
  identification_type: null,
  identification_number: null,
  phone: '8888-1111',
  email: '',
  gender: 'FEMENINO',
  date_of_birth: '1990-05-10',
  is_active: true,
  profile_complete: true,
  missing_profile_fields: [],
  clinical_record: {},
}

function deferredPromise() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function renderPage({ isNew = false } = {}) {
  const router = createMemoryRouter([
    { path: '/pacientes/nuevo', element: <PatientRecordPage isNew /> },
    { path: '/pacientes/:id', element: <PatientRecordPage /> },
    { path: '/pacientes', element: <p>Lista de pacientes</p> },
  ], { initialEntries: [isNew ? '/pacientes/nuevo' : '/pacientes/7'] })
  return render(<RouterProvider router={router} />)
}

describe('HU-35 clinical record PDF export', () => {
  beforeEach(() => {
    state.user = {
      role: 'ODONTOLOGO',
      permissions: ['patients.view', 'consultations.view'],
    }
    getPatient.mockResolvedValue(patient)
    exportPatientClinicalRecord.mockReset()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:clinical-record')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('downloads once with loading state, backend filename and object URL cleanup', async () => {
    const pending = deferredPromise()
    const clicks = []
    exportPatientClinicalRecord.mockReturnValue(pending.promise)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
      clicks.push({ download: this.download, href: this.href })
    })
    renderPage()

    const button = await screen.findByRole('button', { name: 'Exportar PDF' })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(exportPatientClinicalRecord).toHaveBeenCalledOnce()
    expect(exportPatientClinicalRecord).toHaveBeenCalledWith('access-token', '7')
    expect(screen.getByRole('button', { name: 'Generando PDF…' })).toBeDisabled()

    const blob = new Blob(['%PDF'], { type: 'application/pdf' })
    await act(async () => {
      pending.resolve({ blob, filename: 'expediente-clinico-PAC-00007.pdf' })
      await pending.promise
    })

    expect(clicks).toEqual([{
      download: 'expediente-clinico-PAC-00007.pdf',
      href: 'blob:clinical-record',
    }])
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:clinical-record')
    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeEnabled()
  })

  it('shows an API error and allows a retry', async () => {
    exportPatientClinicalRecord.mockRejectedValueOnce(
      new Error('No tienes permiso para exportar este expediente.'),
    )
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Exportar PDF' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permiso para exportar este expediente.',
    )
    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeEnabled()
  })

  it('renders only for an existing record with both clinical read permissions', async () => {
    const cases = [
      { user: { role: 'ODONTOLOGO', permissions: ['patients.view'] }, visible: false },
      { user: { role: 'ODONTOLOGO', permissions: ['consultations.view'] }, visible: false },
      { user: { role: 'ADMINISTRADOR', permissions: [] }, visible: true },
    ]

    for (const testCase of cases) {
      state.user = testCase.user
      const view = renderPage()
      await screen.findByText('Ana López')
      expect(screen.queryByRole('button', { name: 'Exportar PDF' }) !== null).toBe(testCase.visible)
      view.unmount()
    }

    state.user = { role: 'ADMINISTRADOR', permissions: [] }
    renderPage({ isNew: true })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Exportar PDF' })).not.toBeInTheDocument()
    })
  })
})
