import { describe, expect, it } from 'vitest'
import { buildPlannedOdontogramOverlay } from './odontogramOverlay'

describe('buildPlannedOdontogramOverlay', () => {
  it('deduplicates visual marks without merging treatment details', () => {
    const items = [
      {
        treatment_item_id: 4,
        status: 'PROPUESTO',
        tooth_code: '16',
        surfaces: ['OCCLUSAL'],
        planned_finding: 'RESTORATION',
        description: 'Primera restauración',
      },
      {
        treatment_item_id: 8,
        status: 'ACEPTADO',
        tooth_code: '16',
        surfaces: ['OCCLUSAL'],
        planned_finding: 'RESTORATION',
        description: 'Segunda restauración',
      },
    ]

    const overlay = buildPlannedOdontogramOverlay(items)

    expect(overlay.teeth['16'].planned.surfaces.OCCLUSAL).toEqual(['RESTORATION'])
    expect(overlay.detailsByTooth['16'].map(({ treatment_item_id }) => treatment_item_id)).toEqual([4, 8])
  })

  it('maps whole-tooth plans and ignores incomplete non-dental rows defensively', () => {
    const overlay = buildPlannedOdontogramOverlay([
      { treatment_item_id: 3, tooth_code: '21', surfaces: [], planned_finding: 'CROWN' },
      { treatment_item_id: 5, tooth_code: null, surfaces: [], planned_finding: '' },
    ])

    expect(overlay.teeth['21'].planned.whole).toEqual(['CROWN'])
    expect(overlay.detailsByTooth['21']).toHaveLength(1)
    expect(overlay.detailsByTooth.null).toBeUndefined()
  })
})
