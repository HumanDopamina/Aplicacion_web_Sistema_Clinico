# HU-07: Desactivación de usuarios

- Jira: SCRUM-16
- Estado: Cumplida
- Validada: 2026-08-08

## Historia

Como administrador, quiero desactivar usuarios para impedir el acceso a personal que ya no labora en la clínica.

## Criterios y evidencia

| Criterio | Evidencia | Resultado |
|---|---|---|
| Una cuenta desactivada no puede iniciar sesión. | La prueba backend desactiva mediante `PATCH /api/auth/users/{id}/` e intenta iniciar sesión con las mismas credenciales. | Cumple |
| Las acciones y datos previos se conservan. | Archivar cambia `is_active` e invalida sesiones mediante `token_version`, sin eliminar el registro. La eliminación de usuarios con historial protegido responde `409`. | Cumple dentro del modelo actual |
| Solo un administrador puede cambiar el estado. | `UserDetailView` requiere autenticación y permiso de administrador; una cuenta no administradora recibe `403`. | Cumple |
| La interfaz refleja el nuevo estado. | La prueba de `SettingsPage` desmarca **Usuario activo**, guarda y comprueba el indicador **Inactivo**. | Cumple |

## Archivos de prueba

- `src/backend/apps/users/tests.py`
- `src/frontend/src/pages/Settings/SettingsPage.test.jsx`

## Verificación

```powershell
src/backend/.venv/Scripts/python.exe src/backend/manage.py test apps.users
cd src/frontend
npm test -- --run
npm run lint
npm run build
```

No se crea un módulo de auditoría en esta historia. Los futuros reportes o historiales deben conservar la referencia al usuario desactivado y evitar eliminación en cascada.

## Revisión de seguridad — septiembre de 2026

Archivar/reactivar o cambiar el rol invalida tokens anteriores. El último administrador activo está protegido. Regresión: `python manage.py test apps.users.test_production_safety --settings=config.settings.test`.

El alcance y los pendientes de producción están en [el informe de correcciones](../production-readiness-improvements.md).
