# Acceso y actividad privada

Estado del código: 3 noviembre 2026. La edición actual admite un propietario y miembros que entran mediante invitación; no es un SaaS con organizaciones ni una revisión de seguridad externa.

## Acceso actual

El propietario inicia sesión con `JOURNAL_PASSWORD`. En producción la autenticación multiusuario se activa por defecto; en desarrollo local puede activarse con `JOURNAL_MULTI_USER=true`. El modo hosted/producción exige contraseña. En una instalación local sin contraseña, las invitaciones no están disponibles.

El propietario puede invitar desde **Invitations** en el sidebar privado. El enlace tiene una sola aceptación y caduca en siete días. No se envía correo: el propietario copia el enlace y lo comparte manualmente. El enlace funciona como credencial de portador; la dirección de correo queda asociada y se muestra en el formulario, pero la persona no demuestra control de ese buzón. Cualquier persona que obtenga el enlace puede crear la contraseña de esa invitación. Envíalo por un canal privado y no lo publiques.

Cada miembro invitado crea una contraseña de al menos 12 caracteres. Se guarda derivada con scrypt y salt aleatorio. Los tokens de sesión se almacenan como hash, expiran en 24 horas y admiten hasta cinco sesiones activas por usuario. El propietario conserva una sesión firmada con `JOURNAL_PASSWORD` que expira a los 30 días. No hay restablecimiento de contraseña, segundo factor ni recuperación automática de cuenta.

Desde **User access**, el propietario puede crear y revocar invitaciones y activar o desactivar cuentas. Suspender bloquea nuevos accesos, revoca sesiones activas y conserva el journal del miembro. Reactivar permite volver a iniciar sesión; no restaura sesiones revocadas. La API protegida `/api/admin/users` también admite revocar sesiones sin suspender la cuenta.

## Aislamiento de datos

La base del propietario está en `JOURNAL_DATA_DIR/journal.db`. Cada miembro usa `JOURNAL_DATA_DIR/users/<user-id>/journal.db`; su journal, trades, cuentas, notas, configuración y adjuntos quedan en ese archivo separado. Las identidades, contraseñas derivadas, hashes de sesión, invitaciones y auditoría de acceso permanecen en la base del propietario. No hay espacios compartidos entre miembros ni roles personalizables: los roles efectivos son propietario y miembro.

El perfil de demostración pública, solo lectura, usa `JOURNAL_DATA_DIR/public-demo/journal.db` y datos sintéticos sembrados. El modo demo bloquea solicitudes HTTP de escritura; sus consultas se ejecutan en una base separada y nunca usan la base del propietario o de un miembro. Los directorios de usuario y demo reciben permisos restrictivos en POSIX; los tres tipos de base permanecen en el mismo directorio de datos/volumen operativo.

Esto ofrece separación por archivo SQLite por miembro dentro de una sola instalación. No implementa organizaciones/tenants SaaS, carpetas compartidas, cuotas de almacenamiento, ni separación de recursos de infraestructura. Para un despliegue hosted, configurar contraseña, clave de cifrado, origen HTTPS y proxy de confianza.

## Copias de seguridad

**Settings → Data & backups → Full backup (JSON)** sigue exportando solo el journal correspondiente a la sesión activa. Para un snapshot operacional completo, hay comandos CLI que comprimen y cifran todas las bases SQLite y archivos de `JOURNAL_DATA_DIR`, incluidos propietario, cada miembro, demo, adjuntos BLOB y `.secret` si existe. SQLite se copia con su backup API y cada archivo restaurado pasa `PRAGMA quick_check`. La restauración solo escribe en una ruta nueva y verifica las bases antes de terminar.

Detén la app antes del backup para que las bases de owner, miembros y demo representen una ventana coherente. Usa un `JOURNAL_BACKUP_PASSPHRASE` único de al menos 20 caracteres, guardado en un gestor de secretos, y almacena el `.tbjbackup` fuera del host en un destino con acceso restringido. Los snapshots temporales en claro se crean dentro del mismo `JOURNAL_DATA_DIR` local, con permisos POSIX 700/600, y se borran al terminar; usa un volumen cifrado porque borrar archivos no garantiza un borrado físico seguro ni elimina snapshots del sistema de archivos. El archivo incluye `.secret` si se generó. Si se usa `JOURNAL_SECRET`, ese valor también debe recuperarse del gestor de secretos. La contraseña del propietario, el token del proxy y el origen público siguen siendo configuración externa.

