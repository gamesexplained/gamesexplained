'use strict';
const assert = require('assert');
const {start} = require('../../../kit/scripts/play_browser.js');

(async () => {
  const {browser, base, stop} = await start(process.argv.slice(2));
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/c64/wonder-boy-in-monster-land/graphics.html`, {waitUntil: 'load'});
    const before = await page.locator('#shared-pattern-canvas').evaluate(canvas =>
      [...canvas.getContext('2d').getImageData(0, 0, 24, 21).data]);
    assert.equal(await page.locator('#shared-pattern-select option').count(), 253);
    await page.locator('#shared-pattern-select').selectOption('252');
    const after = await page.locator('#shared-pattern-canvas').evaluate(canvas =>
      [...canvas.getContext('2d').getImageData(0, 0, 24, 21).data]);
    assert.notDeepStrictEqual(after, before);
    assert((await page.locator('#shared-pattern-details a').getAttribute('href')).startsWith('source-stage-'));
    assert((await page.locator('#shared-patterns').innerText()).includes('in-game use and colours are unverified'));
    assert.deepStrictEqual(errors, []);
    console.log('OK - repeated and single-load pattern viewer');
  } finally {
    await stop();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
