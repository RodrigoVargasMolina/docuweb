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
