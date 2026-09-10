# Informe QA integral — Sistema clínico

**Fecha:** 28 de agosto de 2026  
**Entorno:** copia aislada de base de datos y archivos; Chromium headless 1440 × 900; API Django en `127.0.0.1:8010`; Vite en `localhost:5174`  
**Alcance:** autenticación, perfil, staff, permisos, clínica, dashboard, pacientes, consultas, odontogramas, documentos y agenda  
**Decisión:** **no apto todavía para producción**. El flujo clínico principal es funcional, pero quedan seis riesgos P1 que deben cerrarse antes del lanzamiento.

No se corrigió código durante esta campaña. Google Calendar, notificaciones, responsive móvil y Firefox/WebKit quedaron fuera del alcance acordado.

## Resumen ejecutivo

| Resultado | Cantidad |
| --- | ---: |
| Escenarios ejecutados | 131 |
| PASS | 118 |
| FAIL | 13 |
| BLOCKED | 0 |
| Tasa de aprobación | 90.1 % |

Se registraron **12 defectos o brechas**: 0 P0, 6 P1, 3 P2 y 3 P3. Dos escenarios fallidos corresponden a una misma brecha: las rutas incompletas `/usuarios` y `/clinicas`.

Los flujos de login, renovación, logout, recuperación de un solo uso, cambio de contraseña, registro clínico, consultas, versiones de odontograma, documentos privados, disponibilidad y transiciones de citas funcionaron con datos sintéticos. Los controles por capacidad devolvieron `401`/`403` y el aislamiento entre pacientes se mantuvo en los casos ejecutados.

Los principales bloqueos de lanzamiento son la configuración insegura de producción, una migración pendiente en la base actual, el manejo no controlado de imágenes corruptas, la falta de auditoría clínica, el almacenamiento de JWT en Web Storage y la ausencia de limitación de intentos de login.

## Método y aislamiento

- Se copió `db.sqlite3`, `media` y `private_media` a un directorio temporal fuera del repositorio.
- Sólo la copia temporal fue modificada. Se crearon cuentas, pacientes, consultas, odontogramas, documentos, servicios, horarios, cierres y citas con prefijo `QA`.
- Se usaron Administración, Recepción, Odontología, una cuenta inactiva y sesiones concurrentes.
- Las pruebas UI se ejecutaron en Chromium headless a 1440 × 900. Se observaron consola, respuestas HTTP, foco y estados visibles.
- Las API se probaron por HTTP independientemente de la UI, incluyendo contratos válidos e inválidos y respuestas `400`, `401`, `403`, `404`, `405` y `409`.
- Las capturas conservadas contienen únicamente datos sintéticos. No se guardaron tokens ni contraseñas.
- Al terminar se detuvieron los servicios temporales y se eliminó el entorno aislado; sólo permanecen este informe y las capturas sanitizadas.

## Verificación automatizada

| Comando | Resultado |
| --- | --- |
| `python manage.py test` | PASS — 133 pruebas |
| `npm test` | PASS — 19 archivos, 134 pruebas |
| `npm run lint` | PASS — Oxlint sin errores |
| `npm run build` | PASS — bundle generado |
| `python manage.py makemigrations --check --dry-run` | PASS — sin cambios de modelos |
| `python manage.py check --deploy` | FAIL de preparación — 7 advertencias de seguridad |
| `python manage.py showmigrations patients` | FAIL de preparación — `0008_consultation_dashboard_index` no aplicada |

El build produjo un JavaScript principal de 417.14 kB (120.02 kB gzip). La imagen SVG del login pesa 535.92 kB y su PNG 636.06 kB; conviene optimizarlas antes del despliegue, aunque no bloquean funcionalidad.

## Defectos y brechas

### QA-DEF-001 — P1 — Configuración base no es segura ni escalable para producción

