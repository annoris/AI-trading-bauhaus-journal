# Bauhaus: datos y seguridad para el piloto y el crecimiento

Revisión: 3 noviembre 2026. Este documento separa la edición actual de piloto privado del diseño futuro para cientos de usuarios. Las plantillas de despliegue no prueban que exista un servicio remoto desplegado.

## Situación actual comprobada

La app es un monolito modular Next.js con SQLite y Drizzle. El propietario inicia sesión con `JOURNAL_PASSWORD`; el modo multiusuario de producción usa invitaciones de un solo uso, miembros con contraseñas derivadas con scrypt y sesiones opacas con hash. La base del propietario contiene identidades, invitaciones y actividad de acceso. Cada miembro tiene un archivo SQLite separado bajo `users/<user-id>/journal.db`; la demo pública tiene otro en `public-demo/journal.db`. El middleware y los handlers seleccionan el contexto de base en servidor.

La separación actual es por archivo SQLite dentro de una sola instalación y un volumen operativo. No hay `user_id` en cada fila del journal ni aislamiento entre procesos/servidores; no se debe describir como SaaS multi-tenant ya validado. Las pruebas A/B actuales ejercitan handlers reales para cuentas, exportaciones, adjuntos, soporte, credenciales de proveedores, suspensión de sesiones y escrituras de demo. Aún falta cubrir todas las APIs y ejecutar esa matriz en staging. La demo usa una base separada y sus escrituras se bloquean en middleware y handlers.

Las invitaciones se comparten manualmente como enlaces bearer de un solo uso que caducan; todavía no verifican propiedad del correo. No hay recuperación de contraseña ni MFA. Existe una bandeja de soporte y un registro local, depurado, de fallos de API autenticados; no hay captura de errores del navegador ni alertas externas. Las claves de IA y mercado definidas en el entorno del servidor solo están disponibles dentro del journal del propietario en modo multiusuario; cada miembro necesita credenciales propias. No hay sistema de suscripciones para cobrar por Bauhaus.

Hay plantillas Docker/Caddy para un preview privado. No se verificó una instalación remota, HTTPS real, proxy, almacenamiento persistente, backup fuera del host ni restauración en staging. La capacidad para grupos de cientos de usuarios no se ha medido.

La estimación local previa de 169 trades, 368 ejecuciones, un adjunto y dos datasets solo describe una instantánea antigua de desarrollo; no se debe usar para dimensionar una instalación actual o proyectar costes.

## Volumen y capacidad

300 × 50 = 15.000 trades diarios. 22 sesiones/mes = 330.000 trades/mes; 252 sesiones/año = 3.780.000 trades/año. Si operan 365 días, son 5.475.000. Un trade puede tener varias ejecuciones, anotaciones y comprobaciones de reglas.

Presupuesto orientativo, no medición: si trade + ejecuciones + índices promedian 2–5 KB, 3,78 millones representan aproximadamente 7,56–18,9 GB/año, sin adjuntos, notas extensas, WAL ni backups. Medir con una carga representativa antes de contratar capacidad. Una captura de 1 MB por trade representa 330 GB/mes: las imágenes dominan el coste. Fuera de PostgreSQL siguen ocupando espacio y tienen coste; separarlas no elimina esos bytes.

## Arquitectura actual y evolución recomendada

Para el piloto privado, conservar Next.js modular y una base SQLite por miembro reduce el riesgo de mezclar journals mientras se valida el producto con pocas cuentas. Completar primero backup/restore cifrado, staging, observabilidad, políticas de soporte y pruebas de aislamiento. Medir tamaño, consultas, concurrencia, adjuntos e importaciones con datos piloto antes de decidir una migración.

Si el uso real llega a cientos de usuarios o varias instancias, evaluar una arquitectura compartida con PostgreSQL, aislamiento de filas y objetos privados para adjuntos. No migrar solo por una proyección genérica ni asumir que una base por miembro o por proceso escalará sin medición.

### Diseño futuro para escala

La propuesta futura es una aplicación Next.js en contenedor, PostgreSQL con aislamiento de filas, almacenamiento de objetos privado para adjuntos/archivos importados y workers para importaciones/estadísticas. No está implementada ni desplegada. No crear un servidor por usuario ni partir tablas sin evidencia de que haga falta.

