const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function appearanceTests({run,open,click,installSaveMock,save,model,screenshot,artifacts,cdp}) {
  async function pickNode(id) {
    await run(`document.querySelector('[data-svg="f1"] [data-node="${id}"]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))`);
  }
  async function pickEdge(id) {
    await run(`document.querySelector('[data-svg="f1"] [data-edge="${id}"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0}))`);
  }
  async function appearance(key,value) {
    await run(`{const e=document.querySelector('#props [data-appearance="${key}"]');if(!e)throw new Error('Missing field: ${key}');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));}`);
  }
  async function action(text) {
    await run(`Array.from(document.querySelectorAll('#props button')).find(b=>b.textContent===${JSON.stringify(text)}).click()`);
  }
  async function shape(id) {
    return run(`{const g=document.querySelector('[data-svg="f1"] [data-node="${id}"]');const s=g.querySelector('[class^="n-"]');const t=g.querySelector('text');({stroke:getComputedStyle(s).stroke,fill:getComputedStyle(s).fill,dash:getComputedStyle(s).strokeDasharray,width:getComputedStyle(s).strokeWidth,radius:s.getAttribute('rx'),opacity:getComputedStyle(g).opacity,text:getComputedStyle(t).fill,fontSize:getComputedStyle(t).fontSize,bold:getComputedStyle(t).fontWeight,italic:getComputedStyle(t).fontStyle,align:t.getAttribute('text-anchor')})}`);
  }
  await open('template.html');await click('btn-edit');await pickNode('b');
  await appearance('stroke','#a855f7');await appearance('fill','#faf5ff');
  await appearance('dash','dashdot');await appearance('strokeWidth','3');await appearance('radius','18');
  await appearance('opacity','65');await appearance('textColor','#581c87');await appearance('fontSize','20');
  await appearance('bold','true');await appearance('italic','true');await appearance('align','start');
  let box=await shape('b');
  assert.equal(box.stroke,'rgb(168, 85, 247)');assert.equal(box.fill,'rgb(250, 245, 255)');
  assert.equal(box.width,'3px');assert.equal(box.radius,'18');assert.equal(box.opacity,'0.65');
  assert.ok(box.dash.includes('21px'));assert.equal(box.text,'rgb(88, 28, 135)');
  assert.equal(box.bold,'700');assert.equal(box.italic,'italic');assert.equal(box.align,'start');
  assert.equal(box.fontSize,'20px');
  await action('Copiar apariencia');await pickNode('a');await action('Pegar apariencia');
  assert.deepEqual(await shape('a'),box);
  await action('Restablecer apariencia');
  assert.notEqual((await shape('a')).stroke,box.stroke);
  await run(`Array.from(document.querySelectorAll('[data-tools="f1"] button')).find(b=>b.textContent==='Deshacer').click()`);
  assert.deepEqual(await shape('a'),box);
  await appearance('dash','dotted');
  assert.equal(await run('getComputedStyle(document.querySelector(\'[data-node="a"] .n-box\')).strokeLinecap'),'round');
  await run('document.querySelector(\'#props [data-appearance="transparent"]\').click()');
  assert.equal((await shape('a')).fill,'none');
  await appearance('dash','solid');assert.equal((await shape('a')).dash,'none');
  await appearance('dash','longdash');assert.ok((await shape('a')).dash.includes('36px'));
  await appearance('dash','dashed');assert.ok((await shape('a')).dash.includes('18px'));
  console.log('PASS: colors, all five stroke patterns, radius, opacity, text and copy/paste/reset/undo');

  await pickEdge('e1');await appearance('stroke','#ea580c');await appearance('strokeWidth','2.5');
  await appearance('dash','dashdot');await appearance('startHead','circle');await appearance('endHead','open');
  await appearance('linecap','round');await appearance('textColor','#9a3412');await appearance('fontSize','16');
  const arrow=await run(`{const line=document.querySelector('[data-edge="e1"] .e-line');const start=line.getAttribute('marker-start');const end=line.getAttribute('marker-end');const marker=document.querySelector(end.slice(4,-1));({start,end,stroke:getComputedStyle(line).stroke,headStroke:getComputedStyle(marker.firstChild).stroke,headFill:getComputedStyle(marker.firstChild).fill})}`);
  assert.ok(arrow.start);assert.ok(arrow.end);assert.equal(arrow.stroke,'rgb(234, 88, 12)');
  assert.equal(arrow.headStroke,arrow.stroke);assert.equal(arrow.headFill,'none');
  await appearance('endHead','none');assert.equal(await run('document.querySelector(\'[data-edge="e1"] .e-line\').hasAttribute("marker-end")'),false);
  await appearance('endHead','diamond');
  await appearance('strokeWidth','0');
  assert.equal(await run('document.querySelector(\'[data-edge="e1"] .e-line\').hasAttribute("marker-end")'),false);
  await appearance('strokeWidth','2.5');
  console.log('PASS: independently colored edges and matching endpoint markers, including no arrow');

  await run(`Array.from(document.querySelectorAll('[data-tools="f1"] button')).find(b=>b.textContent==='Seleccionar todo').click()`);
  await appearance('stroke','#2563eb');await appearance('dash','dashed');
  await installSaveMock();
  let html=await save('Apariencia personalizada');
  const all=await model();
  assert.ok(all.figures.f1.nodes.every(n=>n.appearance.stroke==='#2563eb'));
  assert.ok(all.figures.f1.edges.every(e=>e.appearance.stroke==='#2563eb'));
  assert.equal(all.figures.f1.nodes.find(n=>n.id==='b').appearance.fill,'#faf5ff');
  const saved=path.join(artifacts,'apariencia-v2.html');fs.writeFileSync(saved,html);await open(saved);
  assert.equal((await shape('b')).stroke,'rgb(37, 99, 235)');assert.equal((await shape('b')).radius,'18');
  assert.equal((await model()).meta.history.at(-1).note,'Apariencia personalizada');
  await click('btn-edit');await pickNode('b');
  await run(`document.querySelectorAll('#props details').forEach(d=>d.open=true);document.querySelector('#props').scrollTop=250;`);
  await screenshot('apariencia-caja');
  await run('window.__svg=null;URL.createObjectURL=blob=>{window.__svgPromise=blob.text().then(t=>window.__svg=t);return "blob:appearance-test"};HTMLAnchorElement.prototype.click=function(){};');
  await run(`Array.from(document.querySelectorAll('[data-tools="f1"] button')).find(b=>b.textContent==='Exportar SVG').click()`);
  const svg=await run('window.__svgPromise');assert.ok(svg.startsWith('<?xml'));assert.ok(!svg.includes('var(--'));
  const svgPath=path.join(artifacts,'apariencia.svg');fs.writeFileSync(svgPath,svg);
  const exported=await run(`{const doc=new DOMParser().parseFromString(window.__svg,'image/svg+xml');const g=doc.querySelector('[data-node="b"]');const r=g.querySelector('rect');const line=doc.querySelector('[data-edge="e1"] polyline:nth-child(2)');({color:r.getAttribute('stroke'),radius:r.getAttribute('rx'),opacity:g.getAttribute('opacity'),dash:r.getAttribute('stroke-dasharray'),marker:line.getAttribute('marker-end'),valid:!doc.querySelector('parsererror')})}`);
  assert.equal(exported.valid,true);assert.equal(exported.color,'rgb(37, 99, 235)');assert.equal(exported.radius,'18');
  assert.equal(exported.opacity,'0.65');assert.ok(exported.dash!=='none');assert.ok(exported.marker);
  console.log('PASS: mixed selection, versioned save/reopen and standalone SVG preserve appearance');

  // Notes and boundary lines use the same appearance controls without losing geometry.
  await run(`Array.from(document.querySelectorAll('[data-tools="f1"] button')).find(b=>b.textContent==='+ Nota').click()`);
  await appearance('fontSize','22');await appearance('fill','#fff7ed');await appearance('stroke','#c2410c');
  await appearance('dash','dotted');
  await installSaveMock();await save('Nota personalizada');
  const note=(await model()).figures.f1.nodes.find(n=>n.kind==='note');
  assert.ok(note.h>60);assert.equal(note.appearance.fontSize,22);
  await pickNode('c');
  await run(`{const s=Array.from(document.querySelectorAll('#props .field')).find(f=>f.querySelector('label').textContent==='Estilo').querySelector('select');s.value='divider';s.dispatchEvent(new Event('change'));}`);
  await appearance('stroke','#db2777');await appearance('dash','dashdot');
  assert.equal(await run('getComputedStyle(document.querySelector(\'[data-node="c"] .n-divider\')).stroke'),'rgb(219, 39, 119)');
  await cdp('Emulation.setEmulatedMedia',{media:'print'});
  assert.equal((await shape('b')).stroke,'rgb(37, 99, 235)');
  await cdp('Emulation.setEmulatedMedia',{media:''});
  console.log('PASS: note text resizes its box, divider strokes and custom print colors');

  // Build the new composition using only the standalone editor, then move the file.
  await open('template.html');await click('btn-edit');
  await run(`Array.from(document.querySelectorAll('[data-tools="f1"] button')).find(b=>b.textContent==='Diagramas…').click()`);
  await run(`Array.from(document.querySelectorAll('#modal-body button')).find(b=>b.textContent==='Panel de tarjetas').click()`);
  await installSaveMock();let panelHtml=await save('Panel de tarjetas');
  let panelModel=await model();
  const nodes=panelModel.figures.f1.nodes;
  const panel=nodes.find(n=>n.appearance?.fillOpacity===0.12);
  const card=nodes.find(n=>n.appearance?.shadow==='soft');
  const curve=panelModel.figures.f1.edges.find(e=>e.appearance?.route==='curve');
  assert.ok(panel && card && curve);
  assert.equal(card.parent,panel.id);
  assert.ok(nodes.filter(n=>n.parent===panel.id).length===4);
  const moved=path.join(artifacts,'standalone-panel.html');fs.writeFileSync(moved,panelHtml);
  await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await open(moved);
  assert.equal(await run(`getComputedStyle(document.querySelector('[data-node="${panel.id}"] .n-box')).fillOpacity`),'0.12');
  assert.equal(await run(`getComputedStyle(document.querySelector('[data-node="${panel.id}"]')).opacity`),'1');
  assert.equal(await run(`document.querySelector('[data-node="${card.id}"]').querySelectorAll('rect').length`),2);
  assert.ok(await run(`document.querySelector('[data-edge="${curve.id}"] path.e-line').getTotalLength()>0`));
  assert.equal(await run(`{const g=document.querySelector('[data-edge="${curve.id}"]');g.querySelector('path.hit').getAttribute('d')===g.querySelector('path.e-line').getAttribute('d')}`),true);
  await click('btn-edit');await pickNode(card.id);await appearance('preset','panel');
  assert.equal(await run(`getComputedStyle(document.querySelector('[data-node="${card.id}"] .n-box')).fillOpacity`),'0.12');
  assert.equal(await run(`getComputedStyle(document.querySelector('[data-node="${card.id}"] text')).opacity`),'1');
  await run(`Array.from(document.querySelectorAll('[data-tools="f1"] button')).find(b=>b.textContent==='Deshacer').click()`);
  await pickEdge(curve.id);await appearance('route','rounded');
  await action('Añadir codo');
  assert.ok(await run(`document.querySelector('[data-edge="${curve.id}"] path.e-line').getAttribute('d').includes('Q')`));
  assert.equal(await run(`document.querySelectorAll('[data-edge="${curve.id}"] path').length`),2);
  await action('Quitar codo');
  await appearance('route','curve');
  await installSaveMock();panelHtml=await save('Edición sin conexión');
  assert.ok(panelHtml.length<200000,'standalone editor stays compact');
  fs.writeFileSync(moved,panelHtml);await open(moved);
  assert.equal((await model()).meta.history.at(-1).note,'Edición sin conexión');
  await screenshot('panel-tarjetas');
  await run('URL.createObjectURL=blob=>{window.__svgPromise=blob.text();return "blob:panel-test"};HTMLAnchorElement.prototype.click=function(){};');
  await click('btn-edit');
  await run(`Array.from(document.querySelectorAll('[data-tools="f1"] button')).find(b=>b.textContent==='Exportar SVG').click()`);
  const panelSvg=await run('window.__svgPromise');
  assert.ok(panelSvg.includes('fill-opacity="0.12"'));
  assert.ok(panelSvg.includes(' C'));
  fs.writeFileSync(path.join(artifacts,'panel-tarjetas.svg'),panelSvg);
  await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  console.log('PASS: card panel, independent fill opacity, shadows, curved hit targets, undo and offline save/reopen/export under 200 KB');
};
