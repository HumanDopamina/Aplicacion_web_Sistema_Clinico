import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import DashboardPage from './DashboardPage'

afterEach(cleanup)

describe('DashboardPage', () => {
  it('shows an empty clinical overview when there are no database records', () => {
    render(
      <MemoryRouter>
        <DashboardPage user={{ first_name: 'Arguello' }} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Bienvenido, Dr. Arguello' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo paciente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nueva cita' })).toBeInTheDocument()
    expect(screen.getByLabelText('Total pacientes')).toHaveTextContent('0')
    expect(screen.getByRole('heading', { name: 'Citas de hoy' })).toBeInTheDocument()
    expect(screen.getByText('No hay citas programadas para hoy.')).toBeInTheDocument()
    expect(screen.getByText('Pacientes recientes')).toBeInTheDocument()
    expect(screen.getByText('Aún no hay pacientes registrados.')).toBeInTheDocument()
    expect(screen.queryByText('Leonel Hernández')).not.toBeInTheDocument()
  })
})