```sh
JOURNAL_BACKUP_PASSPHRASE="$BACKUP_PASSPHRASE" pnpm backup -- --confirm-app-stopped /secure-backups/bauhaus-YYYYMMDD.tbjbackup
JOURNAL_BACKUP_PASSPHRASE="$BACKUP_PASSPHRASE" pnpm restore -- /secure-backups/bauhaus-YYYYMMDD.tbjbackup /var/lib/bauhaus/data-restored
```

El destino restaurado debe ser nuevo y quedar fuera del `JOURNAL_DATA_DIR` actual. Antes de usarlo, configura los secretos externos originales y planifica el cambio con la app detenida. Los comandos se pueden ejecutar manualmente; aún no existe calendario, rotación ni destino off-host configurado. El backup del volumen de Compose sigue siendo responsabilidad de operaciones.

## Actividad y direcciones IP

La captura de IP se activa al configurar `JOURNAL_PROXY_TOKEN`. El backend exige el token del proxy y luego lee `X-Journal-Client-IP`; no confía en `X-Forwarded-For` enviado directamente por el cliente. La plantilla Caddy sobrescribe ambas cabeceras y toma la dirección desde `remote_host`. Si hay CDN u otro proxy antes de Caddy, `remote_host` puede identificar solo ese proxy: configurar una política de proxy confiable antes de habilitar captura. En modo hosted, las solicitudes Node requieren el proxy configurado; en modo local, una petición sin IP confiable simplemente no registra evento.

La IP se guarda cifrada con AES-GCM y se usa un HMAC para correlación. Los eventos guardan tipo, estado HTTP, actor y marca de tiempo; no se guardan contraseñas, tokens, cuerpos, query strings, user-agent ni URLs completas. Las entradas de invitación y actividad usan la base del propietario, no la DB privada de cada miembro. Las peticiones rechazadas antes de llegar al handler Node pueden quedar fuera de este registro y requieren logs de ingress con una política equivalente.

El registro limita a 20 eventos por IP/minuto y 50.000 filas. La vista de actividad informa diez o más fallos por fuente en diez minutos; es una señal de revisión, no un bloqueo automático. La retención lógica es de siete días. Con `JOURNAL_PROXY_TOKEN` configurado, el proceso limpia filas cada hora y al arrancar; una lectura o escritura también purga filas vencidas. Con el servidor apagado no hay temporizador, y WAL, páginas libres, snapshots y backups pueden conservar ciphertext anterior. No prometer borrado físico instantáneo.

Este mecanismo es local al proceso/SQLite: no es un rate limiter distribuido ni un servicio de logs de alta disponibilidad. No se configuraron backups cloud. Las plantillas Docker y Caddy deben validarse en staging; su existencia no equivale a un despliegue realizado ni a una certificación de seguridad.

## Reportes de soporte

Los miembros pueden enviar un reporte desde **Support**. El reporte conserva la cuenta, categoría, asunto, descripción escrita por la persona, ruta de página y fechas; no adjunta automáticamente trades, notas, capturas, contraseñas ni información de pago. Los reportes se guardan en la base del propietario; cada miembro solo puede consultar los suyos. El propietario puede responder y cambiar el estado en **Support & errors**. La respuesta aparece en Support cuando el miembro vuelve a abrirlo; no se envía correo.

Esta bandeja recibe problemas reportados por usuarios. Al enviar un reporte, el miembro puede incluir la referencia de error que vio en la interfaz; algunos fallos de API rellenan ese campo automáticamente. La referencia se guarda en la pestaña por diez minutos y el servidor solo acepta una referencia generada para la misma cuenta. Los eventos técnicos conservan una ruta API reducida, método, tipo de cuenta, hash del ID interno y hora; nunca guardan mensaje, stack, query, cuerpo de la petición ni datos del journal. La purga se ejecuta al consultar la lista o registrar otro error, con un máximo de 20.000 filas; la retención es de hasta 30 días, no una garantía de borrado a una hora exacta. El panel muestra los fallos inesperados de API de propietario y miembros autenticados; el contador resume siete días y la lista muestra hasta 30. No captura errores anónimos, la demo, respuestas 4xx, errores de renderizado del navegador ni excepciones que Next.js no entregue al wrapper de API. No hay alertas externas ni almacenamiento de alta disponibilidad. El registro de actividad anterior sigue limitado a eventos de seguridad y requiere un proxy confiable para capturar IP.