**Precondición:** ejecutar el backend con la configuración versionada.  
**Pasos:** ejecutar `python manage.py check --deploy` e inspeccionar `config/settings.py`.  
**Esperado:** secretos por entorno, `DEBUG=False`, TLS/cookies seguras, hosts explícitos y servicios persistentes aptos para producción.  
**Real:** siete advertencias (`W004`, `W008`, `W009`, `W012`, `W016`, `W018`, `W020`); `SECRET_KEY` está versionada, `DEBUG=True`, `ALLOWED_HOSTS=[]`, SQLite, archivos locales y correo por consola como valores base.  
**Ruta/rol:** configuración del servidor; todos los roles.  
**Evidencia:** salida de `check --deploy` y `src/backend/config/settings.py`.  
**Recomendación inicial:** separar settings por entorno, cargar secretos desde un gestor, usar PostgreSQL administrado, almacenamiento de objetos para archivos privados, correo transaccional, TLS en proxy y cookies/encabezados seguros. Añadir un gate de despliegue que falle ante advertencias críticas.

### QA-DEF-002 — P1 — La base actual tiene una migración pendiente

**Precondición:** base `db.sqlite3` actual o su copia aislada.  
**Pasos:** ejecutar `python manage.py showmigrations patients` o iniciar el servidor.  
**Esperado:** todas las migraciones aplicadas antes de servir tráfico.  
**Real:** `patients.0008_consultation_dashboard_index` aparece sin aplicar y `runserver` advierte sobre una migración pendiente. El dashboard funciona, pero no cuenta todavía con el índice previsto para crecer.  
**Ruta/rol:** base de datos; todos los roles.  
**Evidencia:** verificación de migraciones.  
**Recomendación inicial:** ejecutar migraciones en staging, validar el plan sobre una copia y convertir `migrate --check` en paso obligatorio previo al despliegue.

### QA-DEF-003 — P1 — Un PNG corrupto genera `500` en carga de documentos

**Precondición:** usuario autenticado con `documents.create` y paciente válido.  
**Pasos:** enviar a `POST /api/patients/{id}/documents/` un archivo declarado `image/png` con estructura PNG dañada.  
**Esperado:** `400` con un mensaje de archivo inválido, sin excepción no controlada.  
**Real:** `500`; Pillow lanza `SyntaxError: broken PNG file` desde `image.verify()`. En modo debug se devuelve una página técnica extensa. Un PNG realmente válido sí devuelve `201` y conserva correctamente visualización privada y borrado por permisos.  
**Rol:** Recepción.  
**Evidencia:** `API-DOC-01`; ciclo válido suplementario `API-DOC-10`.  
**Recomendación inicial:** capturar las excepciones de decodificación de Pillow, normalizar a `ValidationError`, limitar coste de análisis y añadir regresión con PNG truncado/checksum incorrecto.

### QA-DEF-004 — P1 — No existe bitácora inmutable de actividad clínica y administrativa

**Precondición:** editar expediente, consulta, cita, permisos o staff.  
**Pasos:** efectuar un cambio y buscar un evento que registre actor, fecha, objeto, acción y antes/después.  
**Esperado:** trazabilidad consultable y resistente a edición para datos clínicos sensibles.  
**Real:** sólo existen campos operativos como creación/actualización y versiones específicas del odontograma; no hay modelo o servicio transversal de auditoría.  
**Ruta/rol:** todas las áreas; Administración.  
**Evidencia:** revisión estática de modelos, vistas y configuración.  
**Recomendación inicial:** implementar eventos append-only para accesos y mutaciones críticas, retención definida, exportación y vista restringida para Administración.

### QA-DEF-005 — P1 — Los JWT se almacenan en `localStorage`/`sessionStorage`

**Precondición:** iniciar sesión con o sin “Recuérdame”.  
**Pasos:** inspeccionar el almacenamiento del navegador.  
**Esperado:** la credencial de sesión no debe estar disponible para JavaScript de la página.  
**Real:** access y refresh token se serializan en `dentalclinic_session` dentro de Web Storage. Una futura vulnerabilidad XSS podría extraer ambos.  
**Ruta/rol:** login; todos los roles.  
**Evidencia:** `src/frontend/src/context/AuthContext.jsx` y `src/frontend/src/services/api.js`.  
**Recomendación inicial:** migrar el refresh token a cookie `HttpOnly`, `Secure`, `SameSite`, mantener access token de corta vida en memoria y definir CSP estricta.

### QA-DEF-006 — P1 — El login no limita intentos repetidos

