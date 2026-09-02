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
  consultation: null, tooth_code: null,
  content_url: '/api/patients/1/documents/8/content/',
}

const clinicalPhoto = {
  ...document,
  id: 9,
  original_name: 'frontal-clinica.png',
  category: 'Fotografía clínica',
  mime_type: 'image/png',
  size_bytes: 4096,
  consultation: { id: 12, date: '2026-09-01' },
  tooth_code: '16',
  content_url: '/api/patients/1/documents/9/content/',
}

const consultationOptions = {
  count: 1,
  next: null,
  previous: null,
  results: [{ id: 12, date: '2026-09-01' }],
}

const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  blob: () => Promise.resolve(data instanceof Blob ? data : new Blob()),
  headers: { get: () => null },
})

function renderPage({ permissions = ['patients.view', 'documents.view', 'documents.create'] } = {}) {
  const initialSession = {
    access: 'access-token', refresh: 'refresh-token',
    user: { email: 'clinico@example.com', first_name: 'Elena', role: 'ODONTOLOGO', permissions },
  }
  const router = createMemoryRouter([{
    path: '*', element: <AuthProvider initialSession={initialSession}><App /></AuthProvider>,
  }], { initialEntries: ['/pacientes/1/documentos'] })
  return render(<RouterProvider router={router} />)
}

