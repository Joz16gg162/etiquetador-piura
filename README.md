# Etiquetado manual de publicaciones de Gran Piura

Página estática para importar CSV o Excel (.xlsx y .xls), revisar texto e imágenes juntos y exportar anotaciones individuales. Funciona en GitHub Pages y abriendo `index.html` desde un ZIP extraído. No instala dependencias ni necesita tokens de X.

## Uso

- Importa el CSV o Excel que vas a etiquetar. No se requiere cuenta ni abrir una sesión.
- Revisa la publicación y completa sus etiquetas. Si necesitas revisión, elige **Con duda** en el campo **Confianza** y explica el motivo en Observaciones. En ambos casos pulsa **Guardar y siguiente**.
- Escribe el **Nombre del etiquetador** y exporta en Excel (.xlsx) o CSV al terminar. Para continuar en otro ordenador, importa ese mismo archivo etiquetado.

## Pantalla

**Archivo** muestra el nombre del archivo y los botones **Importar CSV o Excel**, **Exportar Excel** y **Exportar CSV**. **Avance del archivo** permanece visible sobre toda el área de trabajo: el contador grande «Publicación X de Y» muestra la posición original, incluso al filtrar. La barra y el porcentaje representan publicaciones completadas. Los borradores cuentan como pendientes; los casos con duda se muestran por separado y no se consideran completados.

**Publicación** separa ID, fecha y hora, título cuando esté incluido, contenido e imágenes/videos. X no exige un título: si el CSV no tiene `titulo`, `título` o `title`, no se genera uno ni se divide artificialmente el texto. **Etiquetas** agrupa los valores que debe registrar la persona, conservando las reglas del protocolo.

En pantallas de al menos 1100 px de ancho y 600 px de alto, el archivo y el avance ocupan una cabecera compacta. **Publicación** y **Etiquetas** aparecen lado a lado y aprovechan el alto disponible. Cada panel permite desplazarse de forma independiente si el texto, los medios o las ubicaciones son extensos; los botones para guardar y avanzar permanecen visibles. **Ver criterios** despliega las explicaciones completas del protocolo y **Uso** conserva las instrucciones. En móvil, con zoom elevado o con poco alto de pantalla se usa el desplazamiento habitual para mantener campos y textos legibles.

**Borrar etiquetas** permite reiniciar el archivo cargado sin volver a importarlo. Pide confirmación; cancelar conserva el trabajo. Confirmar vacía el etiquetado activo y el nombre, vuelve a la primera publicación, limpia los filtros y guarda un avance de 0 completadas. Las publicaciones originales se conservan. Las sesiones anteriores quedan en el historial local interno, separadas del etiquetado y de la exportación nuevos. La protección de escrituras también impide que una pestaña anterior deshaga este reinicio.

## Archivos y guardado

El CSV o Excel y las etiquetas se procesan en el navegador. GitHub solo aloja el programa y ejemplos ficticios. El archivo no se envía a GitHub ni a un servidor de almacenamiento. Los enlaces a medios se cargan desde sus servidores originales; las búsquedas de mapas envían solo la consulta al proveedor al pulsar el enlace.

El guardado local permite recuperar el avance en el mismo navegador y origen. Al importar un archivo sin etiquetas que coincide con trabajo guardado, se pregunta si deseas **Continuar avance guardado**, **Empezar desde cero** o cancelar. Empezar desde cero deja todas las publicaciones pendientes y el nombre vacío; las sesiones anteriores se conservan internamente en `annotationHistory` del archivo local y no se incorporan a la nueva exportación. Cancelar conserva la selección y el avance actuales. Para conservarlo o cambiar de equipo, usa el Excel o CSV exportado. El guardado local puede no estar disponible en modo privado, con el almacenamiento lleno o tras borrar datos del navegador. Si falla, la página pide exportar. No se editan simultáneamente los mismos archivos en varias pestañas.

Desde la versión 1.7, el guardado usa `piura-etiquetador-v2` y lee los archivos anteriores de `piura-etiquetador-v1` cuando aún no hay una copia nueva. La versión antigua se mantiene intacta para la migración; una pestaña con código anterior no puede sobrescribir el archivo nuevo. Cada escritura comprueba su revisión en la misma transacción que guarda datos y posición. Si otra pestaña ya guardó o reinició ese archivo, se rechaza la escritura antigua y se pide recargar; no se anuncia un reinicio o guardado exitoso que haya fallado. Las pestañas sin cambios pendientes no vuelven a guardar solo por ocultarse o cerrarse.

No existe inicio de sesión ni sincronización entre asesores. Cada participante trabaja con su archivo y entrega su exportación. El campo **Nombre del etiquetador** es texto escrito por la persona, no un inicio de sesión. Se conserva con el archivo y es necesario para exportar. La columna visible `etiquetador` contiene ese nombre en las filas con anotaciones; las filas todavía pendientes quedan sin autor. Se conservan además los metadatos necesarios para recuperar el nombre y continuar, incluso si se exporta antes de etiquetar la primera publicación. El nombre del archivo exportado deriva del CSV cargado.

