  /* Optional appearance overrides leave semantic kinds and old documents intact. */
  var DRAW_PATTERNS = {
    solid: [], dashed: [6, 4], dotted: [0.1, 3], dashdot: [7, 3, 0.1, 3], longdash: [12, 5]
  };
  var appearanceClipboard = null;
  var appearanceOpenGroups = { "Borde y relleno": true, "Texto": false, "Extremos de línea": true };
  var appearanceFields = ["stroke", "fill", "textColor", "strokeWidth", "dash", "radius", "opacity", "fontSize", "bold", "italic", "align", "linecap", "startHead", "endHead"];

  function appearanceOf(item) { return item.appearance || {}; }
  function validColor(value) { return /^#[0-9a-f]{6}$/i.test(value || ""); }
  function appearanceNumber(item, key, fallback, min, max) {
    var value = appearanceOf(item)[key];
    return typeof value === "number" && isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  }
  function drawingFontSize(item, fallback) { return appearanceNumber(item, "fontSize", fallback, 9, 40); }
  function noteLineHeight(n) { return drawingFontSize(n, NOTE_SIZE) * 1.36; }
  function defaultStroke(item, isEdge) {
    if (item.kind === "new") return "var(--brand-ink)";
    if (item.kind === "dead" || item.kind === "chipdead") return "var(--danger)";
    if (item.kind === "note") return "var(--note-ink)";
    if (item.kind === "divider") return "var(--info)";
    return isEdge ? "var(--ink-muted)" : "var(--border-strong)";
  }
  function applyStroke(shape, item, isEdge) {
    if (!shape) return;
    var a = appearanceOf(item);
    if (validColor(a.stroke)) shape.style.stroke = a.stroke;
    if (a.strokeWidth != null) {
      shape.style.strokeWidth = appearanceNumber(item, "strokeWidth", 1.5, 0, 12);
      // Interior blocks normally have no outline; setting a width enables one.
      if (!isEdge && item.kind === "chip" && !validColor(a.stroke)) shape.style.stroke = defaultStroke(item, false);
    }
    if (Object.prototype.hasOwnProperty.call(DRAW_PATTERNS, a.dash)) {
      var scale = appearanceNumber(item, "strokeWidth", 1.5, 0.5, 12);
      shape.style.strokeDasharray = DRAW_PATTERNS[a.dash].length ? DRAW_PATTERNS[a.dash].map(function (v) { return v * scale; }).join(" ") : "none";
      if (item.kind === "chip" && !validColor(a.stroke)) shape.style.stroke = defaultStroke(item, false);
      if (a.dash === "dotted" || a.dash === "dashdot") shape.style.strokeLinecap = "round";
    }
    if (["butt", "round", "square"].indexOf(a.linecap) >= 0) shape.style.strokeLinecap = a.linecap;
  }
  function applyTextAppearance(group, item) {
    var a = appearanceOf(item);
    group.querySelectorAll("text").forEach(function (t) {
      if (validColor(a.textColor)) t.style.fill = a.textColor;
      if (typeof a.bold === "boolean") t.style.fontWeight = a.bold ? "700" : "400";
      if (typeof a.italic === "boolean") t.style.fontStyle = a.italic ? "italic" : "normal";
    });
  }
  function decorateNode(group, n) {
    var a = appearanceOf(n);
    var shape = group.querySelector('[class^="n-"]');
    applyStroke(shape, n, false);
    if (shape && shape.tagName.toLowerCase() === "rect") {
      if (a.fill === "none" || validColor(a.fill)) shape.style.fill = a.fill;
      if (a.radius != null) shape.setAttribute("rx", appearanceNumber(n, "radius", 4, 0, Math.min(n.w, n.h) / 2));
      // Keep transparent and borderless shapes easy to select.
      shape.style.pointerEvents = "all";
    }
    if (a.opacity != null) group.style.opacity = appearanceNumber(n, "opacity", 1, 0.1, 1);
    applyTextAppearance(group, n);
    if (["note", "label", "divider"].indexOf(n.kind) >= 0 && a.fontSize != null) {
      group.querySelectorAll("text").forEach(function (t) { t.style.fontSize = drawingFontSize(n, 12.5) + "px"; });
    }
    var tail = group.querySelector(".e-note");
    if (tail) applyStroke(tail, n, false);
    var dot = group.querySelector(".p-note");
    if (dot && validColor(a.stroke)) dot.style.fill = a.stroke;
  }
  function makeArrowMarker(defs, id, type, color) {
    var m = el("marker", { id: id, viewBox: "0 0 12 12", refX: 10, refY: 6, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
    var shape;
    if (type === "circle") shape = el("circle", { cx: 6, cy: 6, r: 4 });
    else if (type === "diamond") shape = el("path", { d: "M1,6 L6,1 L11,6 L6,11 z" });
    else if (type === "open") shape = el("path", { d: "M2,2 L10,6 L2,10", fill: "none", "stroke-width": 1.5 });
    else shape = el("path", { d: "M1,1 L11,6 L1,11 z" });
    if (type === "open") { shape.style.stroke = color; shape.style.fill = "none"; }
    else shape.style.fill = color;
    m.appendChild(shape); defs.appendChild(m);
    return "url(#" + id + ")";
  }
  function decorateEdge(group, line, e, defs, f, index) {
    var a = appearanceOf(e);
    applyStroke(line, e, true);
    if (a.opacity != null) group.style.opacity = appearanceNumber(e, "opacity", 1, 0.1, 1);
    applyTextAppearance(group, e);
    var color = validColor(a.stroke) ? a.stroke : defaultStroke(e, true);
    [["start", a.startHead || "none"], ["end", a.endHead || "arrow"]].forEach(function (pair) {
      if (pair[1] === "none" || a.strokeWidth === 0) line.removeAttribute("marker-" + pair[0]);
      else line.setAttribute("marker-" + pair[0], makeArrowMarker(defs, f + "-edge-" + index + "-" + pair[0], pair[1], color));
    });
  }

  function drawingSelection(f) {
    return state.sel.items.map(function (it) { return { type: it.type, item: it.type === "node" ? node(f, it.id) : edge(f, it.id) }; }).filter(function (it) { return !!it.item; });
  }
  function supportsAppearance(entry, key) {
    if (["stroke", "strokeWidth", "dash", "linecap"].indexOf(key) >= 0 && entry.type === "node" && entry.item.kind === "label") return false;
    if (["startHead", "endHead"].indexOf(key) >= 0) return entry.type === "edge";
    if (["fill", "radius"].indexOf(key) >= 0) return entry.type === "node" && ["divider", "label"].indexOf(entry.item.kind) < 0;
    if (key === "align") return entry.type === "node" && ["divider", "note"].indexOf(entry.item.kind) < 0;
    return true;
  }
  function commonAppearance(entries, key) {
    var applicable = entries.filter(function (entry) { return supportsAppearance(entry, key); });
    var values = applicable.map(function (entry) { return appearanceOf(entry.item)[key]; });
    if (!values.length) return undefined;
    return values.every(function (v) { return v === values[0]; }) ? values[0] : "mixed";
  }
  function setAppearance(f, key, value) {
    snapshot();
    drawingSelection(f).forEach(function (entry) {
      if (!supportsAppearance(entry, key)) return;
      if (!entry.item.appearance) entry.item.appearance = {};
      if (value === undefined) delete entry.item.appearance[key];
      else entry.item.appearance[key] = value;
      if (entry.item.kind === "note") fitNoteHeight(entry.item);
    });
    afterChange();
  }
  function appearanceSelect(f, entries, key, label, options) {
    var current = commonAppearance(entries, key);
    var choices = [["", "Del tipo de elemento"]].concat(options);
    if (current === "mixed") choices.unshift(["mixed", "Varios valores"]);
    var fieldEl = selectField(label, current == null ? "" : String(current), choices, function (v) {
      if (v === "mixed") return;
      setAppearance(f, key, v === "" ? undefined : key === "bold" || key === "italic" ? v === "true" : v);
    });
    var input = fieldEl.querySelector("select");
    input.setAttribute("aria-label", label); input.dataset.appearance = key;
    return fieldEl;
  }
  function appearanceNumberField(f, entries, key, label, min, max, step, scale) {
    var current = commonAppearance(entries, key), wrap = document.createElement("div");
    wrap.className = "field";
    var labelEl = document.createElement("label"), input = document.createElement("input");
    input.type = "number"; input.min = min; input.max = max; input.step = step;
    input.id = "appearance-" + key; labelEl.htmlFor = input.id; labelEl.textContent = label;
    input.dataset.appearance = key;
    input.value = typeof current === "number" ? Math.round(current * (scale || 1) * 100) / 100 : "";
    input.placeholder = current === "mixed" ? "Varios valores" : "Automático";
    input.addEventListener("change", function () {
      if (!input.checkValidity()) { input.reportValidity(); return; }
      setAppearance(f, key, input.value === "" ? undefined : Number(input.value) / (scale || 1));
    });
    wrap.appendChild(labelEl); wrap.appendChild(input); return wrap;
  }
  function appearanceColor(f, entries, key, label, transparent) {
    var current = commonAppearance(entries, key);
    var wrap = document.createElement("div"); wrap.className = "field color-field";
    var labelEl = document.createElement("label"); labelEl.textContent = label;
    var row = document.createElement("div"); row.className = "color-controls";
    var picker = document.createElement("input"); picker.type = "color";
    picker.value = validColor(current) ? current : effectiveColor(f, entries, key);
    picker.setAttribute("aria-label", label); picker.dataset.appearance = key;
    var hex = document.createElement("input"); hex.type = "text"; hex.maxLength = 7;
    hex.setAttribute("aria-label", label + " hexadecimal");
    hex.value = validColor(current) ? current : "";
    hex.placeholder = current === "mixed" ? "Varios" : current === "none" ? "Sin relleno" : "Automático";
    hex.pattern = "#[0-9a-fA-F]{6}";
    picker.addEventListener("input", function () { hex.value = picker.value; });
    picker.addEventListener("change", function () { setAppearance(f, key, picker.value); });
    hex.addEventListener("change", function () {
      if (!hex.checkValidity()) { hex.reportValidity(); return; }
      setAppearance(f, key, hex.value || undefined);
    });
    var reset = toolButton("Auto", function () { setAppearance(f, key, undefined); }, "btn--ghost", "Usar el color del tipo de elemento");
    row.appendChild(picker); row.appendChild(hex); row.appendChild(reset);
    wrap.appendChild(labelEl); wrap.appendChild(row);
    if (transparent) {
      var clear = toolButton("Sin relleno", function () { setAppearance(f, key, "none"); }, "btn--ghost");
      clear.dataset.appearance = "transparent"; clear.setAttribute("aria-pressed", String(current === "none")); wrap.appendChild(clear);
    }
    return wrap;
  }
  function effectiveColor(f, entries, key) {
    var svg = document.querySelector('svg[data-svg="' + f + '"]');
    var entry = entries.filter(function (e) { return supportsAppearance(e, key); })[0];
    if (!entry || !svg) return "#ffffff";
    var attr = entry.type === "node" ? "data-node" : "data-edge";
    var group = Array.from(svg.querySelectorAll("[" + attr + "]")).filter(function (g) { return g.getAttribute(attr) === entry.item.id; })[0];
    var shape = group && group.querySelector(key === "textColor" ? "text" : entry.type === "node" ? '[class^="n-"]' : 'polyline:not(.hit)');
    var color = shape ? getComputedStyle(shape).getPropertyValue(key === "stroke" ? "stroke" : "fill") : "";
    var rgb = color.match(/^rgba?\((\d+),?\s+(\d+),?\s+(\d+)/);
    return rgb ? "#" + rgb.slice(1, 4).map(function (v) { return Number(v).toString(16).padStart(2, "0"); }).join("") : "#ffffff";
  }
  function appearanceGroup(body, title, expanded) {
    var details = document.createElement("details"); details.className = "appearance-group";
    details.open = appearanceOpenGroups[title] == null ? expanded : appearanceOpenGroups[title];
    details.addEventListener("toggle", function () { if (details.isConnected) appearanceOpenGroups[title] = details.open; });
    var summary = document.createElement("summary"); summary.textContent = title; details.appendChild(summary);
    var fields = document.createElement("div"); fields.className = "appearance-fields"; details.appendChild(fields); body.appendChild(details); return fields;
  }
  function renderAppearancePanel(f, body) {
    var entries = drawingSelection(f);
    if (!entries.length) return;
    var boxEntries = entries.filter(function (e) { return supportsAppearance(e, "fill"); });
    var hasEdges = entries.some(function (e) { return e.type === "edge"; });
    var hasStroke = entries.some(function (e) { return supportsAppearance(e, "stroke"); });
    var fields = appearanceGroup(body, hasStroke ? "Borde y relleno" : "Apariencia", true);
    if (hasStroke) {
      fields.appendChild(appearanceColor(f, entries, "stroke", "Color de línea", false));
      fields.appendChild(appearanceSelect(f, entries, "dash", "Patrón de línea", [["solid", "Continua ━━━━━"], ["dashed", "Segmentos ━ ━ ━"], ["dotted", "Puntos · · · ·"], ["dashdot", "Guion-punto ━ · ━ ·"], ["longdash", "Segmentos largos ━━ ━━"]]));
    }
    var grid = document.createElement("div"); grid.className = "appearance-grid";
    if (hasStroke) grid.appendChild(appearanceNumberField(f, entries, "strokeWidth", "Grosor (px)", 0, 12, 0.25));
    grid.appendChild(appearanceNumberField(f, entries, "opacity", "Opacidad (%)", 10, 100, 5, 100)); fields.appendChild(grid);
    if (boxEntries.length) {
      fields.appendChild(appearanceColor(f, entries, "fill", "Relleno", true));
      fields.appendChild(appearanceNumberField(f, entries, "radius", "Esquinas (px)", 0, 100, 1));
    }
    var text = appearanceGroup(body, "Texto", false);
    text.appendChild(appearanceColor(f, entries, "textColor", "Color del texto", false));
    text.appendChild(appearanceNumberField(f, entries, "fontSize", "Tamaño del texto (px)", 9, 40, 0.5));
    text.appendChild(appearanceSelect(f, entries, "bold", "Peso", [["false", "Normal"], ["true", "Negrita"]]));
    text.appendChild(appearanceSelect(f, entries, "italic", "Inclinación", [["false", "Normal"], ["true", "Cursiva"]]));
    if (entries.some(function (e) { return supportsAppearance(e, "align"); })) text.appendChild(appearanceSelect(f, entries, "align", "Alineación del texto", [["start", "Izquierda"], ["middle", "Centro"], ["end", "Derecha"]]));
    if (hasEdges) {
      var ends = appearanceGroup(body, "Extremos de línea", true);
      var options = [["none", "Sin punta"], ["arrow", "Flecha"], ["open", "Flecha abierta"], ["circle", "Círculo"], ["diamond", "Rombo"]];
      ends.appendChild(appearanceSelect(f, entries, "startHead", "Inicio", options));
      ends.appendChild(appearanceSelect(f, entries, "endHead", "Final", options));
      ends.appendChild(appearanceSelect(f, entries, "linecap", "Terminación del trazo", [["butt", "Recta"], ["round", "Redonda"], ["square", "Cuadrada"]]));
    }
    var actions = document.createElement("div"); actions.className = "props-actions appearance-actions";
    var copy = toolButton("Copiar apariencia", function () {
      appearanceClipboard = clone(appearanceOf(entries[0].item)); renderProps();
    }, "btn--ghost");
    copy.disabled = entries.length !== 1; actions.appendChild(copy);
    var paste = toolButton("Pegar apariencia", function () {
      if (!appearanceClipboard) return;
      snapshot();
      drawingSelection(f).forEach(function (entry) {
        entry.item.appearance = {};
        appearanceFields.forEach(function (key) { if (supportsAppearance(entry, key) && appearanceClipboard[key] !== undefined) entry.item.appearance[key] = appearanceClipboard[key]; });
        if (entry.item.kind === "note") fitNoteHeight(entry.item);
      }); afterChange();
    }, "btn--ghost");
    paste.disabled = !appearanceClipboard; actions.appendChild(paste);
    actions.appendChild(toolButton("Restablecer apariencia", function () {
      snapshot(); entries.forEach(function (entry) { delete entry.item.appearance; if (entry.item.kind === "note") fitNoteHeight(entry.item); }); afterChange();
    }, "btn--ghost"));
    body.appendChild(actions);
  }
