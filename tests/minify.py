# -*- coding: utf-8 -*-
"""Comprueba que recortar el motor no lo cambia.

Un minificador que se equivoca no rompe la compilacion: produce un documento que abre
y falla mas tarde, al pulsar algo. Por eso aqui no se comprueba que salga mas corto
-eso ya lo mide `tests/peso.py`- sino que salga *lo mismo*.

La comprobacion principal es de equivalencia: se trocea el guion original, se trocea el
recortado y las dos listas de tokens tienen que ser identicas. Un token de mas, de menos
o distinto, y falla. Despues estan los casos con trampa, que es donde los minificadores
caseros se rompen: la barra que no es division, el salto de linea que es un punto y coma
y los signos que al juntarse forman otro.

Uso: python tests/minify.py
"""
import io
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'src'))
import minify  # noqa: E402

fallos = []


def comprueba(titulo, entrada, esperado=None):
    """El recorte conserva los tokens y, si se dice, sale exactamente asi."""
    try:
        salida = minify.js(entrada)
    except Exception as err:                       # noqa: BLE001
        fallos.append('%s: el tokenizador se atraganto (%s)' % (titulo, err))
        return
    antes = [(k, t) for k, t, _ in minify._tokeniza_js(entrada)]
    despues = [(k, t) for k, t, _ in minify._tokeniza_js(salida)]
    if antes != despues:
        fallos.append('%s: los tokens cambian\n  %r\n  %r' % (titulo, antes, despues))
    elif esperado is not None and salida != esperado:
        fallos.append('%s: sale %r y se esperaba %r' % (titulo, salida, esperado))


# --- la barra: division, comentario o expresion regular --------------------
comprueba('division', 'var r = a / b / c;', 'var r=a/b/c;')
comprueba('regex tras igual', 'var r = /a\\/b[/]c/g;', 'var r=/a\\/b[/]c/g;')
comprueba('regex tras return', 'function f(){ return /x/.test(s); }',
          'function f(){return /x/.test(s);}')
comprueba('division tras parentesis', 'var r = (a + b) / 2;', 'var r=(a+b)/2;')
comprueba('division tras corchete', 'var r = xs[0] / 2;', 'var r=xs[0]/2;')
# el `)` de una condicion no cierra ninguna cuenta: detras puede venir una regex
comprueba('regex tras condicion', 'if (x) /a b/.test(y);', 'if(x)/a b/.test(y);')
comprueba('division tras llamada dentro de la condicion', 'if (f(a) / 2 > 1) g();',
          'if(f(a)/2>1)g();')
comprueba('regex tras cabecera de for', 'for (;;) /a\\/b/.test(y);', 'for(;;)/a\\/b/.test(y);')
comprueba('comentario de linea', 'var a = 1; // nota\nvar b = 2;', 'var a=1;var b=2;')
comprueba('comentario de bloque', 'var a = /* nota */ 1;', 'var a=1;')
comprueba('barra dentro de cadena', 'var s = "// esto no es un comentario";')

# --- el salto de linea que es un punto y coma ------------------------------
comprueba('return con salto', 'function f(){\n  return\n  x\n}', 'function f(){return\nx}')
comprueba('llamada en la linea siguiente', 'var a = b\n(c)', 'var a=b\n(c)')
comprueba('corchete en la linea siguiente', 'var a = b\n[c]', 'var a=b\n[c]')
comprueba('mas en la linea siguiente', 'var a = b\n+c', 'var a=b\n+c')
comprueba('incremento en la linea siguiente', 'a = b\n++c', 'a=b\n++c')
comprueba('decremento en la linea siguiente', 'a = b\n--c', 'a=b\n--c')
# sin el salto, `break\nbucle` pasa de romper el bucle a romper la etiqueta `bucle`
comprueba('break con etiqueta debajo', 'bucle: for(;;){ break\nbucle; }',
          'bucle:for(;;){break\nbucle;}')
comprueba('continue con etiqueta debajo', 'bucle: for(;;){ continue\nbucle; }',
          'bucle:for(;;){continue\nbucle;}')
comprueba('salto sin riesgo', 'var a = 1;\nvar b = 2;', 'var a=1;var b=2;')

# --- signos que al juntarse forman otro ------------------------------------
comprueba('mas y mas', 'var a = b + +c;', 'var a=b+ +c;')
comprueba('menos y menos', 'var a = b - -c;', 'var a=b- -c;')
comprueba('mas e incremento', 'var a = b + ++c;', 'var a=b+ ++c;')
comprueba('palabra y palabra', 'typeof x === "n"', 'typeof x==="n"')
comprueba('numero y punto', 'var s = 1 .toString();', 'var s=1 .toString();')
comprueba('decimal y propiedad', 'var s = 1..toString();', 'var s=1. .toString();')
comprueba('decimal sin entero', 'var a = .5 + 1.5;', 'var a=.5+1.5;')
comprueba('exponente', 'var a = 1e3 + 1.5e-7;', 'var a=1e3+1.5e-7;')
comprueba('hexadecimal', 'var a = 0xff + 0b11;', 'var a=0xff+0b11;')
comprueba('menor y admiracion', 'var a = b < !c;', 'var a=b< !c;')