Las exportaciones anteriores siguen siendo compatibles. Los registros locales anteriores se conservan y se recupera el etiquetado activo sin mezclar respuestas de distintas personas. Para recuperar una exportación concreta, impórtala. No se ofrece gestión de sesiones ni respaldos JSON en la pantalla simplificada.

## Formato Excel

Se importan **.xlsx** y **.xls** y se exporta **.xlsx**. La primera fila debe contener los mismos encabezados que el CSV descrito abajo. Si hay varias hojas con datos, se pide elegir una antes de importar; no se mezclan lotes. El límite de entrada es 20 MB, 100 000 publicaciones y 256 columnas por hoja.

Los IDs largos deben estar guardados como **texto** en el Excel de origen: los IDs largos numéricos se rechazan porque Excel puede haber redondeado sus dígitos. Las fechas nativas de Excel se interpretan como hora de Perú (UTC-05); las fechas ISO escritas como texto conservan su zona original. Las fórmulas se leen por su resultado guardado y no se ejecutan; las celdas con errores o fórmulas sin resultado se rechazan.

La exportación Excel conserva todas las columnas originales, etiquetas, metadatos y el nombre del etiquetador. Sus celdas son texto, incluidos IDs y coordenadas, para conservar los valores exactos sin ejecutar fórmulas. No necesita los apóstrofos protectores del CSV: usa `_etq_export_version=2`. Puede importarse de nuevo o convertirse a CSV desde la página sin acumular prefijos. Si alguna celda excede los 32 767 caracteres que admite Excel, se pide exportar CSV para evitar pérdida de contenido.