**Precondición:** endpoint público de autenticación.  
**Pasos:** enviar ocho credenciales inválidas consecutivas a `POST /api/auth/login/`.  
**Esperado:** retraso o `429` después del umbral, con límites por IP y cuenta.  
**Real:** las ocho respuestas fueron `400`; sólo recuperación de contraseña tiene throttle configurado.  
**Rol:** Anónimo.  
**Evidencia:** `SEC-AUTH-01`, HTTP aislado.  
**Recomendación inicial:** añadir throttling específico de login, backoff, observabilidad y alerta de credential stuffing, evitando bloquear permanentemente cuentas legítimas.

### QA-DEF-007 — P2 — Listados principales no tienen paginación

**Precondición:** historial creciente de pacientes, usuarios, citas, documentos u odontogramas.  
**Pasos:** revisar contratos y configuración DRF; no existe paginador global o por vista.  
**Esperado:** respuestas acotadas con cursor/página y filtros indexados.  
**Real:** los listados serializan colecciones completas; la agenda y varios paneles descargan datos que crecerán sin límite.  
**Ruta/rol:** endpoints de listado; roles autorizados.  
**Evidencia:** revisión estática `API-SCALE-01`.  
**Recomendación inicial:** introducir paginación estable, búsqueda del lado servidor, límites máximos y pruebas de contrato; priorizar pacientes, documentos, staff e historiales.

### QA-DEF-008 — P2 — `/usuarios` y `/clinicas` son rutas visibles sin interfaz funcional

**Precondición:** sesión de Administración.  
**Pasos:** abrir `/usuarios` y `/clinicas`.  
**Esperado:** módulo funcional o ruta no publicada.  
**Real:** sólo se muestra el título “Usuarios” o “Clínicas” en un lienzo vacío.  
**Rol:** Administración.  
**Evidencia:** [E07](evidence/2026-08-28/07-users-placeholder.png) y [E08](evidence/2026-08-28/08-clinics-placeholder.png).  
**Recomendación inicial:** retirar ambas rutas de navegación/release o implementar alcance, permisos, estados y pruebas antes de exponerlas.

### QA-DEF-009 — P2 — El diálogo de staff no se cierra con `Escape`

**Precondición:** Administración en Configuración → Gestión de Staff.  
**Pasos:** abrir “Añadir miembro” y pulsar `Escape`.  
**Esperado:** cerrar el diálogo y devolver el foco al botón que lo abrió.  
**Real:** el diálogo permanece abierto. El foco inicial sí entra en el diálogo y `Shift+Tab` no escapó en la comprobación ejecutada.  
**Evidencia:** `UI-A11Y-04` y [E09](evidence/2026-08-28/09-staff-browser-flow.png).  
**Recomendación inicial:** centralizar un componente modal con cierre por `Escape`, trampa de foco, restauración de foco y pruebas de teclado.

### QA-DEF-010 — P3 — Método no soportado devuelve `403` en vez de `405`

**Precondición:** Administración con permisos de pacientes.  
**Pasos:** enviar `DELETE /api/patients/{id}/`.  
**Esperado:** `405 Method Not Allowed`, porque el recurso no expone borrado.  
**Real:** `403 Forbidden`; el permiso se evalúa antes de que DRF resuelva el método no permitido.  
**Evidencia:** `API-PATIENT-09`.  
**Recomendación inicial:** alinear la clase de permisos y los métodos permitidos para mantener semántica HTTP y contrato predecible.

### QA-DEF-011 — P3 — La interfaz aún anuncia Notificaciones

**Precondición:** Administración en Configuración.  
**Pasos:** revisar las secciones disponibles.  
**Esperado:** no presentar la funcionalidad excluida del MVP.  
**Real:** aparece un elemento deshabilitado “Notificaciones — Recordatorios SMS/Email”.  
**Evidencia:** `UI-SETTINGS-02` y [E09](evidence/2026-08-28/09-staff-browser-flow.png).  
**Recomendación inicial:** ocultarlo hasta que el alcance se reactive; no se propone implementar notificaciones en esta etapa.

### QA-DEF-012 — P3 — Error ortográfico en el login

**Precondición:** abrir `/iniciar-sesion`.  
**Pasos:** leer la etiqueta del campo de contraseña.  
**Esperado:** “Contraseña”.  
**Real:** “Constraseña”.  
**Evidencia:** [E01](evidence/2026-08-28/01-login-invalid.png).  
**Recomendación inicial:** corregir el texto y añadir una aserción de contenido accesible en la prueba del login.

## Riesgos de lanzamiento

