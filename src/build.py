# -*- coding: utf-8 -*-
"""Ensambla index.html (demo) y template.html (vacio) a partir del motor.

El motor es el fichero que veniamos construyendo: estilos + guion, identicos en
ambas salidas. Lo unico que cambia entre un documento y otro es el cuerpo HTML y
el JSON de los diagramas.

Las fuentes de `src/` estan escritas para leerse: comentarios, sangrado y nombres
largos. Lo que sale son documentos que viajan solos por correo o por disco, sin
servidor que los comprima, asi que al ensamblarlos se les quita todo lo que el
navegador no lee (`minify`). Las dos zonas que alguien puede editar a mano -el
cuerpo del documento y el JSON de los diagramas- se quedan como estan.
"""
import io, json, re, sys
from pathlib import Path
import os
from html import escape
import minify
os.chdir(Path(__file__).resolve().parent.parent)

MOTOR = "src/motor.html"
CUERPO = "src/demo-cuerpo.html"
DATOS = "src/demo-datos.json"
CADENAS = "src/i18n.json"


def encoge(texto, abre, cierra, recorta, desde=0):
    """Sustituye por su version recortada lo que hay entre dos marcas."""
    i = texto.index(abre, desde) + len(abre)
    j = texto.index(cierra, i)
    return texto[:i] + recorta(texto[i:j]) + texto[j:]


def traspon(catalogo):
    """El catalogo de cadenas con cada clave escrita una vez, no una por idioma.

    Son 307 claves y dos idiomas: repetirlas cuesta varios kilobytes en cada
    documento. El motor lo vuelve a montar al abrir, en cuatro lineas.
    """
    claves = list(catalogo["es"])
    salida = {"keys": claves}
    for code, tabla in catalogo.items():
        assert set(tabla) == set(claves), ("las claves de " + code + " no son las de es")
        salida[code] = [tabla[clave] for clave in claves]
    return salida


motor = io.open(MOTOR, encoding="utf-8").read()
motor = motor.replace("/* STUDIO_STYLES */", Path("src/studio.css").read_text(encoding="utf-8"))
motor = motor.replace("/* STUDIO_SCRIPT */", Path("src/studio.js").read_text(encoding="utf-8") + "\n" + Path("src/drawing.js").read_text(encoding="utf-8"))
catalog = json.loads(Path("src/templates.json").read_text(encoding="utf-8"))
motor = motor.replace('<script id="template-data" type="application/json">[]</script>',
                      '<script id="template-data" type="application/json">' + minify.compacto(catalog) + '</script>')
# catalogo de cadenas de la interfaz: viaja dentro de cada documento, como el resto
i18n = json.loads(Path(CADENAS).read_text(encoding="utf-8"))
motor = motor.replace('<script id="i18n-data" type="application/json">{}</script>',
                      '<script id="i18n-data" type="application/json">' + minify.compacto(traspon(i18n)) + '</script>')
# estilos y guion: el navegador no lee los comentarios ni el sangrado, y quien quiera
# leerlos tiene las fuentes de src/, que es donde se editan
motor = encoge(motor, "<style>", "</style>", minify.css)
motor = encoge(motor, "<script>", "</script>", minify.js, desde=motor.index('id="i18n-data"'))

# --- 1. el cuerpo del documento queda entre marcas explicitas ---------------
ini = motor.index("  <header>")
fin = motor.index("</footer>") + len("</footer>")

ABRE = ('  <!-- ═══════════════ CONTENIDO DEL DOCUMENTO ═══════════════\n'
        '       Todo lo que hay entre esta marca y la de cierre es tuyo.\n'
        '       El resto del fichero es el motor: no hace falta tocarlo.\n'
        '  ════════════════════════════════════════════════════════ -->\n')
CIERRA = ('\n  <!-- ═══════════════ FIN DEL CONTENIDO ═══════════════ -->')

def ensambla(cuerpo, datos, titulo, marca, descripcion, lang="es"):
    out = motor[:ini] + ABRE + cuerpo.rstrip("\n") + CIERRA + motor[fin:]

    # idioma del documento: de aqui sale el idioma con el que abre la interfaz
    out = re.sub(r'<html lang="[^"]*"', '<html lang="' + lang + '"', out, count=1)
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
    return out[:a] + "\n" + minify.diagramas(datos) + "\n" + out[b:]

# --- 2. la demo -------------------------------------------------------------
demo = ensambla(
    io.open(CUERPO, encoding="utf-8").read(),
    json.loads(io.open(DATOS, encoding="utf-8").read()),
    "Taking the writes out of the monolith",
    "docuweb · example document",
    "docuweb example document: editable diagrams, review notes, decision answers "
    "and versioning in a single HTML file.",
    lang="en")
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

# Purpose-specific documents remain standalone HTML files. Cada plantilla se publica
# en los dos idiomas: el documento declara el suyo en <html lang>, y de ahi sale tambien
# el idioma con el que abre su interfaz.
Path("templates").mkdir(exist_ok=True)

def variante(entry, lang):
    """El titulo, la descripcion, el cuerpo y las figuras de una plantilla en un idioma."""
    en = (entry.get("i18n") or {}).get("en")
    if lang == "en" and en:
        return {"title": en["title"], "description": en["description"],
                "html": en["html"], "figures": en.get("figures") or entry["figures"]}
    return {"title": entry["title"], "description": entry["description"],
            "html": entry["html"], "figures": entry["figures"]}

for entry in catalog:
    for lang, carpeta in (("es", Path("templates")), ("en", Path("templates", "en"))):
        v = variante(entry, lang)
        # el cuerpo va una sola vez, en la zona de contenido. El motor lo lee de ahi al
        # abrir, asi que repetirlo dentro del JSON solo hacia el fichero mas gordo.
        data = {"version": 1, "meta": {"rev": 1, "savedAt": "", "savedBy": "", "history": []},
                "answers": {}, "figures": v["figures"],
                "document": {"design": entry["design"], "theme": "auto"}}
        html = ensambla(v["html"], data, escape(v["title"]),
                        "docuweb · " + escape(v["title"]), escape(v["description"], quote=True),
                        lang=lang)
        html = html.replace('<html lang="' + lang + '">',
                            '<html lang="' + lang + '" data-design="' + entry["design"] + '">', 1)
        carpeta.mkdir(parents=True, exist_ok=True)
        # newline="": igual que index.html y template.html. Sin esto, en Windows cada
        # salto se escribe con dos bytes y el fichero deja de ser el mismo en cada sistema.
        io.open(carpeta / (entry["id"] + ".html"), "w", encoding="utf-8", newline="").write(html)
print("templates/    %d documentos en dos idiomas" % (len(catalog) * 2))
