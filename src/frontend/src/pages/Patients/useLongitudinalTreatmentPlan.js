import { useCallback, useEffect, useState } from 'react'
import { listPatientTreatmentItems } from '../../services/patientService'
import { mergeTreatmentItems } from './treatmentPlanUtils'

const PAGE_SIZE = 25
const emptyPages = () => ({
  pending: { page: 1, hasMore: false },
  history: { page: 1, hasMore: false },
})

export default function useLongitudinalTreatmentPlan(accessToken, patientId, enabled) {
  const [items, setItems] = useState([])
  const [pages, setPages] = useState(emptyPages)
  const [loading, setLoading] = useState(enabled)
  const [loadingMoreScope, setLoadingMoreScope] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!enabled || !patientId) {
      setItems([])
      setPages(emptyPages())
      setLoading(false)
      setError('')
      return () => { active = false }
    }

    setLoading(true)
    setError('')
    Promise.allSettled([
      listPatientTreatmentItems(accessToken, patientId, { scope: 'pending', page: 1, pageSize: PAGE_SIZE }),
      listPatientTreatmentItems(accessToken, patientId, { scope: 'history', page: 1, pageSize: PAGE_SIZE }),
    ]).then(([pendingResult, historyResult]) => {
      if (!active) return
      const fulfilled = [pendingResult, historyResult].filter(({ status }) => status === 'fulfilled')
      const loaded = fulfilled.flatMap(({ value }) => value.results)
      setItems(mergeTreatmentItems([], loaded))
      setPages({
        pending: {
          page: 1,
          hasMore: pendingResult.status === 'fulfilled' && Boolean(pendingResult.value.next),
        },
        history: {
          page: 1,
          hasMore: historyResult.status === 'fulfilled' && Boolean(historyResult.value.next),
        },
      })
      const rejected = [pendingResult, historyResult].find(({ status }) => status === 'rejected')
      if (rejected) setError(rejected.reason.message)
    }).finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [accessToken, enabled, patientId])

  const loadMore = useCallback(async (scope) => {
    if (!pages[scope]?.hasMore || loadingMoreScope) return
    const nextPage = pages[scope].page + 1
    setLoadingMoreScope(scope)
    setError('')
    try {
      const result = await listPatientTreatmentItems(accessToken, patientId, {
        scope,
        page: nextPage,
        pageSize: PAGE_SIZE,
      })
      setItems((current) => mergeTreatmentItems(current, result.results))
      setPages((current) => ({
        ...current,
        [scope]: { page: nextPage, hasMore: Boolean(result.next) },
      }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoadingMoreScope('')
    }
  }, [accessToken, loadingMoreScope, pages, patientId])

  const upsert = useCallback((item) => {
    setItems((current) => mergeTreatmentItems(current, [item]))
  }, [])

  return {
    items,
    loading,
    error,
    pendingHasMore: pages.pending.hasMore,
    historyHasMore: pages.history.hasMore,
    loadingMoreScope,
    loadMore,
    upsert,
  }
}
