import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import * as authService from './services/authService'

vi.mock('./services/authService')

const rolePermissions = {
  ADMINISTRADOR: ['patients.view', 'patients.create', 'patients.edit', 'appointments.view', 'appointments.create'],
  RECEPCIONISTA: ['patients.view', 'patients.create', 'patients.edit', 'appointments.view', 'appointments.create'],
  ODONTOLOGO: ['patients.view', 'appointments.view'],
}

const patientFixture = {
  id: 1,
  code: 'PAC-00001',
  first_name: 'María Fernanda',
  last_name: 'García',
  second_last_name: 'López',
  full_name: 'María Fernanda García López',
  birth_place: 'Managua',
  origin: 'Chinandega',
  religion: 'Católica',
  education: 'Universitaria',
  profession: 'Docente',
  address: 'Colonia Roma Norte',
  father_name: 'José García',
  mother_name: 'Ana López',
  information_source: 'Paciente',
  information_reliability: 'Confiable',
  national_id: '001-160498-0001A',
  phone: '+505 8888 1111',
  email: 'maria@example.com',
  emergency_contact_name: 'Carlos García',
  emergency_relationship: 'Hermano',
  emergency_phone: '+505 8888 2222',
  gender: 'FEMENINO',
  date_of_birth: '1998-04-16',
  is_active: true,
  created_at: '2026-08-08T12:00:00Z',
  updated_at: '2026-08-08T12:00:00Z',
  registered_by: 2,
  clinical_record: {
    id: 1, examiner_name: 'Dra. Elena Ruiz', examiner_national_id: '001-010180-0003C',
    inss_number: 'INSS-9081', cema_number: 'CEMA-4402', consultation_date: '2026-08-08',
    consultation_time: '09:30:00', dental_service: 'Valoración odontológica',
    chief_complaint: 'Dolor en molar inferior derecho.', present_illness_history: 'Dolor pulsátil de tres días.',
    respiratory: 'Sin disnea.', cardiovascular: 'Sin dolor precordial.', hepatic_renal: 'Sin alteraciones.',
    gastrointestinal: 'Apetito conservado.', neurological: 'Sin cefalea.', blood_system: 'Sin sangrado.',
    reproductive_organs: 'Sin alteraciones.', family_history: 'Madre con hipertensión arterial.',
    infectious_diseases: { hepatitis: false, varicella: true, other: '' },
    hereditary_diseases: { allergies: false, diabetes_mellitus: true, other: '' },
    heart_rate: 72, respiratory_rate: 16, blood_pressure: '118/76', temperature: '36.6',
    weight: '68.40', height: '1.65', body_surface_area: '1.76', bmi: '25.12',
    general_appearance: 'Consciente y orientada.', skin_and_mucosa: 'Normocoloreadas.', thorax: 'Simétrico.',
    rib_cage: 'Sin deformidades.', breasts: 'Sin hallazgos.', lung_fields: 'Ventilados.', cardiac: 'Rítmico.',
    abdomen_pelvis: 'Blando, depresible.', rectal_exam: 'No aplica.', musculoskeletal: 'Movilidad conservada.',
    upper_extremities: 'Sin edema.', lower_extremities: 'Sin edema.', genitourinary: 'Sin hallazgos.',
    gynecological_exam: 'No aplica.', neurological_exam: 'Sin déficit focal.',
    observations_analysis: 'Paciente apta para tratamiento.', dental_diagnoses: 'Pulpitis irreversible en pieza 46.',
    treatment_plan: 'Tratamiento endodóntico y corona.', budget: 'C$ 10,500.',
    treatment_performed: 'Radiografía periapical diagnóstica.', radiographic_exams: ['periapical-46.pdf'],
    clinical_photographs: ['pieza-46-frontal.jpg'], created_at: '2026-08-08T12:00:00Z', updated_at: '2026-08-08T12:00:00Z',
  },
}

const consultationFixture = {
  id: 12,
  date: '2026-08-08',
  consultation_type: 'SEGUIMIENTO',
  consultation_type_display: 'Seguimiento',
  professional: 3,
  professional_name: 'Dra. Elena Rivera',
  summary: 'Paciente estable. Continúa con el tratamiento indicado.',
  status: 'COMPLETADA',
  status_display: 'Completada',
}

const session = (role) => ({
  access: 'access-token',
  refresh: 'refresh-token',
  user: {
    email: `${role.toLowerCase()}@test.com`,
    first_name: 'Usuario',
    role,
    permissions: rolePermissions[role],
  },
})

const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
})

function BackControl() {
  const navigate = useNavigate()
  return <button type="button" onClick={() => navigate(-1)}>Atrás</button>
}

