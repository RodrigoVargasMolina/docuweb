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

## What you get

| Instead of | With docuweb |
|---|---|
| A `.docx` with screenshots of the diagram pasted in | The diagram is data: move a box and the arrow re-routes itself |
| Opening Word, Writer or Docs, with its licence or account | Double-click a 160 KB file, in any browser, with nothing to install and no sign-up |
| Losing the document the moment there is no network: Docs, Confluence, the wiki | It lives on your disk. It opens on a plane, in a room with no wifi, or with the VPN down |
| A wiki page you cannot send | Email it and it arrives whole: no broken links, no "request access" |
| Exporting the diagram to PNG every time it changes | No export step: the drawing lives inside the document, and goes out as SVG when you need it |
| An archived PDF nobody touches again | Archive it the same way, except every version carries its number, date, author and change note inside |
| "Who has the latest version?" | The file itself: `-v7` in the name and the full history inside |
| Writing the whole thing by hand | Hand the repository to an assistant: the body is plain HTML and the diagrams are JSON |

No server, no database, no account, no vendor to pay. It sends nothing anywhere: the only
request that leaves is the Google font, and without a connection it uses the system one.
MIT licensed: take it and change it.

**If it saves you an afternoon of fighting a document, star the repository.** That is what
makes the next person with the same problem find it.

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

The document **is** the `.html` file. What you download is what you edit, email and archive:
it carries the engine, the content, the diagrams and the history inside it. Once it is on
your disk it needs nothing from this repository.

| File | What it is |
|---|---|
| [`index.html`](index.html) | A complete, clickable example document. Works as a starting point too. |
| [`template.html`](template.html) | An empty document: the bare structure. |
| [`templates/`](templates/) | Five documents already written, one per purpose, in Spanish; `templates/en/` holds the English versions. |
| `src/`, `tests/`, `docs/` | Sources and checks. Not needed to use a document. |

1. **Take one with you.** From GitHub, use *Download raw file*: a plain click shows the
   source, not the document. Or open any docuweb document, press **Plantillas** and pick a
   type: it downloads as `propuesta-tecnica.html`, separate and with an empty history. Every
   document carries the catalogue, so any one of them yields the rest.
2. **Open it by double-click.** No server, nothing to install. Chrome or Edge if you want
   versions to land in the document's own folder instead of Downloads.
3. **Fill it in** with *Editar texto* and *Editar diagramas*, or hand it to an assistant:
   the body is plain HTML and the diagrams are JSON, so there is nothing to learn first.
4. **Save a version.** Out comes `propuesta-tecnica-v2.html`, with the number, date, author
   and change note written inside. **That new file is the one you pass on**; the previous one
   stays untouched, which is what makes it archivable.

Rename it to whatever it is about — `payments-migration.html` — and versions follow the new
name. The number does not come from the name: it comes from inside the file.

**As someone directing an assistant:** hand it the repository and a sentence such as:

> Fill in template.html with this project's content. The body is the HTML between the two
> markers, and the diagrams are the JSON inside `diagram-data`.

**To see before deciding:** open [`index.html`](index.html), a complete example about moving
writes out of a monolith. It is a document like any other: you can edit it and save your own
version.

## Templates and presentation

Five ready-made documents are included, each one in Spanish and in English. A document
opens with the interface in the language it declares in `<html lang>`, so the English
templates are English inside and out.

| Template | Español | English | What it is for |
|---|---|---|---|
| Technical proposal | [Propuesta técnica](templates/propuesta-tecnica.html) | [Technical proposal](templates/en/propuesta-tecnica.html) | Problem, alternatives, architecture and validation |
| Executive report | [Informe ejecutivo](templates/informe-ejecutivo.html) | [Executive report](templates/en/informe-ejecutivo.html) | Findings, indicators and next steps |
| Project plan | [Plan de proyecto](templates/plan-proyecto.html) | [Project plan](templates/en/plan-proyecto.html) | Scope, milestones, owners and risks |
| Alternatives comparison | [Comparación de alternativas](templates/comparacion-alternativas.html) | [Comparison of alternatives](templates/en/comparacion-alternativas.html) | Criteria and evidence for choosing |
| Decision record | [Registro de decisión](templates/registro-decision.html) | [Decision record](templates/en/registro-decision.html) | Context, resolution and consequences |

**Estilo** switches between Technical, Editorial and Executive presentation without changing
the content. **Tema** selects light, dark or system appearance. **Idioma** switches the whole
interface between Spanish and English: a document opens in the language it declares in
`<html lang>`, and your choice is remembered in the browser without touching the file.

**Editar texto** edits headings, paragraphs, table cells and captions. Controls at the bottom
add titles, sections, callouts, tables, diagrams and decisions, with undo and redo. Text and
appearance are included in the existing save/version workflow.

Diagram tools duplicate, align, distribute and fit boxes to text. **Diagramas…** inserts flow,
layered architecture, before/after and sequence presets. **Imprimir / PDF** provides an A4
print layout with controls hidden, scaled diagrams and complete answers; choose Save as PDF
in your browser's print dialog.

Every top-level block — the header, the sections and the footer — has Move up, Move down
and Delete controls in text editing mode, with undo.
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

The engine travels stripped: no comments, no indentation, because nobody reads it there — you
read it in `src/`, which is where it is edited. Your two zones are left alone: the body is
ordinary HTML and the diagrams are JSON with one box per line, as readable as if you had
written them. Of the 160 KB of an empty document, some 150 are engine and catalogues: paid
once, and they do not grow with what you write.

The contract — body classes, JSON schema, box and arrow kinds — is not written down in a
separate document: the working example in [`index.html`](index.html) and the five templates in
[`templates/`](templates/) are the reference, and `src/` is the code behind them.

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

Targets recent Chrome, Edge, Firefox and Safari. Automated checks run in Chromium; Firefox
and Safari still require manual verification. On Mac the multi-select modifier is Cmd,
because Ctrl+click is the right-click; the document detects this on its own.

## Interface language

The document chrome — toolbar, dialogs, help — is available in Spanish and English. There is
a single set of controls: the strings live in `src/i18n.json`, which travels inside every
document, and the engine swaps them at runtime.

A document opens with the interface in the language it declares in `<html lang>`, so
`index.html` and `templates/en/` open in English while `template.html` and `templates/` open
in Spanish. The **Idioma** selector switches it either way, and that choice is remembered in
your browser without touching the file.

## Development

`index.html`, `template.html` and the templates in `templates/` and `templates/en/` are
generated: build them with `python src/build.py` after changing anything in `src/`. Do not
edit them by hand — the next build overwrites them.

You need Python 3, Node 22 or later, and Chrome or Chromium. The documents that come out
need none of it.

```powershell
python src/build.py
python tests/validate.py   # structure, figure and decision references, catalogues
python tests/minify.py     # stripping the engine does not change the program
python tests/peso.py       # every document fits its budget, and where the bytes go
python tests/drift.py      # the generated files match src/ byte for byte
node tests/browser.cjs     # load, edit, save, reopen, PDF and mobile
```

## License

[MIT](LICENSE) © 2026 Rodrigo Vargas Molina.

Use it, modify it and distribute it, commercial projects included. All that is asked is that
you keep the copyright notice and the licence.

---

⭐ If it was useful, a star helps it reach whoever needs it.
