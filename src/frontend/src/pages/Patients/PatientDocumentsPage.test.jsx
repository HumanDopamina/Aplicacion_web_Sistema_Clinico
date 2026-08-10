import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { AuthProvider } from '../../context/AuthContext'

const patient = {
  id: 1, code: 'PAC-00001', full_name: 'María García', first_name: 'María', last_name: 'García',
  gender: 'FEMENINO', date_of_birth: '1998-04-16', national_id: '001-160498-0001A', is_active: true,
}

const document = {
  id: 8, patient: 1, original_name: 'radiografia-panoramica.pdf', category: 'Radiografía',
  document_date: '2026-08-09', notes: 'Control inicial', mime_type: 'application/pdf',
  size_bytes: 245760, uploaded_by_name: 'Dra. Elena Rivera', created_at: '2026-08-09T10:00:00Z',
  content_url: '/api/patients/1/documents/8/content/',
}

const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  blob: () => Promise.resolve(data instanceof Blob ? data : new Blob()),
  headers: { get: () => null },
})

function renderPage({ permissions = ['patients.view', 'documents.view', 'documents.create'] } = {}) {
  sessionStorage.setItem('dentalclinic_session', JSON.stringify({
    access: 'access-token', refresh: 'refresh-token',
    user: { email: 'clinico@example.com', first_name: 'Elena', role: 'ODONTOLOGO', permissions },
  }))
  const router = createMemoryRouter([{
    path: '*', element: <AuthProvider><App /></AuthProvider>,
  }], { initialEntries: ['/pacientes/1/documentos'] })
  return render(<RouterProvider router={router} />)
}

function baseFetch({ documents = [document], active = true } = {}) {
  return vi.fn((url, options = {}) => {
    if (url.endsWith('/api/patients/1/documents/')) return Promise.resolve(jsonResponse(documents))
    if (url.includes('/api/patients/1/documents/?')) return Promise.resolve(jsonResponse(documents))
    if (url.endsWith('/api/patients/document-categories/')) return Promise.resolve(jsonResponse(['Radiografía', 'Consentimiento']))
    if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse({ ...patient, is_active: active }))
    throw new Error(`Unexpected request: ${url} ${options.method || 'GET'}`)
  })
}

describe('patient documents page', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('enables the tab and renders searchable document metadata', async () => {
    const fetchMock = baseFetch()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute('href', '/pacientes/1/documentos')
    const row = screen.getByRole('row', { name: /radiografia-panoramica\.pdf/ })
    expect(within(row).getByText('Radiografía')).toBeInTheDocument()
    expect(within(row).getByText('240 KB')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Buscar documentos'), { target: { value: 'panorámica' } })
    fireEvent.change(screen.getByLabelText('Filtrar por categoría'), { target: { value: 'Radiografía' } })
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes('category=Radiograf%C3%ADa'))).toBe(true))
  })

  it('keeps selected files and metadata visible when an upload fails', async () => {
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (url.endsWith('/api/patients/1/documents/') && options.method === 'POST') {
        return Promise.resolve(jsonResponse({ files: ['El archivo no coincide con su contenido.'] }, 400))
      }
      return baseFetch({ documents: [] })(url, options)
    }))
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Adjuntar documentos' }))
    const dialog = screen.getByRole('dialog', { name: 'Adjuntar documentos' })
    const file = new File(['not an image'], 'evidencia.png', { type: 'image/png' })
    fireEvent.change(within(dialog).getByLabelText('Seleccionar archivos'), { target: { files: [file] } })
    fireEvent.change(within(dialog).getByLabelText('Categoría'), { target: { value: 'Fotografía clínica' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar documentos' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('El archivo no coincide con su contenido.')
    expect(within(dialog).getByText('evidencia.png')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Categoría')).toHaveValue('Fotografía clínica')
  })

  it('previews an authenticated PDF and offers deletion only with explicit permission', async () => {
    const pdfBlob = new Blob(['%PDF'], { type: 'application/pdf' })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (url.endsWith('/documents/8/content/')) return Promise.resolve(jsonResponse(pdfBlob))
      return baseFetch()(url, options)
    }))
    renderPage({ permissions: ['patients.view', 'documents.view', 'documents.create', 'documents.delete'] })

    fireEvent.click(await screen.findByRole('button', { name: /Ver radiografia-panoramica\.pdf/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Detalle del documento' })
    expect(within(dialog).getByTitle('Vista previa de radiografia-panoramica.pdf')).toHaveAttribute('src', 'blob:preview')
    expect(within(dialog).getByRole('button', { name: 'Eliminar documento' })).toBeInTheDocument()
  })

  it('makes an inactive patient visibly read-only', async () => {
    vi.stubGlobal('fetch', baseFetch({ active: false }))
    renderPage({ permissions: ['patients.view', 'documents.view', 'documents.create', 'documents.delete'] })

    expect(await screen.findByText(/expediente está en modo de solo lectura/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adjuntar documentos' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Ver radiografia-panoramica\.pdf/ }))
    expect(await screen.findByRole('dialog', { name: 'Detalle del documento' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar documento' })).not.toBeInTheDocument()
  })
})
