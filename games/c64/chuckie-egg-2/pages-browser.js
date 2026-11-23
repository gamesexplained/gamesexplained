'use strict';
// Drives the four Chuckie Egg 2 pages in Chromium and checks what each widget shows.
const assert = require('assert');
const {start} = require('../../../kit/scripts/play_browser.js');

const pixels = async (page, sel) => {
  await page.locator(sel).scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  return page.locator(sel).evaluate((cv) => Array.from(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data));
};
const lit = (px) => { let n = 0; for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] > 120) n++; return n; };
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

(async () => {
  const {browser, base, stop} = await start(process.argv.slice(2));
  try {
    for (const width of [1100, 380]) {
      const page = await browser.newPage({viewport: {width, height: 900}});
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // a resource from outside the site (web fonts, analytics) may be unreachable where the check runs
      page.on('console', (m) => { if (m.type() === 'error' && (m.location().url || base).startsWith(base)) errors.push(m.text()); });
      const go = async (p) => { await page.goto(`${base}/c64/chuckie-egg-2/${p}`, {waitUntil: 'load'}); await page.waitForTimeout(1500); };

      // How it works: the room viewer, its slider and overlay
      await go('index.html');
      const r115 = await pixels(page, '#ce2-room');
      assert(lit(r115) > 1000, 'room 115 drew');
      const n = Number(await page.locator('#ce2-k').getAttribute('max'));
      assert(n > 5, 'room 115 has commands');
      await page.locator('#ce2-k').fill('3'); await page.locator('#ce2-k').dispatchEvent('input');
      assert.match(await page.locator('#ce2-kn').textContent(), new RegExp(`^3 of ${n}`));
      const part = await pixels(page, '#ce2-room');
      assert(!same(part, r115), 'three commands draw only part of the room');
      await page.locator('#ce2-k').fill(String(n)); await page.locator('#ce2-k').dispatchEvent('input');
      await page.locator('#ce2-ov').check();
      assert(!same(await pixels(page, '#ce2-room'), r115), 'the overlay changes the picture');
      await page.locator('#ce2-ov').uncheck();
      await page.locator('#ce2-r').fill('1'); await page.locator('#ce2-r').dispatchEvent('input');
      assert(!same(await pixels(page, '#ce2-room'), r115), 'room 1 differs from room 115');

      // the jump: 21 steps up 16 empty-handed, 18 steps up 5 with a basket ($55AE, $5095)
      await page.locator('#ce2-jump').scrollIntoViewIfNeeded();
      assert.match(await page.locator('#ce2-jcap').textContent(), /^21 steps, rising 16 pixels and ending 12 pixels below the take-off, 42 pixels/);
      await page.locator('input[name=ce2-j][value="3"]').check();
      assert.match(await page.locator('#ce2-jcap').textContent(), /^18 steps, rising 5 pixels/);

      // the tune: playing it sets voice 1 to a note and leaves voices 2 and 3 silent
      await page.locator('#ce2-sid button', {hasText: 'The tune Harry dies to'}).click();
      await page.waitForTimeout(700);
      const sid = await page.locator('#ce2-sid').innerText();
      assert.match(sid, /Voice 1\s*Mute\s*Frequency\s*\$(?!0000)[0-9A-F]{4}/, 'voice 1 plays a note');
      assert.match(sid, /Voice 2\s*Mute\s*Frequency\s*\$0000/, 'voice 2 stays silent');

      // Maps: every room drawn
      await go('levels.html');
      const canvases = await page.locator('canvas').count();
      assert(canvases >= 1);
      assert(lit(await pixels(page, 'canvas >> nth=0')) > 1000, 'the map drew');

      // Discoveries: the source fragment and the code it built
      await go('discoveries.html');
      const src = await page.locator('#ce2-src').innerText();
      assert.match(src, /2420 \.setfull DEY:LDA#&82/);
      assert.match(src, /2470 \.setf LDA tcar/);
      const asm = await page.locator('#ce2-asm').innerText();
      assert.match(asm, /setfull:[\s\S]*inc lives[\s\S]*jsr upscr[\s\S]*jmp tib1/);
      assert(lit(await pixels(page, '#ce2-logo')) > 200, 'the unused logo drew');
      assert(lit(await pixels(page, '#ce2-spare')) > 100, 'the two spare pictures drew');

      // Graphics: 128 sprite shapes, 28 pick-ups, four toy sets of nine
      await go('graphics.html');
      assert.equal(await page.locator('#ce2-spr canvas').count(), 128);
      assert.equal(await page.locator('#ce2-pk canvas').count(), 28);
      assert.equal(await page.locator('#ce2-toys canvas').count(), 36);
      assert((await page.locator('#ce2-pk').textContent()).includes('$0D ladder'));
      assert(lit(await pixels(page, '#ce2-cs')) > 2000, 'the character set drew');

      assert.deepStrictEqual(errors, [], `console errors at width ${width}`);
      await page.close();
    }
    console.log('OK - room viewer, jump, tune, maps, source fragment, logo and graphics, wide and narrow');
  } finally {
    await stop();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
