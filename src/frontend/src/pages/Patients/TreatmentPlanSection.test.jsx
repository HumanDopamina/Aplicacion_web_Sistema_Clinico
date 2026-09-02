import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TreatmentPlanSection from './TreatmentPlanSection'

const services = [
  {
    id: 4,
    name: 'Restauración con resina',
    category_name: 'Restauraciones',
    price: '850.00',
    is_active: true,
  },
]

const item = {
  id: 9,
  service: services[0],
  description: 'Restauración con resina',
  diagnosis_text: 'Caries oclusal',
  tooth_code: '16',
  surfaces: ['OCCLUSAL'],
  planned_finding: 'RESTORATION',
  status: 'PROPUESTO',
  status_display: 'Propuesto',
  unit_price_snapshot: '850.00',
  notes: 'Aislamiento absoluto',
  performed_in: null,
  performed_at: null,
  status_reason: '',
  proposed_in: { id: 12, date: '2026-08-20' },
}

afterEach(cleanup)

describe('TreatmentPlanSection', () => {
  it('shows loading, backend error and empty states', () => {
    const { rerender } = render(
      <TreatmentPlanSection loading items={[]} services={[]} canEdit onCreate={vi.fn()} />,
    )
    expect(screen.getByText('Cargando plan de tratamiento…')).toBeInTheDocument()

    rerender(
      <TreatmentPlanSection error="No fue posible cargar el plan." items={[]} services={[]} canEdit onCreate={vi.fn()} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('No fue posible cargar el plan.')

    rerender(
      <TreatmentPlanSection items={[]} services={[]} canEdit onCreate={vi.fn()} />,
    )
    expect(screen.getByText('No hay tratamientos pendientes.')).toBeInTheDocument()
    expect(screen.getByText('Aún no existe historial de tratamientos estructurados.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agregar tratamiento' })).toBeInTheDocument()
  })

  it('offers the active catalog, reference price, tooth surfaces and clinical fields', () => {
    render(
      <TreatmentPlanSection items={[]} services={services} canEdit onCreate={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Agregar tratamiento' }))

    fireEvent.change(screen.getByLabelText('Servicio'), { target: { value: '4' } })
    expect(screen.getByText('Precio de referencia: C$ 850.00')).toBeInTheDocument()
    expect(screen.getByLabelText('Procedimiento personalizado')).toBeInTheDocument()
    expect(screen.getByLabelText('Diagnóstico o justificación')).toBeInTheDocument()
    expect(screen.getByLabelText('Pieza dental')).toBeInTheDocument()
    expect(screen.getByLabelText('Hallazgo planificado')).toBeInTheDocument()
    expect(screen.getByLabelText('Notas')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Pieza dental'), { target: { value: '16' } })
    expect(screen.getByRole('group', { name: 'Superficies' })).toBeInTheDocument()
    expect(screen.getByLabelText('Oclusal')).toBeInTheDocument()
    expect(screen.queryByLabelText('Incisal')).not.toBeInTheDocument()
  })

  it('validates an identifiable procedure and appends a successful proposal', async () => {
    const onCreate = vi.fn().mockResolvedValue(item)
    render(
      <TreatmentPlanSection items={[]} services={services} canEdit onCreate={onCreate} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Agregar tratamiento' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar tratamiento' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Selecciona un servicio o escribe un procedimiento.')

    fireEvent.change(screen.getByLabelText('Servicio'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Diagnóstico o justificación'), { target: { value: 'Caries oclusal' } })
    fireEvent.change(screen.getByLabelText('Pieza dental'), { target: { value: '16' } })
    fireEvent.click(screen.getByLabelText('Oclusal'))
    fireEvent.change(screen.getByLabelText('Hallazgo planificado'), { target: { value: 'RESTORATION' } })
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: 'Aislamiento absoluto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar tratamiento' }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({
      service_id: 4,
      description: '',
      diagnosis_text: 'Caries oclusal',
      tooth_code: '16',
      surfaces: ['OCCLUSAL'],
      planned_finding: 'RESTORATION',
      notes: 'Aislamiento absoluto',
    }))
    const proposal = await screen.findByRole('article', { name: 'Restauración con resina' })
    expect(within(proposal).getByText('Propuesto')).toBeInTheDocument()
    expect(within(proposal).getByText('Pieza 16 · Oclusal')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar tratamiento' })).not.toBeInTheDocument()
  })

  it('supports a custom procedure and preserves a backend creation error', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('La consulta ya está cerrada.'))
    render(
      <TreatmentPlanSection items={[]} services={services} canEdit onCreate={onCreate} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Agregar tratamiento' }))
    fireEvent.change(screen.getByLabelText('Procedimiento personalizado'), {
      target: { value: 'Educación de higiene oral' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar tratamiento' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La consulta ya está cerrada.')
    expect(screen.getByLabelText('Procedimiento personalizado')).toHaveValue('Educación de higiene oral')
  })

  it('keeps proposal creation closed while still allowing lifecycle actions after origin closure', () => {
    render(
      <TreatmentPlanSection
        items={[item]}
        services={[]}
        canEdit={false}
        canTransition
        canPerform={false}
        currentConsultationId={12}
        onCreate={vi.fn()}
        onAccept={vi.fn()}
        onPerform={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText('Restauración con resina')).toBeInTheDocument()
    expect(screen.getByText('Propuesto')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar tratamiento' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aceptar Restauración con resina' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar Restauración con resina' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Realizar Restauración con resina' })).not.toBeInTheDocument()
  })

  it('accepts once on a double click and replaces the item with the backend response', async () => {
    let resolveAccept
    const onAccept = vi.fn(() => new Promise((resolve) => { resolveAccept = resolve }))
    render(
      <TreatmentPlanSection
        items={[item]}
        services={[]}
        canEdit
        canTransition
        canPerform
        currentConsultationId={12}
        onCreate={vi.fn()}
        onAccept={onAccept}
        onPerform={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const accept = screen.getByRole('button', { name: 'Aceptar Restauración con resina' })
    fireEvent.click(accept)
    fireEvent.click(accept)

    expect(onAccept).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Aceptando Restauración con resina' })).toBeDisabled()
    resolveAccept({ ...item, status: 'ACEPTADO', status_display: 'Aceptado' })

    expect(await screen.findByText('Aceptado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Realizar Restauración con resina' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aceptar Restauración con resina' })).not.toBeInTheDocument()
  })

  it('performs without an odontogram result only after explicit confirmation', async () => {
    const accepted = { ...item, status: 'ACEPTADO', status_display: 'Aceptado' }
    const performed = {
      ...accepted,
      status: 'REALIZADO',
      status_display: 'Realizado',
      performed_in: 18,
      performed_at: '2026-08-31T16:30:00Z',
    }
    const onPerform = vi.fn().mockResolvedValue(performed)
    render(
      <TreatmentPlanSection
        items={[accepted]}
        services={[]}
        canEdit={false}
        canTransition
        canPerform
        currentConsultationId={18}
        onCreate={vi.fn()}
        onAccept={vi.fn()}
        onPerform={onPerform}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Cancelar Restauración con resina' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Realizar Restauración con resina' }))
    expect(screen.getByRole('dialog', { name: 'Realizar tratamiento' })).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Realizar sin registrar resultado en odontograma'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar realización' }))

    await waitFor(() => expect(onPerform).toHaveBeenCalledWith(9, 12, 18, null))
    const performedCard = await screen.findByRole('article', { name: 'Restauración con resina' })
    expect(within(performedCard).getAllByText('Realizado')).toHaveLength(2)
    expect(within(performedCard).getByText(/31 ago 2026/)).toBeInTheDocument()
    expect(within(performedCard).getByText('Consulta #18')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Aceptar|Realizar|Cancelar/ })).not.toBeInTheDocument()
  })

  it('requires an explicit current finding and sends the confirmed odontogram result', async () => {
    const accepted = { ...item, status: 'ACEPTADO', status_display: 'Aceptado' }
    const onPerform = vi.fn().mockResolvedValue({
      ...accepted,
      status: 'REALIZADO',
      status_display: 'Realizado',
      resulting_odontogram_version: 52,
    })
    render(
      <TreatmentPlanSection
        items={[accepted]}
        services={[]}
        canEdit={false}
        canTransition
        canPerform
        currentConsultationId={18}
        onCreate={vi.fn()}
        onPerform={onPerform}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Realizar Restauración con resina' }))
    fireEvent.click(screen.getByLabelText('Registrar resultado en odontograma'))
    expect(screen.getByLabelText('Pieza del resultado')).toHaveValue('16')
    expect(screen.getByText(/La planificación sugería Restauración/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar realización' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Selecciona el hallazgo actual confirmado.')

    fireEvent.change(screen.getByLabelText('Hallazgo actual confirmado'), {
      target: { value: 'RESTORATION' },
    })
    fireEvent.click(screen.getByLabelText('Oclusal'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar realización' }))

    await waitFor(() => expect(onPerform).toHaveBeenCalledWith(9, 12, 18, {
      tooth_code: '16',
      surfaces: ['OCCLUSAL'],
      finding: 'RESTORATION',
    }))
    expect(screen.queryByRole('dialog', { name: 'Realizar tratamiento' })).not.toBeInTheDocument()
  })

  it('does not offer odontogram registration when the treatment has no tooth', () => {
    const accepted = {
      ...item,
      status: 'ACEPTADO',
      status_display: 'Aceptado',
      tooth_code: null,
      surfaces: [],
      planned_finding: '',
    }
    render(
      <TreatmentPlanSection
        items={[accepted]}
        services={[]}
        canEdit={false}
        canTransition
        canPerform
        currentConsultationId={18}
        onCreate={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Realizar Restauración con resina' }))

    expect(screen.queryByLabelText('Registrar resultado en odontograma')).not.toBeInTheDocument()
    expect(screen.getByText(/no tiene una pieza dental asociada/i)).toBeInTheDocument()
  })

  it('cancels with an optional trimmed reason and renders the terminal reason', async () => {
    const onCancel = vi.fn().mockResolvedValue({
      ...item,
      status: 'CANCELADO',
      status_display: 'Cancelado',
      status_reason: 'Paciente pospone el tratamiento',
    })
    render(
      <TreatmentPlanSection
        items={[item]}
        services={[]}
        canEdit={false}
        canTransition
        canPerform={false}
        currentConsultationId={12}
        onCreate={vi.fn()}
        onAccept={vi.fn()}
        onPerform={vi.fn()}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar Restauración con resina' }))
    fireEvent.change(screen.getByLabelText('Motivo de cancelación'), {
      target: { value: '  Paciente pospone el tratamiento  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }))

    await waitFor(() => expect(onCancel).toHaveBeenCalledWith(9, 12, 'Paciente pospone el tratamiento'))
    expect(await screen.findByText('Cancelado')).toBeInTheDocument()
    expect(screen.getByText('Paciente pospone el tratamiento')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Aceptar|Realizar|Cancelar/ })).not.toBeInTheDocument()
  })

  it('preserves a proposed item when cancellation fails', async () => {
    const onCancel = vi.fn().mockRejectedValue(new Error('El tratamiento ya fue realizado.'))
    render(
      <TreatmentPlanSection
        items={[item]}
        services={[]}
        canEdit={false}
        canTransition
        canPerform={false}
        currentConsultationId={12}
        onCreate={vi.fn()}
        onAccept={vi.fn()}
        onPerform={vi.fn()}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar Restauración con resina' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El tratamiento ya fue realizado.')
    expect(screen.getByText('Propuesto')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar cancelación' })).toBeEnabled()
  })

  it('keeps the current state and exposes a controlled lifecycle error', async () => {
    const onAccept = vi.fn().mockRejectedValue(new Error('El tratamiento cambió de estado.'))
    render(
      <TreatmentPlanSection
        items={[item]}
        services={[]}
        canEdit={false}
        canTransition
        canPerform={false}
        currentConsultationId={12}
        onCreate={vi.fn()}
        onAccept={onAccept}
        onPerform={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar Restauración con resina' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El tratamiento cambió de estado.')
    expect(screen.getByText('Propuesto')).toBeInTheDocument()
  })

  it('separates pending and history, shows context and deduplicates by id', () => {
    const accepted = { ...item, id: 10, status: 'ACEPTADO', status_display: 'Aceptado' }
    const performed = {
      ...item,
      id: 11,
      description: 'Endodoncia realizada',
      status: 'REALIZADO',
      status_display: 'Realizado',
      performed_in: 18,
      performed_at: '2026-08-31T16:30:00Z',
    }
    const cancelled = {
      ...item,
      id: 13,
      description: 'Corona cancelada',
      status: 'CANCELADO',
      status_display: 'Cancelado',
      status_reason: 'Paciente decidió posponer.',
    }
    render(
      <TreatmentPlanSection
        items={[item, accepted, performed, performed, cancelled]}
        services={[]}
        canEdit={false}
        currentConsultationId={18}
        onCreate={vi.fn()}
      />,
    )

    const pending = screen.getByRole('region', { name: 'Tratamientos pendientes' })
    const history = screen.getByRole('region', { name: 'Historial de tratamientos' })
    expect(within(pending).getByText('Propuesto')).toBeInTheDocument()
    expect(within(pending).getByText('Aceptado')).toBeInTheDocument()
    expect(within(history).getByText('Cancelado')).toBeInTheDocument()
    expect(within(history).getAllByRole('article', { name: 'Endodoncia realizada' })).toHaveLength(1)
    expect(screen.getAllByText(/Consulta #12/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/20 ago 2026/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Consulta #18/)).toBeInTheDocument()
    expect(screen.getByText('Paciente decidió posponer.')).toBeInTheDocument()
    expect(screen.getAllByText('C$ 850.00').length).toBeGreaterThan(0)
  })

  it('offers independent pagination for pending and history', () => {
    const onLoadMore = vi.fn()
    render(
      <TreatmentPlanSection
        items={[item]}
        services={[]}
        canEdit={false}
        pendingHasMore
        historyHasMore
        onLoadMore={onLoadMore}
        onCreate={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cargar más pendientes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más historial' }))

    expect(onLoadMore).toHaveBeenNthCalledWith(1, 'pending')
    expect(onLoadMore).toHaveBeenNthCalledWith(2, 'history')
  })

  it('uses the origin consultation for HU-48 actions on a prior proposal', async () => {
    const onAccept = vi.fn().mockResolvedValue({
      ...item,
      status: 'ACEPTADO',
      status_display: 'Aceptado',
    })
    render(
      <TreatmentPlanSection
        items={[item]}
        services={[]}
        canEdit={false}
        canTransition
        canPerform
        currentConsultationId={18}
        onCreate={vi.fn()}
        onAccept={onAccept}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar Restauración con resina' }))

    await waitFor(() => expect(onAccept).toHaveBeenCalledWith(9, 12))
  })
})
