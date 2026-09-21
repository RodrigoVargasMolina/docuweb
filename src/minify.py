# -*- coding: utf-8 -*-
"""Recorta el motor sin cambiar lo que hace.

El documento viaja solo: no hay servidor que lo comprima ni cache que lo guarde, asi
que cada byte del fichero es un byte que el lector se descarga o se lleva en el correo.
Estas funciones quitan lo que el navegador no necesita -comentarios, sangrado, saltos
de linea- y no tocan nada mas: ni renombran variables ni reordenan nada. Lo que entra y
lo que sale son el mismo programa, token a token.

Sin dependencias: el resto del repositorio tampoco las tiene.

`tests/minify.py` comprueba caso por caso lo que aqui se afirma.
"""
import json
import re

# ---------------------------------------------------------------------------
# JavaScript
# ---------------------------------------------------------------------------
# Un minificador de JavaScript solo es seguro si sabe donde empieza y acaba cada
# token: una barra puede abrir un comentario, una division o una expresion regular,
# y un salto de linea puede ser decorativo o puede ser el punto y coma que el
# lenguaje inserta por ti. El tokenizador de abajo distingue los dos casos; el
# ensamblador solo pega tokens y decide que separador hace falta entre cada par.

_ESPACIO = " \t\v\f\ufeff\xa0"
_SALTO = "\n\r\u2028\u2029"

# Un identificador puede llevar acentos y otras letras: se aceptan por rango, no por
# lista, para no separar dos tokens que en realidad son uno.
_ID = re.compile(r"[A-Za-z_$\u00aa-\uffff][A-Za-z0-9_$\u00aa-\uffff]*")
# El punto final cuenta como parte del numero: en `1..toString()` el primero es el
# decimal de `1.` y solo el segundo accede a la propiedad.
_NUMERO = re.compile(
    r"0[xXbBoO][0-9a-fA-F_]+n?"
    r"|\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?n?"
    r"|\.\d[\d_]*(?:[eE][+-]?\d+)?")

# Signos de puntuacion, de mas largo a mas corto: el tokenizador coge siempre el
# primero que encaja, asi que `>>>=` nunca se lee como `>` seguido de `>>=`.
_SIGNOS = sorted([
    ">>>=", "...", "===", "!==", "**=", "<<=", ">>=", ">>>", "&&=", "||=", "??=",
    "=>", "==", "!=", "<=", ">=", "&&", "||", "??", "?.", "++", "--", "+=", "-=",
    "*=", "/=", "%=", "&=", "|=", "^=", "<<", ">>", "**",
    "{", "}", "(", ")", "[", "]", ";", ",", "<", ">", "+", "-", "*", "/", "%",
    "&", "|", "^", "!", "~", "?", ":", "=", ".", "#", "@",
], key=len, reverse=True)

# Detras de estas palabras una barra abre una expresion regular, no una division.
_ANTES_DE_REGEX = frozenset("""
    return typeof instanceof in of new delete void throw case do else yield await
    if while for with switch
""".split())

# Estas abren un parentesis que no es una expresion, sino una condicion o una cabecera.
# Detras del `)` que lo cierra empieza una instruccion, no continua ninguna cuenta.
_ABREN_CONDICION = frozenset("if while for switch catch with".split())

# Un token que puede cerrar una expresion: si el siguiente empieza otra y entre los dos
# habia un salto de linea, ese salto es un punto y coma y hay que conservarlo.
_CIERRA_EXPRESION = frozenset(["nombre", "numero", "cadena", "plantilla", "regex"])
_SIGNOS_QUE_CIERRAN = frozenset([")", "]", "}", "++", "--"])
_SIGNOS_QUE_ABREN = frozenset(["(", "[", "{", "+", "-", "!", "~", "/", "++", "--"])


