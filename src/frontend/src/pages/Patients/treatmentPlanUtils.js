export const mergeTreatmentItems = (current, incoming) => {
  const byId = new Map(current.map((item) => [item.id, item]))
  incoming.forEach((item) => byId.set(item.id, item))
  return [...byId.values()]
}

export const treatmentConsultationId = (value) => (
  value && typeof value === 'object' ? value.id : value
)
