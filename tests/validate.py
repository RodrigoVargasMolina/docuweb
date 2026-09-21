"""Validate generated documents without third-party dependencies."""
from pathlib import Path
from html.parser import HTMLParser
import json
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent


class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = {key: [] for key in ('data-fig', 'data-tools', 'data-svg', 'data-decision', 'data-answer')}
        self.ids = []
        self.external = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in self.refs:
            if key in attrs:
                self.refs[key].append(attrs[key])
        if tag == 'script' and 'src' in attrs:
            self.external.append(attrs['src'])


files = [ROOT / 'index.html', ROOT / 'template.html', *sorted((ROOT / 'templates').glob('*.html'))]
assert len(files) == 7
for path in files:
    html = path.read_text(encoding='utf-8')
    doc = Document()
    doc.feed(html)
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
    catalog = json.loads(re.search(r'<script id="template-data" type="application/json">(.*?)</script>', html, re.S)[1])
    assert len(catalog) == 5
    script = re.search(r'<script>\s*(.*?)</script>', html, re.S)[1]
    with tempfile.TemporaryDirectory(prefix='docuweb-syntax-') as folder:
        js = Path(folder) / 'engine.js'
        js.write_text(script, encoding='utf-8')
        subprocess.run(['node', '--check', str(js)], check=True)
    print('PASS:', path.relative_to(ROOT), 'structure, graph references, catalog and JavaScript')
