import { describe, expect, it } from 'vitest'
import { patientIdentity } from './patientDisplay'

describe('patientIdentity', () => {
  it.each([
    ['CEDULA', '001-160498-0001A', 'Cédula 001-160498-0001A'],
    ['PASAPORTE', 'PA-009874', 'Pasaporte PA-009874'],
    ['OTRO', 'EXP-0007', 'Otra identificación EXP-0007'],
  ])('renders the %s identification without changing its significant characters', (
    identificationType,
    identificationNumber,
    expected,
  ) => {
    expect(patientIdentity({
      identification_type: identificationType,
      identification_number: identificationNumber,
    })).toContain(expected)
  })

  it('omits identification cleanly when the patient does not have one', () => {
    const identity = patientIdentity({
      gender: 'FEMENINO',
      date_of_birth: '1998-04-16',
      identification_type: null,
      identification_number: null,
      national_id: 'legacy-must-not-be-read',
    })

    expect(identity).toContain('Femenino')
    expect(identity).not.toContain('Cédula')
    expect(identity).not.toContain('legacy-must-not-be-read')
    expect(identity).not.toContain('null')
    expect(identity).not.toContain('undefined')
  })
})
