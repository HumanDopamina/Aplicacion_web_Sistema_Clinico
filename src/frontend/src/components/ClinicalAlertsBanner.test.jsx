import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ClinicalAlertsBanner from './ClinicalAlertsBanner'


afterEach(cleanup)


describe('ClinicalAlertsBanner', () => {
  it('shows every registered clinical alert category', () => {
    render(<ClinicalAlertsBanner clinicalRecord={{
      allergies: 'Penicilina — urticaria',
      current_medications: 'Losartán 50 mg',
      relevant_conditions: 'Hipertensión controlada',
      other_clinical_alerts: 'Antecedente de síncope durante procedimientos',
    }} />)

    const banner = screen.getByRole('region', { name: 'Alertas clínicas' })
    expect(within(banner).getByText('Penicilina — urticaria')).toBeInTheDocument()
    expect(within(banner).getByText('Losartán 50 mg')).toBeInTheDocument()
    expect(within(banner).getByText('Hipertensión controlada')).toBeInTheDocument()
    expect(within(banner).getByText('Antecedente de síncope durante procedimientos')).toBeInTheDocument()
  })

  it('represents the absence of registered alerts explicitly', () => {
    render(<ClinicalAlertsBanner clinicalRecord={{}} />)

    expect(screen.getByRole('region', { name: 'Alertas clínicas' })).toHaveTextContent(
      'No hay alertas clínicas registradas.',
    )
  })

  it('marks the migrated historical allergy as pending detail', () => {
    render(<ClinicalAlertsBanner clinicalRecord={{
      allergies: 'Alergia registrada previamente; completar detalle',
    }} />)

    expect(screen.getByText('Información pendiente de completar')).toBeInTheDocument()
    expect(screen.getByText('Alergia registrada previamente; completar detalle')).toBeInTheDocument()
  })
})
