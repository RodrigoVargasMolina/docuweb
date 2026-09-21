const assert = require('node:assert/strict');

// Doblar una flecha arrastrandola. Era lo unico que faltaba para reconducirla: el boton
// «Anadir codo» del panel ya existia, pero el gesto que todo el mundo prueba primero
// -agarrar la linea y tirar- no hacia nada, asi que la flecha parecia rigida.
module.exports = async function({run, open, click, model}) {
  // Se agarra la linea por donde esta de verdad: se toma un punto de su geometria y se
  // convierte a coordenadas de pantalla. A ojo no vale, porque la figura se mueve.
  const gesto = (t, dx, dy) => run(`{
    const svg=document.querySelector('svg[data-svg="f1"]');
    svg.scrollIntoView({block:'center'});
    const linea=document.querySelector('[data-edge="e1"] .e-line');
    const p=linea.getPointAtLength(linea.getTotalLength()*${t});
    const m=linea.getScreenCTM();
    const a={x:p.x*m.a+p.y*m.c+m.e, y:p.x*m.b+p.y*m.d+m.f};
    const b={x:a.x+${dx}, y:a.y+${dy}};
    const sobre=document.elementFromPoint(a.x,a.y);
    if(!sobre||!sobre.closest('[data-edge="e1"]')) throw new Error('el punto no cae sobre la flecha: '+(sobre&&sobre.outerHTML.slice(0,80)));
    const op={bubbles:true,cancelable:true,pointerId:1,button:0,isPrimary:true};
    sobre.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:a.x,clientY:a.y},op)));
    if(${dx}||${dy}){
      svg.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2},op)));
      svg.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:b.x,clientY:b.y},op)));
    }
    svg.dispatchEvent(new PointerEvent('pointerup',Object.assign({clientX:b.x,clientY:b.y},op)));
    true;
  }`);
  const codos = () => run(`document.querySelectorAll('svg[data-svg="f1"] [data-wp]').length`);
  const forma = () => run(`(function(){const l=document.querySelector('[data-edge="e1"] .e-line');return l.getAttribute('points')||l.getAttribute('d')||''})()`);
  const sucio = () => run(`document.getElementById('status').className`);

  await open('template.html');
  await click('btn-edit');
  const recta = await forma();
  assert.equal(await codos(), 0, 'starts with no elbows');

  // agarrar la linea por la mitad y tirar: aparece un codo y la flecha se dobla
  await gesto(0.5, 0, 90);
  assert.equal(await codos(), 1, 'dragging the line makes an elbow');
  assert.notEqual(await forma(), recta, 'and the arrow actually bends');

  // cada tramo admite el suyo, asi que se rodea lo que haga falta
  await gesto(0.2, 0, -70);
  assert.equal(await codos(), 2, 'a second elbow on another leg');
  await gesto(0.85, 0, -50);
  assert.equal(await codos(), 3, 'and a third');

  // doble clic en un codo lo quita
  await run(`document.querySelector('svg[data-svg="f1"] [data-wp]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))`);
  assert.equal(await codos(), 2, 'double-click removes one elbow');

  // pulsar sin arrastrar sigue siendo solo seleccionar, y no ensucia el documento
  await run(`{const s=document.getElementById('status');s.className='saved';s.textContent='limpio'}`);
  await gesto(0.5, 0, 0);
  assert.equal(await codos(), 2, 'a plain click adds no elbow');
  assert.equal(await sucio(), 'saved', 'and does not mark the document as changed');

  // los codos viajan en el modelo al grabar
  await run(`window.__saved=null;window.showSaveFilePicker=async()=>({createWritable:async()=>({write:async t=>{window.__saved=t},close:async()=>{}})})`);
  await click('btn-save');
  await run(`{const i=document.querySelectorAll('#modal-body input');i[0].value='R';i[0].dispatchEvent(new Event('input'));document.querySelector('#modal-actions button').click();}`);
  await new Promise(r => setTimeout(r, 300));
  assert.equal((await model()).figures.f1.edges.find(e => e.id === 'e1').wps.length, 2, 'the elbows travel in the model');

  console.log('PASS: arrows bend by dragging the line, take an elbow per leg, and a plain click still only selects');
};
