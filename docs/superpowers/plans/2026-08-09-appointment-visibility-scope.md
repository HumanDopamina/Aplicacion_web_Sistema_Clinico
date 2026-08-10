# Alcance de visibilidad de citas por odontólogo

**Objetivo:** Permitir que Odontología vea y gestione por defecto únicamente sus citas, manteniendo acceso global configurable para Recepción y perfiles autorizados.

## Implementación

- [x] Añadir `appointments.view_all` al catálogo y a los permisos predeterminados de Recepción.
- [x] Migrar presets existentes de Recepción que ya cuenten con `appointments.view`.
- [x] Filtrar listados y detalles en el backend según el odontólogo autenticado cuando falte `view_all`.
- [x] Restringir creación, reasignación y disponibilidad al usuario autenticado.
- [x] Mantener `404` para el acceso directo a citas ajenas y `403` para asignaciones no permitidas.
- [x] Mostrar “Tu agenda del día” y “Ver mi agenda” en el dashboard restringido.
- [x] Aplicar la dependencia entre `appointments.view` y `appointments.view_all` en API y configuración.
- [x] Actualizar pruebas, HU-18 y README.

## Verificación

- `python manage.py test`
- `npm test`
- `npm run lint`
- `npm run build`
