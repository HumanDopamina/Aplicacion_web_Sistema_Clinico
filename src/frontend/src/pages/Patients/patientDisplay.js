export function patientIdentity(patient) {
  if (!patient) return ''
  const genderLabels = { FEMENINO: 'Femenino', MASCULINO: 'Masculino', OTRO: 'Otro' }
  const parts = []
  if (patient.gender) parts.push(genderLabels[patient.gender] || patient.gender)
  if (patient.date_of_birth) {
    const formatter = new Intl.DateTimeFormat('es-NI', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
    parts.push(formatter.format(new Date(`${patient.date_of_birth}T00:00:00Z`)))
  }
  if (patient.national_id) parts.push(`Cédula ${patient.national_id}`)
  return parts.join(' · ')
}

export function patientInitials(patient) {
  return `${patient?.first_name?.[0] || ''}${patient?.last_name?.[0] || ''}`.toUpperCase() || 'PA'
}
