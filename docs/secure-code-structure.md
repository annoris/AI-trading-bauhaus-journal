# Estructura y preparación de Bauhaus

Estado del documento: 3 noviembre 2026. La edición actual admite acceso del propietario e invitaciones con una DB SQLite separada por miembro; esto no la convierte en un SaaS con organizaciones ni es una certificación de seguridad.

## Decisión de arquitectura

Mantener el monolito modular Next.js; no introducir microservicios sin una necesidad medida. Los controles se ejecutan en el servidor. HTML/JS/rutas que recibe un navegador son observables; no deben contener claves o permisos decisivos. Una interfaz oculta no es una barrera de seguridad.

Estructura actual organizada:

```text
apps/web/src/
  app/                       páginas y adaptadores HTTP
    api/                     validación de entrada → servicio → respuesta
  components/                presentación; sin acceso a base/secretos
  lib/                       utilidades compartidas, tipos y hooks sin secretos
  server/
    security/
      auth.ts                firma, validación y expiración de sesiones locales
      request.ts             origen de escrituras y límite de login local
      http.ts                guard API, errores y respuestas privadas
    auth.ts                  re-export compatible
    api.ts                   re-export compatible
    request-security.ts      re-export compatible
    market-data/             proveedores y transporte limitado
    settings.ts              configuración y secretos cifrados locales
    ...                      lógica existente, pendiente de separar por dominios
  db/                        esquema SQLite actual y acceso exclusivo de servidor
packages/
  core/                      cálculos puros de trading
  importers/                 parsers de formatos
scripts/
  check-security-boundaries.mjs
  benchmark-journal.py
deploy/
  compose.preview.yml        preview privada por invitación, SQLite en volumen persistente
  Caddyfile.example          HTTPS frontal y límite de cuerpos
```

No mover todos los archivos por estética: mantener imports compatibles y aislar primero las responsabilidades sensibles. El frontend sigue igual.

## Escalado posterior para organizaciones/SaaS

El modelo por invitación y la DB separada por miembro ya existen. El diseño siguiente es una posible evolución para organizaciones con datos compartidos y despliegue SaaS; no describe capacidades actuales.

```text
server/
  security/                  identidad, sesión, autorización, cuotas y auditoría
  modules/
    accounts/                servicios y repositorios de cuentas y credenciales
    trading/                 trades, ejecuciones, importación y deduplicación
    journal/                 notas, carpetas, plantillas y adjuntos
    discipline/              rutinas y verificaciones
    prop-firms/              fases, gastos, pagos, recibos y auditoría
    analytics/               agregados, filtros y exportación por propietario
    integrations/            brokers, IA y proveedores externos
  storage/                   objetos privados y firmas temporales
  jobs/                      workers con propietario e idempotencia
  db/                        PostgreSQL, transacciones, migraciones y RLS
```

Para esa evolución, el contrato seguirá siendo `ruta → validar → autenticar → autorizar recurso → servicio → repositorio con propietario → respuesta pública mínima`. La identidad debe derivarse de la sesión y jamás de un campo enviado por el navegador. Incluso si un atacante conoce el ID de un recurso ajeno, la consulta debe rechazarlo. Usuarios normales sin privilegios de migración ni bypass de RLS.

Para cada dominio, el repositorio recibe contexto de usuario verificado. La autorización abarca consultas, mutaciones, archivos, settings, exportaciones, jobs y cache. No basta añadir user_id a trades: reglas, notas, proveedores y rutinas también necesitan propietario. RLS, políticas de escritura y relaciones compuestas aportan una segunda barrera.

## Hallazgos y acciones

| Área           | Situación                                                                                                                   | Acción                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidades    | Propietario con `JOURNAL_PASSWORD`; miembros por invitación con contraseña propia, sesión revocable y control de suspensión | Añadir verificación de buzón y recuperación/MFA si se requieren; no hay email automático                                                       |
| Datos          | DB del propietario, DB distinta por miembro y DB pública de demo de solo lectura                                            | Para organizaciones compartidas, diseñar pertenencia/roles por tenant y migrar a PostgreSQL con propietario en todas las tablas privadas y RLS |
| Consultas      | queryTrades filtra y convierte muchos registros en memoria                                                                  | Paginación y agregados por fecha/cuenta/usuario; conservar semántica de zona horaria y moneda                                                  |
| Adjuntos       | BLOB dentro de SQLite, validación de firma y 8 MB                                                                           | Objetos privados, cuarentena, cuotas y enlaces temporales autorizados                                                                          |
| IA             | Credenciales backend cifradas; claves de entorno solo owner en multi-user                                                   | Confirmar consentimiento, límites de gasto, timeout y datos enviados al proveedor en cada flujo                                                |
| Market data    | URLs fijas por proveedor; redirects rechazados, cache limitada                                                              | Conservar destinos controlados; no añadir URL arbitraria sin política egress/SSRF; datasets privados separados                                 |
| Secretos       | Clave de fallback junto a datos                                                                                             | Para nube, clave persistente separada, backups independientes; evitar variables públicas                                                       |
| Copias         | CLI manual cifra snapshots consistentes de `JOURNAL_DATA_DIR` y verifica restauración SQLite                                | Configurar retención cifrada off-host, custodia separada de secretos y simulacro completo en staging                                           |
| Auth/HTTP      | Seguridad antes repartida en tres archivos                                                                                  | Centralizada en server/security con entradas compatibles y pruebas                                                                             |
| Dependencias   | Audit inicial reportó 19 avisos (2 críticos)                                                                                | Corregido: Next.js 15.5.27, PostCSS 8.5.26, source-map-js 1.2.2 y undici 7.29.1. Audit de producción posterior: 0 avisos conocidos             |
| Contenedor     | Usuario node no root ya existente                                                                                           | Preparado compose preview con filesystem de solo lectura, sin capacidades, sin privilegios nuevos y puerto loopback                            |
| Paquete Docker | Ya excluía datos y .env                                                                                                     | Añadidas exclusiones de outputs, backups, claves y artefactos de compilación                                                                   |
| Public assets  | Landing con imágenes de demostración                                                                                        | En producción solo marketing aprobado; nunca copiar journal/adjuntos/credenciales a public                                                     |