1. **Seguridad:** el modo debug, secreto versionado, cookies/TLS sin endurecer, JWT en Web Storage y login sin throttle no son aceptables para expedientes clínicos reales.
2. **Trazabilidad:** no puede reconstruirse quién consultó o cambió información sensible fuera de los pocos campos de autor existentes.
3. **Disponibilidad:** SQLite y archivos locales limitan concurrencia, despliegue horizontal, recuperación y operación multi-instancia.
4. **Despliegue:** hay una migración pendiente; el proceso actual no garantiza que esquema y código entren coordinados.
5. **Crecimiento:** listados sin paginación y archivos/imágenes sin pipeline robusto degradarán latencia y memoria con datos reales.

## Mejoras funcionales priorizadas

Google Calendar y notificaciones se excluyen expresamente de esta priorización.

### Siguiente iteración

| Mejora | Impacto | Esfuerzo | Motivo observado |
| --- | --- | --- | --- |
| Bitácora clínica y administrativa | Muy alto | Medio | Cierra trazabilidad, soporte y seguridad; es requisito previo a datos reales. |
| Flujo de llegada y sala de espera | Alto | Medio | La agenda conoce el estado de la cita, pero no modela check-in, tiempo de espera o paciente en sillón. |
| Detección y fusión controlada de pacientes duplicados | Alto | Medio | La cédula evita algunos duplicados, pero nombres/teléfonos/correos pueden generar expedientes paralelos. |
| Plan de tratamiento y presupuesto por etapas | Alto | Medio/alto | Las consultas guardan texto clínico, pero no existe seguimiento estructurado de procedimientos pendientes, aceptados y realizados. |
| Exportación clínica/operativa y recuperación administrada | Alto | Medio | Reduce dependencia técnica para respaldos, portabilidad y continuidad del negocio. |

### Después de validar uso real

- Lista de espera y reasignación rápida ante cancelaciones.
- Consentimientos informados versionados con firma y relación a consulta/procedimiento.
- Indicadores operativos: ocupación, inasistencias, duración real, pacientes recurrentes y carga por profesional.
- Plantillas clínicas configurables por tipo de consulta para reducir escritura repetitiva.
- Búsqueda global real; el campo del encabezado actualmente es sólo visual y no ejecuta una búsqueda transversal.

### Escala y producción

- Paginación/cursor, filtros indexados y consultas medidas con datos volumétricos.
- PostgreSQL, almacenamiento de objetos privado, CDN sólo para activos públicos y procesamiento asíncrono de archivos.
- Backups cifrados con pruebas periódicas de restauración y objetivos RPO/RTO definidos.
- Observabilidad con métricas, logs estructurados, trazas, alertas y correlación de solicitudes sin datos clínicos sensibles.
- Despliegues repetibles con migraciones controladas, health checks, rollback y entorno staging anonimizado.
- Separación por clínica/tenant sólo después de definir propiedad, aislamiento, roles centrales y facturación.

Las cinco mejoras con mejor relación impacto/esfuerzo son: bitácora de auditoría, llegada/sala de espera, detección de duplicados, exportación/recuperación y plantillas clínicas.

## Matriz detallada

Leyenda de evidencia: `HTTP` = respuesta capturada contra la API aislada; `Chromium` = inspección automatizada en navegador; `E01`–`E09` = captura sanitizada del índice de evidencias.

