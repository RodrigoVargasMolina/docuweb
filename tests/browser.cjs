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
  const files=['index.html','template.html',...fs.readdirSync(path.join(root,'templates')).filter(n=>n.endsWith('.html')).map(n=>'templates/'+n)];
  for(const file of files){
    await open(file);
    const count=await run('document.querySelectorAll("svg[data-svg]").length');
    assert.equal(await run('Array.from(document.querySelectorAll("svg[data-svg]")).filter(s=>s.children.length>0).length'),count,file+' diagrams render');
    await click('btn-edit');await click('btn-edit');
    await click('btn-content');
    assert.ok(await run('document.querySelectorAll("[contenteditable=true]").length')>0,file+' editable');
    await click('btn-content');
    await screenshot(path.basename(file,'.html'));
  }
  console.log('PASS: all 7 documents load and edit without runtime exceptions');
  await open('template.html');
  await click('btn-content');
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
  await click('btn-content');
  await run(`document.querySelector('[data-add-block=section]').click()`);
  await click('btn-content-undo');assert.equal(await run('document.querySelector("#btn-history").textContent'),'v3');
  await click('btn-content-redo');
  await click('btn-content');
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
  await click('btn-content');
  const initialTitle=await run('document.querySelector("h1").textContent');
  await run(`{const h=document.querySelector('h1');h.focus();h.textContent='Borrador recuperable';h.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await click('btn-content-undo');assert.equal(await run('document.querySelector("h1").textContent'),initialTitle);
  await click('btn-content-redo');assert.equal(await run('document.querySelector("h1").textContent'),'Borrador recuperable');
  await change('design-select','executive');
  await open(newPath);
  assert.equal(await run('document.querySelector("h1").textContent'),'Borrador recuperable');
  assert.equal(await run('document.documentElement.dataset.design'),'executive');
  await click('btn-reset');
  assert.equal(await run('document.querySelector("h1").textContent'),initialTitle);
  assert.equal(await run('document.documentElement.dataset.design'),'technical');
  console.log('PASS: text undo/redo, draft recovery and reset preserve the saved baseline');
  await require('./appearance.cjs')({run,open,click,installSaveMock,save,model,screenshot,artifacts,cdp});
  await open('index.html');await click('btn-content');
  const headings=()=>run('Array.from(document.querySelectorAll("#document-content>section>h2")).map(h=>h.textContent)');
  const originalOrder=await headings();
  await run('document.querySelectorAll(".section-controls")[0].querySelectorAll("button")[1].click()');
  assert.equal((await headings())[1],originalOrder[0]);
  await run('document.querySelectorAll(".section-controls")[1].querySelectorAll("button")[0].click()');
  assert.deepEqual(await headings(),originalOrder);
  await run('document.querySelector(".section-controls").querySelectorAll("button")[2].click()');
  assert.equal((await headings()).length,originalOrder.length-1);
  assert.equal(await run('document.querySelectorAll("svg[data-svg]").length'),2);
  await click('btn-content-undo');assert.deepEqual(await headings(),originalOrder);
  assert.equal(await run('document.querySelectorAll("svg[data-svg]").length'),3);
  await run('document.querySelector(".section-controls").querySelectorAll("button")[2].click()');
  await installSaveMock();const sectionHtml=await save('Secciones reorganizadas');
  const sectionPath=path.join(artifacts,'secciones.html');fs.writeFileSync(sectionPath,sectionHtml);await open(sectionPath);
  assert.equal((await headings()).length,originalOrder.length-1);
  assert.equal(Object.keys((await model()).figures).length,2);
  assert.equal(await run('document.querySelectorAll("[data-block-tools]").length'),0);
  console.log('PASS: move sections up/down, remove with diagram cleanup, undo and reopen');
  assert.deepEqual(errors,[],'browser exceptions');
  console.log('Artifacts: '+artifacts);
}
main().catch(err=>{console.error(err);process.exitCode=1;}).finally(async()=>{try{if(ws)await cdp('Browser.close');}catch{}if(ws)ws.close();child.kill();});
