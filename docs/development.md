# Desarrollo y comprobación

Los documentos distribuidos siguen siendo un único HTML. Se abren por doble clic y
contienen sus estilos, motor, contenido, diagramas y catálogo de plantillas.
Google Fonts es opcional: sin conexión se usa la tipografía del sistema.

## Fuentes

- `src/motor.html`: estructura, diagramas, respuestas, historial y guardado.
- `src/studio.js`: edición de contenido, apariencia, catálogo y herramientas adicionales.
- `src/studio.css`: estilos de documento, adaptación móvil e impresión.
- `src/drawing.js`: apariencia de cajas, notas y líneas, marcadores y controles.
- `src/templates.json`: cinco plantillas de contenido y su estilo inicial.
- `src/demo-cuerpo.html` y `src/demo-datos.json`: documento de demostración.
- `src/build.py`: ensambla las fuentes en `index.html`, `template.html` y `templates/*.html`.

Ejecuta `python src/build.py` después de modificar fuentes. No edites a mano las
salidas si quieres conservar tus cambios tras recompilar. Para redactar un documento,
trabaja sobre una copia del HTML o utiliza la edición en el navegador.

## Contenido y versiones

El guardado existente conserva número, fecha, autor y nota de cambios. Ahora el modelo
también incluye `document.html`, `document.design` y `document.theme`. El borrador local
y Deshacer/Rehacer incluyen contenido, apariencia y diagramas. Deshacer nunca rebaja el
número de una versión ya guardada. Cancelar el selector de archivo tampoco lo incrementa.

El cuerpo HTML visible es la fuente inicial del contenido, por lo que sigue siendo posible
rellenar un documento a mano. Si existe un borrador local pendiente, se recupera y se avisa.
Los documentos anteriores sin `document` se inicializan desde su cuerpo al usar el motor nuevo.
No se modifican automáticamente archivos anteriores que aún contienen el motor antiguo.

Plantillas descarga un documento separado, con historial vacío y versión 1. Cambiar el
selector Estilo modifica únicamente la apariencia del documento actual. Las figuras se
descubren desde el modelo y el cuerpo; también se admiten documentos sin diagramas.

Editar texto permite modificar títulos, párrafos, celdas y pies de figura. El pegado inserta
texto plano. Los botones al final del documento añaden secciones, avisos, tablas, diagramas
y decisiones. Es edición de contenido estructurado: no es un procesador de textos con
formato enriquecido ni incluye gestión de filas y columnas de tabla.

Imprimir / PDF abre la impresión del navegador. El CSS usa A4, oculta controles, adapta
diagramas y conserva respuestas completas; la paginación final depende del navegador y
del contenido. Las notas visibles también se imprimen; el botón Notas permite ocultarlas.

## Pruebas

La apariencia se almacena opcionalmente en `nodes[].appearance` y `edges[].appearance`,
independiente de `kind`. Admite `stroke`, `fill` (`#rrggbb` o `none`), `textColor`,
`strokeWidth`, `dash` (`solid`, `dashed`, `dotted`, `dashdot`, `longdash`), `radius`,
`opacity`, `fontSize`, `bold`, `italic`, `align`, `linecap`, `startHead` y `endHead`.
Las puntas admiten `none`, `arrow`, `open`, `circle` y `diamond`. Omitir una propiedad
conserva el valor del tipo. Los colores personalizados son fijos; Auto recupera el tema.

Los controles de sección mueven o eliminan secciones completas. Eliminar retira también
sus figuras y respuestas del modelo; Deshacer las recupera. Cabecera y pie permanecen
en sus posiciones. Los controles de edición no se incluyen en el HTML guardado ni en PDF.

`tests/appearance.cjs` se ejecuta desde la prueba de navegador para comprobar estilos,
copiar/pegar, restablecer, selección múltiple, puntas, persistencia y exportación SVG.

Requisitos de desarrollo: Python 3, Node 22 o posterior y Chrome o Chromium instalado.
Los HTML finales no requieren estas herramientas.

```powershell
python src/build.py
python tests/validate.py
node tests/browser.cjs
```

`validate.py` comprueba los siete documentos, referencias de figuras y decisiones,
identificadores, catálogo y sintaxis JavaScript. `browser.cjs` utiliza el protocolo de
depuración de Chromium sin paquetes npm. Prueba carga, edición, guardado y reapertura,
cancelación, historial, PDF, móvil, herramientas de diagramas y descarga de plantillas.
Usa un perfil temporal aislado; no abre el perfil personal del navegador.

Para usar otro ejecutable o elegir dónde guardar las capturas y el PDF de prueba:

```powershell
$env:DOCUWEB_BROWSER = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:DOCUWEB_ARTIFACTS = Join-Path $env:TEMP 'docuweb-artifacts'
node tests/browser.cjs
```

La prueba de guardado simula el selector de archivos y verifica el HTML producido al
reabrirlo en Chromium. No automatiza los permisos del selector nativo. Firefox, Safari y
la impresión en una impresora física requieren comprobación manual.
