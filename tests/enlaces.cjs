const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Enlaces: en el texto del documento y en las cajas de los diagramas. Lo que importa
// no es solo que se creen, sino a donde pueden apuntar: este fichero se abre desde el
// disco y pasa de mano en mano, asi que un `javascript:` no puede llegar a ser un enlace
// ni escribiendolo en el panel ni metiendolo a mano dentro del HTML.
module.exports = async function({run, open, click, installSaveMock, save, model, artifacts}) {
  const dialogo = (texto) =>
    run(`Array.from(document.querySelectorAll('#modal-actions button')).find(b=>b.textContent===${JSON.stringify(texto)}).click()`);
  const escribe = (valor) =>
    run(`{const i=document.querySelector('#modal-body input');i.value=${JSON.stringify(valor)};i.dispatchEvent(new Event('input',{bubbles:true}));}`);
  const seleccionaTitulo = () =>
    run(`{const h=document.querySelector('#document-content h1');const r=document.createRange();r.selectNodeContents(h);const s=getSelection();s.removeAllRanges();s.addRange(r);true}`);

  await open('template.html');
  await click('btn-edit');

  // sin seleccion no hay nada que enlazar, y se dice
  await run(`getSelection().removeAllRanges()`);
  await click('btn-link');
  assert.equal(await run(`document.getElementById('notice').classList.contains('open')`), true, 'asks for a selection');
  await click('notice-dismiss');

  // el https:// se pone solo
  await seleccionaTitulo();
  await click('btn-link');
  await escribe('ejemplo.com/arquitectura');
  await dialogo('Enlazar');
  assert.equal(await run(`document.querySelector('#document-content h1 a').getAttribute('href')`),
    'https://ejemplo.com/arquitectura', 'adds the scheme');
  assert.equal(await run(`document.querySelector('#document-content h1 a').getAttribute('rel')`),
    'noopener noreferrer', 'external links do not hand over the opener');

  // el dialogo reconoce el enlace que ya hay y sabe quitarlo
  await seleccionaTitulo();
  await click('btn-link');
  assert.equal(await run(`document.querySelector('#modal-body input').value`), 'https://ejemplo.com/arquitectura');
  await dialogo('Quitar enlace');
  assert.equal(await run(`document.querySelectorAll('#document-content h1 a').length`), 0, 'removes the link');
  assert.ok((await run(`document.querySelector('#document-content h1').textContent`)).length > 0, 'keeps the text');

  // un correo se enlaza como correo
  await seleccionaTitulo();
  await click('btn-link');
  await escribe('alguien@ejemplo.com');
  await dialogo('Enlazar');
  assert.equal(await run(`document.querySelector('#document-content h1 a').getAttribute('href')`), 'mailto:alguien@ejemplo.com');

  // y un javascript: no llega a ser un enlace
  await seleccionaTitulo();
  await click('btn-link');
  await escribe('javascript:alert(1)');
  await dialogo('Enlazar');
  assert.equal(await run(`document.getElementById('notice').classList.contains('open')`), true, 'refuses javascript:');
  assert.equal(await run(`document.querySelector('#document-content h1 a').getAttribute('href')`), 'mailto:alguien@ejemplo.com', 'and changes nothing');
  await click('notice-dismiss');

  // una caja tambien enlaza: el <a> envuelve al grupo y el data-node sigue donde estaba
  await run(`document.querySelector('[data-svg="f1"] [data-node="b"]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))`);
  await run(`{const campos=Array.from(document.querySelectorAll('#props-body .field'));const campo=campos.find(f=>f.querySelector('label').textContent==='Enlace');const i=campo.querySelector('input');i.value='ejemplo.com/caja';i.dispatchEvent(new Event('input',{bubbles:true}));}`);
  assert.equal(await run(`document.querySelector('[data-svg="f1"] a.node-link').getAttribute('href')`), 'https://ejemplo.com/caja');
  assert.equal(await run(`document.querySelector('[data-svg="f1"] a.node-link [data-node="b"]')!==null`), true, 'the group keeps its data-node');

  // los dos sobreviven a guardar y reabrir
  await installSaveMock();
  const html = await save('Con enlaces');
  const guardado = path.join(artifacts, 'enlaces-v2.html');
  fs.writeFileSync(guardado, html);
  await open(guardado);
  assert.equal(await run(`document.querySelector('#document-content h1 a').getAttribute('href')`), 'mailto:alguien@ejemplo.com');
  assert.equal(await run(`document.querySelector('[data-svg="f1"] a.node-link').getAttribute('href')`), 'https://ejemplo.com/caja');
  assert.equal((await model()).figures.f1.nodes.find(n => n.id === 'b').link, 'ejemplo.com/caja', 'the link travels in the model');

  // un enlace peligroso metido a mano en el fichero se desactiva al abrirlo
  const trucado = path.join(artifacts, 'enlaces-trucado.html');
  fs.writeFileSync(trucado, html.replace('<h1>', '<h1><a href="javascript:window.__colado=1">pulsa</a> '));
  await open(trucado);
  assert.equal(await run(`document.querySelectorAll('#document-content a[href^="javascript"]').length`), 0, 'strips it on load');
  assert.ok((await run(`document.querySelector('#document-content h1').textContent`)).includes('pulsa'), 'but keeps the words');

  console.log('PASS: links in text and boxes, scheme completion, removal, saving, and javascript: refused both ways');
};
