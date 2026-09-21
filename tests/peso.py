# -*- coding: utf-8 -*-
"""Vigila lo que pesa cada documento y por que.

Un documento docuweb viaja solo: por correo, en un pendrive, en la carpeta de descargas.
No hay servidor que lo comprima ni cache que lo guarde, asi que cada byte del fichero es
un byte que alguien se lleva. El peso es un requisito, no una consecuencia, y un requisito
sin prueba se deshace solo: basta con un catalogo nuevo, una fuente sin recortar o un
campo que se cuela dos veces en el JSON.

Esta prueba hace dos cosas. Imprime el reparto -cuanto ocupa el motor, cuanto los
catalogos y cuanto el documento de verdad-, para que al mirarla se sepa donde tocar. Y
pone techo a cada salida, ademas de comprobar los cuatro mecanismos que sostienen el
peso actual: que estilos y guion salen recortados, que el JSON no se escapa mas caro de
lo necesario y que el cuerpo del documento viaja una sola vez.

Uso: python tests/peso.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'src'))
import minify  # noqa: E402

KB = 1024

# Techos. Con holgura sobre lo que se mide hoy: no estan para afinar bytes, sino para
# que un cambio que anada decenas de kilobytes no pase sin que nadie lo vea.
TECHOS = {
    'index.html': 175 * KB,      # la demo, con su contenido y sus diagramas
    'template.html': 165 * KB,   # el documento vacio: casi todo es motor
    'plantilla': 165 * KB,       # cada uno de los diez documentos de templates/
}


def zonas(html):
    """Lo que ocupa cada parte del fichero, en bytes.

    En bytes y no en caracteres: los acentos de los textos ocupan dos y el reparto
    tiene que sumar lo que pesa el fichero, no lo que mide la cadena.
    """
    def entre(abre, cierra, desde=0):
        i = html.index(abre, desde)
        j = html.index(cierra, i + len(abre)) + len(cierra)
        return len(html[i:j].encode('utf-8'))

    reparto = {'estilos': entre('<style>', '</style>')}
    for marca in ('diagram-data', 'template-data', 'i18n-data'):
        reparto[marca] = entre('<script id="%s"' % marca, '</script>')
    i = html.index('<script>', html.index('id="i18n-data"'))
    j = html.rindex('</script>') + len('</script>')
    reparto['guion'] = len(html[i:j].encode('utf-8'))
    reparto['contenido'] = entre('CONTENIDO DEL DOCUMENTO', 'FIN DEL CONTENIDO')
    reparto['resto'] = len(html.encode('utf-8')) - sum(reparto.values())
    return reparto


def motor_de(html):
    """El guion y las hojas de estilo tal y como viajan en el documento."""
    i = html.index('<script>', html.index('id="i18n-data"')) + len('<script>')
    guion = html[i:html.rindex('</script>')]
    i = html.index('<style>') + len('<style>')
    return guion, html[i:html.index('</style>')]


fallos = []
documentos = [ROOT / 'index.html', ROOT / 'template.html',
              *sorted((ROOT / 'templates').rglob('*.html'))]

print('%-40s %8s  %s' % ('documento', 'bytes', 'techo'))
for path in documentos:
    # los bytes que hay en el disco, sin que Python traduzca saltos de linea por el camino
    crudo_bytes = path.read_bytes()
    html = crudo_bytes.decode('utf-8')
    peso = len(crudo_bytes)
    techo = TECHOS.get(path.name if path.parent == ROOT else 'plantilla')
    rel = path.relative_to(ROOT).as_posix()
    print('%-40s %8d  %s' % (rel, peso, 'OK' if peso <= techo else 'SE PASA'))
    if peso > techo:
        fallos.append('%s pesa %d bytes y el techo son %d' % (rel, peso, techo))

    guion, estilos = motor_de(html)
    # Recortar lo ya recortado no puede quitar nada: si quita, es que salio sin recortar.
    if minify.js(guion) != guion:
        fallos.append('%s: el guion viaja sin recortar' % rel)
    if minify.css(estilos) != estilos:
        fallos.append('%s: las hojas de estilo viajan sin recortar' % rel)
    if '\\u003c' in guion.replace('\\u003c!--', ''):
        fallos.append('%s: el guion escapa `<` a seis bytes por cada uno' % rel)

    for marca in ('diagram-data', 'template-data', 'i18n-data'):
        crudo = re.search('<script id="%s"[^>]*>(.*?)</script>' % marca, html, re.S)[1]
        if '\\u003c' in crudo.replace('\\u003c!--', ''):
            fallos.append('%s: %s escapa `<` a seis bytes por cada uno' % (rel, marca))
        json.loads(crudo)  # si el escape se pasa de listo, esto revienta

    modelo = json.loads(re.search(
        r'<script id="diagram-data" type="application/json">(.*?)</script>', html, re.S)[1])
    if 'html' in (modelo.get('document') or {}):
        fallos.append('%s: el cuerpo del documento viaja dos veces, tambien dentro del JSON' % rel)

# El reparto de las dos salidas que enseñan los dos extremos: la que solo es motor y la
# que ademas trae un documento escrito.
print()
print('%-14s %9s %9s' % ('zona', 'template', 'index'))
leer = lambda nombre: zonas((ROOT / nombre).read_bytes().decode('utf-8'))
vacio, demo = leer('template.html'), leer('index.html')
for zona in ('guion', 'estilos', 'i18n-data', 'template-data', 'diagram-data', 'contenido', 'resto'):
    print('%-14s %9d %9d' % (zona, vacio[zona], demo[zona]))
print('%-14s %9d %9d' % ('TOTAL', sum(vacio.values()), sum(demo.values())))

if fallos:
    print()
    for f in fallos:
        print('FALLA:', f)
    sys.exit(1)
print()
print('PASS: los %d documentos caben en su techo' % len(documentos))
print('PASS: viajan con el motor recortado, el JSON escapado al minimo y el cuerpo una sola vez')
