  /* Optional appearance overrides leave semantic kinds and old documents intact. */
  var DRAW_PATTERNS = {
    solid: [], dashed: [6, 4], dotted: [0.1, 3], dashdot: [7, 3, 0.1, 3], longdash: [12, 5]
  };
  var appearanceClipboard = null;
  // Las claves de los grupos son fijas: el titulo cambia con el idioma, la clave no.
  var appearanceOpenGroups = { stroke: true, text: false, ends: true };
  var appearanceFields = ["stroke", "fill", "textColor", "strokeWidth", "dash", "radius", "opacity", "fillOpacity", "shadow", "route", "fontSize", "bold", "italic", "align", "linecap", "startHead", "endHead"];
  var CARD_STYLES = {
    card: { fill: "#ffffff", stroke: "#d4d4dc", textColor: "#252532", strokeWidth: 0.75, radius: 12, fillOpacity: 1, shadow: "soft" },
    panel: { fill: "#9480ef", stroke: "#9480ef", textColor: "#35265f", strokeWidth: 0, radius: 20, fillOpacity: 0.12, shadow: "none" },
    heading: { fill: "#8973e8", stroke: "#8973e8", textColor: "#ffffff", strokeWidth: 0, radius: 12, fillOpacity: 1, shadow: "none" },
    placeholder: { fill: "#ffffff", stroke: "#a594ee", textColor: "#443666", strokeWidth: 0.75, radius: 8, fillOpacity: 1, dash: "dashed", shadow: "none" }
  };

  // Curves stay inside the control polygon; elbows remain editable waypoints.
  function connectorShape(p, e) {
    var mode = appearanceOf(e).route, pts = p.pts;
    if (mode !== "rounded" && mode !== "curve") return { tag: "polyline", attrs: { points: pts.map(function (q) { return q.x + "," + q.y; }).join(" ") } };
    function xy(q) { return q.x + "," + q.y; }
    var d = "M" + xy(pts[0]);
    if (mode === "curve" && pts.length === 2) {
      var a = pts[0], b = pts[1], horizontal = Math.abs(b.x-a.x) >= Math.abs(b.y-a.y);
      var verticalStart = e.fromAnchor === "n" || e.fromAnchor === "s";
      var verticalEnd = e.toAnchor === "n" || e.toAnchor === "s";
      var c1 = (verticalStart || (!e.fromAnchor && !horizontal)) ? {x:a.x,y:(a.y+b.y)/2} : {x:(a.x+b.x)/2,y:a.y};
      var c2 = (verticalEnd || (!e.toAnchor && !horizontal)) ? {x:b.x,y:(a.y+b.y)/2} : {x:(a.x+b.x)/2,y:b.y};
      d += " C" + xy(c1) + " " + xy(c2) + " " + xy(b);
    } else {
      for (var i=1; i<pts.length-1; i++) {
        var prev=pts[i-1], q=pts[i], next=pts[i+1];
        var before=Math.hypot(q.x-prev.x,q.y-prev.y), after=Math.hypot(next.x-q.x,next.y-q.y);
        if (!before || !after) continue;
        var r=Math.min(mode === "curve" ? 48 : 12, before/2, after/2);
        d += " L" + xy({x:q.x+(prev.x-q.x)*r/before,y:q.y+(prev.y-q.y)*r/before});
        d += " Q" + xy(q) + " " + xy({x:q.x+(next.x-q.x)*r/after,y:q.y+(next.y-q.y)*r/after});
      }
      d += " L" + xy(pts[pts.length-1]);
    }
    return {tag:"path",attrs:{d:d}};
  }

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
      if (a.fillOpacity != null) shape.style.fillOpacity = appearanceNumber(n, "fillOpacity", 1, 0, 1);
      if (a.radius != null) shape.setAttribute("rx", appearanceNumber(n, "radius", 4, 0, Math.min(n.w, n.h) / 2));
      if (a.shadow === "soft" && a.fill !== "none") {
        var shadow = el("rect", { x:n.x+3, y:n.y+5, width:n.w, height:n.h, rx:shape.getAttribute("rx"), fill:"#302450", "fill-opacity":0.08 * appearanceNumber(n, "fillOpacity", 1, 0, 1), "pointer-events":"none" });
        group.insertBefore(shadow, shape);
      }
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
    if (["startHead", "endHead", "route"].indexOf(key) >= 0) return entry.type === "edge";
    if (["fill", "radius", "fillOpacity", "shadow"].indexOf(key) >= 0) return entry.type === "node" && ["divider", "label"].indexOf(entry.item.kind) < 0;
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
    var choices = [["", t("appear.fromKind")]].concat(options);
    if (current === "mixed") choices.unshift(["mixed", t("appear.mixedValues")]);
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
    input.placeholder = current === "mixed" ? t("appear.mixedValues") : t("appear.auto");
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
    hex.placeholder = current === "mixed" ? t("appear.mixedShort") : current === "none" ? t("appear.none") : t("appear.auto");
    hex.pattern = "#[0-9a-fA-F]{6}";
    picker.addEventListener("input", function () { hex.value = picker.value; });
    picker.addEventListener("change", function () { setAppearance(f, key, picker.value); });
    hex.addEventListener("change", function () {
      if (!hex.checkValidity()) { hex.reportValidity(); return; }
      setAppearance(f, key, hex.value || undefined);
    });
    var reset = toolButton(t("appear.auto"), function () { setAppearance(f, key, undefined); }, "btn--ghost", t("appear.auto.title"));
    row.appendChild(picker); row.appendChild(hex); row.appendChild(reset);
    wrap.appendChild(labelEl); wrap.appendChild(row);
    if (transparent) {
      var clear = toolButton(t("appear.noFill"), function () { setAppearance(f, key, "none"); }, "btn--ghost");
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
    var shape = group && group.querySelector(key === "textColor" ? "text" : entry.type === "node" ? '[class^="n-"]' : '[class^="e-"]');
    var color = shape ? getComputedStyle(shape).getPropertyValue(key === "stroke" ? "stroke" : "fill") : "";
    var rgb = color.match(/^rgba?\((\d+),?\s+(\d+),?\s+(\d+)/);
    return rgb ? "#" + rgb.slice(1, 4).map(function (v) { return Number(v).toString(16).padStart(2, "0"); }).join("") : "#ffffff";
  }
  function appearanceGroup(body, groupKey, title, expanded) {
    var details = document.createElement("details"); details.className = "appearance-group";
    details.open = appearanceOpenGroups[groupKey] == null ? expanded : appearanceOpenGroups[groupKey];
    details.addEventListener("toggle", function () { if (details.isConnected) appearanceOpenGroups[groupKey] = details.open; });
    var summary = document.createElement("summary"); summary.textContent = title; details.appendChild(summary);
    var fields = document.createElement("div"); fields.className = "appearance-fields"; details.appendChild(fields); body.appendChild(details); return fields;
  }
  function renderAppearancePanel(f, body) {
    var entries = drawingSelection(f);
    if (!entries.length) return;
    var boxEntries = entries.filter(function (e) { return supportsAppearance(e, "fill"); });
    var hasEdges = entries.some(function (e) { return e.type === "edge"; });
    var hasStroke = entries.some(function (e) { return supportsAppearance(e, "stroke"); });
    var fields = appearanceGroup(body, "stroke", hasStroke ? t("appear.group.stroke") : t("appear.group.plain"), true);
    if (boxEntries.length) {
      var preset = selectField(t("appear.preset"), "", [["",t("appear.preset.choose")]].concat(Object.keys(CARD_STYLES).map(function (key) { return [key,t("appear.preset."+key)]; })), function (key) {
        if (!CARD_STYLES[key]) return;
        snapshot();
        boxEntries.forEach(function (entry) { entry.item.appearance = Object.assign({}, appearanceOf(entry.item), {opacity:1,dash:"solid"}, CARD_STYLES[key]); });
        afterChange();
      });
      preset.querySelector("select").dataset.appearance = "preset";
      fields.appendChild(preset);
    }
    if (hasStroke) {
      fields.appendChild(appearanceColor(f, entries, "stroke", t("appear.stroke"), false));
      fields.appendChild(appearanceSelect(f, entries, "dash", t("appear.dash"), [
        ["solid", t("appear.dash.solid")],
        ["dashed", t("appear.dash.dashed")],
        ["dotted", t("appear.dash.dotted")],
        ["dashdot", t("appear.dash.dashdot")],
        ["longdash", t("appear.dash.longdash")]
      ]));
    }
    var grid = document.createElement("div"); grid.className = "appearance-grid";
    if (hasStroke) grid.appendChild(appearanceNumberField(f, entries, "strokeWidth", t("appear.strokeWidth"), 0, 12, 0.25));
    grid.appendChild(appearanceNumberField(f, entries, "opacity", t("appear.opacity"), 10, 100, 5, 100)); fields.appendChild(grid);
    if (boxEntries.length) {
      fields.appendChild(appearanceColor(f, entries, "fill", t("appear.fill"), true));
      fields.appendChild(appearanceNumberField(f, entries, "fillOpacity", t("appear.fillOpacity"), 0, 100, 1, 100));
      fields.appendChild(appearanceNumberField(f, entries, "radius", t("appear.radius"), 0, 100, 1));
      fields.appendChild(appearanceSelect(f, entries, "shadow", t("appear.shadow"), [["none",t("appear.head.none")],["soft",t("appear.shadow.soft")]]));
    }
    var text = appearanceGroup(body, "text", t("appear.group.text"), false);
    text.appendChild(appearanceColor(f, entries, "textColor", t("appear.textColor"), false));
    text.appendChild(appearanceNumberField(f, entries, "fontSize", t("appear.fontSize"), 9, 40, 0.5));
    text.appendChild(appearanceSelect(f, entries, "bold", t("appear.bold"), [["false", t("appear.bold.normal")], ["true", t("appear.bold.bold")]]));
    text.appendChild(appearanceSelect(f, entries, "italic", t("appear.italic"), [["false", t("appear.italic.normal")], ["true", t("appear.italic.italic")]]));
    if (entries.some(function (e) { return supportsAppearance(e, "align"); })) text.appendChild(appearanceSelect(f, entries, "align", t("appear.align"), [["start", t("appear.align.start")], ["middle", t("appear.align.middle")], ["end", t("appear.align.end")]]));
    if (hasEdges) {
      var ends = appearanceGroup(body, "ends", t("appear.group.ends"), true);
      ends.appendChild(appearanceSelect(f, entries, "route", t("appear.route"), [["straight",t("appear.route.straight")],["rounded",t("appear.route.rounded")],["curve",t("appear.route.curve")]]));
      var options = [["none", t("appear.head.none")], ["arrow", t("appear.head.arrow")], ["open", t("appear.head.open")], ["circle", t("appear.head.circle")], ["diamond", t("appear.head.diamond")]];
      ends.appendChild(appearanceSelect(f, entries, "startHead", t("appear.startHead"), options));
      ends.appendChild(appearanceSelect(f, entries, "endHead", t("appear.endHead"), options));
      ends.appendChild(appearanceSelect(f, entries, "linecap", t("appear.linecap"), [["butt", t("appear.cap.butt")], ["round", t("appear.cap.round")], ["square", t("appear.cap.square")]]));
    }
    var actions = document.createElement("div"); actions.className = "props-actions appearance-actions";
    var copy = toolButton(t("appear.copy"), function () {
      appearanceClipboard = clone(appearanceOf(entries[0].item)); renderProps();
    }, "btn--ghost");
    copy.disabled = entries.length !== 1; actions.appendChild(copy);
    var paste = toolButton(t("appear.paste"), function () {
      if (!appearanceClipboard) return;
      snapshot();
      drawingSelection(f).forEach(function (entry) {
        entry.item.appearance = {};
        appearanceFields.forEach(function (key) { if (supportsAppearance(entry, key) && appearanceClipboard[key] !== undefined) entry.item.appearance[key] = appearanceClipboard[key]; });
        if (entry.item.kind === "note") fitNoteHeight(entry.item);
      }); afterChange();
    }, "btn--ghost");
    paste.disabled = !appearanceClipboard; actions.appendChild(paste);
    actions.appendChild(toolButton(t("appear.reset"), function () {
      snapshot(); entries.forEach(function (entry) { delete entry.item.appearance; if (entry.item.kind === "note") fitNoteHeight(entry.item); }); afterChange();
    }, "btn--ghost"));
    body.appendChild(actions);
  }
