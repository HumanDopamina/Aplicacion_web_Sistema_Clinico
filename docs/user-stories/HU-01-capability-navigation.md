# HU-01 — Navegación según capacidades reales

Estado: Implementada y verificada el 2 de septiembre de 2026.

## Alcance implementado

- La navegación principal se filtra con los permisos efectivos entregados por
  el backend; no deriva acceso desde el nombre del rol.
- Pacientes requiere `patients.view`, Citas requiere `appointments.view` y
  Configuración requiere al menos `clinic.manage` o `users.manage`.
- Las secciones internas de Configuración también se separan por capacidad:
  configuración de clínica y gestión de usuarios.
- Las rutas protegidas aplican la misma comprobación visual para evitar que una
  URL manual renderice contenido no autorizado. Los permisos del backend siguen
  siendo la barrera de seguridad autoritativa.
- Los códigos administrativos son capacidades efectivas reservadas al
  administrador y no forman parte del catálogo editable de presets de rol.

## Evidencia de aceptación

- Sidebar con permisos completos y parciales, módulos ocultos de manera
  independiente y configuración segmentada.
- Acceso manual a Pacientes, Usuarios, Clínicas y Configuración sin capacidad.
- Regresiones de login, mensaje genérico de credenciales inválidas y permisos
  backend incluidas en las suites completas.

## Verificación

```powershell
cd src/backend
.venv\Scripts\python.exe manage.py test --settings=config.settings.test

cd ../frontend
npm test -- --reporter=dot
npm run lint
npm run build
```

