const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'

const systemFields = [
  ['respiratory', 'Respiratorio'], ['cardiovascular', 'Cardiovascular'],
  ['hepatic_renal', 'Hepático y renal'], ['gastrointestinal', 'Gastrointestinal'],
  ['neurological', 'Neurológico'], ['blood_system', 'Sistema sanguíneo'],
  ['reproductive_organs', 'Órganos reproductivos'],
]

const infectiousDiseases = [
  ['hepatitis', 'Hepatitis'], ['syphilis', 'Sífilis'], ['tuberculosis', 'Tuberculosis (TB)'],
  ['cholera', 'Cólera'], ['amebiasis', 'Amebiasis'], ['pertussis', 'Tosferina'],
  ['measles', 'Sarampión'], ['varicella', 'Varicela'], ['rubella', 'Rubéola'],
  ['mumps', 'Parotiditis'], ['meningitis', 'Meningitis'], ['impetigo', 'Impétigo'],
  ['typhoid_fever', 'Fiebre tifoidea'], ['scarlet_fever', 'Escarlatina'], ['malaria', 'Malaria'],
  ['scabies', 'Escabiosis'], ['pediculosis', 'Pediculosis'], ['ringworm', 'Tiña'],
]

const hereditaryDiseases = [
  ['allergies', 'Alergias'], ['diabetes_mellitus', 'Diabetes mellitus'],
  ['hypertension', 'Hipertensión arterial'], ['rheumatic_disease', 'Enfermedad reumática'],
  ['kidney_diseases', 'Enfermedades renales'], ['eye_diseases', 'Enfermedades oculares'],
  ['heart_diseases', 'Enfermedades cardíacas'], ['liver_disease', 'Enfermedad hepática'],
  ['muscle_diseases', 'Enfermedades musculares'], ['congenital_malformations', 'Malformaciones congénitas'],
  ['mental_disorders', 'Desórdenes mentales'], ['degenerative_cns_diseases', 'Enfermedades degenerativas del sistema nervioso central'],
  ['growth_anomalies', 'Anomalías del crecimiento y desarrollo'], ['inborn_metabolic_errors', 'Errores innatos del metabolismo'],
]

const physicalFields = [
  ['general_appearance', 'Aspecto general'], ['skin_and_mucosa', 'Piel y mucosas'],
  ['thorax', 'Tórax'], ['rib_cage', 'Caja torácica'], ['breasts', 'Mamas'],
  ['lung_fields', 'Campos pulmonares'], ['cardiac', 'Cardíaco'], ['abdomen_pelvis', 'Abdomen y pelvis'],
  ['rectal_exam', 'Tacto rectal, cuando aplique'], ['musculoskeletal', 'Musculoesquelético'],
  ['upper_extremities', 'Extremidades superiores'], ['lower_extremities', 'Extremidades inferiores'],
  ['genitourinary', 'Genitourinario, cuando aplique'], ['gynecological_exam', 'Examen ginecológico'],
  ['neurological_exam', 'Examen neurológico'],
]

function Section({ number, title, description, children }) {
  return <section className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-50 font-mono text-xs font-bold text-cyan-800">{String(number).padStart(2, '0')}</span>
      <div><h2 className="font-serif text-xl font-semibold text-slate-900">{title}</h2>{description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}</div>
    </header>
    <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">{children}</div>
  </section>
}

function Field({ label, name, value, onChange, type = 'text', required = false, wide = false, readOnly = false, placeholder = '' }) {
  return <label className={`grid content-start gap-1.5 text-sm font-medium text-slate-700 ${wide ? 'sm:col-span-2' : ''}`}>
    <span>{label}{required ? <span className="text-blue-700"> *</span> : null}</span>
    {type === 'textarea'
      ? <textarea aria-label={label} name={name} value={value ?? ''} onChange={onChange} rows="3" placeholder={placeholder} className={`${inputClass} resize-y`} />
      : <input aria-label={label} name={name} value={value ?? ''} onChange={onChange} type={type} step={type === 'number' ? 'any' : undefined} required={required} readOnly={readOnly} placeholder={placeholder} className={`${inputClass} ${readOnly ? 'bg-slate-50 text-slate-500' : ''}`} />}
  </label>
}

