export function formatDocumentSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDocumentDate(value) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-NI', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

export const CLINICAL_PHOTO_CATEGORY = 'Fotografía clínica'

export function documentTypeLabel(document) {
  if (document.category === CLINICAL_PHOTO_CATEGORY) return 'FOTO'
  if (document.mime_type === 'application/pdf') return 'PDF'
  return document.mime_type.split('/')[1].toUpperCase()
}

export function documentContextLabel(document) {
  const context = []
  if (document.consultation?.date) context.push(`Consulta · ${formatDocumentDate(document.consultation.date)}`)
  if (document.tooth_code) context.push(`Pieza ${document.tooth_code}`)
  return context.join(' · ')
}

export function withClinicalPhotoCategory(categories) {
  return [...new Set([...categories, CLINICAL_PHOTO_CATEGORY])]
}
