import { describe, expect, it, vi } from 'vitest'
import { collectPaginatedResults } from './pagination'

describe('collectPaginatedResults', () => {
  it('loads every bounded page without losing records', async () => {
    const loadPage = vi.fn()
      .mockResolvedValueOnce({ count: 3, next: '/items/?page=2', previous: null, results: [{ id: 1 }, { id: 2 }] })
      .mockResolvedValueOnce({ count: 3, next: null, previous: '/items/', results: [{ id: 3 }] })

    await expect(collectPaginatedResults(loadPage, 2)).resolves.toEqual([
      { id: 1 }, { id: 2 }, { id: 3 },
    ])
    expect(loadPage).toHaveBeenNthCalledWith(1, 1, 2)
    expect(loadPage).toHaveBeenNthCalledWith(2, 2, 2)
  })
})