# --- cadenas y plantillas: dentro no se toca nada --------------------------
comprueba('llave dentro de cadena', 'var s = "} no cierra nada";')
comprueba('salto escapado', 'var s = "linea\\nlinea";')
comprueba('plantilla con hueco', 'var s = `hola ${ a + b } adios`;', 'var s=`hola ${ a + b } adios`;')
comprueba('plantilla anidada', 'var s = `a${`b${c}d`}e`;', 'var s=`a${`b${c}d`}e`;')

# --- el caso que importa: el motor de verdad -------------------------------
motor = io.open(ROOT / 'src' / 'motor.html', encoding='utf-8').read()
inicio = motor.index('<script>', motor.index('id="i18n-data"')) + len('<script>')
guion = motor[inicio:motor.rindex('</script>')].replace(
    '/* STUDIO_SCRIPT */',
    (ROOT / 'src' / 'studio.js').read_text(encoding='utf-8') + '\n' +
    (ROOT / 'src' / 'drawing.js').read_text(encoding='utf-8'))
comprueba('el motor entero', guion)
recortado = minify.js(guion)
# Idempotente: recortar lo ya recortado no puede quitar ni un byte mas. Si lo quita,
# es que la primera pasada dejo algo que no hacia falta.
if minify.js(recortado) != recortado:
    fallos.append('el motor: recortar dos veces no da lo mismo que recortar una')
tokens = len(minify._tokeniza_js(guion))

# --- CSS: solo sobra lo que no se lee --------------------------------------
casos_css = [
    ('comentario', '/* nota */ .a{color:red}', '.a{color:red}'),
    ('sangrado', '.a {\n  color: red;\n}', '.a{color:red}'),
    ('ultimo punto y coma', '.a{color:red;}', '.a{color:red}'),
    ('descendencia', '.a .b{color:red}', '.a .b{color:red}'),
    ('hijo directo', '.a > .b {color:red}', '.a>.b{color:red}'),
    ('calc conserva el espacio', '.a{width:calc(100% - 16px)}', '.a{width:calc(100% - 16px)}'),
    ('media query', '@media (max-width:560px) {\n  .a{color:red}\n}', '@media (max-width:560px){.a{color:red}}'),
    ('contenido de cadena', '.a::after{content:"  a ; b  "}', '.a::after{content:"  a ; b  "}'),
]
for titulo, entrada, esperado in casos_css:
    salida = minify.css(entrada)
    if salida != esperado:
        fallos.append('css %s: sale %r y se esperaba %r' % (titulo, salida, esperado))

hojas = ''.join([
    motor[motor.index('<style>') + len('<style>'):motor.index('</style>')].replace(
        '/* STUDIO_STYLES */', (ROOT / 'src' / 'studio.css').read_text(encoding='utf-8'))])
if minify.css(minify.css(hojas)) != minify.css(hojas):
    fallos.append('las hojas de estilo: recortar dos veces no da lo mismo que recortar una')

# --- el escape del JSON dentro de <script> ---------------------------------
casos_json = [
    ('cierre de etiqueta', '"a</script>b"', '"a<\\/script>b"'),
    ('apertura de comentario', '"a<!--b"', '"a\\u003c!--b"'),
    ('menor suelto', '"a < b"', '"a < b"'),
]
for titulo, entrada, esperado in casos_json:
    salida = minify.escapa_json(entrada)
    if salida != esperado:
        fallos.append('escape %s: sale %r y se esperaba %r' % (titulo, salida, esperado))
    if '</' in salida or '<!--' in salida:
        fallos.append('escape %s: deja al analizador de HTML entrar en el JSON' % titulo)

# --- el JSON de los diagramas se lee y se sigue leyendo --------------------
import json  # noqa: E402
datos = json.loads((ROOT / 'src' / 'demo-datos.json').read_text(encoding='utf-8'))
texto = minify.diagramas(datos)
if json.loads(texto.replace('<\\/', '</')) != datos:
    fallos.append('los diagramas: el JSON formateado no vuelve a leerse igual')
# Una caja corta ocupa una linea entera, con su id y su posicion juntos. Si aparece
# `"id": ` con espacio es que json.dumps la ha repartido en ocho lineas.
cajas = datos['figures'][next(iter(datos['figures']))]['nodes']
assert cajas, 'la demo deberia traer cajas'
for caja in cajas:
    linea = [l for l in texto.split('\n') if '"id":"%s"' % caja['id'] in l]
    if not linea:
        fallos.append('los diagramas: la caja %s no cabe en una linea' % caja['id'])
    elif '"x"' not in linea[0]:
        fallos.append('los diagramas: la caja %s se reparte en varias lineas' % caja['id'])

if fallos:
    for f in fallos:
        print('FALLA:', f)
    sys.exit(1)
print('PASS: recortar el motor (%d tokens) conserva el programa token a token' % tokens)
print('PASS: la barra, el punto y coma automatico, las plantillas y los signos pegados')
print('PASS: el CSS pierde comentarios y sangrado y conserva calc(), cadenas y selectores')
print('PASS: el JSON no deja entrar al analizador de HTML y se relee igual')