| ID | Módulo | Rol | Capa | Resultado | Evidencia |
| --- | --- | --- | --- | --- | --- |
| API-AUTH-01 | Autenticación | Anónimo | API | PASS | HTTP |
| API-AUTH-02 | Autenticación | Anónimo | API | PASS | HTTP |
| API-AUTH-03 | Autenticación | Anónimo | API | PASS | HTTP |
| API-AUTH-04 | Autenticación | Inactivo | API | PASS | HTTP |
| API-AUTH-05 | Autenticación | Administración | API | PASS | HTTP |
| API-AUTH-06 | Autenticación | Recepción | API | PASS | HTTP |
| API-AUTH-07 | Autenticación | Odontología | API | PASS | HTTP |
| API-AUTH-08 | Autenticación | Administración | API | PASS | HTTP |
| API-AUTH-09 | Autenticación | Administración | API | PASS | HTTP |
| API-AUTH-10 | Autenticación | Administración | API | PASS | HTTP |
| API-AUTH-11 | Recuperación | Anónimo | API | PASS | HTTP |
| API-AUTH-12 | Recuperación | Anónimo | API | PASS | HTTP |
| API-AUTH-13 | Recuperación | Anónimo | API | PASS | HTTP |
| API-PROFILE-01 | Perfil | Odontología | API | PASS | HTTP |
| API-PROFILE-02 | Perfil | Odontología | API | PASS | HTTP |
| API-PROFILE-03 | Perfil | Odontología | API | PASS | HTTP |
| API-STAFF-01 | Staff | Administración | API | PASS | HTTP |
| API-STAFF-02 | Staff | Recepción | API | PASS | HTTP |
| API-STAFF-03 | Staff | Administración | API | PASS | HTTP |
| API-STAFF-04 | Staff | Administración | API | PASS | HTTP |
| API-STAFF-05 | Staff | Administración | API | PASS | HTTP |
| API-STAFF-06 | Staff | Administración | API | PASS | HTTP |
| API-PERM-01 | Permisos | Administración | API | PASS | HTTP |
| API-PERM-02 | Permisos | Recepción | API | PASS | HTTP |
| API-PERM-03 | Permisos | Administración | API | PASS | HTTP |
| API-PERM-04 | Permisos | Administración | API | PASS | HTTP |
| API-PERM-05 | Permisos | Odontología | API | PASS | HTTP |
| API-PERM-06 | Permisos | Administración | API | PASS | HTTP |
| API-CLINIC-01 | Clínica | Recepción | API | PASS | HTTP |
| API-CLINIC-02 | Clínica | Recepción | API | PASS | HTTP |
| API-CLINIC-03 | Clínica | Administración | API | PASS | HTTP |
| API-CLINIC-04 | Clínica | Administración | API | PASS | HTTP |
| API-CLINIC-05 | Clínica | Administración | API | PASS | HTTP |
| API-HOURS-01 | Horarios | Administración | API | PASS | HTTP |
| API-HOURS-02 | Horarios | Administración | API | PASS | HTTP |
| API-HOURS-03 | Horarios | Recepción | API | PASS | HTTP |
| API-HOURS-04 | Horarios | Recepción | API | PASS | HTTP |
| API-SERVICE-01 | Servicios | Administración | API | PASS | HTTP |
| API-SERVICE-02 | Servicios | Administración | API | PASS | HTTP |
| API-SERVICE-03 | Servicios | Administración | API | PASS | HTTP |
| API-SERVICE-04 | Servicios | Administración | API | PASS | HTTP |
| API-SERVICE-05 | Servicios | Recepción | API | PASS | HTTP |
| API-CLOSURE-01 | Cierres | Administración | API | PASS | HTTP |
| API-CLOSURE-02 | Cierres | Administración | API | PASS | HTTP |
| API-CLOSURE-03 | Cierres | Administración | API | PASS | HTTP |
| API-PATIENT-01 | Pacientes | Administración | API | PASS | HTTP |
| API-PATIENT-02 | Pacientes | Administración | API | PASS | HTTP |
| API-PATIENT-03 | Pacientes | Administración | API | PASS | HTTP |
| API-PATIENT-04 | Pacientes | Administración | API | PASS | HTTP |
| API-PATIENT-05 | Pacientes | Administración | API | PASS | HTTP |
| API-PATIENT-06 | Pacientes | Administración | API | PASS | HTTP |
| API-PATIENT-07 | Pacientes | Administración | API | PASS | HTTP |
| API-PATIENT-08 | Pacientes | Administración | API | PASS | HTTP |
| API-PATIENT-09 | Pacientes | Administración | API | FAIL | HTTP |
| API-PATIENT-10 | Pacientes | Administración | API | PASS | HTTP |
| API-PATIENT-11 | Pacientes | Administración | API | PASS | HTTP |
| API-CONSULT-01 | Consultas | Odontología | API | PASS | HTTP |
| API-CONSULT-02 | Consultas | Recepción | API | PASS | HTTP |
| API-CONSULT-03 | Consultas | Odontología | API | PASS | HTTP |
| API-CONSULT-04 | Consultas | Odontología | API | PASS | HTTP |
| API-CONSULT-05 | Consultas | Administración | API | PASS | HTTP |
| API-CONSULT-06 | Consultas | Odontología | API | PASS | HTTP |
| API-DASH-01 | Dashboard | Administración | API | PASS | HTTP |
| API-DASH-02 | Dashboard | Administración | API | PASS | HTTP |
| API-ODONTO-01 | Odontograma | Odontología | API | PASS | HTTP |
| API-ODONTO-02 | Odontograma | Odontología | API | PASS | HTTP |
| API-ODONTO-03 | Odontograma | Odontología | API | PASS | HTTP |
| API-ODONTO-04 | Odontograma | Recepción | API | PASS | HTTP |
| API-ODONTO-05 | Odontograma | Odontología | API | PASS | HTTP |
| API-ODONTO-06 | Odontograma | Odontología | API | PASS | HTTP |
| API-DOC-01 | Documentos | Recepción | API | FAIL | HTTP |
| API-DOC-02 | Documentos | Recepción | API | PASS | HTTP |
| API-DOC-03 | Documentos | Odontología | API | PASS | HTTP |
| API-DOC-04 | Documentos | Odontología | API | PASS | HTTP |
| API-DOC-05 | Documentos | Odontología | API | PASS | HTTP |
| API-DOC-06 | Documentos | Odontología | API | PASS | HTTP |
| API-DOC-07 | Documentos | Recepción | API | PASS | HTTP |
| API-DOC-08 | Documentos | Administración | API | PASS | HTTP |
| API-DOC-09 | Documentos | Recepción | API | PASS | HTTP |
| API-APPT-01 | Agenda | Recepción | API | PASS | HTTP |
| API-APPT-02 | Agenda | Recepción | API | PASS | HTTP |
| API-APPT-03 | Agenda | Recepción | API | PASS | HTTP |
| API-APPT-04 | Agenda | Recepción | API | PASS | HTTP |
| API-APPT-05 | Agenda | Recepción | API | PASS | HTTP |
| API-APPT-06 | Agenda | Recepción | API | PASS | HTTP |
| API-APPT-07 | Agenda | Recepción | API | PASS | HTTP |
| API-APPT-08 | Agenda | Recepción | API | PASS | HTTP |
| API-APPT-09 | Agenda | Administración | API | PASS | HTTP |
| API-APPT-10 | Agenda | Odontología | API | PASS | HTTP |
| API-APPT-11 | Agenda | Odontología | API | PASS | HTTP |
| API-SEC-01 | Seguridad | Administración | API | PASS | HTTP |
| API-SEC-02 | Seguridad | Administración | API | PASS | HTTP |
| API-SEC-03 | Seguridad | Administración | API | PASS | HTTP |
| API-SEC-04 | Seguridad | Administración | API | PASS | HTTP |
| UI-AUTH-01 | Autenticación | Anónimo | UI | PASS | E01 |
| UI-AUTH-02 | Autenticación | Anónimo | UI | PASS | E01 |
| UI-DASH-01 | Dashboard | Administración | UI | PASS | Chromium |
| UI-A11Y-01 | Accesibilidad | Administración | UI | PASS | Chromium |
| UI-PATIENT-01 | Pacientes | Administración | UI | PASS | E02 |
| UI-PATIENT-02 | Pacientes | Administración | UI | PASS | E03 |
| UI-CONSULT-01 | Consultas | Administración | UI | PASS | E04 |
| UI-CONSULT-02 | Consultas | Administración | UI | PASS | E04 |
| UI-ODONTO-01 | Odontograma | Administración | UI | PASS | E05 |
| UI-ODONTO-02 | Odontograma | Administración | UI | PASS | E05 |
| UI-DOC-01 | Documentos | Administración | UI | PASS | Chromium |
| UI-APPT-01 | Agenda | Administración | UI | PASS | E06 |
| UI-APPT-02 | Agenda | Administración | UI | PASS | E06 |
| UI-APPT-03 | Agenda | Administración | UI | PASS | E06 |
| UI-PROFILE-01 | Perfil | Administración | UI | PASS | Chromium |
| UI-SETTINGS-01 | Configuración | Administración | UI | PASS | E09 |
| UI-SETTINGS-02 | Configuración | Administración | UI | FAIL | E09 |
| UI-PLACEHOLDER-01 | Navegación | Administración | UI | FAIL | E07 |
| UI-PLACEHOLDER-02 | Navegación | Administración | UI | FAIL | E08 |
| UI-A11Y-02 | Accesibilidad | Anónimo | UI | PASS | Chromium |
| UI-ROLE-01 | Roles | Odontología | UI | PASS | Chromium |
| UI-ROLE-02 | Roles | Odontología | UI | PASS | Chromium |
| UI-ROLE-03 | Roles | Recepción | UI | PASS | Chromium |
| UI-ROLE-04 | Roles | Recepción | UI | PASS | Chromium |
| API-AUTH-14 | Logout y revocación | Recepción | API | PASS | HTTP |
| API-AUTH-15 | Recuperación válida y un solo uso | Anónimo | API | PASS | HTTP |
| API-DOC-10 | Ciclo de PNG válido y privado | Recepción/Administración | API | PASS | HTTP |
| UI-STAFF-01 | Crear, editar y cambiar contraseña | Administración | UI/API | PASS | E09 |
| UI-A11Y-03 | Foco inicial y navegación inversa en modal | Administración | UI | PASS | Chromium |
| UI-A11Y-04 | Cierre de modal con Escape | Administración | UI | FAIL | E09 |
| UI-AUTH-03 | Ortografía de etiqueta de contraseña | Anónimo | UI | FAIL | E01 |
| SEC-AUTH-01 | Limitación de intentos de login | Anónimo | API | FAIL | HTTP |
| SEC-AUTH-02 | Protección de tokens frente a JavaScript | Todos | Estática | FAIL | Código |
| CFG-DEPLOY-01 | Checklist Django de producción | Sistema | Configuración | FAIL | Comando |
| CFG-MIG-01 | Esquema de base actualizado | Sistema | Base de datos | FAIL | Comando |
| API-SCALE-01 | Paginación de listados | Roles autorizados | API | FAIL | Código |
| SEC-AUDIT-01 | Trazabilidad de mutaciones | Administración | API/datos | FAIL | Código |

