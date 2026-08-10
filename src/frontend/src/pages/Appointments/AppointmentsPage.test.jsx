import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../context/authContextValue'
import * as appointmentService from '../../services/appointmentService'
import { listPatients } from '../../services/patientService'
import { listClinicServices } from '../../services/clinicService'
import AppointmentsPage from './AppointmentsPage'

vi.mock('../../services/appointmentService')
vi.mock('../../services/patientService', async (importOriginal) => ({
  ...await importOriginal(),
  listPatients: vi.fn(),
}))
vi.mock('../../services/clinicService', () => ({ listClinicServices: vi.fn() }))

const localDate = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

const datePlus = (days) => {
  const value = new Date(`${localDate()}T12:00:00`)
  value.setDate(value.getDate() + days)
  return value.toISOString().slice(0, 10)
}

const weekStart = () => {
  const value = new Date(`${localDate()}T12:00:00`)
  const weekday = value.getDay()
  value.setDate(value.getDate() + (weekday === 0 ? -6 : 1 - weekday))
  return value.toISOString().slice(0, 10)
}

const patient = {
  id: 1, code: 'PAC-00001', full_name: 'Ana Pérez', first_name: 'Ana', last_name: 'Pérez',
  phone: '8888-1111', is_active: true,
}
const dentist = { id: 3, full_name: 'Dra. Elena Vargas', email: 'elena@dentalclinic.com' }
const appointment = (overrides = {}) => ({
  id: 9,
  patient: 1,
  patient_name: 'Ana Pérez',
  patient_code: 'PAC-00001',
  dentist: 3,
  dentist_name: 'Dra. Elena Vargas',
  date: localDate(),
  start_time: '09:00:00',
  end_time: '10:00:00',
  duration_minutes: 60,
  reason: 'Valoración de ortodoncia',
  notes: 'Sensibilidad dental.',
  status: 'PROGRAMADA',
  status_display: 'Programada',
  cancellation_reason: '',
  created_by: 2,
  created_at: `${localDate()}T12:00:00Z`,
  updated_at: `${localDate()}T12:00:00Z`,
  ...overrides,
})

const receptionist = {
  role: 'RECEPCIONISTA',
  permissions: ['appointments.view', 'appointments.create', 'appointments.edit'],
}
const odontologist = { role: 'ODONTOLOGO', permissions: ['appointments.view'] }

function renderPage(user = receptionist) {
  return render(
    <AuthContext.Provider value={{ user, accessToken: 'access-token' }}>
      <AppointmentsPage />
    </AuthContext.Provider>,
  )
}

