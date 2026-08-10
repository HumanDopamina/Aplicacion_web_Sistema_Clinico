# Plan técnico — HU-13 Detección robusta de pacientes duplicados

## Objetivo

Evitar expedientes duplicados cuando una misma identificación se captura con diferencias de mayúsculas, guiones o espacios, preservando el formato visible y manteniendo al backend como fuente autoritativa.

## Implementación

1. Añadir `national_id_key` a `Patient` como clave técnica no expuesta.
2. Normalizar con `re.sub(r"[\s-]+", "", value).upper()` desde `Patient.save()`.
3. Consultar la clave normalizada desde `PatientSerializer`, excluyendo la propia instancia al editar.
4. Mantener `national_id` con separadores, espacios internos y conversión a mayúsculas.
5. Capturar conflictos únicos ocurridos después de la validación preventiva y devolver el mismo error `national_id`.
6. Migrar en tres fases: campo nullable, detección/backfill seguro y restricción única obligatoria.
7. Conservar la gestión actual de errores del formulario, sin búsqueda preventiva desde el cliente.

## Contratos

- `POST /api/patients/` y `PATCH /api/patients/{id}/` no cambian.
- `national_id_key` no aparece en solicitudes ni respuestas.
- Un duplicado responde `400` con `{"national_id": ["Ya existe un paciente con esta cédula."]}`.

## Verificación

- Pruebas API para variantes, reformateo propio, identificaciones distintas y conflicto concurrente.
- Prueba de restricción mediante guardado directo del modelo.
- Pruebas de migración para backfill y colisiones históricas.
- Prueba frontend para mensaje exacto, borrador conservado, ruta estable y acción de guardado.
- Suite Django completa y comprobación de migraciones.
- Suite Vitest, lint y build de producción.

## Decisiones

- La identificación pública conserva su formato.
- Solo guiones, espacios y capitalización son irrelevantes para la comparación.
- No se crean mecanismos de fusión ni detección probabilística.
