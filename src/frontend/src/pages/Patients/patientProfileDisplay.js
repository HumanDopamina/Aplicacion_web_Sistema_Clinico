export const profileFieldLabels = {
  first_name: 'Nombres',
  last_name: 'Primer apellido',
  birth_place: 'Lugar de nacimiento',
  gender: 'Género',
  date_of_birth: 'Fecha de nacimiento',
  phone: 'Teléfono',
  identification_type: 'Tipo de identificación',
  identification_number: 'Número de identificación',
  guardian_name: 'Nombre del responsable',
  guardian_relationship: 'Parentesco del responsable',
  guardian_phone: 'Teléfono del responsable',
}

export function profileFieldLabel(field) {
  return profileFieldLabels[field] || field.replaceAll('_', ' ')
}

export function isMinorDate(dateOfBirth, today = new Date()) {
  if (!dateOfBirth) return false
  const [year, month, day] = dateOfBirth.split('-').map(Number)
  if (!year || !month || !day) return false
  let age = today.getFullYear() - year
  if (
    today.getMonth() + 1 < month
    || (today.getMonth() + 1 === month && today.getDate() < day)
  ) age -= 1
  return age >= 0 && age < 18
}

export function derivedMissingProfileFields(patient) {
  const required = ['first_name', 'last_name', 'date_of_birth', 'phone']
  if (isMinorDate(patient?.date_of_birth)) {
    required.push('guardian_name', 'guardian_relationship', 'guardian_phone')
  }
  return required.filter((field) => !String(patient?.[field] ?? '').trim())
}

export function patientMissingProfileFields(patient, derive = false) {
  if (Array.isArray(patient?.missing_profile_fields)) return patient.missing_profile_fields
  return derive ? derivedMissingProfileFields(patient) : []
}