## Índice de evidencias

| Código | Evidencia |
| --- | --- |
| E01 | [Login inválido y mensaje accesible](evidence/2026-08-28/01-login-invalid.png) |
| E02 | [Listado y búsqueda de paciente sintético](evidence/2026-08-28/02-patients-qa-filter.png) |
| E03 | [Expediente sintético](evidence/2026-08-28/03-patient-record.png) |
| E04 | [Consulta clínica sintética](evidence/2026-08-28/04-consultation-record.png) |
| E05 | [Odontograma versionado](evidence/2026-08-28/05-odontogram.png) |
| E06 | [Agenda diaria y cita sintética](evidence/2026-08-28/06-appointments-day.png) |
| E07 | [Ruta incompleta de usuarios](evidence/2026-08-28/07-users-placeholder.png) |
| E08 | [Ruta incompleta de clínicas](evidence/2026-08-28/08-clinics-placeholder.png) |
| E09 | [Diálogo sanitizado de gestión de staff](evidence/2026-08-28/09-staff-browser-flow.png) |

## Cobertura y limitaciones

- Se cubrieron todas las rutas y familias de endpoints publicadas encontradas en el código, además de roles y capacidades configurables.
- Los flujos críticos tuvieron comprobación de UI/renderizado y API; las mutaciones de staff se repitieron de extremo a extremo desde Chromium.
- La entrega real de correo no se probó contra SMTP: se validó solicitud, token válido, cambio, reutilización rechazada y login posterior por API.
- No se ejecutaron pruebas de carga, pentest activo, análisis de dependencias/CVE, recuperación de backups, fallo de red prolongado ni despliegue real.
- No se evaluaron móvil, Firefox o WebKit por exclusión expresa del plan.
- El único error de consola del recorrido principal fue la respuesta `400` esperada del login inválido; no hubo excepciones JavaScript ni solicitudes de UI fallidas inesperadas.

