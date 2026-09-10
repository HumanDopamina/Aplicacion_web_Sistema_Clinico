export default function PaginationControls({ count, label, onPageChange, page, pageSize }) {
  if (!count) return null

  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const first = ((page - 1) * pageSize) + 1
  const last = Math.min(page * pageSize, count)

  return (
    <nav aria-label={`Paginación de ${label}`} className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite" className="text-xs font-medium tabular-nums text-slate-500" role="status">
        {first}–{last} de {count}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Página anterior de ${label}`}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        <span className="min-w-20 text-center text-xs font-semibold tabular-nums text-slate-600">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          aria-label={`Página siguiente de ${label}`}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </nav>
  )
}
