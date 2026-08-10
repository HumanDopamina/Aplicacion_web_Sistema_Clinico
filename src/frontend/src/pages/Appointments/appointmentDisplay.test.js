import { afterEach, describe, expect, it, vi } from 'vitest'
import { currentClockMinutes, todayValue } from './appointmentDisplay'

describe('clinic timezone display helpers', () => {
  afterEach(() => vi.useRealTimers())

  it('calculates today and the current clock in the configured IANA timezone', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-10T02:30:00Z'))

    expect(todayValue('America/Managua')).toBe('2026-08-09')
    expect(todayValue('Europe/Madrid')).toBe('2026-08-10')
    expect(currentClockMinutes('America/Managua')).toBe(20 * 60 + 30)
  })
})