## Criterio de salida recomendado

No cargar datos clínicos reales hasta cerrar los seis P1, aplicar migraciones en staging y repetir esta matriz. Después deben pasar nuevamente Django, Vitest, Oxlint, build, `check --deploy`, prueba de restauración de backup y un smoke test contra la infraestructura de producción.

## Seguimiento de remediación — 2026-08-29

Esta sección no modifica los resultados históricos de la campaña del 28 de agosto. Registra la verificación posterior de sus seis P1:

| Defecto | Remediación implementada | Verificación posterior |
| --- | --- | --- |
| QA-DEF-001 | Configuración `base/development/test/production`, PostgreSQL, Redis, SMTP, S3-compatible, HTTPS/HSTS/CSP y CI. | `config.tests.test_settings`, `check --deploy`, Oxlint y build: PASS. |
| QA-DEF-002 | Migración `patients.0008` aplicada localmente y disciplina de migraciones en CI/runbook. | `makemigrations --check --dry-run` y `migrate --check`: PASS. |
| QA-DEF-003 | Validador compartido contra corrupción, checksum, formato engañoso y bombas de píxeles; lote atómico. | Suite documental y de avatares: PASS. |
| QA-DEF-004 | `AuditEvent` append-only, `X-Request-ID`, middleware transaccional para mutaciones y API administrativa filtrable. | Pruebas de inmutabilidad, permisos, redacción y rollback: PASS. |
| QA-DEF-005 | Refresh en cookie `HttpOnly`, access sólo en memoria, CSRF, rotación y límite absoluto de ocho horas. | Vitest y Chromium headless: recarga, rotación, cambio de contraseña y logout PASS; JWT ausentes de Web Storage. |
| QA-DEF-006 | Límite compartido por cuenta e IP, claves hash y cabeceras proxy no confiables ignoradas. | Pruebas por cuenta, IP, reinicio y spoofing: PASS. |

