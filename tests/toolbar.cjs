const assert = require('node:assert/strict');
module.exports = async function({run,open,click,change,screenshot,cdp}) {
  await open('template.html');
  const previousLang=await run(`localStorage.getItem('docuweb:idioma')`);
  const visible=id=>run(`document.getElementById('${id}').checkVisibility()`);
  assert.equal(await visible('btn-edit'),true);
  // Restablecer esta a la vista, no escondido dentro de un menu
  assert.equal(await visible('btn-reset'),true);
  assert.equal(await run(`document.querySelectorAll('.appbar .btn--primary').length`),1);
  assert.equal(await run(`document.getElementById('status').textContent`),'Sin cambios');
  // el numero de version se ve como una pastilla, no como texto suelto
  const pastilla=await run(`{const s=getComputedStyle(document.getElementById('btn-history'));({borde:s.borderTopWidth,fondo:s.backgroundColor})}`);
  assert.equal(pastilla.borde,'1px');
  assert.notEqual(pastilla.fondo,'rgba(0, 0, 0, 0)');
  // sin notas, el boton de Notas no puede hacer nada: apagado y diciendo donde se hacen
  assert.equal(await run(`document.getElementById('btn-notes').disabled`),true,'nothing to show or hide');
  assert.ok(/\+ Nota/.test(await run(`document.getElementById('btn-notes').title`)),'and it says where they come from');

  // la ayuda es larga: tiene que abrirse por el titulo, no por el final
  await click('btn-help');
  assert.equal(await run(`document.querySelector('.modal').scrollTop`),0,'help opens at its title');
  assert.ok(await run(`document.querySelector('.modal').scrollHeight>document.querySelector('.modal').clientHeight`),
    'and it is long enough for that to matter');
  assert.ok(await run(`document.querySelector('.modal').contains(document.activeElement)`),'focus stays in the dialog');
  // el titulo tiene que estar alcanzable: ni por encima del borde de la ventana ni fuera de ella
  const caja=await run(`(function(){const r=document.querySelector('.modal').getBoundingClientRect();return {top:Math.round(r.top),alto:Math.round(r.height),ventana:innerHeight}})()`);
  assert.ok(caja.top>=0,'the dialog does not start above the top of the window');
  assert.ok(caja.alto<=caja.ventana,'and it never grows taller than the window');
  assert.ok(caja.alto<=760,'nor into a wall of text');
  await run(`Array.from(document.querySelectorAll('#modal-actions button')).find(b=>b.textContent==='Cerrar').click()`);

  // el historial vacio se lee en una linea, no partido palabra por palabra
  await click('btn-history');
  assert.equal(await run(`document.querySelectorAll('#modal-body .histrow').length`),0,'the empty notice is not a row');
  assert.ok(await run(`document.querySelector('#modal-body .histempty').getBoundingClientRect().width>200`),'and it has room to read');
  await run(`Array.from(document.querySelectorAll('#modal-actions button')).find(b=>b.textContent==='Cerrar').click()`);
  await screenshot('cabecera-escritorio');

  // ocultar la barra: queda solo el interruptor, en el mismo sitio y tenue
  const sitio=()=>run(`(function(){const r=document.getElementById('btn-chrome').getBoundingClientRect();return {arriba:Math.round(r.top),ancho:Math.round(r.width)}})()`);
  const conBarra=await sitio();
  const altoConBarra=await run(`Math.round(document.querySelector('.appbar').getBoundingClientRect().height)`);
  // el pliegue dura 240ms y acaba apagando la barra con `visibility`, que
  // `checkVisibility()` solo mira si se le pide
  const plegada=()=>run(`new Promise(r=>setTimeout(()=>r(document.getElementById('btn-save').checkVisibility({visibilityProperty:true})),320))`);
  await click('btn-chrome');
  assert.equal(await run(`document.body.classList.contains('chrome-hidden')`),true);
  assert.equal(await plegada(),false,'the toolbar is gone');
  assert.equal(await visible('btn-chrome'),true,'but the way back is not');
  assert.ok(await run(`Math.round(document.querySelector('.appbar').getBoundingClientRect().height)`)<altoConBarra/2,
    'and the document gets the space back');
  const sinBarra=await sitio();
  assert.ok(Math.abs(sinBarra.arriba-conBarra.arriba)<=8,'the switch does not jump around when pressed');
  // discreto no es invisible: si es lo unico que queda, tiene que encontrarse sin buscarlo
  const pinta=await run(`(function(){const e=document.getElementById('btn-chrome');const s=getComputedStyle(e);const r=e.getBoundingClientRect();
    return {ancho:Math.round(r.width),alto:Math.round(r.height),fondo:s.backgroundColor,borde:s.borderTopWidth,opacidad:Number(s.opacity),texto:e.textContent}})()`);
  assert.ok(pinta.ancho>=56&&pinta.alto>=28,'big enough to see and to hit: '+pinta.ancho+'x'+pinta.alto);
  assert.notEqual(pinta.fondo,'rgba(0, 0, 0, 0)','it has a surface of its own');
  assert.equal(pinta.borde,'1px','and an edge');
  assert.equal(pinta.opacidad,1,'and it is not faded out');
  assert.ok(/Barra/.test(pinta.texto),'and it says what it brings back');
  assert.equal(await run(`document.getElementById('btn-chrome').getAttribute('aria-expanded')`),'false');
  assert.equal(await run(`document.getElementById('btn-chrome').getAttribute('aria-label')`),'Mostrar la barra');
  await screenshot('cabecera-oculta');
  await click('btn-chrome');
  assert.equal(await plegada(),true,'and it comes back');
  assert.equal(await run(`document.getElementById('btn-chrome').getAttribute('aria-label')`),'Ocultar la barra');
  await change('theme-select','light');
  assert.equal(await run(`document.getElementById('status').textContent`),'Sin guardar');
  await change('lang-select','en');
  assert.equal(await run(`document.getElementById('btn-print').textContent`),'Preview / PDF');
  assert.equal(await run(`document.getElementById('btn-help').getAttribute('aria-label')`),'Help');
  await change('lang-select','es');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await visible('btn-menu'),true);
  // Editar es la accion principal del documento: tampoco se esconde en movil
  assert.equal(await visible('btn-edit'),true);
  assert.equal(await visible('theme-select'),false);
  assert.equal(await visible('btn-reset'),false);
  assert.equal(await visible('btn-notes'),false);
  assert.ok(await run(`document.documentElement.scrollWidth<=390`));
  await screenshot('cabecera-movil');
  await click('btn-menu');
  assert.equal(await visible('theme-select'),true);
  assert.equal(await visible('btn-reset'),true);
  // pulsar fuera del panel lo cierra, y un solo boton abre texto y diagramas
  await click('btn-edit');
  assert.equal(await visible('theme-select'),false);
  assert.equal(await run(`document.body.classList.contains('editing-content')`),true);
  assert.equal(await run(`document.body.classList.contains('editing')`),true);
  assert.equal(await run(`document.getElementById('btn-edit').textContent`),'Terminar');
  await click('btn-edit');
  assert.equal(await run(`document.getElementById('btn-edit').textContent`),'Editar');
  await run(`document.querySelector('[data-panel="secondary-menu"]').click()`);
  assert.equal(await visible('btn-notes'),true);
  assert.equal(await visible('btn-help'),true);
  await run(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  assert.equal(await visible('btn-notes'),false);
  assert.equal(await run(`document.activeElement.dataset.panel`),'secondary-menu');
  await cdp('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true});
  assert.ok(await run(`document.documentElement.scrollWidth<=320`));
  await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await run(previousLang === null ? `localStorage.removeItem('docuweb:idioma')` : `localStorage.setItem('docuweb:idioma',${JSON.stringify(previousLang)})`);
  console.log('PASS: one Edit button, visible Reset, one primary action, translated status, mobile menus and keyboard dismissal');
};
