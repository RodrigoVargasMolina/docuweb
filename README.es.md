[English](README.md) · **Castellano**

# docuweb

**Un documento de arquitectura que se edita, se comenta y se versiona. En un solo fichero HTML.**

Sin servidor, sin dependencias, sin instalar nada. Doble clic y funciona. Lo mandas por
correo y llega entero.

## El problema

Un documento de arquitectura muere de una de estas dos formas. O es un PNG exportado de una
herramienta que nadie más tiene, y la primera corrección lo deja obsoleto para siempre. O es
una página en una wiki, que está viva pero no se puede mandar, ni llevar a una reunión sin
red, ni archivar tal cual quedó el día que se decidió algo.

`docuweb` es un fichero. Se edita como una wiki y se archiva como un PDF.

## Lo que ganas

| En vez de | Con docuweb |
|---|---|
| Un `.docx` con capturas pegadas del diagrama | El diagrama son datos: mueves una caja y la flecha se recoloca sola |
| Abrir Word, Writer o Docs, con su licencia o su cuenta | Doble clic en un fichero de 160 KB, en cualquier navegador, sin instalar ni registrarte |
| Quedarte sin documento en cuanto no hay red: Docs, Confluence, la wiki | Vive en tu disco. Se abre en un avión, en una sala sin wifi o con la VPN caída |
| Una página de wiki que no se puede mandar | Se manda por correo y llega entero: nada de enlaces rotos ni de «pide acceso» |
| Exportar el diagrama a PNG cada vez que cambia | No hay exportación: el dibujo vive dentro del documento y sale a SVG cuando lo necesitas |
| Un PDF de archivo, que ya no se toca | Se archiva igual, pero cada versión lleva dentro número, fecha, autor y nota de cambio |
| «¿Quién tiene la última versión?» | El propio fichero: `-v7` en el nombre y el historial completo dentro |
| Redactarlo entero a mano | Le pasas el repositorio a un asistente: el cuerpo es HTML normal y los diagramas son JSON |

Sin servidor, sin base de datos, sin cuenta y sin proveedor al que pagar. No manda nada a
ningún sitio: la única petición que sale es la tipografía de Google, y sin conexión usa la
del sistema. Licencia MIT: te lo llevas y lo cambias.

**Si te ahorra una tarde de pelear con un documento, dale una estrella al repositorio.** Es
lo que hace que lo encuentre la siguiente persona con el mismo problema.

## Qué hace

- **Diagramas editables.** Las cajas y las flechas son datos, no una imagen. Se arrastran,
  se redimensionan, se conectan y se borran. Las flechas se recalculan solas y admiten codos
  para rodear lo que estorba. Selección múltiple con marco o con Ctrl/Cmd+clic.
- **Notas de revisión.** Comentarios sobre el dibujo, con firma, que pueden apuntar con un
  rabito a la caja que comentan. Se ocultan de golpe cuando toca enseñarlo limpio.
- **Respuestas a las decisiones.** Cada decisión abierta tiene su línea de respuesta dentro
  del propio documento. Se escriben sin entrar en modo edición. El documento acaba siendo a
  la vez el planteamiento y lo que se acordó.
- **Versionado real.** Cada grabado crea `documento-v2.html`, `-v3`… con el número, la fecha,
  el autor y una nota de cambio **escritos dentro del fichero**. Un fichero renombrado sigue
  sabiendo qué versión es. El historial completo viaja con él.
- **Graba donde vive.** En Chrome y Edge, fijas la carpeta una vez y las versiones caen ahí
  mismo, sin pasar por Descargas.
- **Exporta a SVG** cada figura, con los colores resueltos, para llevarla a una presentación.
- **Tema claro y oscuro**, y funciona en móvil.

## Empezar

El documento **es** el fichero `.html`. Lo que descargas es lo que se edita, se manda por
correo y se archiva: lleva dentro el motor, el contenido, los diagramas y el historial. Una
vez está en tu disco no necesita este repositorio para nada.

| Fichero | Qué es |
|---|---|
| [`index.html`](index.html) | Documento de ejemplo, completo y tocable. Vale también como punto de partida. |
| [`template.html`](template.html) | Documento vacío, solo la estructura mínima. |
| [`templates/`](templates/) | Cinco documentos ya redactados por propósito, en español; `templates/en/` tiene las versiones inglesas. |
| `src/`, `tests/`, `docs/` | Fuentes y comprobaciones. No hacen falta para usar un documento. |

