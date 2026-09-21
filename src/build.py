# -*- coding: utf-8 -*-
"""Ensambla index.html (demo) y template.html (vacio) a partir del motor.

El motor es el fichero que veniamos construyendo: estilos + guion, identicos en
ambas salidas. Lo unico que cambia entre un documento y otro es el cuerpo HTML y
el JSON de los diagramas.
"""
import io, json, re, sys
from pathlib import Path
import os
from html import escape
os.chdir(Path(__file__).resolve().parent.parent)

MOTOR = "src/motor.html"
CUERPO = "src/demo-cuerpo.html"
DATOS = "src/demo-datos.json"

motor = io.open(MOTOR, encoding="utf-8").read()
motor = motor.replace("/* STUDIO_STYLES */", Path("src/studio.css").read_text(encoding="utf-8"))
motor = motor.replace("/* STUDIO_SCRIPT */", Path("src/studio.js").read_text(encoding="utf-8") + "\n" + Path("src/drawing.js").read_text(encoding="utf-8"))
catalog = json.loads(Path("src/templates.json").read_text(encoding="utf-8"))
catalog_json = json.dumps(catalog, ensure_ascii=False).replace("<", "\\u003c")
motor = motor.replace('<script id="template-data" type="application/json">[]</script>', '<script id="template-data" type="application/json">' + catalog_json + '</script>')

# --- 1. el cuerpo del documento queda entre marcas explicitas ---------------
ini = motor.index("  <header>")
fin = motor.index("</footer>") + len("</footer>")

ABRE = ('  <!-- ═══════════════ CONTENIDO DEL DOCUMENTO ═══════════════\n'
        '       Todo lo que hay entre esta marca y la de cierre es tuyo.\n'
        '       El resto del fichero es el motor: no hace falta tocarlo.\n'
        '       Contrato completo en AGENTS.md.\n'
        '  ════════════════════════════════════════════════════════ -->\n')
CIERRA = ('\n  <!-- ═══════════════ FIN DEL CONTENIDO ═══════════════ -->')

def ensambla(cuerpo, datos, titulo, marca, descripcion):
    out = motor[:ini] + ABRE + cuerpo.rstrip("\n") + CIERRA + motor[fin:]

    # titulo de la pestana y de la galeria
    out = re.sub(r"<title>.*?</title>", "<title>" + titulo + "</title>", out, count=1)
    out = re.sub(r'<meta name="description" content=".*?">',
                 '<meta name="description" content="' + descripcion + '">', out, count=1)
    # marca de la barra superior
    out = re.sub(r'<span class="brandmark">.*?</span>',
                 '<span class="brandmark">' + marca + '</span>', out, count=1)
    # datos de los diagramas
    a = out.index('<script id="diagram-data" type="application/json">')
    a = out.index(">", a) + 1
    b = out.index("</script>", a)
    texto = json.dumps(datos, ensure_ascii=False, indent=2).replace("<", "\\u003c")
    return out[:a] + "\n" + texto + "\n" + out[b:]

# --- 2. la demo -------------------------------------------------------------
demo = ensambla(
    io.open(CUERPO, encoding="utf-8").read(),
    json.loads(io.open(DATOS, encoding="utf-8").read()),
    "Sacar las escrituras del monolito",
    "docuweb · documento de ejemplo",
    "Documento de ejemplo de docuweb: diagramas editables, notas de revision, "
    "respuestas a decisiones y versionado en un unico fichero HTML.")
io.open("index.html", "w", encoding="utf-8", newline="").write(demo)

# --- 3. la plantilla vacia --------------------------------------------------
CUERPO_VACIO = """  <header>
    <p class="kicker">Ámbito o proyecto</p>
    <h1>Título del documento</h1>
    <p class="lede">
      Una o dos frases que digan qué defiende este documento. Lo que el lector debe
      llevarse aunque no siga leyendo.
    </p>
    <div class="meta">
      <span class="pill is-draft">Borrador</span>
      <span class="pill">Fecha</span>
    </div>
  </header>

  <section>
    <h2>Primera sección</h2>
    <p>
      El texto que prepara la figura: qué hay que mirar y por qué importa.
    </p>
    <figure data-fig="f1">
      <div class="figtools" data-tools="f1"></div>
      <div class="canvas canvas--mid"><svg data-svg="f1" role="img" aria-label="Describe aquí el diagrama para quien no puede verlo."></svg></div>
      <figcaption>
        <b>La afirmación que sostiene la figura.</b> Una figura, una idea: si hacen falta
        dos frases sin relación, probablemente hagan falta dos figuras.
      </figcaption>
    </figure>
  </section>

  <section>
    <h2>Decisiones abiertas</h2>
    <p class="deccount" id="dec-count"></p>
    <ol class="decisions">
      <li data-decision="1"><span class="num">01</span><div>
        <p class="decision-q">¿La pregunta que hay que resolver?</p>
        <p class="decision-w">Por qué importa y qué cambia según la respuesta.</p>
      </div>
        <div class="answer"><span class="lbl">↳ Respuesta:</span><textarea data-answer="1" rows="1" placeholder="sin responder"></textarea></div>
      </li>
    </ol>
  </section>

  <footer>
    <p>
      De dónde sale lo que dice este documento y a qué fecha.
    </p>
  </footer>"""

DATOS_VACIOS = {
    "version": 1,
    "meta": {"rev": 1, "savedAt": "", "savedBy": "", "history": []},
    "answers": {},
    "figures": {
        "f1": {
            "w": 640, "h": 220,
            "nodes": [
                {"id": "a", "x": 40, "y": 80, "w": 160, "h": 56, "kind": "box",
                 "title": "origen", "sub": "de dónde sale"},
                {"id": "b", "x": 260, "y": 80, "w": 160, "h": 56, "kind": "new",
                 "title": "pieza nueva"},
                {"id": "c", "x": 480, "y": 80, "w": 120, "h": 56, "kind": "box",
                 "title": "destino"}
            ],
            "edges": [
                {"id": "e1", "from": "a", "to": "b", "label": "qué viaja"},
                {"id": "e2", "from": "b", "to": "c", "label": "qué escribe"}
            ]
        }
    }
}

plantilla = ensambla(CUERPO_VACIO, DATOS_VACIOS,
                     "Título del documento",
                     "Ámbito o proyecto",
                     "Documento creado con docuweb.")
io.open("template.html", "w", encoding="utf-8", newline="").write(plantilla)

print("index.html   %7d bytes" % len(demo.encode("utf-8")))
print("template.html %6d bytes" % len(plantilla.encode("utf-8")))

# Purpose-specific documents remain standalone HTML files.
Path("templates").mkdir(exist_ok=True)
for entry in catalog:
    data = {"version": 1, "meta": {"rev": 1, "savedAt": "", "savedBy": "", "history": []},
            "answers": {}, "figures": entry["figures"],
            "document": {"html": entry["html"], "design": entry["design"], "theme": "auto"}}
    html = ensambla(entry["html"], data, escape(entry["title"]),
                    "docuweb · " + escape(entry["title"]), escape(entry["description"], quote=True))
    html = html.replace('<html lang="es">', '<html lang="es" data-design="' + entry["design"] + '">', 1)
    Path("templates", entry["id"] + ".html").write_text(html, encoding="utf-8")
print("templates/    %d documentos" % len(catalog))
