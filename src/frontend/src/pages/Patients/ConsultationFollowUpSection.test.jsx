import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConsultationFollowUpSection from './ConsultationFollowUpSection'

const pendingItems = [
  {
    id: 15,
    description: 'Restauración de resina',
    status: 'ACEPTADO',
    status_display: 'Aceptado',
    tooth_code: '16',
    surfaces: ['OCCLUSAL'],
    service: {
      id: 8,
      name: 'Restauración simple',
      category_name: 'Restauraciones',
      duration_minutes: 45,
      is_active: true,
    },
  },
  {
    id: 16,
    description: 'Control periodontal',
    status: 'PROPUESTO',
    status_display: 'Propuesto',
    tooth_code: null,
    surfaces: [],
    service: {
      id: 9,
      name: 'Servicio histórico',
      category_name: 'Periodoncia',
      duration_minutes: 60,
      is_active: false,
    },
  },
  { id: 17, description: 'Ya realizado', status: 'REALIZADO' },
  { id: 18, description: 'Ya cancelado', status: 'CANCELADO' },
]

afterEach(cleanup)

describe('ConsultationFollowUpSection', () => {
  it('shows only longitudinal pending items with operational context', () => {
    render(<ConsultationFollowUpSection status="COMPLETADA" items={pendingItems} canSchedule />)

    const region = screen.getByRole('region', { name: 'Seguimiento de la atención' })
    expect(within(region).getByRole('heading', { name: 'Atención completada' })).toBeInTheDocument()
    expect(within(region).getByText('Restauración de resina')).toBeInTheDocument()
    expect(within(region).getByText('Pieza 16 · Oclusal')).toBeInTheDocument()
    expect(within(region).getByText('Restauración simple · 45 minutos')).toBeInTheDocument()
    expect(within(region).getByText('Servicio histórico · no disponible para nuevas citas')).toBeInTheDocument()
    expect(within(region).queryByText('Ya realizado')).not.toBeInTheDocument()
    expect(within(region).queryByText('Ya cancelado')).not.toBeInTheDocument()
  })

  it('keeps treatment context optional and sends only the chosen item', () => {
    const onSchedule = vi.fn()
    render(<ConsultationFollowUpSection
      status="COMPLETADA"
      items={pendingItems}
      canSchedule
      onSchedule={onSchedule}
    />)

    fireEvent.click(screen.getByRole('button', { name: 'Programar próxima cita' }))
    expect(onSchedule).toHaveBeenLastCalledWith(null)

    fireEvent.click(screen.getByRole('radio', { name: /Restauración de resina/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Programar próxima cita' }))
    expect(onSchedule).toHaveBeenLastCalledWith(pendingItems[0])
  })

  it('explains an empty plan without rendering an unnecessary selector', () => {
    render(<ConsultationFollowUpSection status="COMPLETADA" items={[]} canSchedule />)

    expect(screen.getByText('No hay tratamientos pendientes.')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Programar próxima cita' })).toBeInTheDocument()
  })

  it('hides scheduling without permission and hides the post-close block for other statuses', () => {
    const { rerender } = render(
      <ConsultationFollowUpSection status="COMPLETADA" items={pendingItems} canSchedule={false} />,
    )
    expect(screen.queryByRole('button', { name: 'Programar próxima cita' })).not.toBeInTheDocument()

    rerender(<ConsultationFollowUpSection status="EN_PROGRESO" items={pendingItems} canSchedule />)
    expect(screen.queryByRole('region', { name: 'Seguimiento de la atención' })).not.toBeInTheDocument()

    rerender(<ConsultationFollowUpSection status="CANCELADA" items={pendingItems} canSchedule />)
    expect(screen.queryByRole('region', { name: 'Seguimiento de la atención' })).not.toBeInTheDocument()
  })
})
