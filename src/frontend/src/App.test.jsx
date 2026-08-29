import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import * as authService from './services/authService'

vi.mock('./services/authService')

const rolePermissions = {
  ADMINISTRADOR: ['patients.view', 'patients.create', 'patients.edit', 'consultations.view', 'consultations.create', 'consultations.edit', 'appointments.view', 'appointments.create', 'appointments.edit'],
  RECEPCIONISTA: ['patients.view', 'patients.create', 'patients.edit', 'consultations.view', 'appointments.view', 'appointments.create', 'appointments.edit'],
  ODONTOLOGO: ['patients.view', 'consultations.view', 'consultations.create', 'consultations.edit', 'appointments.view'],
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
  patient: 1,
  time: '09:30:00',
  examiner_national_id: '001-010180-0003C',
  inss_number: 'INSS-9081',
  cema_number: 'CEMA-4402',
  dental_service: 'Valoración odontológica',
  chief_complaint: 'Dolor en molar inferior derecho.',
  present_illness_history: 'Dolor pulsátil de tres días.',
  respiratory: 'Sin disnea.',
  cardiovascular: 'Sin dolor precordial.',
  hepatic_renal: '',
  gastrointestinal: '',
  neurological: '',
  blood_system: '',
  reproductive_organs: '',
  heart_rate: 72,
  respiratory_rate: 16,
  blood_pressure: '118/76',
  temperature: '36.6',
  weight: '68.40',
  height: '1.65',
  body_surface_area: '1.76',
  bmi: '25.12',
  general_appearance: 'Consciente y orientada.',
  skin_and_mucosa: '',
  thorax: '',
  rib_cage: '',
  breasts: '',
  lung_fields: '',
  cardiac: '',
  abdomen_pelvis: '',
  rectal_exam: '',
  musculoskeletal: '',
  upper_extremities: '',
  lower_extremities: '',
  genitourinary: '',
  gynecological_exam: '',
  neurological_exam: '',
  observations_analysis: 'Evolución favorable.',
  dental_diagnoses: 'Pulpitis irreversible.',
  treatment_plan: 'Tratamiento endodóntico.',
  budget: 'C$ 4,500.',
  treatment_performed: 'Radiografía diagnóstica.',
  created_at: '2026-08-08T12:00:00Z',
  updated_at: '2026-08-08T12:00:00Z',
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
  const router = createMemoryRouter([{
    path: '*',
    element:
      <AuthProvider initialSession={session(role)}>
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

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de Usuario' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))

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

  it('offers profile, password change and logout actions from the avatar menu', () => {
    renderAuthenticated('ODONTOLOGO')

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de Usuario' }))

    expect(screen.getByRole('menuitem', { name: 'Mi perfil' })).toHaveAttribute('href', '/mi-perfil')
    expect(screen.getByRole('menuitem', { name: 'Cambiar contraseña' })).toHaveAttribute(
      'href',
      '/cambiar-contrasena',
    )
    expect(screen.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menuitem', { name: 'Mi perfil' })).not.toBeInTheDocument()
  })

  it.each(['ADMINISTRADOR', 'RECEPCIONISTA', 'ODONTOLOGO'])(
    'allows %s to open the personal profile route',
    async (role) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
        ...session(role).user,
        id: 4,
        last_name: 'Clínica',
        phone: '',
        avatar_url: '',
      })))

      renderAuthenticated(role, false, '/mi-perfil')

      expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()
      expect(screen.getByDisplayValue(`${role.toLowerCase()}@test.com`)).toBeInTheDocument()
    },
  )

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
    expect(screen.getByRole('heading', { name: 'Datos personales' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Antecedentes familiares patológicos' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Datos generales de la consulta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Interrogatorio por aparatos y sistemas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Examen físico' })).not.toBeInTheDocument()
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
    fireEvent.change(screen.getByLabelText('Antecedentes familiares'), { target: { value: 'Madre con hipertensión arterial.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('heading', { name: 'María Fernanda García López' })).toBeInTheDocument()
    expect(screen.getByText('PAC-00001')).toBeInTheDocument()
    expect(submittedPatient.clinical_record.family_history).toBe('Madre con hipertensión arterial.')
    expect(Object.keys(submittedPatient.clinical_record).sort()).toEqual([
      'clinical_photographs',
      'family_history',
      'hereditary_diseases',
      'infectious_diseases',
      'radiographic_exams',
    ])
  })

  it('[HU-10] keeps consultation-specific fields out of the clinical summary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(patientFixture)))
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1')

    expect(await screen.findByRole('heading', { name: 'María Fernanda García López' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Datos personales' })).toBeInTheDocument()
    expect(screen.getByText('Docente')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Antecedentes familiares patológicos' })).toBeInTheDocument()
    expect(screen.getByText('Varicela')).toBeInTheDocument()
    expect(screen.getByText('Diabetes mellitus')).toBeInTheDocument()
    for (const heading of [
      'Datos generales de la consulta',
      'Motivo de consulta',
      'Historia de la enfermedad actual',
      'Interrogatorio por aparatos y sistemas',
      'Examen físico',
      'Observaciones y análisis',
      'Diagnósticos o problemas odontológicos',
      'Plan de tratamiento odontológico',
      'Presupuesto',
      'Tratamiento realizado',
    ]) {
      expect(screen.queryByRole('heading', { name: heading })).not.toBeInTheDocument()
    }
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
    const row = await screen.findByRole('row', { name: /08 ago 2026 Seguimiento Dra\. Elena Rivera/ })
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

  it('shows consultation actions according to the configured capabilities', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.endsWith('/api/patients/1/consultations/')) return Promise.resolve(jsonResponse([consultationFixture]))
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      throw new Error(`Unexpected request: ${url}`)
    }))
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1/consultas')

    expect(await screen.findByRole('link', { name: 'Nueva consulta' })).toHaveAttribute(
      'href',
      '/pacientes/1/consultas/nueva',
    )
    expect((await screen.findAllByRole('link', { name: 'Ver detalle' }))[0]).toHaveAttribute(
      'href',
      '/pacientes/1/consultas/12',
    )

    cleanup()
    renderAuthenticated('RECEPCIONISTA', false, '/pacientes/1/consultas')
    expect((await screen.findAllByRole('link', { name: 'Ver detalle' })).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Nueva consulta' })).not.toBeInTheDocument()
  })

  it('opens a new consultation with defaults and every clinical section', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.endsWith('/api/patients/1/consultations/')) return Promise.resolve(jsonResponse([]))
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      throw new Error(`Unexpected request: ${url}`)
    }))
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1/consultas/nueva')

    expect(await screen.findByRole('heading', { name: 'Nueva consulta' })).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha')).not.toHaveValue('')
    expect(screen.getByLabelText('Hora')).not.toHaveValue('')
    expect(screen.getByLabelText('Estado')).toHaveValue('EN_PROGRESO')
    expect(screen.getByLabelText('Profesional')).toHaveValue('Usuario')
    ;[
      'N.º de cédula del doctor', 'N.º INSS', 'N.º CEMA', 'Servicio odontológico',
      'Tipo', 'Resumen', 'Motivo de consulta', 'Historia de la enfermedad actual',
      'Respiratorio', 'Cardiovascular', 'Hepático y renal', 'Gastrointestinal',
      'Neurológico', 'Sistema sanguíneo', 'Órganos reproductivos', 'Frecuencia cardíaca',
      'Frecuencia respiratoria', 'Presión arterial', 'Temperatura', 'Peso', 'Talla',
      'Área de superficie corporal', 'IMC', 'Aspecto general', 'Piel y mucosas', 'Tórax',
      'Caja torácica', 'Mamas', 'Campos pulmonares', 'Cardíaco', 'Abdomen y pelvis',
      'Tacto rectal, cuando aplique', 'Musculoesquelético', 'Extremidades superiores',
      'Extremidades inferiores', 'Genitourinario, cuando aplique', 'Examen ginecológico',
      'Examen neurológico', 'Observaciones y análisis', 'Diagnóstico / problemas odontológicos',
      'Plan de tratamiento', 'Presupuesto / descripción', 'Tratamiento realizado',
    ].forEach((label) => expect(screen.getByLabelText(label)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Resumen'), { target: { value: 'Borrador' } })
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(await screen.findByRole('heading', { name: 'Consultas del paciente' })).toBeInTheDocument()
  })

  it('creates a consultation with the cloud and opens its detail', async () => {
    let submittedConsultation = null
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (url.endsWith('/api/patients/1/consultations/') && options.method === 'POST') {
        submittedConsultation = JSON.parse(options.body)
        return Promise.resolve(jsonResponse({ ...consultationFixture, ...submittedConsultation, consultation_type_display: 'Consulta general' }, 201))
      }
      if (url.endsWith('/api/patients/1/consultations/12/')) return Promise.resolve(jsonResponse({ ...consultationFixture, ...submittedConsultation, consultation_type_display: 'Consulta general' }))
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      throw new Error(`Unexpected request: ${url}`)
    }))
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1/consultas/nueva')

    fireEvent.change(await screen.findByLabelText('Tipo'), { target: { value: 'GENERAL' } })
    fireEvent.change(screen.getByLabelText('Resumen'), { target: { value: 'Nueva valoración clínica.' } })
    fireEvent.change(screen.getByLabelText('Motivo de consulta'), { target: { value: 'Dolor dental.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(submittedConsultation).not.toBeNull())
    expect(submittedConsultation.status).toBe('EN_PROGRESO')
    expect(submittedConsultation.chief_complaint).toBe('Dolor dental.')
    expect(await screen.findByRole('heading', { name: 'Consulta general' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
  })

  it('edits and discards a completed consultation inline', async () => {
    let patchPayload = null
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (url.endsWith('/api/patients/1/consultations/12/') && options.method === 'PATCH') {
        patchPayload = JSON.parse(options.body)
        return Promise.resolve(jsonResponse({ ...consultationFixture, ...patchPayload }))
      }
      if (url.endsWith('/api/patients/1/consultations/12/')) return Promise.resolve(jsonResponse(consultationFixture))
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      throw new Error(`Unexpected request: ${url}`)
    }))
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1/consultas/12')

    expect(await screen.findByLabelText('Resumen')).toHaveValue(consultationFixture.summary)
    fireEvent.change(screen.getByLabelText('Resumen'), { target: { value: 'Cambio descartado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.getByLabelText('Resumen')).toHaveValue(consultationFixture.summary)
    expect(patchPayload).toBeNull()

    fireEvent.change(screen.getByLabelText('Resumen'), { target: { value: 'Control actualizado.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument())
    expect(patchPayload.summary).toBe('Control actualizado.')
    expect(screen.getByLabelText('Resumen')).toHaveValue('Control actualizado.')
  })

  it('keeps consultation values read-only without edit capability', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.endsWith('/api/patients/1/consultations/12/')) return Promise.resolve(jsonResponse(consultationFixture))
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      throw new Error(`Unexpected request: ${url}`)
    }))
    renderAuthenticated('RECEPCIONISTA', false, '/pacientes/1/consultas/12')

    expect(await screen.findByText(consultationFixture.summary)).toBeInTheDocument()
    expect(screen.queryByLabelText('Resumen')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
  })

  it('preserves a consultation draft after an API error and blocks navigation', async () => {
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (url.endsWith('/api/patients/1/consultations/12/') && options.method === 'PATCH') {
        return Promise.resolve(jsonResponse({ detail: 'No fue posible guardar la consulta.' }, 400))
      }
      if (url.endsWith('/api/patients/1/consultations/12/')) return Promise.resolve(jsonResponse(consultationFixture))
      if (url.endsWith('/api/patients/1/consultations/')) return Promise.resolve(jsonResponse([consultationFixture]))
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patientFixture))
      throw new Error(`Unexpected request: ${url}`)
    }))
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1/consultas/12')

    fireEvent.change(await screen.findByLabelText('Resumen'), { target: { value: 'Borrador pendiente' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible guardar la consulta.')
    expect(screen.getByLabelText('Resumen')).toHaveValue('Borrador pendiente')

    fireEvent.click(screen.getByRole('link', { name: /Volver a consultas/ }))
    expect(await screen.findByRole('dialog', { name: 'Cambios sin guardar' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByLabelText('Resumen')).toHaveValue('Borrador pendiente')
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
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument())
    expect(screen.getByLabelText('Dirección habitual')).toHaveValue('Residencial Las Colinas')
    expect(screen.getByLabelText('Teléfono de emergencia')).toHaveValue('+505 7777 3333')
    expect(submittedChanges.clinical_record).not.toHaveProperty('chief_complaint')
    expect(submittedChanges.clinical_record).not.toHaveProperty('blood_pressure')
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

  it('[HU-13] shows the duplicate identification error without losing the new patient draft', async () => {
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (url.endsWith('/api/patients/') && options.method === 'POST') {
        return Promise.resolve(jsonResponse({
          national_id: ['Ya existe un paciente con esta cédula.'],
        }, 400))
      }
      throw new Error(`Unexpected request: ${url}`)
    }))
    const { router } = renderAuthenticated('RECEPCIONISTA', false, '/pacientes/nuevo')

    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'María Fernanda' } })
    fireEvent.change(screen.getByLabelText('Primer apellido'), { target: { value: 'García' } })
    fireEvent.change(screen.getByLabelText('Lugar de nacimiento'), { target: { value: 'Managua' } })
    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: '0011604980001a' } })
    fireEvent.change(screen.getByLabelText('Género'), { target: { value: 'FEMENINO' } })
    fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '1998-04-16' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe un paciente con esta cédula.')
    expect(screen.getByLabelText('Cédula')).toHaveValue('0011604980001a')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/pacientes/nuevo')
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