Resultado de regresión: **154/154 Django**, **134/134 Vitest**, Oxlint y build PASS. El smoke test Chromium no observó solicitudes fallidas ni respuestas `500`; el único `401` de consola fue el refresh inicial esperado sin cookie. El entorno y los datos sintéticos fueron eliminados al terminar.

Los P1 quedan cerrados a nivel de código. El criterio de salida conserva dos dependencias externas: aprovisionar staging con PostgreSQL/Redis/SMTP/S3 y ejecutar allí restauración de backup, migraciones y smoke test antes de cargar datos reales.

## Pulido inmediato del MVP — 2026-08-29

Esta segunda remediación cierra los P2/P3 observados en la campaña original sin añadir Google Calendar ni notificaciones:

| Defecto | Remediación implementada | Verificación posterior |
| --- | --- | --- |
| QA-DEF-007 | Contrato paginado común `{count, next, previous, results}` en pacientes, consultas, odontogramas, documentos, staff y citas; 25 elementos por defecto y máximo 100. La agenda recorre todas las páginas de su rango. | Pruebas de contrato Django, servicios, paginador compartido y navegación UI: PASS. |
| QA-DEF-008 | `/usuarios` redirige a la sección operativa de staff y `/clinicas` al perfil de clínica mediante parámetros persistentes en la URL. | Vitest y navegación directa en Chromium: PASS. |
| QA-DEF-009 | El diálogo de staff fija el foco inicial, contiene `Tab`, cierra con `Escape` y devuelve el foco al control de apertura. | Testing Library y Chromium con teclado: PASS. |
| QA-DEF-010 | Los métodos autenticados no soportados llegan al manejador DRF y responden `405`; los métodos soportados sin capacidad conservan `403`. | Pruebas focalizadas de permisos y método: PASS. |
| QA-DEF-011 | Se retiraron el botón de notificaciones, su sección de configuración y la búsqueda global no funcional. | Pruebas de ausencia y recorrido Chromium: PASS. |
| QA-DEF-012 | Login localizado, campos y metadatos en español, foco visible y presentación adaptable sin desbordamiento horizontal. | Vitest y viewport Chromium de 390×844: PASS. |

Además, el SVG con bitmap embebido fue sustituido por un vector nativo de 1.03 kB y la imagen de acceso pasó de PNG de 636.07 kB a WebP de 26.58 kB. El bundle de producción conserva esta última cifra y reserva dimensiones para evitar saltos de diseño.

Resultado de regresión del pulido: **159/159 Django**, **150/150 Vitest**, Oxlint, build, `makemigrations --check --dry-run`, `migrate --check` y `check` PASS. Chromium headless pasó en 390×844 y 1440×900 sin errores de aplicación, solicitudes fallidas inesperadas ni respuestas `500`; el `401` del intento de restaurar una sesión inexistente se mantuvo como resultado esperado. La base, credenciales, capturas y demás artefactos sintéticos se eliminaron al terminar.