Se incluye una copia local de [SheetJS Community Edition 0.20.3](https://docs.sheetjs.com/docs/getting-started/installation/standalone/) con su licencia en `vendor/`; la importación y exportación no envían los datos a SheetJS ni requieren conexión a ese servicio. La aplicación también funciona desde el ZIP extraído.

## Formato CSV

Codificación **UTF-8**, con coma o punto y coma como delimitador. Encierra entre comillas los textos con comas, comillas o saltos de línea. Una comilla dentro de una celda se representa como dos comillas. Los IDs se tratan como texto y se conserva su longitud exacta; no se convierten en números de JavaScript. No abras y vuelvas a guardar IDs largos como números en Excel.

| Columna | Obligatoria | Contenido |
| --- | --- | --- |
| `id` | Sí | ID único como texto. También acepta `tweet_id`, `post_id`, `id_publicacion`. |
| `texto` | Sí | Texto completo. También acepta `text`, `full_text`. |
| `titulo` | No | Título original, si existe. También acepta `título` o `title`. No se inventa un título para los posts que no lo tengan. |
| `fecha` | No | Fecha ISO 8601 con zona horaria. Se muestra en America/Lima. También `created_at`, `date`. |
| `url` | No | Enlace HTTP/HTTPS a la publicación. También `tweet_url`, `enlace`. |
| `imagenes` | No | URLs HTTP/HTTPS de imágenes separadas por `|`, o arreglo JSON de URLs. También `image_urls`, `image_url`, `photo_urls`, `media_urls`. |
| `videos` | No | URLs de videos separadas por `|`. Archivos MP4, WebM u OGG se pueden intentar reproducir; otros enlaces se abren aparte. |
| `miniaturas` | No | URLs de miniaturas de video separadas por `|`. Se muestran como miniaturas, no como fotos para las etiquetas principales. |
| `contiene_video` | No | `si` / `true` / `1` si hay video pero no se dispone de URL o miniatura. |
| `contiene_imagen` | No | `si` / `true` / `1` si hay imagen pero no se dispone de URL. |

Las columnas adicionales se conservan al exportar, pero no se muestran como ayudas al anotador. Evita incluir predicciones o respuestas de referencia en el lote de anotación. Para los ejemplos incluidos se permiten rutas `assets/...`; los medios de un dataset real deben tener URLs HTTP/HTTPS. Un ZIP sin conexión puede mostrar los esquemas locales, pero las fotos remotas requieren conexión a Internet y pueden dejar de estar disponibles.

Filas completamente idénticas con el mismo ID se agrupan; si un ID tiene contenidos distintos, la importación se rechaza para resolver el conflicto. Esto no detecta noticias equivalentes publicadas con IDs distintos ni decide qué es un repost. La depuración del conjunto debe hacerse antes del etiquetado.

## Protocolos

Se aplica el **Protocolo de etiquetado manual facilitado para esta implementación**: relevancia, auxilio a personas, reporte de inundación/desborde, referencias geográficas, confianza, observaciones y evidencia complementaria de video. Incluye el anegamiento dentro de inundación y conserva el umbral de inminencia de hasta 24 horas indicado por la publicación. Las categorías auxilio y reporte de inundación pueden ser Sí a la vez. Las propuestas previas sobre necesidades de atención no forman parte de esta versión.

La calibración entre los tres participantes, la revisión por consenso, el registro de acuerdos y el cálculo del acuerdo entre anotadores continúan siendo actividades del equipo según el protocolo. Esta página implementa el registro individual y la exportación; no reemplaza ese proceso por decisiones automáticas. La ubicación se toma del texto, no de imágenes ni del perfil del autor. No se incorporan puntuaciones de prioridad ni clasificaciones adicionales.

Si la relevancia es No, las dos categorías se guardan como No y las ubicaciones se dejan vacías. Si es Sí, deben responderse ambas categorías y registrarse lugares o declarar que no hay referencia textual. Un punto exige coordenadas y fuente de verificación; un área se conserva como área. Los casos con duda requieren observación y no cuentan como completados.

Las etiquetas principales usan texto e imágenes estáticas; el video tiene un campo complementario y marca temporal. Una miniatura nunca se considera revisión del video completo. No se consultan fuentes ni se sugieren etiquetas automáticamente.

## Buscar una referencia en el mapa

En **Añadir lugar**, puedes escribir la referencia literal o seleccionar la frase dentro del texto de la publicación y pulsar **Usar texto seleccionado del post**. Cada lugar tiene su propia búsqueda editable y dos enlaces: **Buscar en Google Maps** y **Buscar en OpenStreetMap**. Se añade Piura, Perú como contexto de búsqueda visible y editable, sin modificar la referencia textual ni dar por resuelta la ubicación.

Si puedes verificar un punto concreto, elige **Punto**. Copia del mapa el par **latitud, longitud**, pégalo en el asistente y pulsa **Usar coordenadas**. También se aceptan enlaces de Google Maps que contengan coordenadas del punto (`query`, `q` o metadatos `!3d…!4d…`) y enlaces largos de OpenStreetMap con marcador (`mlat` y `mlon`). Cuando se importa un enlace compatible, se conserva en Fuente de verificación. Si pegas solo números, debes indicar la fuente manualmente.

En Google Maps puedes copiar las coordenadas al hacer clic derecho en el punto. En OpenStreetMap usa **Compartir**, marca **Incluir marcador**, sitúalo y copia el enlace largo. Los enlaces cortos y las coordenadas del centro de la vista (`@…` o `#map=…` sin marcador) se rechazan: no prueban dónde está el punto. No se hace geocodificación automática ni se garantizan coordenadas exactas a partir de una referencia ambigua. Si el texto solo identifica un barrio o distrito, conserva **Área**. La anotación sigue requiriendo lugar identificado y fuente antes de completar un punto.

## Exportación e intercambio

Se conservan las columnas originales, se agrega la columna `etiquetador` y se agregan columnas `_etq_` con anotador, versión de protocolo, estado, etiquetas, ubicaciones JSON, confianza, observaciones, fecha de modificación y anotación completa. Los estados son `pendiente`, `borrador`, `duda` y `completa`. La importación del Excel o CSV exportado reconstruye las anotaciones y recupera el nombre del etiquetador. Si hay respuestas locales distintas, se pide una decisión antes de reemplazarlas.

Para reducir la ejecución accidental de fórmulas al abrir CSV en hojas de cálculo, se prefijan con apóstrofo los valores que podrían ser fórmulas, los IDs numéricos de más de 15 dígitos y los textos que ya empiezan con apóstrofo. `_etq_export_version=1` permite revertir esa protección al reimportar, conservando exactamente texto e ID. Los textos originales se reconstruyen al reimportar el CSV exportado. Para análisis externo, elimina solo ese prefijo de protección siguiendo la versión; no conviertas los IDs a número.

La primera versión no reúne automáticamente archivos de varios anotadores ni calcula kappa. Deben consolidarse por `(id, anotador, protocolo)`, manteniendo la independencia y distinguiendo los casos pendientes. No subas datos de investigación ni exportaciones al repositorio público.

## Pruebas

Ejecutar `npm ci` y `npm test` para las pruebas de desarrollo. La única dependencia de desarrollo, `fake-indexeddb`, permite comprobar transacciones y conflictos entre conexiones: reiniciar un archivo y después intentar guardar desde una pestaña antigua no debe recuperar etiquetas ni cambiar la posición. También se comprueba el aislamiento de versiones antiguas y las escrituras concurrentes. Las pruebas CSV y Excel se pueden ejecutar por separado con `node tests/core.test.cjs` y `node tests/excel.test.cjs`, sin instalar dependencias. Comprueban saltos, comillas, delimitadores, IDs largos, duplicados, medios, validación del protocolo y conservación de datos y etiquetas al intercambiar Excel y CSV.

Para inspección visual local, se puede servir esta carpeta con cualquier servidor estático o abrir `index.html`. La herramienta no necesita ese servidor para importar archivos.

## Publicación

El repositorio público debe contener únicamente código, documentación y ejemplos ficticios. En GitHub Pages, publicar desde la raíz de la rama configurada. No hay compilación ni instalación para usar o publicar la página: `index.html`, `styles.css`, `layout.css`, `workspace.css`, `core.js`, `storage.js`, `app.js`, `excel.js`, `demo.js`, `vendor/` y `assets/` constituyen la aplicación. `.nojekyll` evita procesamiento Jekyll. No se requiere una clave API ni un dominio propio.