1. **Llévate uno.** Desde GitHub, *Download raw file*: el clic normal enseña el código, no el
   documento. O abre cualquier documento docuweb, pulsa **Plantillas** y elige el tipo: se
   descarga como `propuesta-tecnica.html`, aparte y con el historial en blanco. Todos llevan
   el catálogo dentro, así que de uno cualquiera salen los demás.
2. **Ábrelo con doble clic.** Sin servidor y sin instalar nada. Chrome o Edge si quieres que
   las versiones caigan en la carpeta del documento en vez de en Descargas.
3. **Rellénalo** con *Editar texto* y *Editar diagramas*, o dáselo a un asistente: el cuerpo
   es HTML normal y los diagramas son JSON, así que no hay nada que aprender antes.
4. **Graba una versión.** Sale `propuesta-tecnica-v2.html`, con el número, la fecha, el autor
   y la nota de cambio escritos dentro. **Ese fichero nuevo es el que pasas**; el anterior
   queda intacto, que es lo que lo hace archivable.

Renómbralo a lo que trate —`migracion-pagos.html`— y las versiones siguen el nombre nuevo.
El número no sale del nombre: sale de dentro del fichero.

**Como quien dirige a un asistente:** dale el repositorio y una frase así:

> Rellena template.html con el contenido de este proyecto. El cuerpo es el HTML que va entre
> las dos marcas, y los diagramas son el JSON de dentro de `diagram-data`.

**Ver antes de decidir:** abre [`index.html`](index.html), un documento de ejemplo completo
sobre sacar las escrituras de un monolito. Es un documento como cualquier otro: puedes
editarlo y grabar tu propia versión.

## Plantillas y presentación

Las cinco plantillas se publican en español y en inglés. Cada documento abre con la interfaz
en el idioma que declara en `<html lang>`, así que las inglesas lo están por dentro y por fuera.

| Plantilla | Español | English | Para qué sirve |
|---|---|---|---|
| Propuesta técnica | [Propuesta técnica](templates/propuesta-tecnica.html) | [Technical proposal](templates/en/propuesta-tecnica.html) | Problema, alternativas, arquitectura y validación |
| Informe ejecutivo | [Informe ejecutivo](templates/informe-ejecutivo.html) | [Executive report](templates/en/informe-ejecutivo.html) | Hallazgos, indicadores y próximos pasos |
| Plan de proyecto | [Plan de proyecto](templates/plan-proyecto.html) | [Project plan](templates/en/plan-proyecto.html) | Alcance, hitos, responsables y riesgos |
| Comparación de alternativas | [Comparación de alternativas](templates/comparacion-alternativas.html) | [Comparison of alternatives](templates/en/comparacion-alternativas.html) | Criterios y evidencia para elegir |
| Registro de decisión | [Registro de decisión](templates/registro-decision.html) | [Decision record](templates/en/registro-decision.html) | Contexto, resolución y consecuencias |

El selector **Estilo** cambia entre Técnico, Editorial y Ejecutivo conservando el contenido.
**Tema** permite elegir claro, oscuro o seguir el sistema. **Idioma** cambia toda la interfaz
entre español e inglés: un documento abre en el idioma que declara en `<html lang>`, y tu
elección se recuerda en el navegador sin tocar el fichero.

**Editar texto** permite escribir en títulos, párrafos, celdas y pies de figura. Al final
del documento puedes añadir títulos, secciones, avisos, tablas, diagramas y decisiones, y
deshacer o rehacer cambios. El contenido y la apariencia quedan incluidos en el versionado
existente.

En los diagramas puedes duplicar cajas, alinearlas, distribuirlas y ajustarlas al texto.
El botón **Diagramas…** añade estructuras de flujo, capas, antes/después o etapas.

Cada bloque —la cabecera, las secciones y el pie— muestra **Subir**, **Bajar** y su botón
de eliminación al activar **Editar texto**. Puedes deshacer estas acciones; el orden y las
eliminaciones se conservan al guardar.

El panel de diagramas permite cambiar colores de línea, relleno y texto; usar línea
continua, segmentos, puntos o guion-punto; ajustar grosor, esquinas y opacidad; y elegir
las puntas de ambos extremos. También incluye formato del texto, selección múltiple,
copiar/pegar apariencia y restablecerla. Los ajustes se conservan en las versiones y el SVG.

