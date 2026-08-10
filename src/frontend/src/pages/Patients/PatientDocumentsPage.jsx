import { useDeferredValue, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/authContextValue'
import { useClinic } from '../../context/clinicContextValue'
import { getPatient, listDocumentCategories, listPatientDocuments } from '../../services/patientService'
import { DocumentDetailDialog, DocumentUploadDialog } from './PatientDocumentDialogs'
import { formatDocumentDate, formatDocumentSize } from './patientDocumentDisplay'
import { patientIdentity, patientInitials } from './patientDisplay'
import { PatientHeader, PatientTabs } from './PatientRecordShell'

const typeLabel = (document) => document.mime_type === 'application/pdf' ? 'PDF' : document.mime_type.split('/')[1].toUpperCase()
const hasPermission = (user, capability) => user?.role === 'ADMINISTRADOR' || user?.permissions?.includes(capability)

function DocumentMark({ document }) {
  return <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[10px] font-bold uppercase ${document.mime_type === 'application/pdf' ? 'bg-red-50 text-red-700' : 'bg-cyan-50 text-cyan-700'}`}>{typeLabel(document)}</span>
}

function EmptyDocuments({ filtered, canCreate, onCreate }) {
  return <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-2xl text-blue-700">▤</span><h2 className="mt-4 font-serif text-2xl font-semibold text-slate-900">{filtered ? 'No encontramos documentos' : 'El archivo clínico está vacío'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{filtered ? 'Prueba con otro nombre o categoría.' : 'Las radiografías, consentimientos y fotografías del paciente aparecerán aquí.'}</p>{!filtered && canCreate ? <button type="button" onClick={onCreate} className="mt-5 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Adjuntar el primer documento</button> : null}</section>
}

export default function PatientDocumentsPage() {
  const { patientId } = useParams()
  const { accessToken, user } = useAuth()
  const { profile } = useClinic()
  const [patient, setPatient] = useState(null)
  const [documents, setDocuments] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [category, setCategory] = useState('')
  const [loadingPatient, setLoadingPatient] = useState(true)
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [error, setError] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState(null)

  const canCreate = hasPermission(user, 'documents.create') && patient?.is_active
  const canDelete = hasPermission(user, 'documents.delete')

  useEffect(() => {
    let active = true
    Promise.all([getPatient(accessToken, patientId), listDocumentCategories(accessToken)])
      .then(([loadedPatient, loadedCategories]) => {
        if (!active) return
        setPatient(loadedPatient)
        setCategories(loadedCategories)
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoadingPatient(false) })
    return () => { active = false }
  }, [accessToken, patientId])

  const loadDocuments = async () => {
    setLoadingDocuments(true)
    try {
      const [loadedDocuments, loadedCategories] = await Promise.all([
        listPatientDocuments(accessToken, patientId, { search: deferredSearch, category }),
        listDocumentCategories(accessToken),
      ])
      setDocuments(loadedDocuments)
      setCategories(loadedCategories)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoadingDocuments(false)
    }
  }

  useEffect(() => {
    let active = true
    setLoadingDocuments(true)
    listPatientDocuments(accessToken, patientId, { search: deferredSearch, category })
      .then((loaded) => { if (active) { setDocuments(loaded); setError('') } })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoadingDocuments(false) })
    return () => { active = false }
  }, [accessToken, category, deferredSearch, patientId])

  if (loadingPatient) return <p className="p-10 text-center text-sm text-slate-500">Cargando archivo clínico…</p>
  if (!patient) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || 'No fue posible cargar el expediente.'}</p>

  const filtered = Boolean(search.trim() || category)

  return <div className="mx-auto w-full max-w-7xl">
    <Link to={`/pacientes/${patientId}`} className="mb-5 inline-flex text-sm font-medium text-slate-600 no-underline hover:text-blue-700">← Volver al expediente</Link>
    <PatientHeader patient={patient} title={patient.full_name} initials={patientInitials(patient)} isActive={patient.is_active} identityText={patientIdentity(patient)} />
    <PatientTabs patientId={patient.id} active="documents" />

    <header className="mt-6 overflow-hidden rounded-2xl border border-cyan-100 bg-cyan-50/70">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700">Archivo clínico</p><h1 className="mt-1 font-serif text-3xl font-semibold text-slate-950">Documentos</h1><p className="mt-1 text-sm text-slate-500">Consulta imágenes, radiografías y consentimientos del paciente.</p></div>{canCreate ? <button type="button" aria-label="Adjuntar documentos" onClick={() => setUploadOpen(true)} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><span aria-hidden="true">＋</span> Adjuntar documentos</button> : null}</div>
      <div className="h-1 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800" />
    </header>

    {!patient.is_active ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Este expediente está en modo de solo lectura porque el paciente está inactivo. Puedes consultar y descargar sus documentos.</p> : null}
    {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px_auto] sm:items-end"><label className="grid gap-1.5 text-xs font-semibold text-slate-600">Buscar documentos<div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"><span aria-hidden="true" className="text-slate-400">⌕</span><input aria-label="Buscar documentos" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, categoría o notas" className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm font-normal outline-none" /></div></label><label className="grid gap-1.5 text-xs font-semibold text-slate-600">Filtrar por categoría<select aria-label="Filtrar por categoría" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="">Todas las categorías</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><p aria-live="polite" className="pb-3 text-xs font-semibold text-slate-500">{loadingDocuments ? 'Actualizando…' : `${documents.length} ${documents.length === 1 ? 'documento' : 'documentos'}`}</p></div>
    </section>

    <div className="mt-5">
      {loadingDocuments && !documents.length ? <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Cargando documentos…</section> : null}
      {!loadingDocuments && !documents.length ? <EmptyDocuments filtered={filtered} canCreate={canCreate} onCreate={() => setUploadOpen(true)} /> : null}
      {documents.length ? <>
        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block"><table className="w-full border-collapse text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Documento</th><th className="px-4 py-4">Categoría</th><th className="px-4 py-4">Fecha</th><th className="px-4 py-4">Tamaño</th><th className="px-4 py-4">Adjuntado por</th><th className="px-5 py-4 text-right">Acción</th></tr></thead><tbody className="divide-y divide-slate-100">{documents.map((document) => <tr key={document.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex min-w-0 items-center gap-3"><DocumentMark document={document} /><div className="min-w-0"><p className="max-w-xs truncate text-sm font-semibold text-slate-900">{document.original_name}</p><p className="mt-0.5 text-xs text-slate-400">{typeLabel(document)}</p></div></div></td><td className="px-4 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{document.category}</span></td><td className="px-4 py-4 text-sm text-slate-600">{formatDocumentDate(document.document_date)}</td><td className="px-4 py-4 text-sm text-slate-600">{formatDocumentSize(document.size_bytes)}</td><td className="px-4 py-4 text-sm text-slate-600">{document.uploaded_by_name}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelectedDocument(document)} aria-label={`Ver ${document.original_name}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:border-blue-200 hover:bg-blue-50">Ver detalle</button></td></tr>)}</tbody></table></div>
        <div className="grid gap-3 md:hidden">{documents.map((document) => <article key={document.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><button type="button" onClick={() => setSelectedDocument(document)} aria-label={`Abrir ${document.original_name} en vista móvil`} className="flex w-full items-start gap-3 text-left"><DocumentMark document={document} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{document.original_name}</span><span className="mt-1 block text-xs text-slate-500">{document.category} · {formatDocumentDate(document.document_date)}</span><span className="mt-2 block text-xs text-slate-400">{formatDocumentSize(document.size_bytes)} · {document.uploaded_by_name}</span></span><span aria-hidden="true" className="text-blue-700">›</span></button></article>)}</div>
      </> : null}
    </div>

    {uploadOpen ? <DocumentUploadDialog accessToken={accessToken} categories={categories} patientId={patient.id} timeZone={profile.timezone} onClose={() => setUploadOpen(false)} onUploaded={loadDocuments} /> : null}
    {selectedDocument ? <DocumentDetailDialog accessToken={accessToken} document={selectedDocument} patientActive={patient.is_active} canDelete={canDelete} patientId={patient.id} onClose={() => setSelectedDocument(null)} onDeleted={loadDocuments} /> : null}
  </div>
}
