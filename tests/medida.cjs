const assert = require('node:assert/strict');

// El ancho de un bloque de texto. La medida de lectura que traen los estilos -62 o 68
// caracteres- es una opinion razonable, pero quien escribe el documento puede tener otra:
// arrastra el borde derecho del bloque y ese ancho se queda, tambien al grabar.
module.exports = async function({run, open, click, installSaveMock, save}) {
  const lede = `document.querySelector('#document-content .lede')`;
  const ancho = () => run(`Math.round(${lede}.getBoundingClientRect().width)`);
  // el tirador esta en el borde derecho, casi todo por fuera del bloque
  const gesto = (dx, doble) => run(`{
    const e=${lede};
    e.scrollIntoView({block:'center'});
    const r=e.getBoundingClientRect();
    const x=r.right+4, y=r.top+r.height/2;
    const op={bubbles:true,cancelable:true,pointerId:1,button:0,isPrimary:true};
    const sobre=document.elementFromPoint(x,y);
    if(${doble ? 'true' : 'false'}){
      sobre.dispatchEvent(new MouseEvent('dblclick',Object.assign({clientX:x,clientY:y},op)));
    } else {
      sobre.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:x,clientY:y},op)));
      document.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:x+${dx}/2,clientY:y},op)));
      document.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:x+${dx},clientY:y},op)));
      document.dispatchEvent(new PointerEvent('pointerup',Object.assign({clientX:x+${dx},clientY:y},op)));
    }
    true;
  }`);

  await open('index.html');
  await click('btn-edit');
  const partida = await ancho();
  assert.ok(partida > 0, 'the lede has a reading measure');
  assert.equal(await run(`${lede}.style.maxWidth`), '', 'and it comes from the stylesheet, not from the file');

  // ensancharlo
  await gesto(200, false);
  const ancho2 = await ancho();
  assert.ok(ancho2 > partida + 150, 'dragging the right edge widens the block: ' + partida + ' -> ' + ancho2);
  assert.ok(/px$/.test(await run(`${lede}.style.maxWidth`)), 'the chosen width lands in its style');

  // no pasa del ancho de su contenedor por mucho que se tire
  await gesto(5000, false);
  const padre = await run(`Math.round(${lede}.parentNode.getBoundingClientRect().width)`);
  assert.ok(await ancho() <= padre, 'and never spills out of the column');

  // se graba con el documento
  await installSaveMock();
  const html = await save('Texto más ancho');
  assert.ok(/class="lede"[^>]*style="[^"]*max-width/.test(html), 'the width travels in the saved HTML');
  // la marca de arrastre no: el motor lleva `data-measure` en su propio código, asi que
  // se mira solo en las etiquetas del cuerpo
  assert.ok(!/<(?:p|h1|h2|h3|figcaption)[^>]*data-measure/.test(html), 'but the drag marker does not');

  // doble clic en el borde lo devuelve a la medida del estilo
  await gesto(0, true);
  assert.equal(await run(`${lede}.style.maxWidth`), '', 'double-click gives the stylesheet measure back');
  assert.equal(await ancho(), partida, 'and the block is what it was');

  // y el borde no le roba el sitio al cursor: pulsar dentro del texto sigue escribiendo
  await run(`{const h=document.querySelector('#document-content h1');h.focus();
    const r=h.getBoundingClientRect();
    h.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:1,button:0,clientX:r.left+20,clientY:r.top+r.height/2}));
    h.textContent='Sigo escribiendo';h.dispatchEvent(new Event('input',{bubbles:true}));}`);
  assert.equal(await run(`document.querySelector('#document-content h1').textContent`), 'Sigo escribiendo',
    'clicking inside a block still edits it');

  console.log('PASS: text blocks take the width you drag them to, keep it when saved, and give it back on double-click');
};
