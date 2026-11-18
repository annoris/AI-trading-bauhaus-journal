# Revisión independiente de lógica y seguridad

**Revisión histórica: 13 octubre 2026.** Esta evaluación describe el estado de aquel día y no debe leerse como inventario actual. La revisión original fue de solo lectura; las correcciones mencionadas se aplicaron y verificaron en esa edición. No se transmitieron secretos, datos del journal ni correos a terceros. No se publicó el proyecto.

**Actualización: 3 noviembre 2026.** El código ahora tiene invitaciones individuales, DB SQLite independiente por miembro y demo, suspensión/reactivación, soporte privado, referencias depuradas de errores del servidor y backup/restauración cifrados manuales. La verificación integral de aislamiento A/B/demo sigue en curso; no hay verificación de email, recuperación/MFA, agenda off-host ni staging remoto comprobado. Para el estado vigente, consulta [launch-roadmap](launch-roadmap.md) y [access-and-activity](access-and-activity.md).

## Alcance

Autenticación, middleware, guard HTTP, invitaciones, control preparado de usuarios/sesiones, confianza en IP del proxy, retención y límites de actividad, Docker/proxy, imports frontend/backend; además revisión acotada de importación/deduplicación, edición masiva, transferencia/borrado de cuentas, reconstrucción de round trips, referencias de adjuntos/notas/reglas y balances de gastos/recibos de prop firms. No fue una revisión exhaustiva de cada función ni un pentest contra infraestructura publicada.

## Hallazgos corregidos

| Hallazgo                                                     | Corrección                                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Docker básico publicaba puerto sin protección obligatoria    | Loopback y credenciales obligatorias; modo hosted valida configuración y proxy                                |
| Cookie sin Secure detrás de HTTPS terminado en proxy         | Política derivada del origen público configurado                                                              |
| Un cliente agotaba el límite global de login                 | Buckets por IP confiable, HMAC en memoria y límites de cardinalidad/circuito                                  |
| Login parseaba cuerpos sin tamaño máximo                     | Lectura en streaming con máximo 2 KB                                                                          |
| Registro de IP derivaba claves con scrypt por evento         | Cache de clave por configuración/proceso                                                                      |
| Middleware impedía registrar rechazos de API                 | Autenticación API delegada al guard común Node; páginas siguen protegidas                                     |
| Transferencia perdía referencias y podía quedar parcial      | Una transacción inmediata para mover/reconstruir/remapear; adjuntos, checks, notas y estimaciones conservados |
| Posiciones del destino podían fusionarse silenciosamente     | Rechazo y rollback si no hay correspondencia exacta de ejecuciones                                            |
| Bulk aceptaba etiquetas/playbooks inválidos                  | Validación consistente de tipos, longitudes, cantidad y existencia; updates en transacción                    |
| Referencias polimórficas quedaban huérfanas al borrar trades | Limpieza de blobs/checks; notas conservadas con ancla anulada; deletes de ejecuciones en lotes y transacción  |

Las cachés de estimaciones transferidas conservan su fingerprint original; se invalidan si cambia el contexto financiero. No se recalculan ni presentan estimaciones antiguas como verificadas para otra moneda/reconstrucción. No se transfirieron ni borraron trades reales durante estas pruebas.

## Límites que detectó la revisión de octubre (estado histórico)

En octubre estaban pendientes el acceso individual, el aislamiento por miembro, y la activación de suspensión en una plataforma publicada. Ya hay invitaciones, sesiones revocables, DB distinta por miembro y controles de suspensión/reactivación en el código local actual; la comprobación exhaustiva de todas las APIs/adjuntos/exportaciones sigue pendiente antes de piloto.

Para activar captura real de IP, configurar proxy confiable y secreto independiente. La vista de actividad mantiene ventana lógica de siete días, con limpieza física horaria/arranque/consultas/escrituras. Los backups, WAL y logs del proxy tienen que configurarse aparte. No registrar cabeceras arbitrarias como IP del usuario ni usar IP sola como prueba de fraude.

La configuración Docker/Caddy sigue necesitando verificación real en staging porque Docker no está disponible en este equipo. La revisión independiente no encontró otro bloqueo concreto para una vista previa privada monousuario en el alcance revisado; no certifica que el producto sea invulnerable.

Verificación final: 610 pruebas en 69 archivos y compilación de producción aprobadas. No se realizaron compras, despliegues ni cambios de cuentas reales.
