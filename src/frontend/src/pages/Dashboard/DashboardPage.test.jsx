import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import DashboardPage from './DashboardPage'

afterEach(cleanup)

describe('DashboardPage', () => {
  it('shows an empty clinical overview when there are no database records', () => {
    render(
      <MemoryRouter>
        <DashboardPage user={{ first_name: 'Arguello', role: 'ADMINISTRADOR' }} accessToken="access-token" />
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
