# Imágenes del proyecto

Cinco capturas reales de Trading Bauhaus, tomadas el 18 de noviembre de 2026 con Chrome headless y Playwright. Resolución: **1440 × 1000 px**, tema oscuro. Muestran el primer viewport de cada pantalla.

| Archivo                                            | Pantalla                          | Ruta de entrada  |
| -------------------------------------------------- | --------------------------------- | ---------------- |
| [01-portada.png](01-portada.png)                   | Presentación pública              | `/`              |
| [02-dashboard-demo.png](02-dashboard-demo.png)     | Dashboard con métricas de ejemplo | `/demo`          |
| [03-operaciones-demo.png](03-operaciones-demo.png) | Lista de operaciones              | `/demo/trades`   |
| [04-calendario-demo.png](04-calendario-demo.png)   | Calendario de resultados          | `/demo/calendar` |
| [05-informes-demo.png](05-informes-demo.png)       | Informes y estadísticas           | `/demo/reports`  |

## Datos y procedencia

Se utilizó un directorio temporal de datos independiente mediante `JOURNAL_DATA_DIR`, con `JOURNAL_MULTI_USER=true`. Las páginas privadas se abrieron exclusivamente mediante el modo público de demostración, que genera su propia base de datos de ejemplo. No se abrió ni copió el diario del propietario, archivos privados ni credenciales. Los resultados de trading visibles son ficticios.

Las capturas conservan el aviso amarillo de demostración de solo lectura. Únicamente se ocultó el indicador técnico de Next.js mediante CSS en el navegador de captura. No se retocaron métricas ni contenidos de las pantallas. La portada y las capturas reflejan el código presente durante esta sesión; pueden necesitar regenerarse después de cambios visuales.

## Regeneración

Desde la raíz del proyecto, iniciar en una terminal el servidor con datos temporales nuevos:

```sh
cd apps/web
JOURNAL_DATA_DIR="$(mktemp -d /tmp/trading-bauhaus-images.XXXXXX)" JOURNAL_MULTI_USER=true NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3107
```

En otra terminal, instalar la herramienta fuera del proyecto y ejecutar el script desde la raíz:

```sh
npm install --prefix /tmp/trading-bauhaus-screenshot-tools playwright-core --no-audit --no-fund
PLAYWRIGHT_MODULE=/tmp/trading-bauhaus-screenshot-tools/node_modules/playwright-core node docs/imagenes-proyecto/capturar.cjs
```

El script usa Chrome instalado en macOS. En otro sistema, establecer `CHROME_PATH` con la ruta de su ejecutable. Al terminar, detener el servidor con Ctrl+C. No ejecutar este servidor de desarrollo mientras se esté generando un build de producción, porque ambos usan `apps/web/.next`.

Las imágenes forman parte del proyecto y están sujetas a sus condiciones de licencia y avisos de terceros.
