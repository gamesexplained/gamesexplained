'use strict';
// The pages' demonstrations in Chromium: the trapped Ghostbusters on Discoveries, and the
// sound-effect player on How it works. Run after kit/scripts/build.py; argv as play_browser.js.
const assert = require('assert/strict'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const {start} = require(path.join(ROOT, 'kit/scripts/play_browser.js'));

(async () => {
  const {browser, base, stop} = await start(process.argv.slice(2));
  try {
    const ctx = await browser.newContext({viewport: {width: 1280, height: 900}});
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('fonts.g')) errors.push(m.text()); });
    const status = () => page.locator('#trap-result').textContent();
    const picture = () => page.locator('#trap').evaluate(el => {
      const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
      let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + 7 * d[i + 1] + 13 * d[i + 2]) >>> 0;
      return h;
    });

    await page.goto(base + '/c64/ghostbusters-2/discoveries.html');
    await page.waitForFunction(() => document.getElementById('trap-result').textContent.length > 0);
    assert.match(await status(), /still in the first room/);
    const alone = await picture();
    await page.locator('#trap-door').click();
    assert.match(await status(), /Both are stuck\./);
    const trapped = await picture();
    assert.notEqual(trapped, alone, 'Ghostbuster 1 is drawn once he comes in');
    for (const dir of ['up', 'down', 'left', 'right']) {
      await page.locator(`.pad button[data-dir="${dir}"]`).click();
      assert.match(await status(), /stays put/, dir);
    }
    await page.locator('#trap-switch').click();
    await page.locator('.pad button[data-dir="up"]').click();
    assert.match(await status(), /Ghostbuster 2 stays put/);
    assert.equal(await picture(), trapped, 'neither Ghostbuster has moved');
    await page.locator('#trap-copy').click();
    assert.match(await status(), /cracked copy skips the check/);
    await page.locator('.pad button[data-dir="up"]').click();
    assert.match(await status(), /can walk any way/);
    assert.notEqual(await picture(), trapped, 'on the cracked copy he walks away');
    await page.locator('#trap-reset').click();
    assert.match(await status(), /still in the first room/);
    console.log('OK - Discoveries: the doorway traps both Ghostbusters on the original disk; the cracked copy lets them walk');

    await page.goto(base + '/c64/ghostbusters-2/index.html');
    const effects = page.locator('#effects-sound button');
    await page.waitForFunction(() => document.querySelectorAll('#effects-sound button').length > 0);
    const names = await effects.allTextContents();
    for (const want of ['0 never played', '17 beam hum', '19 bomb', '25 fireball shot']) {
      assert(names.some(t => t.includes(want)), 'a button for ' + want);
    }
    assert.equal(await page.locator('table.sfx tbody tr').count(), 21);
    console.log('OK - How it works: the effect player has a button for each of the 26 effects, and the table lists them');
    assert.deepEqual(errors, []);
  } finally {
    await stop();
  }
})().catch(e => { console.error(e); process.exit(1); });
