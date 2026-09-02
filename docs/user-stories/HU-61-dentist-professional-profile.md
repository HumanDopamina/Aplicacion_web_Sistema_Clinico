# HU-61 — Perfil profesional del odontólogo

Estado: Implementada y verificada el 2 de septiembre de 2026.

## Modelo y contratos

- `User` incorpora `specialty` (máximo 200) y
  `professional_registration_number` (máximo 100), ambos opcionales y sin
  formato nacional ni unicidad inventados.
- Los serializers recortan espacios mediante la validación estándar de texto y
  permiten crear, editar o limpiar ambos valores desde la administración.
- El perfil propio expone los datos como sólo lectura; un usuario no puede
  asignarse credenciales profesionales ni alterar su rol.
- La consulta expone únicamente el contexto profesional necesario leyendo la
  relación actual con `User`; no guarda snapshots ni duplica los campos.

## Interfaz y documentos

- Crear o editar un odontólogo muestra Especialidad y Número de registro
  profesional. Un cambio posterior de rol oculta los controles sin borrar los
  valores almacenados.
- El perfil del odontólogo y el encabezado contextual de una consulta muestran
  los datos cuando corresponden.
- La exportación PDF de HU-35 lee siempre el perfil profesional vigente; una
  exportación histórica ya generada no se modifica y una nueva refleja el valor
  actual.

## Migración y auditoría

- `users.0010_user_professional_profile` es una expansión simple con dos campos
  vacíos permitidos, sin backfill. Los usuarios existentes permanecen intactos.
- Crear o editar personal audita los nombres seguros de los campos cambiados,
  incluido rol, especialidad y registro; contraseñas y tokens quedan excluidos.

## Evidencia de aceptación

- Campos opcionales, trim, longitudes, texto libre, creación, edición, limpieza,
  cambio de rol y permisos administrativos.
- Contratos de login/perfil/consulta mínimos y perfil propio de sólo lectura.
- Migración desde el estado anterior, auditoría segura, UI administrativa,
  perfil profesional y PDF con lectura dinámica del profesional.

