import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PaginationControls from './PaginationControls'

describe('PaginationControls', () => {
  it('announces the range and changes to the next available page', () => {
    const onPageChange = vi.fn()

    render(
      <PaginationControls
        count={60}
        label="Pacientes"
        onPageChange={onPageChange}
        page={2}
        pageSize={25}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('26–50 de 60')
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente de Pacientes' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('disables navigation at the collection boundaries', () => {
    render(
      <PaginationControls
        count={4}
        label="Documentos"
        onPageChange={() => {}}
        page={1}
        pageSize={25}
      />,
    )

    expect(screen.getByRole('button', { name: 'Página anterior de Documentos' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página siguiente de Documentos' })).toBeDisabled()
  })
})
