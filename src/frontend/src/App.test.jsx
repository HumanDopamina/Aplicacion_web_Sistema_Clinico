import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
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
  return render(
    <MemoryRouter initialEntries={['/login', path]} initialIndex={1}>
      <AuthProvider>
        {withBackControl ? <BackControl /> : null}
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
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
    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'María Fernanda' } })
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
    fireEvent.click(screen.getByRole('button', { name: 'Guardar expediente' }))

    expect(await screen.findByRole('heading', { name: 'María Fernanda García López' })).toBeInTheDocument()
    expect(screen.getByText('PAC-00001')).toBeInTheDocument()
    expect(submittedPatient.clinical_record.examiner_name).toBe('Dra. Elena Ruiz')
    expect(submittedPatient.clinical_record.chief_complaint).toBe('Dolor en molar inferior derecho.')
    expect(submittedPatient.clinical_record.blood_pressure).toBe('118/76')
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

    fireEvent.click(await screen.findByRole('button', { name: 'Editar expediente' }))
    expect(screen.getByRole('heading', { name: 'María Fernanda García López' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nombres')).toHaveValue('María Fernanda')
    fireEvent.change(screen.getByLabelText('Dirección habitual'), { target: { value: 'Cambio descartado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar edición' }))

    expect(screen.queryByLabelText('Dirección habitual')).not.toBeInTheDocument()
    expect(screen.getByText('Colonia Roma Norte')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Editar expediente' }))
    fireEvent.change(screen.getByLabelText('Dirección habitual'), { target: { value: 'Residencial Las Colinas' } })
    fireEvent.change(screen.getByLabelText('Teléfono de emergencia'), { target: { value: '+505 7777 3333' } })
    fireEvent.change(screen.getByLabelText('Motivo de consulta'), { target: { value: 'Control posterior al tratamiento.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar expediente' }))

    expect(await screen.findByText('Residencial Las Colinas')).toBeInTheDocument()
    expect(screen.getByText('+505 7777 3333')).toBeInTheDocument()
    expect(screen.getByText('Control posterior al tratamiento.')).toBeInTheDocument()
    expect(submittedChanges.clinical_record.chief_complaint).toBe('Control posterior al tratamiento.')
    expect(screen.getByRole('button', { name: 'Editar expediente' })).toBeInTheDocument()
  })

  it('[HU-10] hides patient editing actions without the configured permission', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(patientFixture)))
    renderAuthenticated('ODONTOLOGO', false, '/pacientes/1')

    expect(await screen.findByRole('heading', { name: 'María Fernanda García López' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar expediente' })).not.toBeInTheDocument()
  })
})
