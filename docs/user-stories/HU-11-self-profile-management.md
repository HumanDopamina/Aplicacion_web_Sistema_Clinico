# HU-11 — Gestión del perfil personal

**Historia:** Como usuario autenticado, quiero actualizar mis datos y fotografía, para mantener vigente mi identidad dentro de la clínica.

**Estado:** Implementada y validada el 10 de agosto de 2026.

## Criterios de aceptación

- Administración, Recepción y Odontología acceden a **Mi perfil** desde el menú del avatar.
- Cada usuario modifica únicamente su nombre, apellidos, teléfono, correo y fotografía.
- Cambiar el correo requiere confirmar la contraseña actual y mantiene activa la sesión.
- Rol, estado, permisos y contraseña no son modificables desde el perfil personal.
- Administración puede registrar y editar teléfono y fotografía desde **Gestión de Staff**.
- Las fotos se guardan en almacenamiento privado; solo el propietario o Administración pueden obtenerlas.

## Implementación y seguridad

- `User` incorpora `phone` opcional y `avatar` con nombre aleatorio bajo `PRIVATE_MEDIA_ROOT`.
- `PATCH /api/auth/me/` acepta `multipart/form-data`, toma siempre el usuario desde el JWT y usa una lista explícita de campos editables.
- `current_password` es de escritura exclusiva y se exige únicamente si cambia el correo normalizado.
- Las imágenes se verifican por extensión, MIME y contenido real; se admiten PNG, JPEG y WebP de hasta 2 MB.
- Reemplazar o quitar una foto elimina el archivo anterior. Las respuestas nunca exponen la ruta física.
- `GET /api/auth/me/avatar/` sirve la foto propia. `GET /api/auth/users/{id}/avatar/` exige propiedad o rol administrador y responde con `private, no-store` y `nosniff`.
- El frontend descarga las fotos con Bearer como `Blob`, revoca las URL temporales y muestra iniciales cuando no existe imagen o la descarga falla.

## Interfaces

| Método | Endpoint | Acceso | Resultado |
|---|---|---|---|
| `GET` | `/api/auth/me/` | Usuario autenticado | Devuelve identidad, rol, permisos y referencia protegida de la foto. |
| `PATCH` | `/api/auth/me/` | Usuario autenticado | Actualiza los campos personales permitidos. |
| `GET` | `/api/auth/me/avatar/` | Propietario | Devuelve la foto personal. |
| `POST` | `/api/auth/users/` | Administrador | Permite crear un miembro con teléfono y foto opcionales. |
| `PATCH` | `/api/auth/users/{id}/` | Administrador | Permite editar el perfil completo, rol y estado. |
| `GET` | `/api/auth/users/{id}/avatar/` | Propietario o administrador | Devuelve una foto privada autorizada. |

## Evidencia automatizada

- Backend: autenticación, actualización propia, campos privilegiados inmutables, contraseña para correo, duplicidad, carga/reemplazo/eliminación de foto y rechazo de acceso horizontal.
- Administración: alta y edición completa de un miembro sin modificar su contraseña.
- Frontend: servicio multipart/blob, persistencia en el almacenamiento de sesión elegido, menú accesible, formulario condicional, vista previa, eliminación, estados de éxito/error y fotografías en Staff.
- Verificación: `python manage.py test`, `npm test`, `npm run lint` y `npm run build`.