function baseFetch({ documents = [document], active = true, consultations = consultationOptions } = {}) {
  return vi.fn((url, options = {}) => {
    if (url.includes('/api/patients/1/consultations/?compact=true')) {
      return Promise.resolve(jsonResponse(consultations))
    }
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

  it('adds a newly used category to the filter immediately after upload', async () => {
    let storedDocuments = []
    let categoryRequests = 0
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (url.endsWith('/api/patients/1/documents/') && options.method === 'POST') {
        storedDocuments = [{ ...document, id: 9, original_name: 'nueva-radiografia.pdf' }]
        return Promise.resolve(jsonResponse(storedDocuments, 201))
      }
      if (url.endsWith('/api/patients/1/documents/')) {
        return Promise.resolve(jsonResponse(storedDocuments))
      }
      if (url.endsWith('/api/patients/document-categories/')) {
        categoryRequests += 1
        return Promise.resolve(jsonResponse(categoryRequests === 1 ? [] : ['Radiografía']))
      }
      if (url.endsWith('/api/patients/1/')) return Promise.resolve(jsonResponse(patient))
      throw new Error(`Unexpected request: ${url} ${options.method || 'GET'}`)
    }))
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Adjuntar documentos' }))
    const dialog = screen.getByRole('dialog', { name: 'Adjuntar documentos' })
    fireEvent.change(within(dialog).getByLabelText('Seleccionar archivos'), {
      target: { files: [new File(['%PDF'], 'nueva-radiografia.pdf', { type: 'application/pdf' })] },
    })
    fireEvent.change(within(dialog).getByLabelText('Categoría'), { target: { value: 'Radiografía' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar documentos' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Adjuntar documentos' })).not.toBeInTheDocument())
    expect(screen.getAllByText('nueva-radiografia.pdf').length).toBeGreaterThan(0)
    expect(within(screen.getByLabelText('Filtrar por categoría')).getByRole('option', {
      name: 'Radiografía',
    })).toBeInTheDocument()
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

  it('[HU-32] keeps clinical photos in the repository with filter and authenticated image preview', async () => {
    const imageBlob = new Blob(['image'], { type: 'image/png' })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:clinical-photo')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const fetchMock = vi.fn((url, options = {}) => {
      if (url.endsWith('/documents/9/content/')) return Promise.resolve(jsonResponse(imageBlob))
      return baseFetch({ documents: [clinicalPhoto] })(url, options)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage({
      permissions: ['patients.view', 'documents.view', 'documents.create', 'consultations.view'],
    })

    const row = await screen.findByRole('row', { name: /frontal-clinica\.png/ })
    expect(within(row).getByText('Fotografía clínica')).toBeInTheDocument()
    expect(within(row).getAllByText('FOTO').length).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText('Filtrar por categoría'), {
      target: { value: 'Fotografía clínica' },
    })
    await waitFor(() => expect(fetchMock.mock.calls.some(
      ([url]) => url.includes('category=Fotograf%C3%ADa%20cl%C3%ADnica'),
    )).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: /Ver frontal-clinica\.png/ }))
    const preview = await screen.findByAltText('Vista previa de frontal-clinica.png')
    expect(preview).toHaveAttribute('src', 'blob:clinical-photo')
    expect(screen.getByRole('dialog', { name: 'Detalle del documento' })).toBeInTheDocument()
  })

  it('[HU-56] uploads optional consultation and tooth context using minimal options', async () => {
    let uploadedBody
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (url.endsWith('/api/patients/1/documents/') && options.method === 'POST') {
        uploadedBody = options.body
        return Promise.resolve(jsonResponse([clinicalPhoto], 201))
      }
      return baseFetch({ documents: [] })(url, options)
    }))
    renderPage({
      permissions: ['patients.view', 'documents.view', 'documents.create', 'consultations.view'],
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Adjuntar documentos' }))
    const dialog = screen.getByRole('dialog', { name: 'Adjuntar documentos' })
    fireEvent.change(within(dialog).getByLabelText('Seleccionar archivos'), {
      target: { files: [new File(['image'], 'frontal.png', { type: 'image/png' })] },
    })
    fireEvent.change(within(dialog).getByLabelText('Categoría'), {
      target: { value: 'Fotografía clínica' },
    })
    fireEvent.change(within(dialog).getByLabelText('Consulta relacionada'), {
      target: { value: '12' },
    })
    fireEvent.change(within(dialog).getByLabelText('Pieza dental FDI'), {
      target: { value: '16' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar documentos' }))

    await waitFor(() => expect(uploadedBody).toBeInstanceOf(FormData))
    expect(uploadedBody.get('category')).toBe('Fotografía clínica')
    expect(uploadedBody.get('consultation_id')).toBe('12')
    expect(uploadedBody.get('tooth_code')).toBe('16')
  })

  it('[HU-56] filters by consultation, shows compact context and edits it on the existing document', async () => {
    const imageBlob = new Blob(['image'], { type: 'image/png' })
    let patchPayload
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:context-photo')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const fetchMock = vi.fn((url, options = {}) => {
      if (url.endsWith('/documents/9/content/')) return Promise.resolve(jsonResponse(imageBlob))
      if (url.endsWith('/documents/9/') && options.method === 'PATCH') {
        patchPayload = JSON.parse(options.body)
        return Promise.resolve(jsonResponse({ ...clinicalPhoto, tooth_code: patchPayload.tooth_code }))
      }
      return baseFetch({ documents: [clinicalPhoto] })(url, options)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage({
      permissions: ['patients.view', 'documents.view', 'documents.create', 'consultations.view'],
    })

    await screen.findByRole('row', { name: /frontal-clinica\.png/ })
    fireEvent.change(screen.getByLabelText('Filtrar por consulta'), { target: { value: '12' } })
    await waitFor(() => expect(fetchMock.mock.calls.some(
      ([url]) => url.includes('consultation_id=12'),
    )).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: /Ver frontal-clinica\.png/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Detalle del documento' })
    expect(within(dialog).getByText('Consulta · 01 sept 2026')).toBeInTheDocument()
    expect(within(dialog).getByText('Pieza 16')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Editar metadatos' }))
    fireEvent.change(within(dialog).getByLabelText('Pieza dental FDI'), {
      target: { value: '21' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar metadatos' }))

    await waitFor(() => expect(patchPayload).toEqual({
      category: 'Fotografía clínica',
      consultation_id: 12,
      tooth_code: '21',
    }))
  })

  it('[HU-56] does not request or reveal consultation context without its permission', async () => {
    const hiddenContextDocument = { ...clinicalPhoto, consultation: null, tooth_code: null }
    const fetchMock = baseFetch({ documents: [hiddenContextDocument] })
    vi.stubGlobal('fetch', fetchMock)
    renderPage({ permissions: ['patients.view', 'documents.view', 'documents.create'] })

    await screen.findByRole('row', { name: /frontal-clinica\.png/ })
    expect(fetchMock.mock.calls.some(([url]) => url.includes('/consultations/'))).toBe(false)
    expect(screen.queryByLabelText('Filtrar por consulta')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Ver frontal-clinica\.png/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Detalle del documento' })
    expect(within(dialog).queryByText(/Consulta ·/)).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/Pieza /)).not.toBeInTheDocument()
  })
})
