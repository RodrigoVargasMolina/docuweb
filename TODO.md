# Lo que falta

Nota de relevo. Está escrita para que otro hilo —humano o asistente— retome el proyecto sin
haber estado en la conversación en la que nació. Si eres un asistente y te han pedido
continuar esto, lee este fichero entero antes de tocar nada, y después
[AGENTS.md](AGENTS.md).

## Estado actual

El proyecto **está terminado y funciona**. Lo que queda son comprobaciones y mejoras
opcionales. No hay nada roto ni a medias.

Ficheros:

- `index.html`, `template.html` y `templates/*.html` son **generados**. No los edites a
  mano: se pierden en la siguiente compilación.
- Se generan con `python src/build.py`, ejecutado **desde la raíz del repositorio**.
- Las fuentes son `src/motor.html` (motor base), `src/studio.js` y `src/studio.css`
  (edición y presentación), `src/drawing.js` (apariencia de cajas y flechas),
  `src/templates.json` (catálogo), `src/demo-cuerpo.html` (el cuerpo de la demo) y
  `src/demo-datos.json` (sus diagramas). El cuerpo y los datos de la plantilla vacía están
  dentro de `src/build.py`.
- Todo cambio en el motor se hace en `src/motor.html` y se recompila.

## Verificación

Hay pruebas de estructura y navegador en `tests/`, incluidas carga de los siete documentos,
edición, guardado y reapertura con historial, cancelación, PDF, móvil y diagramas.
Consulta `docs/development.md` para ejecutarlas y conocer sus límites.
Antes de publicar, revisar también manualmente en los navegadores de destino:

- Las figuras se dibujan y ninguna flecha atraviesa una caja que no le toca.
- *Editar diagramas* muestra las barras; arrastrar una caja, un codo y una etiqueta funciona.
- El marco de selección y Ctrl+clic seleccionan varios, y arrastrarlos los mueve juntos.
- *+ Nota* crea una nota, se mueve y su rabito apunta.
- La línea de respuesta de una decisión se escribe y el contador cambia.
- *Grabar versión* produce el fichero siguiente con el número subido.
- Tema claro y oscuro, y anchura de móvil.

Si algo falla, el motor es `src/motor.html`; recompilar con `python src/build.py`.

## Decisiones abiertas

- **Idioma de AGENTS.md.** Está en castellano. Es el contrato que leerá un asistente
  ajeno, así que en un repositorio público probablemente debería estar en inglés, o los dos.
  El esquema del JSON y los nombres de campo ya son neutros; lo que hay que traducir es la
  prosa.
- **Idioma del interfaz.** Barra de herramientas, diálogos y ayuda están en castellano,
  como literales dentro de `src/motor.html` y `src/studio.js`. Internacionalizarlo bien
  significa extraer esos literales a un objeto de cadenas y elegir idioma por
  `navigator.language` o por un atributo del documento. Es un trabajo acotado pero real, y
  conviene decidir si merece la pena antes de hacerlo.
- **Deriva del motor.** Si alguien edita a mano una salida —`index.html`, `template.html` o
  una de `templates/`—, su motor deja de coincidir con `src/motor.html` y la siguiente
  compilación lo pisa. Una comprobación en integración continua que recompile y falle si hay
  diferencias lo evitaría. Hoy solo lo protege la advertencia de este fichero.

## Mejoras que se plantearon y no se hicieron

Ninguna es necesaria. Están aquí para que no haya que redescubrirlas.

- **Actualizar el motor de un documento ya relleno.** Hoy hay que sustituir a mano todo salvo
  el cuerpo y el JSON. Un guion que tomara un documento antiguo y le injertara el motor nuevo
  conservando sus datos sería útil en cuanto existan varios documentos en circulación.
- **Comparar dos versiones.** El historial dice qué versiones hay, pero no qué cambió entre
  ellas. Como los diagramas son datos, una comparación real es posible: qué cajas se movieron,
  qué flechas aparecieron, qué respuestas se escribieron.
- **Exportar a PNG**, además de SVG, para pegar en herramientas que no admiten vectores.
- **Guías visuales** al arrastrar, del tipo que enseña una línea guía cuando dos cajas
  comparten borde.

## Restricción que no se debe romper

Este proyecto nació separando un motor genérico de un documento de arquitectura real de una
empresa. **Ese documento no está aquí y no debe estarlo**: nombraba repositorios internos,
tablas de base de datos, cabeceras de autenticación y clientes reales.

Cuidado con `src/motor.html` en particular: es el fichero del que salen los demás, y su
cuerpo y su JSON se sustituyen al compilar. Cualquier contenido real que quede ahí viaja al
repositorio sin aparecer en las salidas, que es la peor forma posible de filtrar algo. Su
cuerpo debe ser siempre el marcador neutro que lleva ahora.

Antes de publicar, y antes de añadir cualquier documento de ejemplo nuevo, pasar una búsqueda
sin distinguir mayúsculas por los nombres propios del origen —empresa, productos, sistemas,
repositorios, clientes— sobre `index.html`, `template.html`, `templates/` y `src/`. No debe
devolver nada.

## Mejoras implementadas

- Cinco plantillas de propósito y tres estilos independientes del contenido.
- Edición de texto y celdas, bloques nuevos y recuperación del borrador completo.
- Alineación, distribución, duplicación, ajuste al texto y diagramas predefinidos.
- Impresión A4 / PDF con respuestas completas y controles ocultos.
- Integración con el versionado existente y figuras dinámicas, incluso cero figuras.
