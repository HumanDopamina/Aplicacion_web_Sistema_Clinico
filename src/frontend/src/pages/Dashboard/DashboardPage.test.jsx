import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listPatients } from '../../services/patientService'
import DashboardPage from './DashboardPage'

vi.mock('../../services/patientService', async (importOriginal) => ({
  ...await importOriginal(),
  listPatients: vi.fn(),
}))

describe('DashboardPage', () => {
  beforeEach(() => listPatients.mockResolvedValue([]))
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
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
    expect(screen.getByText('No hay citas programadas para hoy.')).toBeInTheDocument()
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

  it('opens the same patient registration form from the dashboard action', () => {
    render(
      <MemoryRouter>
        <DashboardPage
          user={{ first_name: 'Recepción', role: 'RECEPCIONISTA', permissions: ['patients.create'] }}
          accessToken="access-token"
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo paciente' }))

    expect(screen.getByRole('dialog', { name: 'Añadir nuevo paciente' })).toBeInTheDocument()
    expect(screen.getByLabelText('Cédula', { exact: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Añadir paciente' })).toBeInTheDocument()
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
