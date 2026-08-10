# Configuración operativa de la clínica

## Objetivo

Administrar una clínica única mediante perfil, horarios de atención, pausas, cierres festivos y un catálogo de servicios. La agenda utiliza la zona horaria y estas reglas para calcular disponibilidad real.

## Entrega

- Perfil único con branding, contacto, moneda NIO/USD, zona IANA y logo local validado.
- Siete jornadas reemplazables atómicamente, múltiples pausas y cierres únicos o anuales.
- Categorías y servicios archivables, con duraciones de 15 a 240 minutos y precios por moneda.
- Servicio opcional en citas, manteniendo duración y motivo como instantáneas editables.
- Bloqueo de horarios y festivos que invaliden citas futuras programadas o confirmadas.
- Paneles React cargados bajo demanda, modales centrados y adaptación móvil.

## Verificación prevista

`python manage.py test`, `npm test`, `npm run lint`, `npm run build` y recorrido Playwright en escritorio y móvil.