def _tokeniza_js(src):
    """Trocea el guion en (clase, texto, habia_salto_antes).

    `clase` es "nombre", "numero", "cadena", "plantilla", "regex" o "signo". Los
    comentarios no salen: lo unico que dejan es su salto de linea, que si importa.
    """
    i, n = 0, len(src)
    salida = []
    salto = False
    anterior = None   # ultimo token real, para saber si una `/` abre una regex
    parentesis = []   # por cada `(` abierto, si era el de un `if`/`while`/`for`
    condicion = False  # el ultimo `)` cerraba una condicion, no una expresion

    def puede_regex():
        if anterior is None:
            return True
        clase, texto = anterior
        if clase == "nombre":
            return texto in _ANTES_DE_REGEX
        if clase == "signo":
            # Detras de `)` casi siempre va una division -`(a + b) / 2`-, pero el `)`
            # de una condicion no cierra ninguna expresion: en `if (x) /re/.test(y)`
            # esa barra abre una expresion regular.
            if texto == ")":
                return condicion
            return texto not in _SIGNOS_QUE_CIERRAN
        return False

    while i < n:
        c = src[i]
        if c in _ESPACIO:
            i += 1
            continue
        if c in _SALTO:
            salto = True
            i += 1
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            j = i + 2
            while j < n and src[j] not in _SALTO:
                j += 1
            i = j
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            fin = src.find("*/", i + 2)
            if fin < 0:
                raise ValueError("comentario de bloque sin cerrar")
            if any(s in src[i:fin] for s in _SALTO):
                salto = True
            i = fin + 2
            continue

        if c in "\"'":
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == c:
                    break
                j += 1
            else:
                raise ValueError("cadena sin cerrar")
            tok = ("cadena", src[i:j + 1])
            i = j + 1
        elif c == "`":
            # Una plantilla puede llevar `${...}` con mas plantillas dentro: se cuentan
            # las llaves para saber cual de ellas la cierra.
            j, hondo = i + 1, 0
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if hondo == 0 and src[j] == "`":
                    break
                if hondo == 0 and src[j] == "$" and j + 1 < n and src[j + 1] == "{":
                    hondo, j = hondo + 1, j + 2
                    continue
                if hondo:
                    if src[j] == "{":
                        hondo += 1
                    elif src[j] == "}":
                        hondo -= 1
                j += 1
            else:
                raise ValueError("plantilla sin cerrar")
            tok = ("plantilla", src[i:j + 1])
            i = j + 1
        elif c == "/" and puede_regex():
            j, corchete = i + 1, False
            while j < n:
                d = src[j]
                if d == "\\":
                    j += 2
                    continue
                if d in _SALTO:
                    raise ValueError("expresion regular sin cerrar")
                if d == "[":
                    corchete = True
                elif d == "]":
                    corchete = False
                elif d == "/" and not corchete:
                    break
                j += 1
            else:
                raise ValueError("expresion regular sin cerrar")
            j += 1
            while j < n and (src[j].isalpha() or src[j] == "_"):  # banderas
                j += 1
            tok = ("regex", src[i:j])
            i = j
        else:
            m = _NUMERO.match(src, i) if (c.isdigit() or (c == "." and i + 1 < n and src[i + 1].isdigit())) else None
            if m:
                tok = ("numero", m.group())
                i = m.end()
            else:
                m = _ID.match(src, i)
                if m:
                    tok = ("nombre", m.group())
                    i = m.end()
                else:
                    for signo in _SIGNOS:
                        if src.startswith(signo, i):
                            tok = ("signo", signo)
                            i += len(signo)
                            break
                    else:
                        raise ValueError("caracter inesperado %r en %d" % (c, i))

        if tok[0] == "signo" and tok[1] in "()":
            if tok[1] == "(":
                parentesis.append(anterior is not None and anterior[0] == "nombre"
                                  and anterior[1] in _ABREN_CONDICION)
            else:
                condicion = parentesis.pop() if parentesis else False
        salida.append((tok[0], tok[1], salto))
        anterior = tok
        salto = False
    return salida


def _pega(anterior, siguiente):
    """Que hace falta entre dos tokens: "" si nada, " " si un espacio, "\\n" si un salto.

    Dos reglas y nada mas. La primera es lexica: `var x` no puede quedarse en `varx`,
    ni `a + +b` en `a++b`. La segunda es el punto y coma automatico: si entre los dos
    tokens habia un salto de linea y el segundo podria continuar la expresion del
    primero, ese salto es el que separa las dos instrucciones y se queda.
    """
    (clase_a, texto_a, _), (clase_b, texto_b, salto) = anterior, siguiente
    palabra = ("nombre", "numero")
    if clase_a in palabra and clase_b in palabra:
        pegan = True                      # `var x` no puede quedarse en `varx`
    elif clase_a == "numero" and clase_b in ("cadena", "plantilla"):
        pegan = True                      # `0` y `"x"` juntos serian un numero raro
    elif clase_a == "nombre" and clase_b == "regex":
        pegan = True                      # `x` y `/re/` juntos se leerian como division
    elif clase_a == "numero" and texto_b == ".":
        pegan = True                      # en `1 .toString()` el punto seria decimal
    elif texto_a == "." and clase_b == "numero":
        pegan = True                      # `.` y `5` juntos serian el decimal `.5`
    elif clase_a == "signo" and clase_b == "signo":
        pegan = (texto_a + texto_b) in _COMBINAN
    else:
        pegan = False
    if pegan:
        return "\n" if salto else " "
    if salto and (clase_a in _CIERRA_EXPRESION or texto_a in _SIGNOS_QUE_CIERRAN):
        if clase_b in _CIERRA_EXPRESION or texto_b in _SIGNOS_QUE_ABREN:
            return "\n"
    return ""


