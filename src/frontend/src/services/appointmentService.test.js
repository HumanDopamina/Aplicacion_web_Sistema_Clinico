import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './api'
import {
  createAppointment,
  getAvailableDentists,
  getAppointment,
  listAppointments,
  updateAppointment,
} from './appointmentService'

vi.mock('./api', () => ({ apiRequest: vi.fn() }))

describe('appointmentService', () => {
  beforeEach(() => apiRequest.mockReset())

  it('lists the selected day with optional filters', () => {
    listAppointments('token', { date: '2026-08-12', dentist: 3, status: 'CONFIRMADA' })

    expect(apiRequest).toHaveBeenCalledWith(
      '/api/appointments/?date=2026-08-12&dentist=3&status=CONFIRMADA',
      { headers: { Authorization: 'Bearer token' } },
    )
  })

  it('lists an inclusive range for week and month calendars', () => {
    listAppointments('token', { date_from: '2026-08-10', date_to: '2026-08-16' })

    expect(apiRequest).toHaveBeenCalledWith(
      '/api/appointments/?date_from=2026-08-10&date_to=2026-08-16',
      { headers: { Authorization: 'Bearer token' } },
    )
  })

  it('requests a bounded appointment page', () => {
    listAppointments('token', { date: '2026-08-12', page: 2, page_size: 100 })

    expect(apiRequest).toHaveBeenCalledWith(
      '/api/appointments/?date=2026-08-12&page=2&page_size=100',
      { headers: { Authorization: 'Bearer token' } },
    )
  })

  it('creates and updates appointments with authentication', () => {
    const appointment = { patient: 2, dentist: 3, date: '2026-08-12' }
    createAppointment('token', appointment)
    updateAppointment('token', 9, { status: 'CONFIRMADA' })

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/api/appointments/', {
      method: 'POST', body: JSON.stringify(appointment), headers: { Authorization: 'Bearer token' },
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/api/appointments/9/', {
      method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMADA' }), headers: { Authorization: 'Bearer token' },
    })
  })

  it('loads detail and available dentists for a slot', () => {
    getAppointment('token', 9)
    getAvailableDentists('token', {
      date: '2026-08-12', startTime: '09:00', durationMinutes: 60, excludeId: 9,
    })

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/api/appointments/9/', {
      headers: { Authorization: 'Bearer token' },
    })
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      '/api/appointments/dentists/availability/?date=2026-08-12&start_time=09%3A00&duration_minutes=60&exclude_id=9',
      { headers: { Authorization: 'Bearer token' } },
    )
  })
})
