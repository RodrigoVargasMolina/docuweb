/* No npm dependencies: exercise the actual standalone files through Chromium CDP. */
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {pathToFileURL} = require('node:url');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const browser = process.env.DOCUWEB_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(),'docuweb-browser-'));
const artifacts = process.env.DOCUWEB_ARTIFACTS || path.join(profile,'artifacts');
fs.mkdirSync(artifacts,{recursive:true});
const child = spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws,seq=0;
const pending=new Map();
const errors=[];
async function cdp(method,params={}) {
  const id=++seq;
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{pending.delete(id);reject(new Error('Timeout: '+method));},20000);
    pending.set(id,{resolve:r=>{clearTimeout(timeout);resolve(r);},reject:e=>{clearTimeout(timeout);reject(e);}});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function run(expression){
  const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});
  if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function open(file){
  await cdp('Page.navigate',{url:pathToFileURL(path.resolve(root,file)).href});
  for(let i=0;i<100;i++){
    try {if(await run('document.readyState === "complete" && !!document.querySelector("#design-select")'))break;}catch{}
    await sleep(100);
  }
  await sleep(100);
}
async function click(id){await run(`document.getElementById(${JSON.stringify(id)}).click()`);}
async function change(id,value){await run(`{const e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));}`);}
async function model(){return run('JSON.parse(document.querySelector("#diagram-data").textContent)');}
async function installSaveMock(cancel=false){
  await run(`window.__saved=null; window.showSaveFilePicker=async()=>{${cancel?'throw new DOMException("Cancelled","AbortError");':'return {createWritable:async()=>({write:async text=>{window.__saved=text},close:async()=>{}})};'}}`);
}
async function save(note='Revisión de prueba'){
  await click('btn-save');
  await run(`{const inputs=document.querySelectorAll('#modal-body input');inputs[0].value='Revisor';inputs[0].dispatchEvent(new Event('input'));inputs[1].value=${JSON.stringify(note)};inputs[1].dispatchEvent(new Event('input'));document.querySelector('#modal-actions button').click();}`);
  await sleep(150);
  return run('window.__saved');
}
async function screenshot(name){const image=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(artifacts,name+'.png'),Buffer.from(image.data,'base64'));}
async function main(){
  let port;
  for(let i=0;i<100;i++){try{port=Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);break;}catch{}await sleep(100);}
  if(!port)throw new Error('Chromium did not expose DevTools');
  const targets=await(await fetch('http://127.0.0.1:'+port+'/json')).json();
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}}else if(m.method==='Page.javascriptDialogOpening'){cdp('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
  await cdp('Runtime.enable');await cdp('Page.enable');
  await cdp('Network.enable');await cdp('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
  await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  const templateFile=n=>'templates/'+n;
  const files=['index.html','template.html',
    ...fs.readdirSync(path.join(root,'templates')).filter(n=>n.endsWith('.html')).map(templateFile),
    ...fs.readdirSync(path.join(root,'templates','en')).filter(n=>n.endsWith('.html')).map(n=>templateFile('en/'+n))];
  assert.equal(files.length,12,'every generated document is exercised');
  for(const file of files){
    await open(file);
    // El idioma del documento manda: la interfaz abre en el suyo.
    const esperado=(file==='index.html'||file.startsWith('templates/en/'))?'en':'es';
    assert.equal(await run('document.documentElement.lang'),esperado,file+' declares its language');
    assert.equal(await run('document.getElementById("btn-edit").textContent'),esperado==='en'?'Edit':'Editar',file+' interface language');
    const count=await run('document.querySelectorAll("svg[data-svg]").length');
    assert.equal(await run('Array.from(document.querySelectorAll("svg[data-svg]")).filter(s=>s.children.length>0).length'),count,file+' diagrams render');
    await click('btn-edit');
    assert.ok(await run('document.querySelectorAll("[contenteditable=true]").length')>0,file+' editable text');
    assert.equal(await run('document.body.classList.contains("editing")'),true,file+' editable diagrams');
    await click('btn-edit');
    assert.equal(await run('document.querySelectorAll("[contenteditable=true]").length'),0,file+' leaves editing');
    await screenshot(file.replace(/^templates\//,'').replace(/\.html$/,'').replace(/\//g,'-'));
  }
  console.log('PASS: all 12 documents (Spanish and English templates) load and edit without runtime exceptions');
  await open('template.html');
  await click('btn-edit');
  await run(`{const h=document.querySelector('#document-content h1');h.focus();h.textContent='Informe revisado <seguro>';h.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await change('design-select','editorial');await change('theme-select','dark');
  await run(`document.querySelector('[data-add-block=table]').click();document.querySelector('[data-add-block=figure]').click();document.querySelector('[data-add-block=decision]').click();`);
  assert.equal(await run('document.querySelectorAll("svg[data-svg]").length'),2);
  await run(`{const a=document.querySelector('[data-answer="2"]');a.value='Aprobado\\nCon dos condiciones';a.dispatchEvent(new Event('input'));}`);
  await installSaveMock();
  const html=await save();assert.ok(html&&html.includes('Informe revisado'));
  assert.ok(!html.includes('contenteditable="true"'));assert.ok(!/<body[^>]*inert/.test(html));
  const output=path.join(artifacts,'documento-v2.html');fs.writeFileSync(output,html);
  await open(output);
  assert.equal(await run('document.querySelector("h1").textContent'),'Informe revisado <seguro>');
  assert.equal(await run('document.documentElement.dataset.design'),'editorial');
  assert.equal(await run('document.documentElement.dataset.theme'),'dark');
  assert.equal(await run('document.querySelector("#btn-history").textContent'),'v2');
  assert.equal(await run('document.querySelector(\'[data-answer="2"]\').value'),'Aprobado\nCon dos condiciones');
  assert.equal((await model()).meta.history[0].by,'Revisor');
  assert.equal((await model()).meta.history[0].note,'Revisión de prueba');
  console.log('PASS: version 2 reopens with text, blocks, design, theme, answers and history');
  await installSaveMock(true);await save('Cancelada');
  assert.equal(await run('document.querySelector("#btn-history").textContent'),'v2');
  assert.equal(await run('document.body.inert'),false);
  await installSaveMock();await save('Tercera versión');
  assert.equal((await model()).meta.rev,3);assert.equal((await model()).meta.history.length,2);
  console.log('PASS: cancel preserves revision; subsequent save advances to version 3');
  await click('btn-edit');
  await run(`document.querySelector('[data-add-block=section]').click()`);
  await click('btn-content-undo');assert.equal(await run('document.querySelector("#btn-history").textContent'),'v3');
  await click('btn-content-redo');
  await click('btn-edit');
  await run('window.dispatchEvent(new Event("beforeprint"))');
  await cdp('Emulation.setEmulatedMedia',{media:'print'});
  assert.equal(await run('getComputedStyle(document.querySelector(".appbar")).display'),'none');
  assert.equal(await run('getComputedStyle(document.querySelector(".answer-print")).display'),'block');
  assert.equal(await run('getComputedStyle(document.querySelector("svg[data-svg]")).minWidth'),'0px');
  const pdf=await cdp('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});fs.writeFileSync(path.join(artifacts,'documento.pdf'),Buffer.from(pdf.data,'base64'));
  assert.ok(Buffer.from(pdf.data,'base64').length>10000);
  await cdp('Emulation.setEmulatedMedia',{media:''});
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.ok(await run('document.documentElement.scrollWidth <= 390'),'mobile page must not overflow');
  await screenshot('mobile');
  console.log('PASS: undo keeps version metadata, PDF renders answers and mobile fits');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await open('template.html');
  // Recover the unsaved draft from before the first save, if present, without affecting tests.
  await click('btn-edit');
  await run(`Array.from(document.querySelectorAll('[data-tools="f1"] button')).find(b=>b.textContent==='Seleccionar todo').click()`);
  const before=await run('document.querySelectorAll(\'[data-svg="f1"] [data-node]\').length');
  await run(`Array.from(document.querySelectorAll('[data-tools="f1"] button')).find(b=>b.textContent==='Duplicar').click()`);
  assert.equal(await run('document.querySelectorAll(\'[data-svg="f1"] [data-node]\').length'),before*2);
  await run(`{const s=document.querySelector('[data-tools="f1"] select');s.value='top';s.dispatchEvent(new Event('change'));}`);
  await run(`Array.from(document.querySelectorAll('[data-tools="f1"] button')).find(b=>b.textContent==='Diagramas…').click();Array.from(document.querySelectorAll('#modal-body button')).find(b=>b.textContent==='Arquitectura por capas').click();`);
  assert.equal(await run('document.querySelectorAll(\'[data-svg="f1"] [data-node]\').length'),before*2+3);
  await installSaveMock();await save('Diagramas');
  const data=await model();const ids=new Set(data.figures.f1.nodes.map(n=>n.id));
  assert.equal(ids.size,data.figures.f1.nodes.length);assert.ok(data.figures.f1.edges.every(e=>ids.has(e.from)&&ids.has(e.to)));
  console.log('PASS: duplicate, alignment and preset insertion preserve graph references');
  await run('window.__template=null;URL.createObjectURL=blob=>{blob.text().then(t=>window.__template=t);return "blob:blocked-test"};HTMLAnchorElement.prototype.click=function(){};');
  await click('btn-templates');await run('document.querySelector(".template-card").click()');await sleep(100);
  const newHtml=await run('window.__template');assert.ok(newHtml.includes('Propuesta técnica'));
  const newPath=path.join(artifacts,'propuesta-nueva.html');fs.writeFileSync(newPath,newHtml);await open(newPath);
  assert.equal((await model()).meta.rev,1);assert.equal((await model()).meta.history.length,0);
  assert.equal(await run('document.querySelector("svg[data-svg]").children.length>0'),true);
  console.log('PASS: gallery downloads a separate, working document with fresh history');
  // Text undo/redo and local draft recovery must survive rebuilding the content DOM.
  await click('btn-edit');
  const initialTitle=await run('document.querySelector("h1").textContent');
  await run(`{const h=document.querySelector('h1');h.focus();h.textContent='Borrador recuperable';h.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await click('btn-content-undo');assert.equal(await run('document.querySelector("h1").textContent'),initialTitle);
  await click('btn-content-redo');assert.equal(await run('document.querySelector("h1").textContent'),'Borrador recuperable');
  await change('design-select','executive');
  await open(newPath);
  assert.equal(await run('document.querySelector("h1").textContent'),'Borrador recuperable');
  assert.equal(await run('document.documentElement.dataset.design'),'executive');
  await click('btn-reset');
  assert.equal(await run('document.getElementById("overlay").hidden'),false,'reset asks first');
  assert.equal(await run('document.querySelector("h1").textContent'),'Borrador recuperable','cancelling changes nothing');
  await run(`Array.from(document.querySelectorAll('#modal-actions button')).find(b=>b.textContent==='Cancelar').click()`);
  assert.equal(await run('document.getElementById("overlay").hidden'),true);
  await click('btn-reset');
  await run(`Array.from(document.querySelectorAll('#modal-actions button')).find(b=>b.textContent==='Restablecer').click()`);
  assert.equal(await run('document.querySelector("h1").textContent'),initialTitle);
  assert.equal(await run('document.documentElement.dataset.design'),'technical');
  console.log('PASS: text undo/redo, draft recovery and reset preserve the saved baseline');
  await require('./appearance.cjs')({run,open,click,installSaveMock,save,model,screenshot,artifacts,cdp});
  await require('./toolbar.cjs')({run,open,click,change,screenshot,cdp});
  await require('./enlaces.cjs')({run,open,click,installSaveMock,save,model,artifacts});
  await require('./ancho.cjs')({run,open,click,installSaveMock,save,model,artifacts,cdp});
  await require('./doblar.cjs')({run,open,click,model});
  await require('./medida.cjs')({run,open,click,installSaveMock,save});
  await open('index.html');await click('btn-edit');
  const headings=()=>run('Array.from(document.querySelectorAll("#document-content>section>h2")).map(h=>h.textContent)');
  const originalOrder=await headings();
  // La cabecera y el pie llevan los mismos controles, asi que aqui se apunta a las secciones.
  const sectionBar=n=>`document.querySelectorAll("#document-content>section .section-controls")[${n}]`;
  await run(`${sectionBar(0)}.querySelectorAll("button")[1].click()`);
  assert.equal((await headings())[1],originalOrder[0]);
  await run(`${sectionBar(1)}.querySelectorAll("button")[0].click()`);
  assert.deepEqual(await headings(),originalOrder);
  await run(`${sectionBar(0)}.querySelectorAll("button")[2].click()`);
  assert.equal((await headings()).length,originalOrder.length-1);
  assert.equal(await run('document.querySelectorAll("svg[data-svg]").length'),2);
  await click('btn-content-undo');assert.deepEqual(await headings(),originalOrder);
  assert.equal(await run('document.querySelectorAll("svg[data-svg]").length'),3);
  await run(`${sectionBar(0)}.querySelectorAll("button")[2].click()`);
  await installSaveMock();const sectionHtml=await save('Secciones reorganizadas');
  const sectionPath=path.join(artifacts,'secciones.html');fs.writeFileSync(sectionPath,sectionHtml);await open(sectionPath);
  assert.equal((await headings()).length,originalOrder.length-1);
  assert.equal(Object.keys((await model()).figures).length,2);
  assert.equal(await run('document.querySelectorAll("[data-block-tools]").length'),0);
  console.log('PASS: move sections up/down, remove with diagram cleanup, undo and reopen');
  // La cabecera y el pie son bloques como cualquier otro: se mueven y se quitan.
  await open('index.html');await click('btn-edit');
  const blocks=()=>run('Array.from(document.querySelectorAll("#document-content .section-controls")).map(b=>b.parentElement.tagName.toLowerCase())');
  const blockBar=sel=>`document.querySelector("#document-content>${sel} .section-controls")`;
  assert.deepEqual(await blocks(),['header','section','section','section','section','section','footer']);
  assert.equal(await run(`${blockBar('header')}.querySelectorAll("button")[0].disabled`),true,'the header is already first');
  assert.equal(await run(`${blockBar('footer')}.querySelectorAll("button")[1].disabled`),true,'the footer is already last');
  await run(`${blockBar('footer')}.querySelectorAll("button")[2].click()`);
  assert.equal(await run('document.querySelectorAll("#document-content>footer").length'),0);
  await run(`${blockBar('header')}.querySelectorAll("button")[2].click()`);
  assert.equal(await run('document.querySelectorAll("#document-content>header").length'),0);
  assert.deepEqual(await blocks(),['section','section','section','section','section']);
  await click('btn-content-undo');assert.equal(await run('document.querySelectorAll("#document-content>header").length'),1);
  await click('btn-content-undo');assert.equal(await run('document.querySelectorAll("#document-content>footer").length'),1);
  assert.deepEqual(await blocks(),['header','section','section','section','section','section','footer']);
  await run(`${blockBar('footer')}.querySelectorAll("button")[2].click()`);
  await run(`${blockBar('header')}.querySelectorAll("button")[2].click()`);
  await installSaveMock();const blockHtml=await save('Sin cabecera ni pie');
  const blockPath=path.join(artifacts,'sin-cabecera.html');fs.writeFileSync(blockPath,blockHtml);await open(blockPath);
  assert.equal(await run('document.querySelectorAll("#document-content>header,#document-content>footer").length'),0);
  assert.equal(await run('document.querySelectorAll("#document-content>section").length'),5);
  console.log('PASS: header and footer behave like any block, undo brings them back and the file reopens without them');
  // Sin cabecera el documento se queda sin h1: `+ Título` tiene que poder crearlo.
  await open('index.html');await click('btn-edit');
  const addBlock=k=>run(`document.querySelector('[data-add-block="${k}"]').click()`);
  const titles=()=>run('Array.from(document.querySelectorAll("#document-content>header h1")).map(h=>h.textContent)');
  const headerBar=()=>`document.querySelector("#document-content>header .section-controls")`;
  assert.deepEqual(await titles(),['Taking the writes out of the monolith']);
  await run(`${headerBar()}.querySelectorAll("button")[2].click()`);
  assert.equal(await run('document.querySelectorAll("#document-content>header").length'),0);
  assert.equal(await run('!!document.querySelector("#document-content h1")'),false);
  await addBlock('header');
  assert.equal(await run('document.querySelectorAll("#document-content>header").length'),1,'a new header comes back');
  assert.equal(await run('!!document.querySelector("#document-content h1")'),true,'and brings an h1 with it');
  assert.equal(await run('document.querySelector("#document-content>header").tagName'),'HEADER');
  assert.equal(await run('document.title'),'Document title','the tab title follows the new h1');
  // La cabecera nueva entra la primera, delante de las secciones.
  assert.deepEqual(await run('Array.from(document.querySelectorAll("#document-content .section-controls")).map(b=>b.parentElement.tagName.toLowerCase())'),['header','section','section','section','section','section','footer']);
  await run('{const h=document.querySelector("#document-content>header h1");h.focus();h.textContent="Título reescrito";h.dispatchEvent(new Event("input",{bubbles:true}));}');
  assert.equal(await run('document.title'),'Título reescrito');
  await installSaveMock();const titleHtml=await save('Título nuevo');
  const titlePath=path.join(artifacts,'titulo-nuevo.html');fs.writeFileSync(titlePath,titleHtml);await open(titlePath);
  assert.equal(await run('document.querySelector("#document-content>header h1").textContent'),'Título reescrito');
  assert.equal(await run('document.querySelectorAll("#document-content>section").length'),5);
  console.log('PASS: a deleted header can be rebuilt with + Título and the new title persists');
  // La interfaz sigue al idioma del documento; el selector la cambia sin tocar el contenido.
  await open('index.html');
  assert.equal(await run('document.documentElement.lang'),'en');
  assert.equal(await run('document.getElementById("btn-notes").textContent'),'Notes');
  assert.equal(await run('document.querySelector("#btn-save .desktop-label").textContent'),'Save version');
  const countEn=await run('document.getElementById("dec-count").textContent');
  assert.equal(countEn,'1 of 3 answered','the decision counter is interface text');
  await open('template.html');
  assert.equal(await run('document.documentElement.lang'),'es');
  assert.equal(await run('document.getElementById("btn-notes").textContent'),'Notas');
  assert.equal(await run('document.querySelector("#btn-save .desktop-label").textContent'),'Guardar versión');
  // El catalogo no puede tener claves sin traducir en un idioma.
  const missing=await run(`{const c=JSON.parse(document.getElementById('i18n-data').textContent);Object.keys(c.es).filter(k=>!(k in c.en))}`);
  assert.deepEqual(missing,[],'every Spanish key must exist in English');
  const missingEs=await run(`{const c=JSON.parse(document.getElementById('i18n-data').textContent);Object.keys(c.en).filter(k=>!(k in c.es))}`);
  assert.deepEqual(missingEs,[],'every English key must exist in Spanish');
  await open('index.html');
  const headingBefore=await run('document.querySelector("#document-content h1").textContent');
  await change('lang-select','es');
  assert.equal(await run('document.getElementById("btn-notes").textContent'),'Notas');
  assert.equal(await run('document.getElementById("dec-count").textContent'),'1 de 3 respondidas');
  assert.equal(await run('document.querySelector(".content-tools button").textContent'),'+ Título');
  assert.equal(await run('document.querySelector("#document-content h1").textContent'),headingBefore,'the document content must not change');
  assert.equal(await run('document.documentElement.lang'),'en','the content language stays as the document declares it');
  await change('lang-select','en');
  assert.equal(await run('document.getElementById("btn-notes").textContent'),'Notes');
  // Una plantilla descargada sale en el idioma de la interfaz.
  await run('window.__template=null;URL.createObjectURL=blob=>{blob.text().then(t=>window.__template=t);return "blob:blocked-test"};HTMLAnchorElement.prototype.click=function(){};');
  await click('btn-templates');await run('document.querySelector(".template-card").click()');await sleep(100);
  const enTemplate=await run('window.__template');
  assert.ok(enTemplate.includes('Technical proposal'),'the downloaded template follows the interface language');
  // El catalogo embebido lleva los dos idiomas: se mira el contenido del documento.
  assert.ok(!enTemplate.includes('<h1>Título de la propuesta</h1>'),'and its body is not the Spanish one');
  assert.ok(enTemplate.includes('<h1>Proposal title</h1>'),'the body follows the interface language too');
  console.log('PASS: the interface follows the document language and the selector switches it without touching content');
  // Amarres de las puntas y varios codos por flecha.
  await open('index.html');
  await click('btn-edit');
  const down=sel=>run(`{const el=document.querySelector(${JSON.stringify(sel)});el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerId:1,clientX:0,clientY:0}));}`);
  const edge2=async()=>(await model()).figures.f2.edges.find(e=>e.id==='e2');
  await down('[data-svg="f2"] [data-edge="e2"] .hit');
  assert.equal(await run(`document.querySelectorAll('[data-svg="f2"] [data-anch]').length`),18,'nine targets per end');
  assert.equal(await run(`document.querySelectorAll('[data-svg="f2"] [data-endp]').length`),2);
  // El JSON del documento solo se reescribe al grabar: hasta entonces se mira lo dibujado.
  // Varias figuras reutilizan los ids de arista (f1 y f2 tienen una `e2`), asi que
  // hay que acotar a f2 o se lee la flecha equivocada. Y dentro de una plantilla de
  // Node hay que escribir \\s: un \s suelto se pierde y el regex pasa a ser /s+/.
  const tail=()=>run(`document.querySelector('[data-svg="f2"] [data-edge="e2"] polyline').getAttribute('points').trim().split(/\\s+/)[0]`);
  const lit=key=>run(`document.querySelector('[data-svg="f2"] [data-anch="e2|from|${key}"]').classList.contains('is-on')`);
  const elbowHandles=()=>run(`document.querySelectorAll('[data-svg="f2"] [data-wp]').length`);
  await down('[data-anch="e2|from|ne"]');
  assert.equal(await tail(),'286,222','the tail moves to the top right corner of the chip');
  assert.ok(await lit('ne'),'and that target is the one lit');
  await down('[data-anch="e2|from|auto"]');
  assert.ok(await lit('auto'),'the centre gives the automatic point back');
  await down('[data-anch="e2|from|w"]');
  assert.equal(await tail(),'74,243','and a side midpoint puts it back on the left');
  const elbows=await elbowHandles();
  await run(`Array.from(document.querySelectorAll('#props button')).find(b=>b.textContent==='Add elbow').click()`);
  assert.equal(await elbowHandles(),elbows+1,'a new elbow joins the list');
  await run(`document.querySelector('[data-wp="e2|0"]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))`);
  assert.equal(await elbowHandles(),elbows,'double click removes just that elbow');
  await installSaveMock();
  const anchorHtml=await save('Amarres y codos');
  const anchorPath=path.join(artifacts,'amarres.html');fs.writeFileSync(anchorPath,anchorHtml);await open(anchorPath);
  const saved=await edge2();
  assert.equal(saved.fromAnchor,'w');assert.equal(saved.toAnchor,'w');assert.equal(saved.wps.length,elbows);
  assert.equal(await run(`document.querySelector('[data-svg="f2"] [data-edge="e2"] polyline').getAttribute("points").trim().split(/\\s+/).length`),elbows+2,'the drawn line keeps every elbow');
  console.log('PASS: endpoint anchors, several elbows per arrow, removal and versioned save');
  // Documentos antiguos: un solo codo en `wp` se sigue leyendo y se normaliza a `wps`.
  // El motor normaliza al leer, pero solo vuelca el modelo a `#diagram-data` al grabar:
  // la migracion se comprueba en el fichero resultante, no en el script de origen.
  const src=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const block=src.match(/<script id="diagram-data" type="application\/json">([\s\S]*?)<\/script>/);
  const legacyData=JSON.parse(block[1].replace(/\u003c/g,'<'));
  const legacyEdge=legacyData.figures.f2.edges.find(e=>e.id==='e2');
  legacyEdge.wp=legacyEdge.wps[0];delete legacyEdge.wps;delete legacyEdge.fromAnchor;delete legacyEdge.toAnchor;
  const legacyPath=path.join(artifacts,'documento-antiguo.html');
  fs.writeFileSync(legacyPath,src.replace(block[1],()=>'\n'+JSON.stringify(legacyData,null,2).replace(/</g,'\u003c')+'\n'));
  await open(legacyPath);
  assert.equal(await run(`document.querySelector('[data-svg="f2"] [data-edge="e2"] polyline').getAttribute("points").trim().split(/\\s+/).length`),3,'the legacy elbow still draws');
  await installSaveMock();
  const migratedHtml=await save('Migrado desde wp');
  const migratedEdge=JSON.parse(migratedHtml.match(/<script id="diagram-data" type="application\/json">([\s\S]*?)<\/script>/)[1].replace(/\u003c/g,'<')).figures.f2.edges.find(e=>e.id==='e2');
  assert.equal(migratedEdge.wp,undefined,'the old field is migrated when the document is written');
  assert.equal(migratedEdge.wps.length,1,'and becomes a list of one elbow');
  console.log('PASS: a document written with the old single elbow still opens, draws and is saved as wps');
  assert.deepEqual(errors,[],'browser exceptions');
  console.log('Artifacts: '+artifacts);
}
main().catch(err=>{console.error(err);process.exitCode=1;}).finally(async()=>{try{if(ws)await cdp('Browser.close');}catch{}if(ws)ws.close();child.kill();});
