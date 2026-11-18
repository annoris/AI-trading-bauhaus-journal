# Arquitectura y prioridades de mejora

## Decisión de tecnología

Mantener TypeScript y la separación existente. Cambiar a Python, Go o Rust sin medir un cuello de botella añadiría una migración y riesgo de alterar cálculos financieros. No se ha establecido todavía un benchmark de rendimiento de esta instalación.

- `packages/core/src`: cálculos puros, modelos, filtros y métricas. No importar React, SQLite ni servicios externos aquí.
- `packages/importers/src`: traducción de archivos del broker a ejecuciones; preservar datos de origen y advertencias.
- `apps/web/src/server`: consultas, persistencia, configuración y proveedores.
- `apps/web/src/app/api`: validar solicitudes y coordinar dominio/persistencia.
- `apps/web/src/lib`: utilidades de interfaz y transformaciones independientes.
- `apps/web/src/components`: componentes reutilizables.
- `apps/web/tests` y `packages/*/tests`: regresiones de cálculos e integraciones.

## Primera mejora aplicada

La lista de operaciones expone resultado neto en R y nombre de estrategia. El selector de columnas permite consultar riesgo planificado y errores. Reutiliza `tradeRisk` y `tradeR` del motor existente: no duplica fórmulas ni cambia operaciones almacenadas.

El riesgo planificado usa entrada media ponderada, stop y cantidad total de entradas; en derivados requiere multiplicador. No representa exposición máxima simultánea ni reconstruye el stop original si fue editado posteriormente. R no está disponible sin riesgo válido ni para posiciones abiertas. Los nombres de estrategias se resuelven con una consulta conjunta, sin una consulta adicional por operación.

## Prioridades siguientes

1. **Exactitud y conciliación:** comparar importaciones con extractos reales anonimizados de los brokers utilizados; verificar comisiones, parciales, reversas, multiplicadores y zonas horarias.
2. **Flujo de revisión:** facilitar revisión por estrategia, errores y cumplimiento de reglas; mantener separadas operaciones abiertas y resultados cerrados.
3. **Persistencia de riesgo inicial:** registrar el riesgo al entrar y su historial antes de presentar R como riesgo original inmutable.
4. **Rendimiento medido:** medir tiempo y memoria con 10.000 y 100.000 operaciones; considerar paginación del servidor y agregaciones antes de cambiar el lenguaje. Hoy la tabla pagina en el navegador y la API devuelve todas las coincidencias.
5. **Restauración:** ya hay comandos manuales de backup/restauración cifrados y verificados con `pnpm verify:backup`; falta configurar retención off-host y ensayar la restauración completa en staging. El export JSON existente sigue siendo por cuenta y no es la copia operativa completa.
6. **Experiencia en español:** introducir traducciones centralizadas y formato por configuración, evitando textos traducidos de forma aislada.

Estas prioridades son propuestas técnicas, no una encuesta de usuarios. Referencias funcionales: [Tradervue: riesgo en R](https://www.tradervue.com/help/reports/risk_reporting) y [TradeZella: análisis de estrategias y errores](https://help.tradezella.com/en/articles/7190691-analyzing-tags).

## Validación

Ejecutar desde la raíz: `pnpm test`, `pnpm typecheck` y `pnpm build`. Revisar formato con Prettier en los archivos modificados. Mantener la versión de pnpm indicada en `package.json` para instalaciones reproducibles. Esta carpeta se recibió sin `.git`; antes de cambios más amplios conviene establecer control de versiones y respaldar la carpeta de datos.
