const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Una figura a todo el ancho de la ventana. Lo que hay que comprobar no es solo que
// crezca, sino que crezca *exactamente* hasta el ancho util: `100vw` incluye la barra
// de desplazamiento vertical, y unos pocos pixeles de mas sacan una barra horizontal
// en toda la pagina, que es peor que no haber expandido nada. Y que el estado viaje en
// el fichero sin llevarse dentro el ancho de la ventana de quien lo grabo.
module.exports = async function({run, open, click, installSaveMock, save, model, artifacts, cdp}) {
  const anchoFigura = () => run(`Math.round(document.querySelector('figure[data-fig="f1"]').getBoundingClientRect().width)`);
  const anchoUtil = () => run(`document.documentElement.clientWidth`);
  const expandir = () => run(`Array.from(document.querySelectorAll('[data-tools="f1"] button')).find(b=>/Expandir|Contraer/.test(b.textContent)).click()`);
  const rotulo = () => run(`Array.from(document.querySelectorAll('[data-tools="f1"] button')).map(b=>b.textContent).find(x=>/Expandir|Contraer/.test(x))`);
  const desplazaEnHorizontal = () =>
    run(`(()=>{window.scrollTo(600,window.scrollY);const x=window.scrollX;window.scrollTo(0,window.scrollY);return x!==0})()`);

  await cdp('Emulation.setDeviceMetricsOverride', {width: 1500, height: 900, deviceScaleFactor: 1, mobile: false});
  await open('template.html');

  // sin editar tambien se puede expandir: quien solo lee un diagrama ancho tambien
  // necesita la pantalla entera
  assert.equal(await rotulo(), 'Expandir', 'the button is there without entering edit mode');
  const estrecha = await anchoFigura();
  assert.ok(estrecha < await anchoUtil(), 'starts inside the reading column');

  await expandir();
  assert.equal(await anchoFigura(), await anchoUtil(), 'fills the usable width, to the pixel');
  assert.equal(await desplazaEnHorizontal(), false, 'and does not push the page sideways');
  assert.equal(await rotulo(), 'Contraer');

  // `container-type` en el body podria haber roto el `position:sticky` de la barra
  await run(`window.scrollTo(0,600)`);
  assert.equal(await run(`Math.round(document.querySelector('.appbar').getBoundingClientRect().top)`), 0,
    'the top bar stays stuck');
  await run(`window.scrollTo(0,0)`);

  // el estado es del documento, asi que se graba
  await installSaveMock();
  const html = await save('Figura expandida');
  assert.equal((await model()).figures.f1.wide, true, 'it travels in the model');
  // ...pero nada del tamano de *esta* ventana: el ancho lo resuelve el CSS al abrir,
  // asi que el fichero no puede llevarse dentro la pantalla de quien lo grabo
  assert.ok(!/<html[^>]*style=/.test(html), 'the saved file carries no measured viewport');

  const guardado = path.join(artifacts, 'figura-ancha-v2.html');
  fs.writeFileSync(guardado, html);
  await open(guardado);
  assert.equal(await rotulo(), 'Contraer', 'reopens expanded');
  assert.equal(await anchoFigura(), await anchoUtil());
  assert.equal(await desplazaEnHorizontal(), false);

  // en una ventana distinta el ancho se resuelve solo: el fichero no lleva medidas
  await cdp('Emulation.setDeviceMetricsOverride', {width: 900, height: 800, deviceScaleFactor: 1, mobile: false});
  await open(guardado);
  assert.equal(await anchoFigura(), await anchoUtil(), 'fits a different window with no measuring');
  assert.equal(await desplazaEnHorizontal(), false);

  // y se deshace. Contraer deja borrador local, asi que se limpia para no arrastrarlo.
  const columna = await run(`Math.round(document.querySelector('#document-content>section').getBoundingClientRect().width)`);
  await expandir();
  assert.equal(await rotulo(), 'Expandir');
  assert.equal(await anchoFigura(), columna, 'back to the reading column');
  await run(`Object.keys(localStorage).filter(k=>k.startsWith('docuweb:borrador')).forEach(k=>localStorage.removeItem(k))`);

  await cdp('Emulation.setDeviceMetricsOverride', {width: 1280, height: 900, deviceScaleFactor: 1, mobile: false});
  console.log('PASS: full-width figures fit the usable width exactly, survive saving, and never travel with a measured viewport');
};