Cada recurso privado lleva `user_id NOT NULL`. Usar una identidad individual obtenida de una sesión verificada en servidor, nunca confiar en un `user_id` enviado por el navegador. La autenticación deberá migrar a un proveedor o librería mantenida, con contraseñas hasheadas apropiadamente, recuperación, sesiones revocables y MFA donde corresponda.

RLS en PostgreSQL como segunda barrera: `ENABLE ROW LEVEL SECURITY` y `FORCE ROW LEVEL SECURITY`, políticas `USING` y `WITH CHECK`, rol de aplicación sin superusuario ni `BYPASSRLS`. Roles de migración separados. Establecer el contexto de usuario en cada transacción, con `SET LOCAL`/`set_config(..., true)` y valores parametrizados, antes de cualquier consulta. No persistir contexto de usuario en conexiones del pool entre peticiones. RLS no sustituye la autorización de la API ni protege frente al robo de credenciales de servidor.

Relaciones compuestas `(user_id, account_id)` → `(user_id, id)` evitan que una fila propia apunte a una cuenta ajena. Aplicar el mismo control a trades, ejecuciones, journal, notebook, rutinas, plantillas, reglas, prop firms, recibos, adjuntos, settings, proveedores, importaciones, exportaciones y trabajos en segundo plano. Enlazar las claves antiguas de trades preservando anotaciones, reglas y adjuntos; comprobar colisiones y transferencias.

Índices según consultas: `(user_id, closed_at DESC, id)`, `(user_id, account_id, closed_at DESC, id)` y claves de deduplicación por propietario, broker y ejecución. Guardar dinero con enteros en unidades menores o NUMERIC, timestamps con zona y atributos estructurados en columnas; JSONB solo para datos variables. Evitar índices redundantes.

## Reducir espacio y carga

- Guardar PNG/JPEG/WebP/PDF en objetos privados; PostgreSQL solo conserva propietario, clave aleatoria, tipo validado, bytes, hash y fechas. Derivar miniaturas con un worker; conservar el original según política. Nunca publicar el bucket ni URLs permanentes.
- Deduplicar importaciones con identificador del broker/hash, sin borrar ejecuciones legítimamente iguales. Archivos originales comprimidos en objetos con retención configurable; no conservar indefinidamente snapshots JSON completos repetidos.
- Compartir velas públicas por proveedor, contrato, mercado, resolución, timestamp y ajuste de precios, cuando la licencia lo permita. No compartir datasets privados subidos por usuarios. No confundir NQ con sus contratos/rollovers ni precios ajustados con reales.
- Consultas paginadas por cursor, filtros por fecha, agregados diarios por usuario/cuenta/moneda y actualizaciones incrementales. Los resúmenes no reemplazan el historial original ni mezclan monedas. Invalidar al editar o borrar un trade.
- Importar en lotes en un worker con idempotencia, backpressure, límites por usuario y cuotas de archivos/almacenamiento. Usar pool limitado; no iniciar una conexión por trade.
- Mantener el historial financiero consultable. Archivo y eliminación solo con política de retención y consentimiento adecuados. Particionado mensual únicamente cuando tamaño/planes de ejecución lo justifiquen; millones de filas no lo exigen por sí solos.
- Cachear con claves que incluyen propietario y permisos; no servir un resultado privado de un usuario a otro. Velas públicas pueden usar cache compartida.

## Controles presentes en el código

El modo hosted/producción falla cerrado si falta la contraseña del propietario; el modo `hosted` requiere además `JOURNAL_SECRET` de al menos 32 caracteres, `JOURNAL_PROXY_TOKEN` de al menos 32 caracteres y `JOURNAL_PUBLIC_ORIGIN` HTTPS válido. La plantilla Caddy establece la IP del cliente y el token de proxy. La plantilla requiere validación en staging para confirmar que el proxy real no acepta cabeceras falsificadas.

Los miembros usan credenciales individuales y sus propias bases; suspenderlos revoca sesiones activas. Las cookies son HttpOnly/SameSite; en modo hosted se añade Secure. Las escrituras validan origen y las contraseñas de proveedor guardadas se cifran con AES-256-GCM. Si no se configura `JOURNAL_SECRET`, una clave `.secret` queda en el directorio de datos: proteger/respaldar el directorio completo, o configurar y conservar la clave externa.

La API oculta detalles de excepciones y puede emitir referencias de error sin cuerpos, query strings, mensajes internos o contenido del journal. La vista es local, de retención limitada y sin alertas/alta disponibilidad. Cabeceras de seguridad y CSP limitada están configuradas; la CSP no constituye una revisión XSS completa. Ver [acceso y actividad](access-and-activity.md) para límites actuales.

