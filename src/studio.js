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
      setTextEditing(textEditing);
    }
    applyAppearance();
    var title = contentRoot.querySelector("h1");
    if (title) document.title = title.textContent.trim() || "Documento";
  }
  function setTextEditing(on) {
    textSession = null;
    textEditing = on;
    renderSectionControls(on);
    document.body.classList.toggle("editing-content", on);
    var btn = document.getElementById("btn-content");
    btn.textContent = on ? "Terminar texto" : "Editar texto";
    btn.setAttribute("aria-pressed", String(on));
    contentRoot.querySelectorAll(EDITABLE).forEach(function (e) {
      if (e.closest(".figtools,.deccount,.answer") || e.querySelector("textarea,input,button")) return;
      if (on) e.setAttribute("contenteditable", "true");
      else e.removeAttribute("contenteditable");
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
  function changeSection(index, action) {
    var root = cleanContent(contentRoot.cloneNode(true));
    var sections = Array.from(root.children).filter(function (e) { return e.tagName === "SECTION"; });
    var section = sections[index];
    if (!section || (action === "up" && index === 0) || (action === "down" && index === sections.length - 1)) return;
    snapshot();
    if (action === "remove") {
      section.querySelectorAll('[data-fig]').forEach(function (e) { delete model.figures[e.getAttribute('data-fig')]; });
      section.querySelectorAll('[data-answer]').forEach(function (e) { delete model.answers[e.getAttribute('data-answer')]; });
      section.remove();
      selClear();
    } else if (action === "up") root.insertBefore(section, sections[index - 1]);
    else root.insertBefore(sections[index + 1], section);
    model.document.html = root.innerHTML;
    afterChange();
  }
  function renderSectionControls(on) {
    contentRoot.querySelectorAll('[data-block-tools]').forEach(function (e) { e.remove(); });
    if (!on) return;
    var sections = Array.from(contentRoot.children).filter(function (e) { return e.tagName === "SECTION"; });
    sections.forEach(function (section, index) {
      var bar = document.createElement('div'); bar.className = 'section-controls'; bar.setAttribute('data-block-tools', '');
      [['up', 'Subir'], ['down', 'Bajar'], ['remove', 'Eliminar sección']].forEach(function (pair) {
        var button = toolButton(pair[1], function () { changeSection(index, pair[0]); }, 'btn--ghost');
        button.disabled = pair[0] === 'up' && index === 0 || pair[0] === 'down' && index === sections.length - 1;
        button.setAttribute('aria-label', pair[1] + ': ' + (section.querySelector('h2') ? section.querySelector('h2').textContent : 'sección ' + (index + 1)));
        bar.appendChild(button);
      });
      section.insertBefore(bar, section.firstChild);
    });
  }
  function beginTextChange(target) {
    if (target && target.isContentEditable && textSession !== target) {
      snapshot();
      textSession = target;
    }
  }
  function newDecision(id) {
    return '<section><h2>Decisión pendiente</h2><ol class="decisions"><li data-decision="' + id + '">'
      + '<span class="num">' + String(id).padStart(2, "0") + '</span><div><p class="decision-q">¿Qué hay que decidir?</p>'
      + '<p class="decision-w">Explica las consecuencias y quién debe responder.</p></div>'
      + '<div class="answer"><span class="lbl">Respuesta:</span><textarea data-answer="' + id + '" rows="1" placeholder="sin responder"></textarea></div></li></ol></section>';
  }
  function figureHTML(id) {
    return '<section><h2>Diagrama</h2><figure data-fig="' + id + '"><div class="figtools" data-tools="' + id + '"></div>'
      + '<div class="canvas canvas--mid"><svg data-svg="' + id + '" role="img" aria-label="Diagrama del documento"></svg></div>'
      + '<figcaption>Describe lo que muestra el diagrama.</figcaption></figure></section>';
  }
  function addBlock(kind) {
    snapshot();
    var root = cleanContent(contentRoot.cloneNode(true));
    var section = '<section><h2>Nueva sección</h2><p>Escribe aquí el contenido.</p></section>';
    if (kind === "callout") section = '<section><div class="callout"><h3>Idea destacada</h3><p>Explica el hallazgo o la recomendación.</p></div></section>';
    if (kind === "table") section = '<section><h2>Comparación</h2><div class="tablewrap"><table><thead><tr><th>Criterio</th><th>Alternativa A</th><th>Alternativa B</th></tr></thead><tbody><tr><td>Beneficio</td><td>Por completar</td><td>Por completar</td></tr><tr><td>Limitación</td><td>Por completar</td><td>Por completar</td></tr></tbody></table></div></section>';
    if (kind === "decision") {
      var ids = Array.from(root.querySelectorAll("[data-decision]")).map(function (e) { return Number(e.getAttribute("data-decision")) || 0; });
      section = newDecision(Math.max.apply(Math, [0].concat(ids)) + 1);
    }
    if (kind === "figure") {
      var id = uid("f", Object.keys(model.figures).map(function (f) { return { id: f }; }));
      model.figures[id] = diagramPreset("flow");
      section = figureHTML(id);
    }
    var footer = root.querySelector("footer");
    if (footer) footer.insertAdjacentHTML("beforebegin", section);
    else root.insertAdjacentHTML("beforeend", section);
    model.document.html = root.innerHTML;
    afterChange();
    var added = contentRoot.querySelector("section:last-of-type");
    if (added) { added.scrollIntoView({ behavior: "smooth", block: "center" }); var heading = added.querySelector("[contenteditable]"); if (heading) heading.focus(); }
  }
  function diagramPreset(kind) {
    var labels = kind === "layers" ? ["Presentación", "Aplicación", "Datos"] : kind === "sequence" ? ["Preparar", "Ejecutar", "Validar"] : ["Entrada", "Proceso", "Resultado"];
    var vertical = kind === "layers";
    var nodes = labels.map(function (t, i) { return { id: "n" + i, x: vertical ? 180 : 32 + i * 224, y: vertical ? 32 + i * 112 : 64, w: 176, h: 64, kind: i === 1 ? "new" : "box", title: t }; });
    var edges = [0, 1].map(function (i) { return { id: "e" + i, from: "n" + i, to: "n" + (i + 1), label: kind === "sequence" ? "continúa" : "envía" }; });
    if (kind === "beforeafter") {
      nodes = [{id:"n0",x:32,y:64,w:220,h:72,kind:"dead",title:"Situación actual",sub:"limitación por resolver"}, {id:"n1",x:352,y:64,w:220,h:72,kind:"new",title:"Situación propuesta",sub:"mejora esperada"}];
      edges = [{id:"e0",from:"n0",to:"n1",label:"transformación",kind:"new"}];
    }
    return { w: vertical ? 540 : 704, h: vertical ? 384 : 224, nodes: nodes, edges: edges };
  }
  function insertDiagramPreset(f, kind) {
    snapshot();
    var preset = diagramPreset(kind), d = fig(f), mapping = {};
    var offset = d.nodes.length ? Math.max.apply(Math, d.nodes.map(function (n) { return n.y + n.h; })) + 48 : 0;
    preset.nodes.forEach(function (n) { var old = n.id; n.id = uid("n", d.nodes); mapping[old] = n.id; n.y += offset; d.nodes.push(n); });
    preset.edges.forEach(function (e) { e.id = uid("e", d.edges); e.from = mapping[e.from]; e.to = mapping[e.to]; d.edges.push(e); });
    d.w = Math.max(d.w, preset.w); d.h = Math.max(d.h, offset + preset.h);
    state.sel = { fig: f, items: preset.nodes.map(function (n) { return { type: "node", id: n.id }; }) };
    closeModal(); afterChange();
  }
  function openDiagramPresets(f) {
    openModal("Añadir diagrama", function (body) {
      [["flow","Flujo"],["layers","Arquitectura por capas"],["beforeafter","Antes y después"],["sequence","Secuencia de etapas"]].forEach(function (pair) {
        body.appendChild(toolButton(pair[1], function () { insertDiagramPreset(f, pair[0]); }));
      });
    }, [{label:"Cerrar",onClick:closeModal}]);
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
      if (c.wp) { c.wp.x += 24; c.wp.y += 24; } d.edges.push(c);
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
      fig(f).edges.forEach(function(e){var a=deltas[e.from],b=deltas[e.to]; if(e.wp&&a&&b&&a.axis===b.axis&&a.value===b.value)e.wp[a.axis]+=a.value;});
    }
    afterChange();
  }
  function studioFigureTools(f, bar) {
    bar.appendChild(toolButton("Diagramas…",function(){openDiagramPresets(f);},"btn--ghost"));
    var active = state.sel.fig === f && selIds("node").length > 0;
    var duplicate = toolButton("Duplicar",function(){duplicateSelection(f);},"btn--ghost"); duplicate.disabled=!active; bar.appendChild(duplicate);
    var select = document.createElement("select"); select.className="btn btn--sm"; select.setAttribute("aria-label","Organizar cajas");
    [["","Organizar…"],["left","Alinear izquierda"],["top","Alinear arriba"],["distribute-x","Distribuir horizontal"],["distribute-y","Distribuir vertical"],["fit","Ajustar al texto"]].forEach(function(pair){var option=document.createElement("option");option.value=pair[0];option.textContent=pair[1];select.appendChild(option);});
    select.disabled=!active;
    select.addEventListener("change",function(){if(select.value)arrangeSelection(f,select.value);});bar.appendChild(select);
  }
  function preparePrint() {
    contentRoot.querySelectorAll(".answer-print").forEach(function(e){e.remove();});
    contentRoot.querySelectorAll("[data-answer]").forEach(function(ta){
      var p=document.createElement("div");p.className="answer-print";p.textContent=ta.value||"Sin responder";ta.parentNode.appendChild(p);
    });
  }
  function newTemplate(template) {
    var root = document.documentElement.cloneNode(true);
    var fresh = {version:1,meta:{rev:1,savedAt:"",savedBy:"",history:[]},answers:{},figures:clone(template.figures),document:{html:template.html,design:template.design,theme:"auto"}};
    root.querySelector("#document-content").innerHTML=template.html;
    root.querySelector("#diagram-data").textContent="\n"+JSON.stringify(fresh,null,2).replace(/</g,"\\u003c")+"\n";
    root.querySelector("title").textContent=template.title;
    root.setAttribute("data-design",template.design);root.removeAttribute("data-theme");
    root.querySelector("body").classList.remove("editing","editing-content");
    root.querySelector("#overlay").hidden=true;
    root.querySelector("#modal-body").innerHTML="";root.querySelector("#modal-actions").innerHTML="";
    root.querySelector("#props").classList.remove("open");root.querySelector("#props-body").innerHTML="";
    root.querySelector("#notice").classList.remove("open");
    root.querySelector("#btn-history").textContent="v1";
    root.querySelector("#status").className="saved";root.querySelector("#status").textContent="sin cambios";
    root.querySelector(".brandmark").textContent="docuweb · "+template.title;
    root.querySelector("#btn-edit").textContent="Editar diagramas";root.querySelector("#btn-edit").setAttribute("aria-pressed","false");
    root.querySelector("#btn-content").textContent="Editar texto";root.querySelector("#btn-content").setAttribute("aria-pressed","false");
    downloadBlob(template.id+".html","<!doctype html>\n"+root.outerHTML);
    closeModal();notice("Plantilla descargada. Abre "+template.id+".html para empezar un documento nuevo.");
  }
  function openTemplates() {
    openModal("Un documento para cada propósito",function(body){
      var p=document.createElement("p");p.textContent="Elige una estructura. Se descargará un documento nuevo, listo para editar y compartir.";body.appendChild(p);
      var grid=document.createElement("div");grid.className="template-grid";
      templateCatalog.forEach(function(t){
        var card=toolButton("",function(){newTemplate(t);},"template-card");
        var preview=document.createElement("span");preview.className="template-preview";preview.setAttribute("aria-hidden","true");preview.innerHTML="<i></i><i></i><i></i>";
        var title=document.createElement("strong");title.textContent=t.title;
        var detail=document.createElement("small");detail.textContent=t.description;
        card.appendChild(preview);card.appendChild(title);card.appendChild(detail);grid.appendChild(card);
      });body.appendChild(grid);
    },[{label:"Cerrar",onClick:closeModal}]);
  }
  function initStudio(restored) {
    if (!baseline.document) baseline.document={html:captureContent(),design:"technical",theme:"auto"};
    // The visible HTML remains authoritative for documents filled in by hand.
    baseline.document.html=captureContent();
    if (!model.document) model.document=clone(baseline.document);
    if (!restored) model.document.html=baseline.document.html;
    restoreContent();
    document.getElementById("btn-content").addEventListener("click",function(){setTextEditing(!textEditing);});
    document.getElementById("btn-templates").addEventListener("click",openTemplates);
    document.getElementById("btn-print").addEventListener("click",function(){preparePrint();window.print();});
    window.addEventListener("beforeprint",preparePrint);
    document.querySelectorAll("[data-add-block]").forEach(function(btn){btn.addEventListener("click",function(){addBlock(btn.getAttribute("data-add-block"));});});
    document.getElementById("btn-content-undo").addEventListener("click",undo);
    document.getElementById("btn-content-redo").addEventListener("click",redo);
    [["design-select","design"],["theme-select","theme"]].forEach(function(pair){document.getElementById(pair[0]).addEventListener("change",function(e){snapshot();model.document[pair[1]]=e.target.value;applyAppearance();markDirty();});});
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
