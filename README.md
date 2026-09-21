**English** · [Castellano](README.es.md)

# docuweb

**An architecture document you can edit, annotate and version. In a single HTML file.**

No server, no dependencies, nothing to install. Double-click and it works. Email it and it
arrives whole.

## The problem

Architecture documents die in one of two ways. Either they are a PNG exported from a tool
nobody else has, and the first correction leaves them obsolete forever. Or they live on a
wiki page — alive, but impossible to send, to carry into a meeting without a network, or to
archive exactly as they stood the day something was decided.

`docuweb` is a file. You edit it like a wiki and archive it like a PDF.

## What it does

- **Editable diagrams.** Boxes and arrows are data, not an image. Drag, resize, connect and
  delete them; arrows re-route themselves and take elbows to avoid whatever is in the way.
  Multi-select with a marquee or Ctrl/Cmd+click.
- **Review notes.** Signed comments on the drawing that can point at the box they are about.
  One button hides them all when it is time to show the diagram clean.
- **Answers to open decisions.** Every open decision has its answer line inside the document
  itself, written without entering edit mode. The document ends up being both the proposal
  and what was agreed about it.
- **Real versioning.** Each save produces `document-v2.html`, `-v3`… with the number, date,
  author and a change note **written inside the file**. A renamed file still knows which
  version it is. The full history travels with it.
- **Saves where it lives.** On Chrome and Edge, pin the folder once and every version lands
  right there, never in Downloads.
- **SVG export** per figure, with colours resolved, ready to drop into a deck.
- **Light and dark themes**, and it works on a phone.

## Getting started

**As a person:** open [`index.html`](index.html), choose *Plantillas* and select a document type. Open the downloaded HTML and use *Editar texto* or *Editar diagramas*. You can also start from [`template.html`](template.html).

**As someone directing an assistant:** hand it the repository and this sentence:

> Read AGENTS.md and fill in template.html with this project's content.

**To see before deciding:** open [`index.html`](index.html), a complete, clickable example
about moving writes out of a monolith.

## Templates and presentation

Five standalone templates are included: [technical proposal](templates/propuesta-tecnica.html),
[executive report](templates/informe-ejecutivo.html), [project plan](templates/plan-proyecto.html),
[alternatives comparison](templates/comparacion-alternativas.html) and
[decision record](templates/registro-decision.html). Their content and interface are in Spanish.

**Estilo** switches between Technical, Editorial and Executive presentation without changing
the content. **Tema** selects light, dark or system appearance. **Plantillas** downloads a
separate document with a fresh history.

**Editar texto** edits headings, paragraphs, table cells and captions. Controls at the bottom
add sections, callouts, tables, diagrams and decisions, with undo and redo. Text and appearance
are included in the existing save/version workflow.

Diagram tools duplicate, align, distribute and fit boxes to text. **Diagramas…** inserts flow,
layered architecture, before/after and sequence presets. **Imprimir / PDF** provides an A4
print layout with controls hidden, scaled diagrams and complete answers; choose Save as PDF
in your browser's print dialog.

Each section has Move up, Move down and Delete controls in text editing mode, with undo.
Diagram properties include stroke/fill/text colors, five stroke patterns, width, corners,
opacity, text formatting, independent endpoint markers and appearance copy/paste/reset.
These settings survive versioned saves and standalone SVG exports.

## How it is built

One file, three zones:

```
┌─ document.html ───────────────────────────────┐
│  <style>   …  engine: leave it alone          │
│  <body>    …  THE DOCUMENT: ordinary HTML     │
│  <script id="diagram-data">                   │
│            …  THE DIAGRAMS: JSON data         │
│  <script>  …  engine: leave it alone          │
└───────────────────────────────────────────────┘
```

The engine is identical in every document. What changes from one to the next is the body and
the JSON. That is why an assistant can fill one in without understanding anything else, and
why upgrading an old document's engine means replacing everything except those two zones.

The full contract — body classes, JSON schema, box and arrow kinds — is in
[AGENTS.md](AGENTS.md). It is written in Spanish; the schema tables and field names are
language-neutral.

## What it does not do

- **No real-time collaboration.** Two people do not edit at once. The model is the file: one
  person edits, saves a version and passes it on. For simultaneous work, use a wiki.
- **It cannot write to its own file.** No browser lets a local page do that, for good
  reasons. Saving creates the next version; keeping the previous one is your call.
- **It is not a general diagram editor.** Boxes, arrows and notes. For free-form drawing with
  curves and layers, use a drawing tool.
- **Firefox and Safari** cannot write to disk from a local page, so versions go to Downloads
  there. Safari opened by double-click also forgets preferences between sessions. Chrome and
  Edge have neither limitation.

## Compatibility

Targets recent Chrome, Edge, Firefox and Safari. Automated checks run in Chromium;
Firefox and Safari still require manual verification. On Mac the multi-select modifier is Cmd, because Ctrl+click is the right-click; the
document detects this on its own.

## Interface language

The document chrome — toolbar, dialogs, help — is in Spanish. The engine carries no
user-facing English strings yet; translating it means touching the literals in `src/motor.html` and `src/studio.js`.
See [TODO.md](TODO.md).

## Development

Build with `python src/build.py`. See [source and test documentation](docs/development.md) (Spanish).

## License

[MIT](LICENSE) © 2026 Rodrigo Vargas Molina.

Use it, modify it and distribute it, commercial projects included. All that is asked is that
you keep the copyright notice and the licence.
