# Lo que falta

Nota de relevo. Está escrita para que otro hilo —humano o asistente— retome el proyecto sin
haber estado en la conversación en la que nació. Si eres un asistente y te han pedido
continuar esto, lee este fichero entero antes de tocar nada, y después
[AGENTS.md](AGENTS.md).

## Estado actual

El proyecto **está terminado y funciona**. Lo que queda son tareas de publicación,
verificación y mejoras opcionales. No hay nada roto ni a medias.

Ficheros:

- `index.html` y `template.html` son **generados**. No los edites a mano: se pierden en la
  siguiente compilación.
- Se generan con `python src/build.py`, ejecutado **desde la raíz del repositorio**.
- Las fuentes son `src/motor.html` (estilos y guion), `src/demo-cuerpo.html` (el cuerpo de la
  demo) y `src/demo-datos.json` (sus diagramas). El cuerpo y los datos de la plantilla vacía
  están dentro de `src/build.py`.
- Todo cambio en el motor se hace en `src/motor.html` y se recompila.

## Pendiente que solo puede hacer una persona

Necesitan la cuenta personal de GitHub del autor. **No usar la cuenta que pueda estar
autenticada en `gh` en la máquina de trabajo: es la de la empresa.**

1. **Crear el repositorio** `docuweb` en la cuenta personal, público.
2. **Subirlo.** El repositorio local ya está inicializado, con rama `main`, un commit y la
   identidad correcta fijada en su configuración local. Solo falta:
   ```
   git remote add origin https://github.com/<usuario>/docuweb.git
   git push -u origin main
   ```
3. **Publicar la demo** en GitHub Pages: ajustes → Pages → rama `main`, carpeta raíz. Queda
   en `https://<usuario>.github.io/docuweb/`. Después, añadir ese enlace al principio de los
   dos README, que es lo que hace que un repositorio de plantilla se entienda de un vistazo.
4. **Marcarlo como Template repository** en los ajustes, para habilitar «Use this template».
5. **Capturas para el README.** Hacen falta tres: el documento en modo lectura, el modo
   edición con una caja seleccionada y su panel, y el diálogo de grabar versión. Guardarlas
   en `docs/` y enlazarlas desde los dos README. Un asistente no puede generarlas.

## Verificación pendiente

**Nadie ha abierto todavía `index.html` ni `template.html` en un navegador.** Se ha
verificado la sintaxis del guion, la validez del JSON y que todas las referencias entre
cajas y flechas resuelven, pero no el resultado visual. Antes de publicar, abrir ambos y
comprobar:

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
  como literales dentro de `src/motor.html`. Internacionalizarlo bien significa extraer esos
  literales a un objeto de cadenas y elegir idioma por `navigator.language` o por un atributo
  del documento. Es un trabajo acotado pero real, y conviene decidir si merece la pena antes
  de hacerlo.
- **Deriva del motor.** Si alguien edita `index.html` a mano, el motor de esa copia deja de
  coincidir con `src/motor.html` y la siguiente compilación lo pisa. Una comprobación en
  integración continua que recompile y falle si hay diferencias lo evitaría. Hoy solo lo
  protege la advertencia de este fichero.

## Mejoras que se plantearon y no se hicieron

Ninguna es necesaria. Están aquí para que no haya que redescubrirlas.

- **Actualizar el motor de un documento ya relleno.** Hoy hay que sustituir a mano todo salvo
  el cuerpo y el JSON. Un guion que tomara un documento antiguo y le injertara el motor nuevo
  conservando sus datos sería útil en cuanto existan varios documentos en circulación.
- **Comparar dos versiones.** El historial dice qué versiones hay, pero no qué cambió entre
  ellas. Como los diagramas son datos, una comparación real es posible: qué cajas se movieron,
  qué flechas aparecieron, qué respuestas se escribieron.
- **Exportar a PNG**, además de SVG, para pegar en herramientas que no admiten vectores.
- **Reglas de alineación** al arrastrar, del tipo que enseña una línea guía cuando dos cajas
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
repositorios, clientes— sobre `index.html`, `template.html` y `src/`. No debe devolver nada.
