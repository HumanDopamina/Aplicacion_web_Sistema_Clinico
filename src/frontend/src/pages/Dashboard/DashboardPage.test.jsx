import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listAppointments } from '../../services/appointmentService'
import { listPatients } from '../../services/patientService'
import DashboardPage from './DashboardPage'

vi.mock('../../services/appointmentService')
vi.mock('../../services/patientService', async (importOriginal) => ({
  ...await importOriginal(),
  listPatients: vi.fn(),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    listPatients.mockResolvedValue([])
    listAppointments.mockResolvedValue([])
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('shows an empty clinical overview when there are no database records', async () => {
    render(
      <MemoryRouter>
        <DashboardPage user={{ first_name: 'Arguello', role: 'ADMINISTRADOR' }} accessToken="access-token" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Bienvenido, Dr. Arguello' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo paciente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nueva cita' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Citas de hoy' })).toBeInTheDocument()
    expect(await screen.findByText('No hay citas programadas para hoy.')).toBeInTheDocument()
    expect(screen.getByText('Pacientes recientes')).toBeInTheDocument()
    expect(await screen.findByText('Aún no hay pacientes registrados.')).toBeInTheDocument()
    expect(screen.getByLabelText('Total pacientes')).toHaveTextContent('0')
    expect(screen.queryByText('Leonel Hernández')).not.toBeInTheDocument()
  })

  it('shows the total and recently registered patients returned by the API', async () => {
    listPatients.mockResolvedValue([{
      id: 1,
      code: 'PAC-00001',
      first_name: 'leonel alberto',
      last_name: 'hernandez',
      second_last_name: 'alvarez',
      full_name: 'leonel alberto hernandez alvarez',
      birth_place: 'El Viejo, Chinandega',
      address: 'Iglesia San José',
      national_id: '3423424242234',
      phone: '354545454',
      email: 'leo3@gmail.com',
      emergency_contact_name: 'Carlos',
      emergency_relationship: 'Hermano',
      emergency_phone: '343434',
      gender: 'MASCULINO',
      date_of_birth: '2003-07-29',
      is_active: true,
      created_at: '2026-08-08T12:00:00Z',
      updated_at: '2026-08-08T12:00:00Z',
      registered_by: 2,
    }])

    render(
      <MemoryRouter>
        <DashboardPage user={{ first_name: 'Arguello', role: 'ADMINISTRADOR' }} accessToken="access-token" />
      </MemoryRouter>,
    )

    expect(await screen.findByText('leonel alberto hernandez alvarez')).toBeInTheDocument()
    expect(screen.getByText('PAC-00001')).toBeInTheDocument()
    expect(screen.getByLabelText('Total pacientes')).toHaveTextContent('1')
    expect(screen.getByRole('link', { name: 'Ver expediente de leonel alberto hernandez alvarez' })).toHaveAttribute('href', '/pacientes/1')
    expect(screen.queryByText('Aún no hay pacientes registrados.')).not.toBeInTheDocument()
  })

  it('opens the full patient record page from the dashboard action', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<DashboardPage
            user={{ first_name: 'Recepción', role: 'RECEPCIONISTA', permissions: ['patients.create'] }}
            accessToken="access-token"
          />} />
          <Route path="/pacientes/nuevo" element={<h1>Nuevo paciente</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo paciente' }))

    expect(screen.getByRole('heading', { name: 'Nuevo paciente' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the appointments scheduled for the current local date', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-09T12:00:00'))
    listAppointments.mockImplementation((access, filters) => Promise.resolve(
      access === 'access-token' && filters.date === '2026-08-09'
        ? [{
            id: 9,
            patient: 1,
            patient_name: 'Leonel Hernández',
            patient_code: 'PAC-00001',
            dentist: 3,
            dentist_name: 'Dr. Wilder Suárez',
            date: '2026-08-09',
            start_time: '09:00:00',
            end_time: '10:00:00',
            duration_minutes: 60,
            reason: 'Valoración de ortodoncia',
            notes: '',
            status: 'PROGRAMADA',
            status_display: 'Programada',
            cancellation_reason: '',
            created_by: 2,
            created_at: '2026-08-09T08:00:00Z',
            updated_at: '2026-08-09T08:00:00Z',
          }]
        : [],
    ))

    render(
      <MemoryRouter>
        <DashboardPage user={{ first_name: 'Arguello', role: 'ADMINISTRADOR' }} accessToken="access-token" />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Leonel Hernández')).toBeInTheDocument()
    expect(screen.getByLabelText('Citas de hoy')).toHaveTextContent('1')
    expect(screen.getByText('09:00–10:00')).toBeInTheDocument()
    expect(screen.getByText(/Valoración de ortodoncia/)).toBeInTheDocument()
    expect(screen.getByText('Domingo, 9 de agosto')).toBeInTheDocument()
    expect(screen.queryByText('No hay citas programadas para hoy.')).not.toBeInTheDocument()
  })

  it('opens the appointments module from the new appointment action', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<DashboardPage
            user={{ first_name: 'Recepción', role: 'RECEPCIONISTA', permissions: ['appointments.create'] }}
            accessToken="access-token"
          />} />
          <Route path="/citas" element={<h1>Agenda de citas</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Nueva cita' }))

    expect(screen.getByRole('heading', { name: 'Agenda de citas' })).toBeInTheDocument()
  })

  it('does not offer patient registration without the configured permission', () => {
    render(
      <MemoryRouter>
        <DashboardPage
          user={{ first_name: 'Odontología', role: 'ODONTOLOGO', permissions: ['patients.view'] }}
          accessToken="access-token"
        />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Nuevo paciente' })).not.toBeInTheDocument()
  })
})