function renderAuthenticated(role, withBackControl = false, path = '/bienvenida') {
  sessionStorage.setItem('dentalclinic_session', JSON.stringify(session(role)))
  const router = createMemoryRouter([{
    path: '*',
    element:
      <AuthProvider>
        {withBackControl ? <BackControl /> : null}
        <App />
      </AuthProvider>,
  }], { initialEntries: ['/login', path], initialIndex: 1 })
  return { ...render(<RouterProvider router={router} />), router }
}

describe('authenticated routes', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    authService.logout.mockResolvedValue(undefined)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it.each(['ADMINISTRADOR', 'RECEPCIONISTA', 'ODONTOLOGO'])(
    'shows the reference menu for %s',
    (role) => {
    renderAuthenticated(role)

    const navigation = within(screen.getByRole('navigation', { name: 'Navegación principal' }))
    const links = navigation.getAllByRole('link')
    expect(links.map((link) => link.textContent.trim())).toEqual([
      'Dashboard',
      'Pacientes',
      'Citas',
      'Configuración',
    ])
    expect(navigation.getByRole('link', { name: 'Configuración' })).toHaveAttribute(
      'href',
      '/configuracion',
    )
    expect(navigation.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
    expect(navigation.queryByRole('link', { name: 'Clínicas' })).not.toBeInTheDocument()
    }
  )

  it('clears the session and protects history after logout', async () => {
    renderAuthenticated('ADMINISTRADOR', true)

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    expect(localStorage.getItem('dentalclinic_session')).toBeNull()
    expect(sessionStorage.getItem('dentalclinic_session')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument())
    expect(screen.queryByText('Panel principal')).not.toBeInTheDocument()
  })

  it('prevents a receptionist from opening an administrator route directly', () => {
    renderAuthenticated('RECEPCIONISTA', false, '/usuarios')

    expect(screen.getByRole('heading', { name: 'Bienvenido, Dr. Usuario' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Usuarios' })).not.toBeInTheDocument()
  })

  it('prevents a receptionist from opening staff configuration directly', () => {
    renderAuthenticated('RECEPCIONISTA', false, '/configuracion')

    expect(screen.getByRole('heading', { name: 'Bienvenido, Dr. Usuario' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Configuración' })).not.toBeInTheDocument()
  })

  it('offers password change navigation to every authenticated role', () => {
    renderAuthenticated('ODONTOLOGO')

    expect(screen.getByRole('link', { name: 'Cambiar contraseña' })).toHaveAttribute(
      'href',
      '/cambiar-contrasena',
    )
  })

  it('uses the clinic logo in the main navigation and opens on the dashboard', () => {
    renderAuthenticated('ODONTOLOGO')

    expect(screen.getByRole('img', { name: 'Dental Clinic' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/bienvenida')
    expect(screen.getByRole('heading', { name: 'Bienvenido, Dr. Usuario' })).toBeInTheDocument()
  })

  it('[HU-10] registers a patient and opens the new clinical record', async () => {
    let submittedPatient = null
    const fetchMock = vi.fn((url, options = {}) => {
      if (url.endsWith('/api/patients/') && options.method === 'POST') {
        submittedPatient = JSON.parse(options.body)
        return Promise.resolve(jsonResponse(patientFixture, 201))
      }
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      if (url.endsWith('/api/patients/')) return Promise.resolve(jsonResponse([]))
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAuthenticated('RECEPCIONISTA', false, '/pacientes')

    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo paciente' }))
    expect(screen.getByRole('heading', { name: 'Nuevo paciente' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Resumen clínico')).toBeInTheDocument()
    expect(screen.getByText('Consultas')).toBeInTheDocument()
    expect(screen.getByText('Odontograma')).toBeInTheDocument()
    expect(screen.getByText('Documentos')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Datos generales de la consulta' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Interrogatorio por aparatos y sistemas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Examen físico' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Archivos clínicos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Descartar cambios' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'María Fernanda' } })
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descartar cambios' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Primer apellido'), { target: { value: 'García' } })
    fireEvent.change(screen.getByLabelText('Segundo apellido'), { target: { value: 'López' } })
    fireEvent.change(screen.getByLabelText('Lugar de nacimiento'), { target: { value: 'Managua' } })
    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: '001-160498-0001A' } })
    fireEvent.change(screen.getByLabelText('Género'), { target: { value: 'FEMENINO' } })
    fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '1998-04-16' } })
    fireEvent.change(screen.getByLabelText('Doctor que examina'), { target: { value: 'Dra. Elena Ruiz' } })
    fireEvent.change(screen.getByLabelText('Motivo de consulta'), { target: { value: 'Dolor en molar inferior derecho.' } })
    fireEvent.change(screen.getByLabelText('Respiratorio'), { target: { value: 'Sin disnea.' } })
    fireEvent.change(screen.getByLabelText('Antecedentes familiares'), { target: { value: 'Madre con hipertensión arterial.' } })
    fireEvent.change(screen.getByLabelText('Presión arterial'), { target: { value: '118/76' } })
    fireEvent.change(screen.getByLabelText('Aspecto general'), { target: { value: 'Consciente y orientada.' } })
    fireEvent.change(screen.getByLabelText('Diagnóstico / problemas odontológicos'), { target: { value: 'Pulpitis irreversible en pieza 46.' } })
    fireEvent.change(screen.getByLabelText('Plan de tratamiento'), { target: { value: 'Tratamiento endodóntico y corona.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('heading', { name: 'María Fernanda García López' })).toBeInTheDocument()
    expect(screen.getByText('PAC-00001')).toBeInTheDocument()
    expect(submittedPatient.clinical_record.examiner_name).toBe('Dra. Elena Ruiz')
    expect(submittedPatient.clinical_record.chief_complaint).toBe('Dolor en molar inferior derecho.')
    expect(submittedPatient.clinical_record.blood_pressure).toBe('118/76')
    expect(submittedPatient.clinical_record.consultation_date).toBeNull()
    expect(submittedPatient.clinical_record.consultation_time).toBeNull()
  })

  it('[HU-10] displays the complete clinical record fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(patientFixture)))
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1')

    expect(await screen.findByRole('heading', { name: 'María Fernanda García López' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Datos generales de la consulta' })).toBeInTheDocument()
    expect(screen.getByText('Dra. Elena Ruiz')).toBeInTheDocument()
    expect(screen.getByText('INSS-9081')).toBeInTheDocument()
    expect(screen.getByText('Docente')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Motivo de consulta' })).toBeInTheDocument()
    expect(screen.getByText('Dolor en molar inferior derecho.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Interrogatorio por aparatos y sistemas' })).toBeInTheDocument()
    expect(screen.getByText('Sin dolor precordial.')).toBeInTheDocument()
    expect(screen.getByText('Varicela')).toBeInTheDocument()
    expect(screen.getByText('Diabetes mellitus')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Examen físico' })).toBeInTheDocument()
    expect(screen.getByText('118/76')).toBeInTheDocument()
    expect(screen.getByText('Consciente y orientada.')).toBeInTheDocument()
    expect(screen.getByText('Paciente apta para tratamiento.')).toBeInTheDocument()
    expect(screen.getByText('Pulpitis irreversible en pieza 46.')).toBeInTheDocument()
    expect(screen.getByText('Tratamiento endodóntico y corona.')).toBeInTheDocument()
    expect(screen.getByText('C$ 10,500.')).toBeInTheDocument()
    expect(screen.getByText('Radiografía periapical diagnóstica.')).toBeInTheDocument()
  })

  it('[HU-10] reserves clinical files for the Documents tab', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(patientFixture)))
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1')

    expect(await screen.findByRole('heading', { name: 'María Fernanda García López' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Archivos clínicos' })).not.toBeInTheDocument()
    expect(screen.queryByText('periapical-46.pdf')).not.toBeInTheDocument()
    expect(screen.queryByText('pieza-46-frontal.jpg')).not.toBeInTheDocument()
  })

  it('shows the persisted consultations for the current patient', async () => {
    const fetchMock = vi.fn((url) => {
      if (url.endsWith('/api/patients/1/consultations/')) {
        return Promise.resolve(jsonResponse([consultationFixture]))
      }
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1')

    fireEvent.click(await screen.findByRole('tab', { name: 'Consultas' }))

    expect(await screen.findByRole('heading', { name: 'Consultas del paciente' })).toBeInTheDocument()
    const row = screen.getByRole('row', { name: /08 ago 2026 Seguimiento Dra\. Elena Rivera/ })
    expect(within(row).getByText('Paciente estable. Continúa con el tratamiento indicado.')).toBeInTheDocument()
    expect(within(row).getByText('Completada')).toBeInTheDocument()
  })

  it('shows guidance when the patient does not have consultations', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.endsWith('/api/patients/1/consultations/')) return Promise.resolve(jsonResponse([]))
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      throw new Error(`Unexpected request: ${url}`)
    }))
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1')

    fireEvent.click(await screen.findByRole('tab', { name: 'Consultas' }))

    expect(await screen.findByText('Este paciente todavía no tiene consultas registradas.')).toBeInTheDocument()
  })

  it('shows the API error when consultations cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.endsWith('/api/patients/1/consultations/')) {
        return Promise.resolve(jsonResponse({ detail: 'No fue posible cargar las consultas.' }, 500))
      }
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      throw new Error(`Unexpected request: ${url}`)
    }))
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1')

    fireEvent.click(await screen.findByRole('tab', { name: 'Consultas' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cargar las consultas.')
  })

  it('[HU-10] edits patient information from the clinical record when permitted', async () => {
    let currentPatient = patientFixture
    let submittedChanges = null
    const fetchMock = vi.fn((url, options = {}) => {
      if (url.endsWith('/api/patients/1/') && options.method === 'PATCH') {
        submittedChanges = JSON.parse(options.body)
        currentPatient = { ...currentPatient, ...submittedChanges, clinical_record: submittedChanges.clinical_record, updated_at: '2026-08-08T13:00:00Z' }
        return Promise.resolve(jsonResponse(currentPatient))
      }
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(currentPatient))
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAuthenticated('RECEPCIONISTA', false, '/pacientes/1')

    expect(await screen.findByLabelText('Nombres')).toHaveValue('María Fernanda')
    expect(screen.queryByRole('button', { name: 'Editar expediente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'María Fernanda García López' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'Mariana' } })
    expect(screen.getByRole('heading', { name: 'Mariana García López' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Dirección habitual'), { target: { value: 'Cambio descartado' } })
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }))

    expect(screen.getByLabelText('Nombres')).toHaveValue('María Fernanda')
    expect(screen.getByLabelText('Dirección habitual')).toHaveValue('Colonia Roma Norte')
    expect(submittedChanges).toBeNull()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Dirección habitual'), { target: { value: 'Residencial Las Colinas' } })
    fireEvent.change(screen.getByLabelText('Teléfono de emergencia'), { target: { value: '+505 7777 3333' } })
    fireEvent.change(screen.getByLabelText('Motivo de consulta'), { target: { value: 'Control posterior al tratamiento.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument())
    expect(screen.getByLabelText('Dirección habitual')).toHaveValue('Residencial Las Colinas')
    expect(screen.getByLabelText('Teléfono de emergencia')).toHaveValue('+505 7777 3333')
    expect(screen.getByLabelText('Motivo de consulta')).toHaveValue('Control posterior al tratamiento.')
    expect(submittedChanges.clinical_record.chief_complaint).toBe('Control posterior al tratamiento.')
  })

  it('[HU-10] keeps the patient record read-only without the configured permission', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(patientFixture)))
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1')

    expect(await screen.findByRole('heading', { name: 'María Fernanda García López' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombres')).not.toBeInTheDocument()
    expect(screen.getByText('María Fernanda')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
  })

  it('[HU-10] discards a dirty new patient without creating it', async () => {
    let postCount = 0
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (url.endsWith('/api/patients/') && options.method === 'POST') postCount += 1
      if (url.endsWith('/api/patients/')) return Promise.resolve(jsonResponse([]))
      throw new Error(`Unexpected request: ${url}`)
    }))
    renderAuthenticated('RECEPCIONISTA', false, '/pacientes/nuevo')

    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'Paciente descartado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }))

    expect(await screen.findByRole('heading', { name: 'Pacientes' })).toBeInTheDocument()
    expect(postCount).toBe(0)
  })

  it('[HU-10] preserves the dirty draft when saving fails', async () => {
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (url.endsWith('/api/patients/1/') && options.method === 'PATCH') {
        return Promise.resolve(jsonResponse({ detail: 'No fue posible guardar los cambios.' }, 400))
      }
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      throw new Error(`Unexpected request: ${url}`)
    }))
    renderAuthenticated('RECEPCIONISTA', false, '/pacientes/1')

    fireEvent.change(await screen.findByLabelText('Dirección habitual'), { target: { value: 'Borrador conservado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible guardar los cambios.')
    expect(screen.getByLabelText('Dirección habitual')).toHaveValue('Borrador conservado')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
  })

  it('[HU-10] warns before leaving a dirty patient record', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      if (url.endsWith('/api/patients/')) return Promise.resolve(jsonResponse([]))
      throw new Error(`Unexpected request: ${url}`)
    }))
    renderAuthenticated('RECEPCIONISTA', false, '/pacientes/1')

    fireEvent.change(await screen.findByLabelText('Dirección habitual'), { target: { value: 'Cambio pendiente' } })
    const unloadEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unloadEvent)
    expect(unloadEvent.defaultPrevented).toBe(true)

    fireEvent.click(screen.getByRole('link', { name: /Volver a pacientes/ }))
    expect(await screen.findByRole('dialog', { name: 'Cambios sin guardar' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByLabelText('Dirección habitual')).toHaveValue('Cambio pendiente')

    fireEvent.click(screen.getByRole('link', { name: /Volver a pacientes/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar y salir' }))
    expect(await screen.findByRole('heading', { name: 'Pacientes' })).toBeInTheDocument()
  })
})
