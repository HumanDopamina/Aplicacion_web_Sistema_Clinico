export const DENTITIONS = [
  ['PRIMARY', 'Temporal'],
  ['MIXED', 'Mixta'],
  ['PERMANENT', 'Permanente'],
]

export const SURFACE_LABELS = {
  MESIAL: 'mesial',
  DISTAL: 'distal',
  VESTIBULAR: 'vestibular',
  PALATAL: 'palatina',
  LINGUAL: 'lingual',
  OCCLUSAL: 'oclusal',
  INCISAL: 'incisal',
}

export const FINDING_LABELS = {
  CARIES: 'Caries',
  RESTORATION: 'Restauración',
  SEALANT: 'Sellante',
  FRACTURE: 'Fractura',
  MISSING: 'Ausente',
  UNERUPTED: 'No erupcionada',
  CROWN: 'Corona',
  IMPLANT: 'Implante',
  ROOT_CANAL: 'Endodoncia',
  EXTRACTION: 'Extracción',
}

export const SURFACE_FINDINGS = {
  current: ['CARIES', 'RESTORATION', 'SEALANT', 'FRACTURE'],
  planned: ['RESTORATION', 'SEALANT'],
}

export const WHOLE_FINDINGS = {
  current: ['MISSING', 'UNERUPTED', 'CROWN', 'IMPLANT', 'ROOT_CANAL'],
  planned: ['CROWN', 'IMPLANT', 'ROOT_CANAL', 'EXTRACTION'],
}

export const PERMANENT_ARCHES = {
  upper: ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'],
  lower: ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'],
}

export const PRIMARY_ARCHES = {
  upper: ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'],
  lower: ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75'],
}

export function toothSurfaces(code) {
  const upper = ['1', '2', '5', '6'].includes(code[0])
  const anterior = Number(code[1]) <= 3
  return ['MESIAL', 'DISTAL', 'VESTIBULAR', upper ? 'PALATAL' : 'LINGUAL', anterior ? 'INCISAL' : 'OCCLUSAL']
}

export function emptyTooth() {
  return {
    reviewed: true,
    note: '',
    current: { whole: [], surfaces: {} },
    planned: { whole: [], surfaces: {} },
  }
}

export function cloneChart(version) {
  return {
    dentition: version.dentition,
    teeth: structuredClone(version.teeth || {}),
    note: '',
  }
}

export function findingTone(finding, layer) {
  if (!finding) return { fill: '#FFFFFF', stroke: '#94A3B8', mark: '' }
  if (layer === 'planned') return { fill: '#FEF3C7', stroke: '#C77A00', mark: 'P' }
  if (finding === 'CARIES' || finding === 'FRACTURE') return { fill: '#FEE2E2', stroke: '#C62828', mark: finding === 'CARIES' ? 'C' : 'F' }
  if (finding === 'RESTORATION') return { fill: '#DBEAFE', stroke: '#0B57D0', mark: 'R' }
  if (finding === 'SEALANT') return { fill: '#CFFAFE', stroke: '#087C91', mark: 'S' }
  return { fill: '#FFFFFF', stroke: '#94A3B8', mark: '' }
}

export function toothName(code) {
  const position = Number(code[1])
  const kind = position <= 2 ? 'incisivo' : position === 3 ? 'canino' : position <= 5 ? 'premolar' : 'molar'
  const side = ['1', '4', '5', '8'].includes(code[0]) ? 'derecho' : 'izquierdo'
  const arch = ['1', '2', '5', '6'].includes(code[0]) ? 'superior' : 'inferior'
  return `${kind} ${arch} ${side}`
}

export function comparisonSummary(versionA, versionB) {
  if (!versionA || !versionB) return []
  const teeth = new Set([...Object.keys(versionA.teeth || {}), ...Object.keys(versionB.teeth || {})])
  return [...teeth].sort().flatMap((code) => {
    const before = versionA.teeth?.[code]
    const after = versionB.teeth?.[code]
    if (JSON.stringify(before) === JSON.stringify(after)) return []
    if (!before) return [`Pieza ${code}: hallazgo agregado`]
    if (!after) return [`Pieza ${code}: hallazgo eliminado`]
    return [`Pieza ${code}: estado modificado`]
  })
}
