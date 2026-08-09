# Configuración operativa

La sección **Configuración** permite a administración gestionar el perfil, los horarios y el catálogo clínico. Staff y Permisos conservan su funcionamiento anterior; Notificaciones se muestra como una opción no disponible.

## Reglas de agenda

Las restricciones permanecen desactivadas hasta el primer guardado de los siete días. Después, una cita debe estar íntegramente dentro de una jornada abierta, no puede cruzar una pausa ni coincidir con un cierre activo. Los cierres recurrentes comparan mes y día. Los cambios que afectarían citas futuras `PROGRAMADA` o `CONFIRMADA` se rechazan e incluyen `conflicting_appointments`.

Los servicios son opcionales. Al elegir uno, la interfaz sugiere su duración y nombre, pero ambos campos siguen siendo editables y quedan guardados en la cita. Un servicio archivado permanece visible en citas históricas.

## API

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET / PATCH | `/api/clinics/profile/` | lectura autenticada / escritura administración |
| GET | `/api/clinics/profile/options/` | autenticado |
| GET / PUT | `/api/clinics/business-hours/` | lectura autenticada / escritura administración |
| GET / POST | `/api/clinics/closures/` | lectura autenticada / escritura administración |
| PATCH | `/api/clinics/closures/<id>/` | administración |
| GET / POST | `/api/clinics/service-categories/` | lectura autenticada / escritura administración |
| PATCH | `/api/clinics/service-categories/<id>/` | administración |
| GET / POST | `/api/clinics/services/` | lectura autenticada / escritura administración |
| PATCH | `/api/clinics/services/<id>/` | administración |

Los logos admiten PNG, JPEG y WebP hasta 2 MB. En desarrollo se almacenan bajo `MEDIA_ROOT`; producción debe proporcionar almacenamiento persistente y configurar `DJANGO_SECRET_KEY`, `DEBUG` y orígenes permitidos mediante el entorno.

## Evidencia visual

- [Perfil de la clínica](user-stories/assets/clinic-config-profile.png)
- [Horarios de atención](user-stories/assets/clinic-config-hours.png)
- [Servicios y tarifas](user-stories/assets/clinic-config-services.png)
- [Modal móvil de categoría](user-stories/assets/clinic-config-mobile-modal.png)
