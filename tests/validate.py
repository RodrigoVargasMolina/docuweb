"""Validate generated documents without third-party dependencies."""
from pathlib import Path
from html.parser import HTMLParser
import json
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
ANCHORS = {'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'}


class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = {key: [] for key in ('data-fig', 'data-tools', 'data-svg', 'data-decision', 'data-answer')}
        self.ids = []
        self.external = []
        self.i18n = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in self.refs:
            if key in attrs:
                self.refs[key].append(attrs[key])
        for key, value in attrs.items():
            if key.startswith('data-i18n-'):
                self.i18n.append(value)
        if tag == 'script' and 'src' in attrs:
            self.external.append(attrs['src'])


# Cada documento declara su idioma en <html lang>, y de ahi sale el de su interfaz.
files = [ROOT / 'index.html', ROOT / 'template.html',
         *sorted((ROOT / 'templates').rglob('*.html'))]
assert len(files) == 12, len(files)
for path in files:
    html = path.read_text(encoding='utf-8')
    doc = Document()
    doc.feed(html)
    lang = re.search(r'<html lang="([^"]*)"', html).group(1)
    esperado = 'en' if (path == ROOT / 'index.html' or path.parent.name == 'en') else 'es'
    assert lang == esperado, (path, 'document language', lang, esperado)
    assert len(doc.ids) == len(set(doc.ids)), (path, 'duplicate HTML ids')
    assert not doc.external, (path, 'runtime must be inline')
    assert 'STUDIO_SCRIPT' not in html and 'STUDIO_STYLES' not in html
    model = json.loads(re.search(r'<script id="diagram-data" type="application/json">(.*?)</script>', html, re.S)[1])
    for key in ('data-fig', 'data-tools', 'data-svg'):
        assert sorted(doc.refs[key]) == sorted(model['figures']), (path, key)
    assert doc.refs['data-decision'] == doc.refs['data-answer'], path
    for figure in model['figures'].values():
        nodes = {node['id'] for node in figure['nodes']}
        assert len(nodes) == len(figure['nodes']), path
        for edge in figure['edges']:
            assert edge['from'] in nodes and edge['to'] in nodes, (path, edge)
            assert 'wp' not in edge, (path, edge, 'generated documents write wps')
            for key in ('fromAnchor', 'toAnchor'):
                assert edge.get(key, 'n') in ANCHORS, (path, edge, key)
            for point in edge.get('wps', []):
                assert isinstance(point.get('x'), (int, float)), (path, edge)
                assert isinstance(point.get('y'), (int, float)), (path, edge)
    catalog = json.loads(re.search(r'<script id="template-data" type="application/json">(.*?)</script>', html, re.S)[1])
    assert len(catalog) == 5
    # El catalogo de la interfaz viaja traspuesto -las claves una sola vez y, por
    # idioma, sus textos en el mismo orden-, tiene que estar completo y en los dos idiomas.
    i18n = json.loads(re.search(r'<script id="i18n-data" type="application/json">(.*?)</script>', html, re.S)[1])
    assert set(i18n) == {'keys', 'es', 'en'}, (path, 'the catalog carries keys plus exactly es and en')
    claves = i18n['keys']
    assert len(set(claves)) == len(claves), (path, 'duplicate interface key')
    for code in ('es', 'en'):
        assert len(i18n[code]) == len(claves), (path, 'both languages must share the same keys', code)
        assert all(text is not None for text in i18n[code]), (path, 'missing string', code)
    for key in doc.i18n:
        assert key in claves, (path, 'unknown interface key', key)
    # Cada plantilla del catalogo publica su titulo, su descripcion y su cuerpo en ingles.
    for entry in catalog:
        assert 'i18n' in entry and 'en' in entry['i18n'], (path, 'template without English', entry['id'])
        for field in ('title', 'description', 'html'):
            assert entry['i18n']['en'].get(field), (path, entry['id'], field)
    script = re.search(r'<script>\s*(.*?)</script>', html, re.S)[1]
    with tempfile.TemporaryDirectory(prefix='docuweb-syntax-') as folder:
        js = Path(folder) / 'engine.js'
        js.write_text(script, encoding='utf-8')
        subprocess.run(['node', '--check', str(js)], check=True)
    print('PASS:', path.relative_to(ROOT), 'structure, graph references, catalog and JavaScript')

# Cada plantilla tiene que existir suelta en los dos idiomas.
catalogo = json.loads((ROOT / 'src' / 'templates.json').read_text(encoding='utf-8'))
for entry in catalogo:
    for carpeta in (ROOT / 'templates', ROOT / 'templates' / 'en'):
        assert (carpeta / (entry['id'] + '.html')).exists(), (entry['id'], carpeta)
print('PASS: templates/ and templates/en/ carry the five templates each')
