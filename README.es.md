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

**Como persona:** descarga [`template.html`](template.html), ábrelo y pulsa *Editar diagramas*.

**Como quien dirige a un asistente:** dale el repositorio y esta frase:

> Lee AGENTS.md y rellena template.html con el contenido de este proyecto.

**Ver antes de decidir:** abre [`index.html`](index.html), un documento de ejemplo completo
y tocable sobre sacar las escrituras de un monolito.

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

El contrato completo —clases del cuerpo, esquema del JSON, tipos de caja y de flecha— está
en [AGENTS.md](AGENTS.md).

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

Chrome, Edge, Firefox y Safari recientes. El guion está escrito sin sintaxis moderna, así
que también funciona en navegadores algo antiguos. En Mac el modificador de selección
múltiple es Cmd, porque Ctrl+clic es el clic derecho; el documento lo detecta solo.

## Idioma del interfaz

El andamiaje del documento —barra de herramientas, diálogos, ayuda— está en castellano.
El motor no tiene todavía cadenas en inglés; traducirlo es tocar los literales de
`src/motor.html`. Ver [TODO.md](TODO.md).

## Licencia

[MIT](LICENSE) © 2026 Rodrigo Vargas Molina.

Puedes usarlo, modificarlo y distribuirlo, también en proyectos comerciales. Solo se pide
conservar el aviso de copyright y la licencia.
