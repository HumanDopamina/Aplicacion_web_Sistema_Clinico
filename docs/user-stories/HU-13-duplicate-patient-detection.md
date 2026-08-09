# HU-13 — Detección de pacientes duplicados

**Jira:** SCRUM-20

**Historia:** Como recepcionista, quiero que el sistema detecte registros duplicados, para evitar crear múltiples expedientes para un mismo paciente.

**Estado:** Implementada y validada el 9 de agosto de 2026.

## Criterio de aceptación

> Dado que intento registrar un paciente con un ID de identificación ya existente, cuando guardo, entonces el sistema bloquea o alerta sobre el duplicado.

## Alcance implementado

- La cédula se compara mediante una clave interna que ignora mayúsculas, minúsculas, guiones y cualquier espacio.
- El valor público conserva sus separadores; solo se eliminan espacios exteriores y se convierte a mayúsculas.
- Variantes como `001-160498-0001A`, `0011604980001a` y `001 160498 0001A` representan la misma identificación.
- La validación se aplica al crear y editar. Una persona puede cambiar únicamente el formato visible de su propia cédula.
- Un duplicado devuelve `400` con `{"national_id": ["Ya existe un paciente con esta cédula."]}`.
- La restricción única de base de datos protege también Django Admin y llamadas directas a `Patient.save()`.
- Los conflictos concurrentes se traducen al mismo error de validación en vez de producir una respuesta interna genérica.
- La interfaz no realiza una consulta preventiva: conserva el borrador, permanece en `/pacientes/nuevo` y muestra el mensaje del backend con la nube disponible para reintentar.

## Modelo y migración

- `Patient.national_id_key` es una clave técnica, obligatoria, única y no editable.
- La clave se calcula con `re.sub(r"[\s-]+", "", value).upper()` cada vez que se guarda el modelo.
- `national_id_key` no forma parte del serializador ni del contrato público de la API.
- La migración `0005_patient_national_id_key` agrega primero el campo nullable, calcula todas las claves y comprueba colisiones antes de escribirlas.
- Si existen colisiones históricas, la migración se detiene con los identificadores internos involucrados; no modifica, combina ni elimina expedientes.
- Solo después de un backfill válido se retira la unicidad del formato visible y se establece la unicidad obligatoria de la clave interna.

## Evidencia automatizada

- La API rechaza variantes por mayúsculas, guiones y espacios con el mensaje exacto y conserva un único paciente.
- Una edición permite reformatear la propia cédula y mantiene la clave normalizada.
- Identificaciones realmente distintas se registran de forma independiente.
- Las escrituras directas quedan protegidas por la restricción única.
- Una prueba de carrera simulada confirma la traducción del conflicto concurrente a `400`.
- Las pruebas de migración verifican el backfill y la detención segura ante colisiones preexistentes.
- La prueba de interfaz valida mensaje, borrador, ruta y acción de guardado después del rechazo.

## Fuera de alcance

- No se detectan duplicados por nombre, teléfono, correo o fecha de nacimiento.
- No se ignoran otros caracteres distintos de guiones y espacios.
- No se fusionan expedientes ni se implementan coincidencias probabilísticas.
