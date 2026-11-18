# Publicación en GitHub

Estado: publicado el 18 de noviembre de 2026.

Repositorio público: [annoris/trading-bauhaus-journal](https://github.com/annoris/trading-bauhaus-journal). Rama principal: `main`. Commit inicial: `85fdce5`.

Se creó el repositorio con la sesión GitHub existente y se subieron los 473 archivos de la copia limpia mediante Git HTTPS con el gestor de credenciales existente. No se crearon tokens ni nuevas credenciales. Se configuraron la descripción y los diez topics del launch kit. Se verificaron el código navegable, el README renderizado y su imagen principal en GitHub.

La publicación del código no despliega la aplicación ni habilita compra o activación de licencias. Los términos comerciales siguen pendientes de revisión jurídica y datos del vendedor.

## Contenido de la copia

Incluye código fuente, pruebas, manifiestos y lockfile, scripts, configuración de despliegue de ejemplo, documentación, recursos públicos y cinco capturas con datos demo ficticios. Excluye bases de datos y diarios, `data`, secretos y archivos `.env` salvo `.env.example`, dependencias instaladas, builds, cachés, logs, copias de respaldo y artefactos locales. No incluye historial Git.

La revisión por patrones de credenciales es una comprobación local orientativa; no garantiza que un secreto incrustado en un formato no reconocido quede detectado. No se deben subir datos del diario ni configuración de producción.

## Próximas actualizaciones

La carpeta original del proyecto queda conectada al repositorio mediante `origin`. Antes de cada commit, revisar `git status` y los archivos que se añadirán. Las exclusiones existentes preservan datos locales, configuración privada y dependencias fuera de Git. No utilizar `git add -f` para incorporar archivos ignorados.

Los anuncios en español e inglés del [launch kit](launch-kit.md) pueden adaptarse al enlace público real. Esta entrega publica el repositorio; no publica anuncios en redes ni crea un release o una aplicación alojada.

Topics sugeridos: `trading-journal`, `trade-analytics`, `self-hosted`, `bauhaus`, `nextjs`, `typescript`, `sqlite`, `trade-replay`, `journaling`, `performance-analytics`.

Los anuncios en español e inglés del launch kit están preparados para adaptar al enlace real. No se ha publicado ningún anuncio en redes sociales ni enviado mensajes a terceros.

## Resultado de preparación local

La copia limpia contiene 473 archivos. Los patrones de claves privadas, tokens GitHub, claves AWS y claves de API reconocibles no encontraron coincidencias. La búsqueda adicional de asignaciones de credenciales señaló siete archivos de pruebas (`auth-gate.unit.test.ts`, `ai-feedback.test.ts`, `ai-import.test.ts`, `market-providers.test.ts`, `auth-login-security.test.ts`, `multi-user-isolation.test.ts` y `market-data-connections.test.ts`); se conservaron como fixtures de tests. No se imprimieron sus valores. Esta revisión no constituye una certificación de ausencia de secretos.
