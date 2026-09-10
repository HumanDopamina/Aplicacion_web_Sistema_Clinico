export const normalizePage = (payload) => Array.isArray(payload)
  ? { count: payload.length, next: null, previous: null, results: payload }
  : payload

export async function collectPaginatedResults(loadPage, pageSize = 100) {
  const firstPage = normalizePage(await loadPage(1, pageSize))
  const results = [...firstPage.results]
  const totalPages = Math.ceil(firstPage.count / pageSize)

  for (let page = 2; page <= totalPages; page += 1) {
    const loaded = normalizePage(await loadPage(page, pageSize))
    results.push(...loaded.results)
  }

  return results
}
