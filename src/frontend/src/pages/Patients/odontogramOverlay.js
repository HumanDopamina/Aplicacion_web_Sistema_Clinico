import { emptyTooth } from './odontogramSchema'

const wholeFindings = new Set(['CROWN', 'IMPLANT', 'ROOT_CANAL', 'EXTRACTION'])

export function buildPlannedOdontogramOverlay(items = []) {
  const teeth = {}
  const detailsByTooth = {}

  items.forEach((item) => {
    if (!item.tooth_code || !item.planned_finding) return
    const tooth = teeth[item.tooth_code] || emptyTooth()
    teeth[item.tooth_code] = tooth
    const details = detailsByTooth[item.tooth_code] || []
    detailsByTooth[item.tooth_code] = [...details, item]

    if (wholeFindings.has(item.planned_finding)) {
      tooth.planned.whole = [...new Set([
        ...tooth.planned.whole,
        item.planned_finding,
      ])]
      return
    }
    ;(item.surfaces || []).forEach((surface) => {
      tooth.planned.surfaces[surface] = [...new Set([
        ...(tooth.planned.surfaces[surface] || []),
        item.planned_finding,
      ])]
    })
  })

  return { teeth, detailsByTooth }
}