function DiseaseChecklist({ legend, group, values, onDiseaseChange }) {
  return <fieldset className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
    <legend className="px-2 text-sm font-semibold text-slate-800">{legend}</legend>
    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {group.map(([name, label]) => <label key={name} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
        <input type="checkbox" checked={Boolean(values?.[name])} onChange={(event) => onDiseaseChange(name, event.target.checked)} className="h-4 w-4 accent-blue-700" />{label}
      </label>)}
    </div>
    <Field label="Otros" name="other" value={values?.other || ''} onChange={(event) => onDiseaseChange('other', event.target.value)} wide />
  </fieldset>
}

export default function ClinicalRecordFields({ form, age, onChange, onDiseaseChange }) {
  return <div className="space-y-5">
    <Section number={1} title="Datos generales de la consulta" description="Identificación de la atención con la que se abre el expediente.">
      <Field label="Paciente" value={`${form.first_name} ${form.last_name}`.trim()} readOnly />
      <Field label="Doctor que examina" name="examiner_name" value={form.examiner_name} onChange={onChange} />
      <Field label="N.º de cédula del doctor" name="examiner_national_id" value={form.examiner_national_id} onChange={onChange} />
      <Field label="N.º INSS" name="inss_number" value={form.inss_number} onChange={onChange} />
      <Field label="N.º CEMA" name="cema_number" value={form.cema_number} onChange={onChange} />
      <Field label="Fecha" name="consultation_date" value={form.consultation_date} onChange={onChange} type="date" />
      <Field label="Hora" name="consultation_time" value={form.consultation_time} onChange={onChange} type="time" />
      <Field label="Servicio odontológico" name="dental_service" value={form.dental_service} onChange={onChange} wide />
    </Section>

    <Section number={2} title="Datos personales" description="Identidad, procedencia y contacto del paciente.">
      <Field label="Nombres" name="first_name" value={form.first_name} onChange={onChange} required />
      <Field label="Primer apellido" name="last_name" value={form.last_name} onChange={onChange} required />
      <Field label="Segundo apellido" name="second_last_name" value={form.second_last_name} onChange={onChange} />
      <Field label="Edad" value={age} readOnly />
      <Field label="Fecha de nacimiento" name="date_of_birth" value={form.date_of_birth} onChange={onChange} type="date" required />
      <Field label="Lugar de nacimiento" name="birth_place" value={form.birth_place} onChange={onChange} required />
      <label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>Género <span className="text-blue-700">*</span></span><select aria-label="Género" required name="gender" value={form.gender} onChange={onChange} className={inputClass}><option value="">Selecciona una opción</option><option value="FEMENINO">Femenino</option><option value="MASCULINO">Masculino</option><option value="OTRO">Otro</option></select></label>
      <Field label="Procedencia" name="origin" value={form.origin} onChange={onChange} />
      <Field label="Religión" name="religion" value={form.religion} onChange={onChange} />
      <Field label="Escolaridad" name="education" value={form.education} onChange={onChange} />
      <Field label="Profesión u oficio" name="profession" value={form.profession} onChange={onChange} />
      <Field label="Cédula" name="national_id" value={form.national_id} onChange={onChange} required />
      <Field label="Dirección habitual" name="address" value={form.address} onChange={onChange} wide />
      <Field label="Nombre del padre" name="father_name" value={form.father_name} onChange={onChange} />
      <Field label="Nombre de la madre" name="mother_name" value={form.mother_name} onChange={onChange} />
      <Field label="Fuente de información" name="information_source" value={form.information_source} onChange={onChange} />
      <Field label="Confiabilidad" name="information_reliability" value={form.information_reliability} onChange={onChange} />
      <Field label="Teléfono" name="phone" value={form.phone} onChange={onChange} type="tel" />
      <Field label="Correo electrónico" name="email" value={form.email} onChange={onChange} type="email" />
      <Field label="Contacto de emergencia" name="emergency_contact_name" value={form.emergency_contact_name} onChange={onChange} />
      <Field label="Parentesco" name="emergency_relationship" value={form.emergency_relationship} onChange={onChange} />
      <Field label="Teléfono de emergencia" name="emergency_phone" value={form.emergency_phone} onChange={onChange} type="tel" />
    </Section>

    <Section number={3} title="Motivo de consulta"><Field label="Motivo de consulta" name="chief_complaint" value={form.chief_complaint} onChange={onChange} type="textarea" wide /></Section>
    <Section number={4} title="Historia de la enfermedad actual"><Field label="Historia de la enfermedad actual" name="present_illness_history" value={form.present_illness_history} onChange={onChange} type="textarea" wide /></Section>
    <Section number={5} title="Interrogatorio por aparatos y sistemas">{systemFields.map(([name, label]) => <Field key={name} label={label} name={name} value={form[name]} onChange={onChange} type="textarea" />)}</Section>
    <Section number={6} title="Antecedentes familiares patológicos">
      <Field label="Antecedentes familiares" name="family_history" value={form.family_history} onChange={onChange} type="textarea" wide />
      <DiseaseChecklist legend="Enfermedades infectocontagiosas" group={infectiousDiseases} values={form.infectious_diseases} onDiseaseChange={(name, value) => onDiseaseChange('infectious_diseases', name, value)} />
      <DiseaseChecklist legend="Enfermedades hereditarias" group={hereditaryDiseases} values={form.hereditary_diseases} onDiseaseChange={(name, value) => onDiseaseChange('hereditary_diseases', name, value)} />
    </Section>
    <Section number={7} title="Examen físico">
      <div className="grid gap-3 rounded-xl bg-cyan-50/60 p-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Frecuencia cardíaca" name="heart_rate" value={form.heart_rate} onChange={onChange} type="number" />
        <Field label="Frecuencia respiratoria" name="respiratory_rate" value={form.respiratory_rate} onChange={onChange} type="number" />
        <Field label="Presión arterial" name="blood_pressure" value={form.blood_pressure} onChange={onChange} />
        <Field label="Temperatura" name="temperature" value={form.temperature} onChange={onChange} type="number" />
        <Field label="Peso" name="weight" value={form.weight} onChange={onChange} type="number" />
        <Field label="Talla" name="height" value={form.height} onChange={onChange} type="number" />
        <Field label="Área de superficie corporal" name="body_surface_area" value={form.body_surface_area} onChange={onChange} type="number" />
        <Field label="IMC" name="bmi" value={form.bmi} onChange={onChange} type="number" />
      </div>
      {physicalFields.map(([name, label]) => <Field key={name} label={label} name={name} value={form[name]} onChange={onChange} type="textarea" />)}
    </Section>
    <Section number={8} title="Observaciones y análisis"><Field label="Observaciones y análisis" name="observations_analysis" value={form.observations_analysis} onChange={onChange} type="textarea" wide /></Section>
    <Section number={9} title="Diagnósticos o problemas odontológicos"><Field label="Diagnóstico / problemas odontológicos" name="dental_diagnoses" value={form.dental_diagnoses} onChange={onChange} type="textarea" wide /></Section>
    <Section number={10} title="Plan de tratamiento odontológico"><Field label="Plan de tratamiento" name="treatment_plan" value={form.treatment_plan} onChange={onChange} type="textarea" wide /></Section>
    <Section number={11} title="Presupuesto"><Field label="Presupuesto / descripción" name="budget" value={form.budget} onChange={onChange} type="textarea" wide /></Section>
    <Section number={12} title="Tratamiento realizado"><Field label="Tratamiento realizado" name="treatment_performed" value={form.treatment_performed} onChange={onChange} type="textarea" wide /></Section>
    <Section number={13} title="Archivos clínicos" description="Registra una referencia por línea; la carga binaria se incorporará al módulo documental.">
      <Field label="Exámenes radiográficos" name="radiographic_exams" value={form.radiographic_exams} onChange={onChange} type="textarea" placeholder="Ej. radiografía panorámica 08/08/2026" />
      <Field label="Fotografías clínicas" name="clinical_photographs" value={form.clinical_photographs} onChange={onChange} type="textarea" placeholder="Ej. fotografía frontal pieza 46" />
    </Section>
  </div>
}
