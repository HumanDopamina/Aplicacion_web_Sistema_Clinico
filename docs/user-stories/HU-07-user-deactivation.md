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
| Las acciones y datos previos se conservan. | La desactivación cambia `is_active` sin eliminar ni reemplazar el registro; `DELETE` sobre el endpoint responde `405`. | Cumple dentro del modelo actual |
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
