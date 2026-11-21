'use strict';
// Drives controls.html in Chromium: the agent must stand, walk right on the stick, somersault on
// fire and stay put with up held; the keyboard must type a name, delete and end it; and the page
// must raise no error. Run after building the site:
//   node games/c64/impossible-mission/controls-browser.js [<site>] [--chromium <path>]
const path = require('path');
const { start } = require(path.join(__dirname, '..', '..', '..', 'kit', 'scripts', 'play_browser.js'));
(async () => {
  const { browser, base, stop } = await start(process.argv.slice(2));
  let fail = 0;
  const no = (...a) => { fail++; console.log('FAIL', ...a); };
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(base + '/c64/impossible-mission/controls.html', { waitUntil: 'load' });
    await page.waitForFunction(() => window.imControls, null, { timeout: 20000 });
    const st = () => page.evaluate(() => ({ f: window.imControls.s.f, x: window.imControls.P.x[0], facing: window.imControls.s.facing }));
    const drawn = await page.$eval('#stage', c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2]) n++; return n; });
    if (drawn < 50) no('the stage drew no agent');
    if ((await st()).f !== 0x0E) no('the agent is not standing at the start');
    const x0 = (await st()).x;
    await page.evaluate(() => window.imControls.setHeld(8));          // right
    await page.waitForTimeout(500);
    let s = await st();
    if (s.f > 0x0D || s.facing !== 1 || s.x === x0) no('right on the stick did not walk him right', JSON.stringify(s));
    await page.evaluate(() => window.imControls.setHeld(8 | 16));     // and fire
    await page.waitForTimeout(150);
    s = await st();
    if (s.f < 0x10) no('fire did not start a somersault', JSON.stringify(s));
    await page.evaluate(() => window.imControls.setHeld(0));
    await page.waitForTimeout(800);
    if ((await st()).f !== 0x0E) no('he did not land and stand');
    await page.evaluate(() => window.imControls.setHeld(1 | 4));      // up and left while standing
    const x1 = (await st()).x;
    await page.waitForTimeout(500);
    s = await st();
    if (s.f !== 0x0E || s.x !== x1) no('up and left while standing moved him', JSON.stringify(s));
    await page.evaluate(() => window.imControls.setHeld(0));
    for (const k of ['I', 'M', 'X', 'DEL', 'P', 'RETURN']) await page.click(`#kb button[data-k="${k}"]`);
    const name = await page.$$eval('#name span', ss => ss.map(e => e.textContent).join(''));
    if (name !== 'IMP') no('the keyboard typed', JSON.stringify(name), 'for I M X DEL P RETURN');
    for (const e of errors) no('page error:', e);
    console.log(`stick and keyboard: ${fail ? fail + ' failures' : 'all as the game does it, no errors'}`);
  } finally { await stop(); }
  process.exit(fail ? 1 : 0);
})();