## Controles pendientes antes de clientes reales

Ampliar las pruebas A/B actuales a cada API, recurso, exportación, sesión y tarea en segundo plano; repetirlas en staging y validar que ningún flujo de demo accede a bases privadas. La separación SQLite por archivo no sustituye la autorización ni un examen de todos los límites de datos.

Verificar HTTPS, cookies Secure, proxy de confianza, límites reales de cuerpo, persistencia, cuotas y proceso de recuperación en un staging aislado. Añadir verificación de correo, recuperación de cuenta y MFA según necesidad del piloto. Planear límites de abuso compartidos y alertas antes de ampliar acceso.

Credenciales de broker/API cifradas con claves externas al servidor/base/backups, idealmente un gestor de secretos/KMS. Ya existe AES-GCM local; la clave de fallback junto a la base no protege frente al robo del directorio completo. Nunca enviar secretos a componentes cliente, NEXT_PUBLIC_, logs o exports. Revisar SSRF en URLs de proveedores e importadores, restringir egress y bloquear redes internas/metadata.

Archivos: validar firma/tamaño, nombre seguro, cuotas, detección de malware en cuarentena, acceso solo tras autorización y enlaces firmados breves. Revisión XSS de notas, HTML y PDF; dependencias actualizadas, CSP completa probada sin romper herramientas. La comprobación actual de tamaño declarado no sustituye un límite de cuerpo real en el servidor/proxy.

Base en red privada sin puerto público, roles mínimos, usuario de contenedor no root, disco persistente, backups cifrados separados, recuperación point-in-time y simulacro de restauración. Medir CPU/RAM/latencia y crecimiento con 15.000 trades/día, ráfagas de importación y 300 sesiones activas; no prometer capacidad por el número de usuarios solamente.

## Publicación

Hostinger VPS con Docker es una opción compatible con la plantilla disponible; no se ha contratado, configurado ni desplegado. Antes de invitar a un grupo piloto, verificar dominio + HTTPS, proxy, variables secretas, volumen persistente, reinicio, copia fuera del host y restauración. Mantener staging con datos ficticios separado de producción. El volumen de Compose no es un backup.

## Migración sin perder datos

1. Backup consistente con SQLite backup API, checksum y restauración ensayada; no copiar solo journal.db con WAL activo.
2. Crear PostgreSQL y esquema nuevo en staging; vincular datos actuales a un propietario explícito.
3. Adaptar todas las consultas y jobs a contexto autenticado; trasladar archivos manteniendo relaciones. Comparar conteos, hashes, P&L y saldos por cuenta/moneda/fecha.
4. Probar aislamiento, roles RLS y pool reutilizado, concurrencia, importaciones y recuperación.
5. Corte con ventana de escritura controlada y plan de rollback; liberar acceso de clientes solo después de validación.

## Fuentes oficiales

- PostgreSQL RLS: https://www.postgresql.org/docs/17/ddl-rowsecurity.html
- PostgreSQL particionado: https://www.postgresql.org/docs/current/ddl-partitioning.html
- OWASP multitenancy: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
- OWASP autorización: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP sesiones: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP CSRF: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- Hostinger Docker deployment: https://github.com/hostinger/deploy-on-vps/blob/main/README.md

## Alternativa Oracle Cloud

Oracle Cloud Infrastructure también permite esta arquitectura: VM para la app/worker, PostgreSQL privado (administrado o autogestionado) y Object Storage privado. Oracle Cloud no obliga a usar Oracle Database; cambiar a ese motor implicaría otra adaptación del código. Evaluar región, disponibilidad, costes de PostgreSQL administrado, objetos, backups y tráfico. No asumir que el servicio PostgreSQL administrado está incluido en Always Free. Las instancias Compute Always Free inactivas pueden ser recuperadas por Oracle; no basar disponibilidad comercial exclusivamente en esa modalidad.

Fuentes: https://www.oracle.com/cloud/postgresql/ y https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

## Historial de verificación

Verificación local del 3 noviembre 2026: 620 pruebas aprobadas; typecheck, Prettier, seguridad de límites, verificador de backup/restauración y build de producción aprobados; `pnpm audit` no encontró vulnerabilidades conocidas. Esto cubre el código de esta revisión, no equivale a un pentest externo ni valida infraestructura cloud, staging, correo o recuperación fuera del host.
