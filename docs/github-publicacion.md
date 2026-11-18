# Preparación para publicar en GitHub

Estado: preparado localmente; no publicado. Fecha: 18 de noviembre de 2026.

El workspace no contiene `.git` y `gh` no está instalado. Se ha preparado una copia de fuentes y documentación en un directorio temporal y un ZIP para entregar a la coordinación. El directorio temporal no sustituye una copia persistente del proyecto.

## Qué falta

- Confirmar propietario u organización, nombre o URL del repositorio y visibilidad.
- Disponer de una sesión GitHub conectada o autenticación Git autorizada para ese destino.
- Revisar la entrega preparada antes de subirla. Las condiciones comerciales siguen siendo un borrador; la publicación no completa una venta ni habilita cobros.

## Contenido de la copia

Incluye código fuente, pruebas, manifiestos y lockfile, scripts, configuración de despliegue de ejemplo, documentación, recursos públicos y cinco capturas con datos demo ficticios. Excluye bases de datos y diarios, `data`, secretos y archivos `.env` salvo `.env.example`, dependencias instaladas, builds, cachés, logs, copias de respaldo y artefactos locales. No incluye historial Git.

La revisión por patrones de credenciales es una comprobación local orientativa; no garantiza que un secreto incrustado en un formato no reconocido quede detectado. No se deben subir datos del diario ni configuración de producción.

## Pasos de publicación pendientes

1. Crear o seleccionar el repositorio en la cuenta y visibilidad confirmadas.
2. Extraer el ZIP en una carpeta nueva y revisar su contenido. No utilizar el workspace con bases de datos como origen indiscriminado de un upload.
3. Desde la carpeta limpia, inicializar Git y crear el primer commit con `git init`, `git add .` y `git commit -m "Initial Trading Bauhaus source release"`.
4. Establecer `main`, añadir como `origin` la URL real del repositorio y hacer push mediante la sesión autenticada correspondiente. No ejecutar estos pasos hasta conocer el destino autorizado.
5. Revisar en GitHub el README, las cinco imágenes, LICENSE y la visibilidad; configurar los topics y descripción propuestos en el [launch kit](launch-kit.md).

Topics sugeridos: `trading-journal`, `trade-analytics`, `self-hosted`, `bauhaus`, `nextjs`, `typescript`, `sqlite`, `trade-replay`, `journaling`, `performance-analytics`.

Los anuncios en español e inglés del launch kit están preparados para adaptar al enlace real. No se ha publicado ningún anuncio ni enviado mensajes a terceros.

## Resultado de preparación local

La copia limpia contiene 473 archivos. Los patrones de claves privadas, tokens GitHub, claves AWS y claves de API reconocibles no encontraron coincidencias. La búsqueda adicional de asignaciones de credenciales señaló siete archivos de pruebas (`auth-gate.unit.test.ts`, `ai-feedback.test.ts`, `ai-import.test.ts`, `market-providers.test.ts`, `auth-login-security.test.ts`, `multi-user-isolation.test.ts` y `market-data-connections.test.ts`); se conservaron como fixtures de tests. No se imprimieron sus valores. Esta revisión no constituye una certificación de ausencia de secretos.
