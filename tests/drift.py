# -*- coding: utf-8 -*-
"""Comprueba que las salidas generadas coinciden con las fuentes.

Si alguien edita a mano `index.html`, `template.html` o una plantilla, su motor deja de
coincidir con `src/` y la siguiente compilacion lo pisa sin avisar: la deriva se descubre
tarde, cuando ya se ha perdido el cambio o cuando el documento que circula es distinto del
que produce el repositorio.

Esta prueba recompila en una carpeta temporal y compara byte a byte. No toca el arbol de
trabajo: si algo no cuadra, falla y dice que ficheros se han separado de las fuentes.

Uso: python tests/drift.py
"""
import filecmp
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def salidas(root):
    """Los documentos que build.py genera, en orden estable."""
    return sorted(
        [Path('index.html'), Path('template.html')]
        + [p.relative_to(root) for p in (root / 'templates').rglob('*.html')]
    )


def main():
    # Los documentos que el repositorio tiene por generados. Se recorren los que hay en
    # disco, no una lista fija: asi un fichero anadido a mano tambien se delata.
    esperadas = salidas(ROOT)

    with tempfile.TemporaryDirectory(prefix='docuweb-deriva-') as tmp:
        tmp = Path(tmp)
        # build.py hace chdir al padre de src/, asi que basta con copiar src/
        shutil.copytree(ROOT / 'src', tmp / 'src')
        compilacion = subprocess.run(
            [sys.executable, 'src/build.py'], cwd=tmp,
            capture_output=True, text=True)
        if compilacion.returncode != 0:
            print('FALLA: no se pudo compilar en la carpeta temporal')
            print(compilacion.stdout, compilacion.stderr)
            return 1

        problemas = []
        for rel in esperadas:
            nueva = tmp / rel
            if not nueva.exists():
                problemas.append((rel, 'esta en el repositorio pero no sale de las fuentes'))
            elif not filecmp.cmp(ROOT / rel, nueva, shallow=False):
                problemas.append((rel, 'no coincide con las fuentes de src/'))

        for rel in salidas(tmp):
            if rel not in esperadas:
                problemas.append((rel, 'las fuentes lo generan pero falta en el repositorio'))

    if problemas:
        for rel, motivo in problemas:
            print('FALLA:', rel, '-', motivo)
        print()
        print('Algun documento generado se ha separado de src/.')
        print('Recompila con:  python src/build.py')
        print('No edites a mano index.html, template.html ni las plantillas:')
        print('se pierden en la siguiente compilacion.')
        return 1

    print('PASS: las %d salidas generadas coinciden byte a byte con src/' % len(esperadas))
    return 0


if __name__ == '__main__':
    sys.exit(main())
