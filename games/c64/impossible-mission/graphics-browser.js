'use strict';
// Drives graphics.html in Chromium: every subject of the viewer must draw on its stage, every one of
// the 28 frames in the frame viewer must draw, the still shapes and the character sets must be there,
// and the page must raise no error. Run after building the site:
//   node games/c64/impossible-mission/graphics-browser.js [<site>] [--chromium <path>]
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
    await page.goto(base + '/c64/impossible-mission/graphics.html', { waitUntil: 'load' });
    await page.waitForFunction(() => window.imGraphics, null, { timeout: 20000 });
    // the colours on a canvas other than its background (the top-left pixel)
    const drawn = sel => page.$eval(sel, c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2]) n++; return n; });
    const subjects = await page.evaluate(() => Object.keys(window.imGraphics.SUBJECTS));
    for (const k of subjects) {
      await page.evaluate(k => window.imGraphics.pick(k), k);
      await page.waitForTimeout(250);
      const n = await drawn('#stage');
      if (n < 20) no('the viewer drew nothing for', k);
    }
    for (let f = 0; f < 28; f++) {
      await page.$eval('#fno', (e, f) => { e.value = f; e.dispatchEvent(new Event('input')); }, f);
      if (await drawn('#fcv') < 20) no('the frame viewer drew nothing for frame', f);
    }
    const stills = await page.$$eval('#sheet canvas', cs => cs.length);
    if (stills < 10) no('only', stills, 'still shapes');
    if (await drawn('#ccv') < 100) no('the character sets drew nothing');
    for (const e of errors) no('page error:', e);
    console.log(`${subjects.length} subjects, 28 frames, ${stills} still shapes: ${fail ? fail + ' failures' : 'all drawn, no errors'}`);
  } finally { await stop(); }
  process.exit(fail ? 1 : 0);
})();