Los avisos de dependencias indican versiones afectadas, no prueban explotación de esta instalación. El parche se realiza sin cambiar a una versión mayor de Next.js.

## Comprobaciones automáticas

`pnpm security:check` inspecciona imports locales estáticos/dinámicos literales, ignora imports solo de tipos, recorre dependencias de entradas `use client` y falla si alcanzan `server/` o `db/`. Detecta nombres de variables públicas de secretos y exports API de variables que evitan el wrapper común. No cubre código generado, paquetes externos, imports calculados ni todos los estilos posibles de exportación; no es un pentest ni un scanner de secretos completo.

Antes de cada publicación: security:check, suite de pruebas, build y audit de dependencias. En SaaS además pruebas con usuarios A/B y jobs/pool reutilizados; exportación y adjunto ajeno deben fallar, incluso con IDs válidos. Probar restauración y migración antes de modificar producción.

## Despliegue previo a SaaS

`deploy/compose.preview.yml` es una preview privada de un solo host, con owner y miembros por invitación en bases SQLite separadas. Requiere contraseña, clave de cifrado y origen público. Expone solo 127.0.0.1:3000; el proxy HTTPS del host publica 443. El volumen `journal_data` mantiene la DB del owner, las DB de `users/` y la DB pública de `public-demo/` entre recreaciones del contenedor. Compose no configura copias fuera del host; `docker compose down -v` elimina el volumen. Este despliegue no proporciona aislamiento SaaS entre organizaciones.

La plantilla Caddy limita cuerpos a 10 MB: coordinar importaciones grandes con límites de aplicación antes de habilitarlas. No abrir puertos DB. Sin Docker disponible en este entorno no se ha probado la imagen/compose en ejecución; verificar en staging, incluido permiso de volumen, tmpfs, recuperación y health checks. No se activaron configuraciones cloud ni se generaron contraseñas del usuario.

Plan completo de crecimiento y migración: [hosted-data-security-plan.md](hosted-data-security-plan.md).

## Orden de trabajo para una oferta SaaS

1. Configurar backup/retención off-host y ensayar restauración completa en staging aislado; los comandos cifrados manuales ya están implementados y verificados localmente.
2. Identidad individual y matriz de permisos.
3. PostgreSQL, propietarios, relaciones y RLS; migrar con conteos/hashes y P&L comparados.
4. Repositorios por dominio y autorización en cada ruta/job/cache.
5. Objetos privados, cuotas, importaciones en worker y estadísticas incrementales.
6. Sesiones revocables, límites compartidos, observabilidad sin secretos y alertas.
7. Prueba de carga y revisión de seguridad externa; publicación gradual y seguimiento.

El producto actual puede dar acceso a miembros invitados con DB separada; este orden aplica a una oferta SaaS con organizaciones y recursos compartidos. No hay envío de invitaciones por email: el propietario comparte los enlaces manualmente. La página de invitaciones no verifica control del buzón, y el enlace es una credencial de portador. La demo pública es read-only, sintética y separada en `JOURNAL_DATA_DIR/public-demo/journal.db`.

## Resultados históricos de preparación (octubre de 2026)

Seguridad centralizada sin romper los imports existentes. La comprobación de límites de frontend/backend se ejecuta automáticamente con `pnpm build` y en la construcción Docker. Se actualizó Next.js a 15.5.27 y Vitest a 4.1.11, con versiones corregidas de dependencias transitivas fijadas en pnpm-workspace.yaml y lockfile actualizado.

Verificación final: 583 pruebas en 63 archivos aprobadas con Vitest 4.1.11; build de producción aprobado; auditoría completa (producción y desarrollo) con 0 avisos conocidos en la fecha de revisión. La detección de imports revisó 225 archivos y 93 entradas cliente. Estos resultados no reemplazan pruebas de aislamiento multiusuario ni revisión de infraestructura. Docker no está instalado aquí: las plantillas de contenedor/proxy requieren validación en staging antes de usarlas.

Invitaciones privadas de un solo uso y sus límites: [invitations.md](invitations.md). El registro es solo por enlace invitado, no abierto.

Control actual de suspensión, sesiones, aislamiento por DB e IP privada: [access-and-activity.md](access-and-activity.md). Las cifras de pruebas anteriores son históricas y no verifican por sí solas los cambios posteriores.
