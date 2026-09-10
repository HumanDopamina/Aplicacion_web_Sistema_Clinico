# HU-06: Edición de usuarios del staff

- Estado: Cumplida
- Validada: 2026-08-28

## Historia

Como administrador, quiero editar la información y el acceso de los usuarios del staff para mantener sus datos actualizados y asignarles una nueva contraseña cuando sea necesario.

## Criterios y evidencia

| Criterio | Evidencia | Resultado |
|---|---|---|
| Administración puede editar nombre, apellidos, correo, teléfono, rol y estado sin cambiar la contraseña. | Las pruebas backend y frontend guardan el resto de campos con la sección **Acceso** cerrada y comprueban que no se envían credenciales. | Cumple |
| Administración puede asignar y confirmar una contraseña nueva desde **Editar miembro**. | La prueba de `SettingsPage` despliega **Cambiar contraseña**, completa ambos campos y verifica el `PATCH` con `new_password` y `confirm_password`. | Cumple |
| Una confirmación diferente, un campo incompleto o una contraseña débil no modifica la cuenta. | El formulario rechaza valores diferentes antes de llamar a la API; el serializador también rechaza diferencias, campos incompletos y fallos de `validate_password`. | Cumple |
| La contraseña se almacena de forma segura y nunca aparece en la respuesta. | La prueba API comprueba `check_password` sobre el hash persistido y verifica que la respuesta no contiene ninguno de los dos campos de escritura. | Cumple |
| Las sesiones emitidas antes del cambio dejan de autorizar solicitudes. | El cambio incrementa `token_version`; la prueba intenta usar el access token anterior y un access token renovado desde el refresh anterior, y ambos reciben `401`. | Cumple |
| Sólo una cuenta administradora puede modificar a otro usuario. | `UserDetailView` conserva `IsAuthenticated` e `IsAdministrator`; la prueba de control de acceso verifica `403` para Recepción. | Cumple |

## Interfaces afectadas

- `PATCH /api/auth/users/{id}/`: acepta opcionalmente `new_password` y `confirm_password` como campos de escritura.
- **Configuración → Gestión de Staff → Editar miembro → Acceso**: revela los dos campos bajo demanda y avisa sobre el cierre de sesiones.
- No se agregan migraciones ni nuevas dependencias.

## Controles de seguridad

- La autorización se resuelve con el usuario autenticado y su rol almacenado en backend.
- Se reutilizan los validadores de contraseña configurados en Django y `set_password`.
- La actualización de `token_version` es atómica para tolerar cambios concurrentes.
- Las credenciales no forman parte de la representación pública del usuario ni se escriben en logs.

## Verificación

```powershell
cd src/backend
.\.venv\Scripts\python.exe manage.py test

cd ..\frontend
$env:NODE_OPTIONS="--no-experimental-webstorage"
npm test
npm run lint
npm run build
```

Resultado del 2026-08-28: 129 pruebas backend y 132 pruebas frontend aprobadas; Oxlint y el bundle de producción finalizaron con código 0.
