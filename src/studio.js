  /* Content, appearance and diagrams share the existing versioned model. */
  var contentRoot = document.getElementById("document-content");
  var textEditing = false;
  var textSession = null;
  var lastDocumentHTML = "";
  var templateCatalog = JSON.parse(document.getElementById("template-data").textContent);
  var EDITABLE = "h1,h2,h3,p,th,td,figcaption,.pill";

  function cleanContent(root) {
    root.querySelectorAll('[data-block-tools]').forEach(function (e) { e.remove(); });
    root.querySelectorAll("[contenteditable]").forEach(function (e) { e.removeAttribute("contenteditable"); });
    root.querySelectorAll("svg[data-svg],.figtools").forEach(function (e) { e.innerHTML = ""; });
    root.querySelectorAll("svg[data-svg]").forEach(function (e) { e.removeAttribute("viewBox"); });
    root.querySelectorAll(".answer-print").forEach(function (e) { e.remove(); });
    root.querySelectorAll("[data-answer]").forEach(function (e) { e.textContent = ""; e.removeAttribute("style"); });
    root.querySelectorAll(".is-answered").forEach(function (e) { e.classList.remove("is-answered"); });
    root.querySelectorAll(".deccount").forEach(function (e) { e.textContent = ""; });
    return root;
  }
  function captureContent() { return cleanContent(contentRoot.cloneNode(true)).innerHTML; }
  function syncContent() {
    if (!model.document) model.document = { design: "technical", theme: "auto" };
    model.document.html = captureContent();
    lastDocumentHTML = model.document.html;
  }
  function applyAppearance() {
    var doc = model.document || {};
    document.documentElement.setAttribute("data-design", doc.design || "technical");
    if (!doc.theme || doc.theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", doc.theme);
    document.getElementById("design-select").value = doc.design || "technical";
    document.getElementById("theme-select").value = doc.theme || "auto";
  }
  function restoreContent() {
    var html = model.document && model.document.html;
    if (typeof html === "string" && html !== lastDocumentHTML) {
      contentRoot.innerHTML = html;
      lastDocumentHTML = html;
      FIGS = Object.keys(model.figures).filter(function (f) { return !!contentRoot.querySelector('svg[data-svg="' + f + '"]'); });
      FIGS.forEach(attachCanvas);
      attachAnswers();
      marcaEnlaces(contentRoot);
      setTextEditing(textEditing);
    }
    applyAppearance();
    var title = contentRoot.querySelector("h1");
    if (title) document.title = title.textContent.trim() || t("doc.untitled");
  }
  function setTextEditing(on) {
    textSession = null;
    textEditing = on;
    renderSectionControls(on);
    document.body.classList.toggle("editing-content", on);
    contentRoot.querySelectorAll(EDITABLE).forEach(function (e) {
      if (e.closest(".figtools,.deccount,.answer") || e.querySelector("textarea,input,button")) return;
      if (on) e.setAttribute("contenteditable", "true");
      else e.removeAttribute("contenteditable");
    });
  }
  /* ---------------- enlaces en el texto ----------------
     Un enlace es un <a> normal dentro del cuerpo, asi que viaja en el HTML como el
     resto y se imprime como el resto. Lo unico que hace falta cuidar es a donde
     apunta: `safeHref` decide eso, tanto aqui como al abrir un fichero que venga de
     otra mano. */
  function linkInSelection() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    var range = sel.getRangeAt(0);
    if (!contentRoot.contains(range.commonAncestorContainer)) return null;
    var nodo = range.commonAncestorContainer;
    if (nodo.nodeType === 3) nodo = nodo.parentNode;
    // el cursor puede estar dentro del enlace, o la seleccion puede envolverlo entero:
    // seleccionar un titulo que ya es un enlace tiene que encontrarlo igual
    var a = nodo.closest("a");
    if (!a) {
      a = Array.prototype.filter.call(nodo.querySelectorAll("a"), function (cand) {
        return range.intersectsNode(cand);
      })[0] || null;
    }
    return a && contentRoot.contains(a) ? a : null;
  }
  function openLinkDialog() {
    var existente = linkInSelection();
    var sel = window.getSelection();
    var range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    var dentro = range && contentRoot.contains(range.commonAncestorContainer);
    if (!existente && (!dentro || range.collapsed)) { notice(t("link.selectFirst")); return; }
    var valor = existente ? existente.getAttribute("href") || "" : "";
    var guardado = range ? range.cloneRange() : null;

    var botones = [{ label: t("modal.linkApply"), cls: "btn--primary", onClick: function () {
      var href = safeHref(valor);
      if (!href) { notice(t("link.rejected")); return; }
      closeModal(); aplicaEnlace(existente, guardado, href);
    } }];
    if (existente) botones.push({ label: t("modal.linkRemove"), cls: "", onClick: function () {
      closeModal(); quitaEnlace(existente);
    } });
    botones.push({ label: t("modal.cancel"), cls: "btn--ghost", onClick: closeModal });

    openModal(t("modal.linkTitle"), function (body) {
      var p = document.createElement("p");
      p.textContent = t("link.help");
      body.appendChild(p);
      body.appendChild(field(t("link.address"), valor, function (v) { valor = v; }));
    }, botones);
  }
  function aplicaEnlace(existente, range, href) {
    snapshot();
    if (existente) {
      existente.setAttribute("href", href);
    } else {
      var a = document.createElement("a");
      a.setAttribute("href", href);
      a.appendChild(range.extractContents());
      range.insertNode(a);
    }
    afterTextChange();
  }
  function quitaEnlace(a) {
    snapshot();
    while (a.firstChild) a.parentNode.insertBefore(a.firstChild, a);
    a.remove();
    afterTextChange();
  }
  function afterTextChange() {
    contentRoot.normalize();
    marcaEnlaces(contentRoot);
    syncContent();
    markDirty();
  }
  /* Todo `<a>` del cuerpo pasa por aqui: el que se acaba de crear y el que ya venia
     dentro del fichero, que puede haberlo escrito cualquiera. El que no lleve a
     ningun sitio aceptable deja de ser un enlace y se queda en texto. */
  function marcaEnlaces(root) {
    root.querySelectorAll("a").forEach(function (a) {
      var href = safeHref(a.getAttribute("href"));
      if (!href) {
        while (a.firstChild) a.parentNode.insertBefore(a.firstChild, a);
        a.remove();
        return;
      }
      a.setAttribute("href", href);
      if (/^https?:/i.test(href)) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }
    });
  }
  function insertPlainText(text) {
    beginTextChange(document.activeElement);
    var selection = window.getSelection();
    if (!selection.rangeCount) return;
    var range = selection.getRangeAt(0);
    if (!contentRoot.contains(range.commonAncestorContainer)) return;
    range.deleteContents();
    var node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node); range.collapse(true);
    selection.removeAllRanges(); selection.addRange(range);
    syncContent(); markDirty();
  }
  /* Los bloques de primer nivel que se pueden mover o quitar: cabecera, secciones
     y pie. La cabecera y el pie se eliminan igual que una seccion. */
  var BLOCK_TAGS = { HEADER: "header", SECTION: "section", FOOTER: "footer" };
  function editableBlocks(root) {
    return Array.from(root.children).filter(function (e) { return !!BLOCK_TAGS[e.tagName]; });
  }
  function blockName(block, blocks) {
    var heading = block.querySelector("h1,h2");
    if (heading && heading.textContent.trim()) return heading.textContent.trim();
    if (block.tagName !== "SECTION") return t("block." + BLOCK_TAGS[block.tagName]);
    var same = blocks.filter(function (e) { return e.tagName === "SECTION"; });
    return t("block.section") + " " + (same.indexOf(block) + 1);
  }
  function changeSection(index, action) {
    var root = cleanContent(contentRoot.cloneNode(true));
    var blocks = editableBlocks(root);
    var block = blocks[index];
    if (!block || (action === "up" && index === 0) || (action === "down" && index === blocks.length - 1)) return;
    snapshot();
    if (action === "remove") {
      block.querySelectorAll('[data-fig]').forEach(function (e) { delete model.figures[e.getAttribute('data-fig')]; });
      block.querySelectorAll('[data-answer]').forEach(function (e) { delete model.answers[e.getAttribute('data-answer')]; });
      block.remove();
      selClear();
    } else if (action === "up") root.insertBefore(block, blocks[index - 1]);
    else root.insertBefore(blocks[index + 1], block);
    model.document.html = root.innerHTML;
    afterChange();
  }
  function renderSectionControls(on) {
    contentRoot.querySelectorAll('[data-block-tools]').forEach(function (e) { e.remove(); });
    if (!on) return;
    var blocks = editableBlocks(contentRoot);
    blocks.forEach(function (block, index) {
      var bar = document.createElement('div'); bar.className = 'section-controls'; bar.setAttribute('data-block-tools', '');
      var what = blockName(block, blocks);
      // El boton de quitar nombra el bloque: "Eliminar sección", "Eliminar cabecera", "Eliminar pie".
      var actions = [['up', t("block.up")], ['down', t("block.down")], ['remove', t("block.delete" + block.tagName.charAt(0) + block.tagName.slice(1).toLowerCase())]];
      actions.forEach(function (pair) {
        var button = toolButton(pair[1], function () { changeSection(index, pair[0]); }, 'btn--ghost');
        button.disabled = pair[0] === 'up' && index === 0 || pair[0] === 'down' && index === blocks.length - 1;
        button.setAttribute('aria-label', pair[1] + ': ' + what);
        bar.appendChild(button);
      });
      block.insertBefore(bar, block.firstChild);
    });
  }
  function beginTextChange(target) {
    if (target && target.isContentEditable && textSession !== target) {
      snapshot();
      textSession = target;
    }
  }
  function newDecision(id) {
    return '<section><h2>' + t("new.decision.title") + '</h2><ol class="decisions"><li data-decision="' + id + '">'
      + '<span class="num">' + String(id).padStart(2, "0") + '</span><div><p class="decision-q">' + t("new.decision.q") + '</p>'
      + '<p class="decision-w">' + t("new.decision.w") + '</p></div>'
      + '<div class="answer"><span class="lbl">' + t("answers.label") + '</span><textarea data-answer="' + id + '" rows="1" placeholder="' + t("answers.placeholder") + '"></textarea></div></li></ol></section>';
  }
  /* <h1> nuevo para el documento. La cabecera se puede borrar como cualquier bloque,
     asi que tiene que haber una forma de volver a crearla. */
  function newHeader() {
    return '<header><p class="kicker">' + t("new.header.kicker") + '</p><h1>' + t("new.header.title") + '</h1>'
      + '<p class="lede">' + t("new.header.lede") + '</p>'
      + '<div class="meta"><span class="pill is-draft">' + t("new.header.pill1") + '</span><span class="pill">' + t("new.header.pill2") + '</span></div></header>';
  }
  function figureHTML(id) {
    return '<section><h2>' + t("new.diagram.title") + '</h2><figure data-fig="' + id + '"><div class="figtools" data-tools="' + id + '"></div>'
      + '<div class="canvas canvas--mid"><svg data-svg="' + id + '" role="img" aria-label="' + t("new.diagram.aria") + '"></svg></div>'
      + '<figcaption>' + t("new.diagram.caption") + '</figcaption></figure></section>';
  }
  function addBlock(kind) {
    snapshot();
    var root = cleanContent(contentRoot.cloneNode(true));
    var section = '<section><h2>' + t("new.section.title") + '</h2><p>' + t("new.section.body") + '</p></section>';
    if (kind === "callout") section = '<section><div class="callout"><h3>' + t("new.callout.title") + '</h3><p>' + t("new.callout.body") + '</p></div></section>';
    if (kind === "table") section = '<section><h2>' + t("new.table.title") + '</h2><div class="tablewrap"><table><thead><tr><th>' + t("new.table.h1") + '</th><th>' + t("new.table.h2") + '</th><th>' + t("new.table.h3") + '</th></tr></thead><tbody><tr><td>' + t("new.table.r1") + '</td><td>' + t("new.table.todo") + '</td><td>' + t("new.table.todo") + '</td></tr><tr><td>' + t("new.table.r2") + '</td><td>' + t("new.table.todo") + '</td><td>' + t("new.table.todo") + '</td></tr></tbody></table></div></section>';
    if (kind === "decision") {
      var ids = Array.from(root.querySelectorAll("[data-decision]")).map(function (e) { return Number(e.getAttribute("data-decision")) || 0; });
      section = newDecision(Math.max.apply(Math, [0].concat(ids)) + 1);
    }
    if (kind === "figure") {
      var id = uid("f", Object.keys(model.figures).map(function (f) { return { id: f }; }));
      model.figures[id] = diagramPreset("flow");
      section = figureHTML(id);
    }
    if (kind === "header") section = newHeader();
    // Se inserta como elemento para poder volver a localizarlo tras re-renderizar.
    var holder = document.createElement("div");
    holder.innerHTML = section;
    var block = holder.firstElementChild;
    if (kind === "header") root.insertBefore(block, root.firstChild);
    else {
      var footer = root.querySelector("footer");
      if (footer) root.insertBefore(block, footer);
      else root.appendChild(block);
    }
    var index = editableBlocks(root).indexOf(block);
    model.document.html = root.innerHTML;
    afterChange();
    var added = editableBlocks(contentRoot)[index];
    if (added) {
      added.scrollIntoView({ behavior: "smooth", block: "center" });
      var heading = added.querySelector("h1,h2") || added.querySelector("[contenteditable]");
      if (heading) heading.focus();
    }
  }
  function diagramPreset(kind) {
    if (kind === "cards") {
      var cards = [
        {id:"panel",x:24,y:24,w:712,h:328,kind:"box",appearance:clone(CARD_STYLES.panel)},
        {id:"heading",parent:"panel",x:48,y:48,w:288,h:48,kind:"box",title:t("preset.cards"),appearance:clone(CARD_STYLES.heading)}
      ];
      ["input","process","output"].forEach(function (name,i) {
        cards.push({id:"card"+i,parent:"panel",x:48+i*236,y:i===1?232:136,w:192,h:88,kind:"box",title:t("preset.labels."+name),appearance:clone(i===0?CARD_STYLES.placeholder:CARD_STYLES.card)});
      });
      return {w:760,h:376,nodes:cards,edges:[0,1].map(function (i) { return {id:"e"+i,from:"card"+i,to:"card"+(i+1),fromAnchor:"e",toAnchor:"w",label:t("preset.edge.sends"),appearance:{route:"curve",stroke:"#a594ce",strokeWidth:0.75,endHead:"open"}}; })};
    }
    var labels = kind === "layers"
      ? [t("preset.labels.presentation"), t("preset.labels.application"), t("preset.labels.data")]
      : kind === "sequence"
        ? [t("preset.labels.prepare"), t("preset.labels.run"), t("preset.labels.validate")]
        : [t("preset.labels.input"), t("preset.labels.process"), t("preset.labels.output")];
    var vertical = kind === "layers";
    var nodes = labels.map(function (label, i) { return { id: "n" + i, x: vertical ? 180 : 32 + i * 224, y: vertical ? 32 + i * 112 : 64, w: 176, h: 64, kind: i === 1 ? "new" : "box", title: label }; });
    var edgeLabel = kind === "sequence" ? t("preset.edge.continues") : t("preset.edge.sends");
    var edges = [0, 1].map(function (i) { return { id: "e" + i, from: "n" + i, to: "n" + (i + 1), label: edgeLabel }; });
    if (kind === "beforeafter") {
      nodes = [
        {id:"n0",x:32,y:64,w:220,h:72,kind:"dead",title:t("preset.before.title"),sub:t("preset.before.sub")},
        {id:"n1",x:352,y:64,w:220,h:72,kind:"new",title:t("preset.after.title"),sub:t("preset.after.sub")}
      ];
      edges = [{id:"e0",from:"n0",to:"n1",label:t("preset.before.edge"),kind:"new"}];
    }
    return { w: vertical ? 540 : 704, h: vertical ? 384 : 224, nodes: nodes, edges: edges };
  }
  function insertDiagramPreset(f, kind) {
    snapshot();
    var preset = diagramPreset(kind), d = fig(f), mapping = {};
    var offset = d.nodes.length ? Math.max.apply(Math, d.nodes.map(function (n) { return n.y + n.h; })) + 48 : 0;
    preset.nodes.forEach(function (n) { var old = n.id; n.id = uid("n", d.nodes); mapping[old] = n.id; n.y += offset; d.nodes.push(n); });
    preset.nodes.forEach(function (n) { if (n.parent) n.parent = mapping[n.parent]; });
    preset.edges.forEach(function (e) { e.id = uid("e", d.edges); e.from = mapping[e.from]; e.to = mapping[e.to]; d.edges.push(e); });
    d.w = Math.max(d.w, preset.w); d.h = Math.max(d.h, offset + preset.h);
    state.sel = { fig: f, items: preset.nodes.map(function (n) { return { type: "node", id: n.id }; }) };
    closeModal(); afterChange();
  }
  function openDiagramPresets(f) {
    openModal(t("preset.title"), function (body) {
      [["cards",t("preset.cards")],["flow",t("preset.flow")],["layers",t("preset.layers")],["beforeafter",t("preset.beforeafter")],["sequence",t("preset.sequence")]].forEach(function (pair) {
        body.appendChild(toolButton(pair[1], function () { insertDiagramPreset(f, pair[0]); }));
      });
    }, [{label:t("modal.close"),onClick:closeModal}]);
  }
  function descendants(f, roots) {
    var found = {}, out = [];
    function visit(n) { if (!n || found[n.id]) return; found[n.id] = true; out.push(n); childrenOf(f, n.id).forEach(visit); }
    roots.forEach(visit); return out;
  }
  function selectedRoots(f) {
    var ids = selIds("node");
    return ids.map(function (id) { return node(f,id); }).filter(function (n) {
      if (!n) return false;
      var p = n.parent, seen = {};
      while (p && !seen[p]) { if (ids.indexOf(p) >= 0) return false; seen[p] = true; var parent = node(f,p); p = parent && parent.parent; }
      return true;
    });
  }
  function duplicateSelection(f) {
    var roots = selectedRoots(f); if (!roots.length) return;
    snapshot();
    var d = fig(f), mapping = {}, copies = descendants(f, roots).map(function (n) {
      var c = clone(n); c.id = uid("n", d.nodes); mapping[n.id] = c.id; c.x += 24; c.y += 24; d.nodes.push(c); return c;
    });
    copies.forEach(function (n) { if (mapping[n.parent]) n.parent = mapping[n.parent]; if (mapping[n.anchor]) n.anchor = mapping[n.anchor]; });
    d.edges.slice().forEach(function (e) {
      if (!mapping[e.from] || !mapping[e.to]) return;
      var c = clone(e); c.id = uid("e",d.edges); c.from = mapping[e.from]; c.to = mapping[e.to];
      setWaypoints(c, waypoints(c).map(function (w) { return { x: w.x + 24, y: w.y + 24 }; }));
      d.edges.push(c);
    });
    state.sel = {fig:f,items:roots.map(function (n) {return {type:"node",id:mapping[n.id]};})};
    afterChange();
  }
  function arrangeSelection(f, action) {
    var roots = selectedRoots(f); if (!roots.length) return;
    if (action.indexOf("distribute") === 0 && roots.length < 3) return;
    snapshot();
    var deltas = {};
    if (action === "fit") {
      roots.forEach(function (n) {
        if (n.kind === "note") { fitNoteHeight(n); return; }
        if (childrenOf(f,n.id).length || n.kind === "divider") return;
        var texts = [n.title,n.sub,n.sub2].filter(Boolean);
        var fontSize = drawingFontSize(n, 15);
        var weightFactor = appearanceOf(n).bold ? 1.15 : 1;
        n.w = Math.max(100, Math.ceil(Math.max.apply(Math,[0].concat(texts.map(function (s) {return textWidth(s,fontSize) * weightFactor;}))) + 32));
        n.h = Math.max(52, texts.length * Math.max(20, fontSize * 1.3) + 24);
      });
    } else {
      var axis = action === "left" || action === "distribute-x" ? "x" : "y";
      var dim = axis === "x" ? "w" : "h";
      roots.sort(function(a,b){return a[axis]-b[axis];});
      var first = roots[0][axis], cursor = first;
      var gap = roots.length > 1 ? (roots[roots.length-1][axis]+roots[roots.length-1][dim]-first-roots.reduce(function(sum,n){return sum+n[dim];},0))/(roots.length-1) : 0;
      roots.forEach(function(n){
        var target = action.indexOf("distribute") === 0 ? cursor : first;
        var delta = target-n[axis];
        descendants(f,[n]).forEach(function(k){k[axis]+=delta; deltas[k.id]={axis:axis,value:delta};});
        cursor += n[dim]+gap;
      });
      fig(f).edges.forEach(function(e){var a=deltas[e.from],b=deltas[e.to]; if(a&&b&&a.axis===b.axis&&a.value===b.value)waypoints(e).forEach(function(w){w[a.axis]+=a.value;});});
    }
    afterChange();
  }
  function studioFigureTools(f, bar) {
    bar.appendChild(toolButton(t("tools.diagrams"),function(){openDiagramPresets(f);},"btn--ghost"));
    var active = state.sel.fig === f && selIds("node").length > 0;
    var duplicate = toolButton(t("tools.duplicate"),function(){duplicateSelection(f);},"btn--ghost"); duplicate.disabled=!active; bar.appendChild(duplicate);
    var select = document.createElement("select"); select.className="btn btn--sm"; select.setAttribute("aria-label",t("tools.arrange.aria"));
    [["",t("tools.arrange")],["left",t("tools.arrange.left")],["top",t("tools.arrange.top")],["distribute-x",t("tools.arrange.distributeX")],["distribute-y",t("tools.arrange.distributeY")],["fit",t("tools.arrange.fit")]].forEach(function(pair){var option=document.createElement("option");option.value=pair[0];option.textContent=pair[1];select.appendChild(option);});
    select.disabled=!active;
    select.addEventListener("change",function(){if(select.value)arrangeSelection(f,select.value);});bar.appendChild(select);
  }
  function preparePrint() {
    contentRoot.querySelectorAll(".answer-print").forEach(function(e){e.remove();});
    contentRoot.querySelectorAll("[data-answer]").forEach(function(ta){
      var p=document.createElement("div");p.className="answer-print";p.textContent=ta.value||t("answers.printEmpty");ta.parentNode.appendChild(p);
    });
  }
  // Un documento descargado desde Plantillas sale en el idioma de la interfaz.
  function templateVar(template) {
    if (!template.i18n) return template;
    return template.i18n[lang] || template.i18n.es || template;
  }
  function newTemplate(template) {
    var v = templateVar(template);
    var root = document.documentElement.cloneNode(true);
    // el cuerpo va en #document-content, no repetido dentro del JSON: al abrir el
    // fichero descargado el motor lo vuelve a leer de ahi
    var fresh = {version:1,meta:{rev:1,savedAt:"",savedBy:"",history:[]},answers:{},figures:clone(v.figures||{}),document:{design:template.design,theme:"auto"}};
    root.setAttribute("lang",lang);
    root.querySelector("#document-content").innerHTML=v.html;
    root.querySelector("#diagram-data").textContent="\n"+fileJSON(fresh)+"\n";
    root.querySelector("title").textContent=v.title;
    root.setAttribute("data-design",template.design);root.removeAttribute("data-theme");
    root.querySelector("body").classList.remove("editing","editing-content");
    root.querySelector("#overlay").hidden=true;
    root.querySelector("#modal-body").innerHTML="";root.querySelector("#modal-actions").innerHTML="";
    root.querySelector("#props").classList.remove("open");root.querySelector("#props-body").innerHTML="";
    root.querySelector("#notice").classList.remove("open");
    root.querySelector("#btn-history").textContent="v1";
    root.querySelector("#status").className="saved";root.querySelector("#status").textContent=t("status.clean");
    root.querySelector(".brandmark").textContent=t("template.brand")+" · "+v.title;
    root.querySelector("#btn-edit").textContent=t("appbar.edit");root.querySelector("#btn-edit").setAttribute("aria-pressed","false");
    downloadBlob(template.id+".html","<!doctype html>\n"+root.outerHTML);
    closeModal();notice(t("templates.done",{file:template.id+".html"}));
  }
  function openTemplates() {
    openModal(t("templates.title"),function(body){
      var p=document.createElement("p");p.textContent=t("templates.intro");body.appendChild(p);
      var grid=document.createElement("div");grid.className="template-grid";
      templateCatalog.forEach(function(template){
        var v=templateVar(template);
        var card=toolButton("",function(){newTemplate(template);},"template-card");
        var preview=document.createElement("span");preview.className="template-preview";preview.setAttribute("aria-hidden","true");preview.innerHTML="<i></i><i></i><i></i>";
        var title=document.createElement("strong");title.textContent=v.title;
        var detail=document.createElement("small");detail.textContent=v.description;
        card.appendChild(preview);card.appendChild(title);card.appendChild(detail);grid.appendChild(card);
      });body.appendChild(grid);
    },[{label:t("modal.close"),onClick:closeModal}]);
  }
  function initStudio(restored) {
    closeToolbarPanels();
    document.querySelectorAll('[data-panel]').forEach(function (button) {
      button.addEventListener('click', function () {
        var open = button.getAttribute('aria-expanded') !== 'true';
        closeToolbarPanels();
        document.getElementById(button.dataset.panel).classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', String(open));
      });
    });
    /* Un panel abierto tapa el documento, asi que se cierra en cuanto dejas de usarlo:
       al pulsar fuera de la barra, o al pulsar cualquier boton que haga algo. Los
       botones que abren panel se excluyen -de eso ya se encarga el de arriba- y los
       selectores de Estilo, Tema e Idioma tambien, que viven dentro del panel y hay
       que poder cambiarlos sin que se cierre en la cara. */
    document.addEventListener('click', function (event) {
      var enBarra = event.target.closest('.appbar');
      var abrePanel = event.target.closest('[data-panel]');
      if (!enBarra || (!abrePanel && event.target.closest('button'))) closeToolbarPanels();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var button = document.querySelector('[data-panel][aria-expanded="true"]');
      closeToolbarPanels();
      if (button) button.focus();
    });
    if (!baseline.document) baseline.document={html:captureContent(),design:"technical",theme:"auto"};
    // The visible HTML remains authoritative for documents filled in by hand.
    baseline.document.html=captureContent();
    if (!model.document) model.document=clone(baseline.document);
    if (!restored) model.document.html=baseline.document.html;
    restoreContent();
    marcaEnlaces(contentRoot);
    document.getElementById("btn-link").addEventListener("click",openLinkDialog);
    document.getElementById("btn-templates").addEventListener("click",openTemplates);
    document.getElementById("btn-print").addEventListener("click",function(){preparePrint();window.print();});
    window.addEventListener("beforeprint",preparePrint);
    document.querySelectorAll("[data-add-block]").forEach(function(btn){btn.addEventListener("click",function(){addBlock(btn.getAttribute("data-add-block"));});});
    document.getElementById("btn-content-undo").addEventListener("click",undo);
    document.getElementById("btn-content-redo").addEventListener("click",redo);
    [["design-select","design"],["theme-select","theme"]].forEach(function(pair){document.getElementById(pair[0]).addEventListener("change",function(e){snapshot();model.document[pair[1]]=e.target.value;applyAppearance();markDirty();});});
    document.getElementById("lang-select").addEventListener("change",function(e){setLang(e.target.value);});
    contentRoot.addEventListener("focusout",function(){textSession=null;});
    contentRoot.addEventListener("beforeinput",function(e){beginTextChange(e.target);});
    contentRoot.addEventListener("input",function(e){if(e.target.isContentEditable){beginTextChange(e.target);syncContent();var h=contentRoot.querySelector("h1");if(h)document.title=h.textContent;markDirty();}});
    contentRoot.addEventListener("paste",function(e){if(!e.target.isContentEditable)return;e.preventDefault();insertPlainText(e.clipboardData.getData("text/plain"));});
    contentRoot.addEventListener("drop",function(e){if(e.target.isContentEditable)e.preventDefault();});
    contentRoot.addEventListener("keydown",function(e){
      if(!e.target.isContentEditable)return;
      if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();insertPlainText("\n");}
      if((e.ctrlKey||e.metaKey)&&(e.key.toLowerCase()==="z"||e.key.toLowerCase()==="y")){e.preventDefault();if(e.shiftKey||e.key.toLowerCase()==="y")redo();else undo();}
    });
  }
  function closeToolbarPanels() {
    document.querySelectorAll('.appbar .is-open').forEach(function (panel) { panel.classList.remove('is-open'); });
    document.querySelectorAll('.appbar [data-panel]').forEach(function (button) { button.setAttribute('aria-expanded','false'); });
  }
