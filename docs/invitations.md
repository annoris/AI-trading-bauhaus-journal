# Invitaciones privadas de un solo uso

Estado del código: 3 noviembre 2026. Las invitaciones y la aceptación por enlace están implementadas para un propietario y miembros con journals separados. No hay envío de email ni verificación del buzón.

## Flujo actual

1. Configura `JOURNAL_PASSWORD` e inicia sesión como propietario. En producción el modo multiusuario está activado por defecto; en local se puede activar con `JOURNAL_MULTI_USER=true`. Sin contraseña del propietario, la emisión y aceptación de invitaciones no están disponibles.
2. Abre **Invitations** desde el sidebar privado, introduce el correo que quieres asociar y crea un enlace válido durante siete días.
3. Copia el enlace y compártelo manualmente por un canal privado. La app no envía emails.
4. El invitado abre `/accept-invitation`, ve el correo asociado y crea una contraseña de al menos 12 caracteres. La invitación se consume una sola vez y se inicia su sesión.

El enlace contiene un token aleatorio de 256 bits en el query string `?token=...`. La base almacena solo el hash SHA-256; el token en claro se devuelve una sola vez al propietario y aparece en el enlace que copia. Trátalo como una contraseña: quien tenga el enlace puede aceptar la invitación. El token también puede quedar en el historial del navegador o en logs de infraestructura que guarden URLs completas. No lo incluyas en tickets, capturas ni canales públicos; los logs de proxy/APM no deben guardar query strings de invitación.

El correo está vinculado y normalizado, pero no se verifica contra un buzón. El invitado no tiene que demostrar que controla esa dirección: el endpoint de aceptación recupera el email desde la invitación y asigna una contraseña a quien presente el token. Comparte el enlace directamente con la persona destinataria. Una futura verificación real requiere proveedor de correo, comprobación de buzón, límites contra abuso y una transacción que consuma solo una prueba de verificación emitida en servidor.

## Datos y permisos

Los registros de invitación, usuarios, hashes de contraseña y sesiones se guardan en la base del propietario `JOURNAL_DATA_DIR/journal.db`. Cada invitado recibe una base privada independiente en `JOURNAL_DATA_DIR/users/<user-id>/journal.db`; no comparte sus trades, notas, cuentas ni ajustes con otros miembros o con el propietario. No es una organización con carpetas compartidas, roles configurables o aislamiento SaaS.

El propietario puede listar, crear y revocar invitaciones, y suspender/reactivar miembros desde **User access**. `/api/admin/users` también permite revocar sesiones sin suspender la cuenta. Reactivar no restablece las sesiones revocadas. Suspender conserva los datos del miembro.

El enlace de invitación es distinto del perfil público `/demo`. La demo es de solo lectura, usa datos ficticios y su propia base `JOURNAL_DATA_DIR/public-demo/journal.db`; nunca contiene los datos del propietario ni de los miembros.

## Límites y controles

- El formulario crea enlaces con TTL de siete días; el servicio admite de una a 168 horas. Una invitación no se puede duplicar mientras siga pendiente para el mismo correo y se puede revocar sin borrar su historial.
- Emisión limitada a 10 por hora, 50 por día y 50 invitaciones pendientes. El historial visible incluye como máximo las últimas 100.
- La aceptación cuenta hasta 100 intentos globales por ventana de cinco minutos en una fila SQLite. No es rate limiting distribuido y no reemplaza controles de abuso por IP.
- La creación del usuario y el consumo del token ocurren en la misma transacción SQLite inmediata. El token solo puede aceptarse una vez.
- Las contraseñas de miembros requieren 12 caracteres como mínimo y se derivan con scrypt y salt aleatorio. El token de sesión se guarda como hash; vence a las 24 horas y cada usuario admite hasta cinco sesiones activas.
- No hay envío de invitación, verificación de email, restablecimiento de contraseña, MFA, suspensión automatizada, cuotas de uso ni una plataforma de organizaciones.
- El Full backup JSON corresponde al journal de la sesión activa, no a los demás usuarios o a la demo. Para snapshots completos cifrados, detener la app y usar `pnpm backup -- --confirm-app-stopped <archivo.tbjbackup>`; restaurar en una ruta nueva con `pnpm restore -- <archivo.tbjbackup> <directorio-nuevo>`. El archivo contiene `.secret` si existe. Conserva `JOURNAL_SECRET` y los secretos de acceso en un gestor separado. Todavía no hay una agenda automática ni un destino off-host configurado.

## Rutas actuales

- `GET/POST/DELETE /api/invitations`: listan, crean y revocan; exigen sesión de propietario y modo multiusuario habilitado.
- `GET /api/invitations/validate?token=...`: valida un enlace vigente y devuelve el correo asociado.
- `POST /api/invitations/redeem`: acepta el token y la contraseña nueva, crea el usuario y emite una sesión.
- `GET/PATCH /api/admin/users`: lista miembros y permite `suspend`, `reactivate` y `revoke-sessions`; solo el propietario puede usarlo.

El registro es por invitación, no un formulario abierto de creación de cuentas. Estos controles reducen acceso casual, pero un token compartido de forma insegura permite que otra persona acepte esa invitación.
