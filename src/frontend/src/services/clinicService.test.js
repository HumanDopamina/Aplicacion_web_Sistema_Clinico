import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createClinicService,
  getBusinessHours,
  getClinicProfile,
  listClinicServices,
  updateClinicProfile,
} from './clinicService'

describe('clinicService', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('uses authenticated clinic endpoints and preserves FormData', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    await getClinicProfile('token')
    await getBusinessHours('token')
    await listClinicServices('token', { active: true, category: 2 })
    const form = new FormData()
    form.append('name', 'Clínica Argüello')
    await updateClinicProfile('token', form)
    await createClinicService('token', { name: 'Limpieza' })

    expect(fetchMock.mock.calls[0][0]).toContain('/api/clinics/profile/')
    expect(fetchMock.mock.calls[1][0]).toContain('/api/clinics/business-hours/')
    expect(fetchMock.mock.calls[2][0]).toContain('active=true&category=2')
    expect(fetchMock.mock.calls[3][1].headers['Content-Type']).toBeUndefined()
    expect(fetchMock.mock.calls[4][1].body).toBe(JSON.stringify({ name: 'Limpieza' }))
  })
})
