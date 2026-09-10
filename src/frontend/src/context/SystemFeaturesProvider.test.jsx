import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import SystemFeaturesProvider from './SystemFeaturesProvider'
import { apiRequest } from '../services/api'
import { useSystemFeatures } from './systemFeaturesValue'

vi.mock('../services/api', () => ({ apiRequest: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

function UploadAction() {
  const { uploads } = useSystemFeatures()
  return <button disabled={!uploads}>Subir documento</button>
}

it('shows the synthetic-data notice and disables uploads using server features', async () => {
  apiRequest.mockResolvedValue({ demo: true, uploads: false, password_reset: false })
  render(<SystemFeaturesProvider><UploadAction /></SystemFeaturesProvider>)
  expect(await screen.findByRole('note')).toHaveTextContent('Solo datos ficticios')
  expect(screen.getByRole('button', { name: 'Subir documento' })).toBeDisabled()
})

it('keeps the application blocked until valid features can be loaded', async () => {
  apiRequest.mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({ demo: false, uploads: true, password_reset: true })
  render(<SystemFeaturesProvider><UploadAction /></SystemFeaturesProvider>)
  expect(screen.queryByRole('button', { name: 'Subir documento' })).not.toBeInTheDocument()
  fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
  expect(await screen.findByRole('button', { name: 'Subir documento' })).toBeEnabled()
})