# Pares de signos que al juntarse forman otro token: `+ +` seria `++`, `/ /` un
# comentario, `< !` la apertura de comentario HTML que JavaScript aun reconoce.
_COMBINAN = frozenset(
    [a + b for a in ("+", "++") for b in ("+", "++", "+=")] +
    [a + b for a in ("-", "--") for b in ("-", "--", "-=")] +
    ["//", "/*", "/=", "<!", "<<", "<=", ">>", ">=", "==", "!=", "&&", "||", "**",
     "??", "?.", "=>", "<<=", ">>=", "|=", "&=", "^=", "*=", "%=", ".."]
)


def js(src):
    """El mismo programa con lo que el navegador no lee.

    Antes de devolverlo lo vuelve a trocear y comprueba que salen los mismos tokens.
    Un minificador que se equivoca no rompe la compilacion: produce un documento que
    abre y falla al pulsar algo, y ese documento ya se ha mandado por correo. Mas vale
    que la compilacion se niegue.
    """
    tokens = _tokeniza_js(src)
    if not tokens:
        return ""
    trozos = [tokens[0][1]]
    for anterior, siguiente in zip(tokens, tokens[1:]):
        trozos.append(_pega(anterior, siguiente))
        trozos.append(siguiente[1])
    salida = "".join(trozos)
    if [(k, t) for k, t, _ in _tokeniza_js(salida)] != [(k, t) for k, t, _ in tokens]:
        raise ValueError("el guion recortado no es el mismo programa: no se compila")
    return salida


# ---------------------------------------------------------------------------
# CSS
# ---------------------------------------------------------------------------
_CSS_CADENA = re.compile(r"""("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')""")


def css(src):
    """Quita comentarios, sangrado y saltos. No reordena ni fusiona reglas."""
    partes = _CSS_CADENA.split(src)
    for k in range(0, len(partes), 2):  # los impares son cadenas: intocables
        t = re.sub(r"/\*.*?\*/", "", partes[k], flags=re.S)
        t = re.sub(r"\s+", " ", t)
        # Junto a estos signos el espacio nunca hace falta. `+` y `~` se quedan como
        # estan: dentro de `calc()` separan operandos y quitarlos cambia el resultado.
        t = re.sub(r"\s*([{};,>])\s*", r"\1", t)
        t = re.sub(r";+}", "}", t)          # el ultimo punto y coma de cada bloque
        t = re.sub(r"(:|,)\s+", r"\1", t)   # `padding: 0` -> `padding:0`
        partes[k] = t
    return "".join(partes).strip()


# ---------------------------------------------------------------------------
# JSON dentro de <script>
# ---------------------------------------------------------------------------
def escapa_json(texto):
    """Deja el JSON a salvo del analizador de HTML por el precio mas bajo.

    Dentro de un `<script>` el navegador solo busca dos cosas: `</` de la etiqueta de
    cierre y `<!--`. Escapar *todos* los `<` costaba seis bytes cada uno y hay mas de
    mil en los catalogos; escapar solo esos dos casos cuesta uno, y `\\/` es un escape
    valido de JSON, asi que lo que se lee al otro lado es identico.
    """
    return texto.replace("<!--", "\\u003c!--").replace("</", "<\\/")


def compacto(datos):
    """Un catalogo que nadie edita a mano: sin un solo espacio de mas."""
    return escapa_json(json.dumps(datos, ensure_ascii=False, separators=(",", ":")))


ANCHO = 120


def _vierte(datos, ancho, nivel):
    plano = json.dumps(datos, ensure_ascii=False, separators=(",", ":"))
    if not isinstance(datos, (dict, list)) or not datos or len(plano) + nivel * 2 <= ancho:
        return plano
    pad, dentro = "  " * nivel, "  " * (nivel + 1)
    if isinstance(datos, dict):
        cuerpo = [dentro + json.dumps(k, ensure_ascii=False) + ": " + _vierte(v, ancho, nivel + 1)
                  for k, v in datos.items()]
        abre, cierra = "{", "}"
    else:
        cuerpo = [dentro + _vierte(v, ancho, nivel + 1) for v in datos]
        abre, cierra = "[", "]"
    return abre + "\n" + ",\n".join(cuerpo) + "\n" + pad + cierra


def diagramas(datos, ancho=ANCHO):
    """El JSON de los diagramas, que si se edita a mano, escrito para leerse.

    `json.dumps(indent=2)` parte cada caja en ocho lineas: el fichero crece y hay que
    recorrerlo entero para ver una posicion. Aqui cada caja y cada flecha caben en una
    linea -tal como estan escritas en el contrato- y solo se abre lo que no cabe. Sale
    mas corto y se lee mejor, que no suele ser la misma decision dos veces.
    """
    return escapa_json(_vierte(datos, ancho, 0))