**Imprimir / PDF** prepara una salida A4 sin controles, con diagramas adaptados y respuestas
completas. Elige Guardar como PDF en la impresión de tu navegador.

## Cómo está hecho

Un fichero, tres zonas:

```
┌─ documento.html ──────────────────────────────┐
│  <style>   …  motor: no se toca               │
│  <body>    …  EL DOCUMENTO: HTML normal       │
│  <script id="diagram-data">                   │
│            …  LOS DIAGRAMAS: datos en JSON    │
│  <script>  …  motor: no se toca               │
└───────────────────────────────────────────────┘
```

El motor es idéntico en todos los documentos. Lo que cambia entre uno y otro son el cuerpo
y el JSON. Por eso un asistente puede rellenarlo sin entender nada del resto, y por eso
actualizar el motor de un documento existente es sustituir todo salvo esas dos zonas.

El motor viaja recortado: sin comentarios ni sangrado, porque nadie lo lee ahí —se lee en
`src/`, que es donde se edita—. Las dos zonas tuyas no se tocan: el cuerpo es HTML normal y
los diagramas son JSON con una caja por línea, igual de legibles que si los hubieras escrito
tú. De los 160 KB de un documento vacío, unos 150 son motor y catálogos: se pagan una vez y
no crecen con lo que escribas.

El contrato —clases del cuerpo, esquema del JSON, tipos de caja y de flecha— no está en un
documento aparte: la referencia es el ejemplo que funciona en [`index.html`](index.html) y las
cinco plantillas de [`templates/`](templates/), y `src/` es el código que hay detrás.

## Lo que no hace

- **No colabora en tiempo real.** Dos personas no editan a la vez. El modelo es el del
  fichero: uno edita, graba una versión y la pasa. Para trabajo simultáneo, usa una wiki.
- **No escribe en su propio fichero.** Ningún navegador permite eso a una página local, por
  buenas razones. Grabar crea la versión siguiente; tú decides si conservas la anterior.
- **No es un editor de diagramas general.** Hace cajas, flechas y notas. Para un diagrama
  libre con curvas y capas, usa una herramienta de dibujo.
- **Firefox y Safari** no permiten escribir en disco desde una página local: ahí las versiones
  van a Descargas. Safari abierto por doble clic tampoco guarda preferencias entre sesiones.
  Chrome y Edge no tienen ninguna de las dos limitaciones.

## Compatibilidad

Dirigido a Chrome, Edge, Firefox y Safari recientes. Las pruebas automatizadas se ejecutan
en Chromium; Firefox y Safari requieren verificación manual. En Mac el modificador de selección
múltiple es Cmd, porque Ctrl+clic es el clic derecho; el documento lo detecta solo.

## Idioma del interfaz

El andamiaje del documento —barra de herramientas, diálogos, ayuda— está en castellano y en
inglés. Hay un solo juego de controles: las cadenas viven en `src/i18n.json`, que viaja dentro
de cada documento, y el motor las cambia al vuelo.

Un documento abre con la interfaz en el idioma que declara en `<html lang>`, así que
`index.html` y `templates/en/` abren en inglés, mientras que `template.html` y `templates/`
abren en castellano. El selector **Idioma** lo cambia en cualquier sentido, y tu elección se
recuerda en el navegador sin tocar el fichero.

## Desarrollo

`index.html`, `template.html` y las plantillas de `templates/` y `templates/en/` son
generados: recompílalos con `python src/build.py` después de tocar cualquier cosa de `src/`.
No los edites a mano, porque la siguiente compilación se los lleva por delante.

Hacen falta Python 3, Node 22 o posterior y Chrome o Chromium. Los documentos que salen no
necesitan nada de eso.

```powershell
python src/build.py
python tests/validate.py   # estructura, referencias de figuras y decisiones, catálogos
python tests/minify.py     # recortar el motor no cambia el programa
python tests/peso.py       # cada documento cabe en su techo, y por qué
python tests/drift.py      # las salidas coinciden byte a byte con src/
node tests/browser.cjs     # carga, edición, guardado, reapertura, PDF y móvil
```

## Licencia

[MIT](LICENSE) © 2026 Rodrigo Vargas Molina.

Puedes usarlo, modificarlo y distribuirlo, también en proyectos comerciales. Solo se pide
conservar el aviso de copyright y la licencia.

---

⭐ Si te ha servido, una estrella ayuda a que llegue a quien le haga falta.