describe('AppointmentsPage', () => {
  beforeEach(() => {
    listClinicServices.mockResolvedValue([])
    appointmentService.listAppointments.mockResolvedValue([appointment()])
    appointmentService.getAvailableDentists.mockResolvedValue([dentist])
    appointmentService.createAppointment.mockResolvedValue(appointment())
    appointmentService.updateAppointment.mockImplementation((access, id, changes) => {
      const labels = {
        CONFIRMADA: 'Confirmada', COMPLETADA: 'Completada', CANCELADA: 'Cancelada', NO_ASISTIO: 'No asistió',
      }
      return Promise.resolve(appointment({
        ...changes,
        status_display: labels[changes.status] || 'Programada',
      }))
    })
    listPatients.mockResolvedValue([patient])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows the daily agenda and appointment context', async () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Citas' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Ana Pérez, 09:00 a 10:00/ })).toBeInTheDocument()
    expect(screen.getByText('Valoración de ortodoncia')).toBeInTheDocument()
    expect(screen.getAllByText('Dra. Elena Vargas')).toHaveLength(2)
    expect(screen.getByText('Programada')).toBeInTheDocument()
  })

  it('navigates days and keeps create controls behind permissions', async () => {
    const { rerender } = renderPage()
    await screen.findByText('Valoración de ortodoncia')
    const dateInput = screen.getByLabelText('Fecha de agenda')
    const initialDate = dateInput.value

    fireEvent.click(screen.getByRole('button', { name: 'Día siguiente' }))

    expect(dateInput.value).not.toBe(initialDate)
    expect(screen.getByRole('button', { name: 'Nueva cita' })).toBeInTheDocument()

    rerender(
      <AuthContext.Provider value={{ user: odontologist, accessToken: 'access-token' }}>
        <AppointmentsPage />
      </AuthContext.Provider>,
    )
    expect(screen.queryByRole('button', { name: 'Nueva cita' })).not.toBeInTheDocument()
  })

  it('switches to a seven-day agenda and opens one day from the week', async () => {
    appointmentService.listAppointments.mockResolvedValue([
      appointment(),
      appointment({
        id: 10,
        patient: 2,
        patient_name: 'Luis Mendoza',
        patient_code: 'PAC-00002',
        date: weekStart(),
        start_time: '11:00:00',
        end_time: '11:45:00',
        duration_minutes: 45,
        reason: 'Control preventivo',
      }),
    ])
    renderPage()
    await screen.findByText('Valoración de ortodoncia')

    fireEvent.click(screen.getByRole('button', { name: 'Semana' }))

    const week = await screen.findByRole('region', { name: 'Vista semanal' })
    expect(within(week).getByText('Ana Pérez')).toBeInTheDocument()
    expect(within(week).getByText('Luis Mendoza')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(week).getAllByRole('button', { name: /Abrir agenda del/ })[0])
    expect(screen.getByRole('button', { name: 'Día' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Fecha de agenda')).toHaveValue(weekStart())
  })

  it('shows a monthly calendar and drills into a day with appointments', async () => {
    appointmentService.listAppointments.mockResolvedValue([
      appointment(),
      appointment({
        id: 10,
        patient_name: 'Luis Mendoza',
        date: datePlus(1),
        start_time: '11:00:00',
        end_time: '11:45:00',
        duration_minutes: 45,
      }),
    ])
    renderPage()
    await screen.findByRole('button', { name: /Ana Pérez, 09:00 a 10:00/ })

    fireEvent.click(screen.getByRole('button', { name: 'Mes' }))

    const month = await screen.findByRole('region', { name: 'Vista mensual' })
    expect(within(month).getByText('Lun')).toBeInTheDocument()
    expect(within(month).getByText('Dom')).toBeInTheDocument()
    expect(within(month).getByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mes' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(month).getAllByRole('button', { name: /Abrir agenda del/ })[0])
    expect(screen.getByRole('button', { name: 'Día' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('creates an appointment from the accessible side panel', async () => {
    appointmentService.listAppointments.mockResolvedValue([])
    listClinicServices.mockResolvedValue([{
      id: 4, name: 'Control de ortodoncia', duration_minutes: 45, is_active: true,
    }])
    renderPage()
    await screen.findByText('No hay citas programadas para este día.')

    fireEvent.click(screen.getByRole('button', { name: 'Nueva cita' }))
    const dialog = screen.getByRole('dialog', { name: 'Nueva cita' })
    fireEvent.change(within(dialog).getByLabelText('Paciente'), { target: { value: '1' } })
    fireEvent.change(within(dialog).getByLabelText(/Servicio/), { target: { value: '4' } })
    expect(within(dialog).getByLabelText('Duración')).toHaveValue('45')
    expect(within(dialog).getByLabelText('Motivo')).toHaveValue('Control de ortodoncia')
    fireEvent.change(within(dialog).getByLabelText('Hora'), { target: { value: '09:00' } })
    await waitFor(() => expect(within(dialog).getByLabelText('Odontólogo').options.length).toBe(2))
    fireEvent.change(within(dialog).getByLabelText('Odontólogo'), { target: { value: '3' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Programar cita' }))

    expect(await screen.findByText('Cita programada.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ana Pérez, 09:00 a 10:00/ })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Nueva cita' })).not.toBeInTheDocument()
    expect(appointmentService.createAppointment).toHaveBeenCalledWith(
      'access-token', expect.objectContaining({ service: 4, duration_minutes: 45, reason: 'Control de ortodoncia' }),
    )
  })

  it('preserves the form and explains a scheduling conflict', async () => {
    appointmentService.listAppointments.mockResolvedValue([])
    appointmentService.createAppointment.mockRejectedValue(
      new Error('El odontólogo ya tiene una cita en ese horario.'),
    )
    renderPage()
    await screen.findByText('No hay citas programadas para este día.')
    fireEvent.click(screen.getByRole('button', { name: 'Nueva cita' }))
    const dialog = screen.getByRole('dialog', { name: 'Nueva cita' })
    fireEvent.change(within(dialog).getByLabelText('Paciente'), { target: { value: '1' } })
    await waitFor(() => expect(within(dialog).getByLabelText('Odontólogo').options.length).toBe(2))
    fireEvent.change(within(dialog).getByLabelText('Odontólogo'), { target: { value: '3' } })
    fireEvent.change(within(dialog).getByLabelText('Motivo'), { target: { value: 'Control' } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Programar cita' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('El odontólogo ya tiene')
    expect(within(dialog).getByLabelText('Motivo')).toHaveValue('Control')
  })

  it('opens appointment details and confirms a scheduled appointment', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Ana Pérez, 09:00 a 10:00/ }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle de cita' })

    expect(within(dialog).getByText('Sensibilidad dental.')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar cita' }))

    expect(await screen.findByText('Cita confirmada.')).toBeInTheDocument()
    expect(screen.getAllByText('Confirmada')).toHaveLength(2)
  })

  it('edits appointment details with the same scheduling form', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Ana Pérez, 09:00 a 10:00/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar cita' })
    await waitFor(() => expect(within(dialog).getByLabelText('Odontólogo').options.length).toBe(2))
    fireEvent.change(within(dialog).getByLabelText('Motivo'), {
      target: { value: 'Control de ortodoncia actualizado' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Cita actualizada.')).toBeInTheDocument()
    expect(screen.getByText('Control de ortodoncia actualizado')).toBeInTheDocument()
  })

  it('cancels an appointment while keeping an optional reason', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Ana Pérez, 09:00 a 10:00/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar cita' }))
    fireEvent.change(screen.getByLabelText(/Motivo de cancelación/), {
      target: { value: 'Paciente reprogramará después.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }))

    expect(await screen.findByText('Cita cancelada.')).toBeInTheDocument()
    expect(screen.getAllByText('Cancelada')).toHaveLength(2)
    expect(screen.getByText('Paciente reprogramará después.')).toBeInTheDocument()
  })
})
