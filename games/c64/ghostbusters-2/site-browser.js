'use strict';
// The pages’ demonstrations in Chromium: the trapped Ghostbusters on Discoveries, the
// sound-effect player on How it works, and the moving figures on Graphics. Run after
// kit/scripts/build.py; argv as play_browser.js.
const assert = require('assert/strict'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const {start, watchErrors} = require(path.join(ROOT, 'kit/scripts/play_browser.js'));

(async () => {
  const {browser, base, stop} = await start(process.argv.slice(2));
  try {
    const ctx = await browser.newContext({viewport: {width: 1280, height: 900}});
    const page = await ctx.newPage(), errors = [];
    watchErrors(page, base, errors);
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

    await page.goto(base + '/c64/ghostbusters-2/graphics.html');
    await page.waitForFunction(() => document.querySelectorAll('#museum-figures .gx-card').length > 0);
    const cards = {};
    for (const id of ['airshaft', 'broadway', 'museum', 'unused']) cards[id] = await page.locator(`#${id}-figures .gx-card`).count();
    assert.deepEqual(cards, {airshaft: 9, broadway: 9, museum: 7, unused: 4});
    const hash = sel => page.locator(sel).evaluate(el => {
      const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
      let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + 7 * d[i + 1] + 13 * d[i + 2]) >>> 0;
      return h;
    });
    const statue = '#broadway-figures .gx-card:nth-child(1) canvas';
    await page.locator('#broadway .gx-play [data-act="play"]').click();
    const held = await hash(statue);
    await page.waitForTimeout(400);
    assert.equal(await hash(statue), held, 'Pause stops the statue');
    await page.locator('#broadway .gx-play [data-act="step"]').click();
    assert.notEqual(await hash(statue), held, 'Step moves the statue on one frame');
    const man = '#airshaft-figures .gx-card:nth-child(1) canvas';
    const before = await hash(man);
    await page.locator('#airshaft-figures .gx-card:nth-child(1) button', {hasText: 'Right'}).click();
    assert.notEqual(await hash(man), before, 'Right turns the airshaft Ghostbuster');
    assert.match(await page.locator('#airshaft-figures .gx-card:nth-child(1) .gx-now').textContent(), /^Pose 7 of 30/);
    assert.equal(await page.locator('#every-shape .gx-cell').count(), 175);
    await page.locator('#every-shape .gx-cell', {hasText: /^\$A8$/}).click();
    assert.match(await page.locator('#every-shape-now').textContent(), /first shape of a hit/);
    await page.locator('#every-shape-episode button', {hasText: 'Museum panel'}).click();
    assert.equal(await page.locator('#every-shape .gx-cell').count(), 10);
    console.log('OK - Graphics: every card is drawn, Pause and Step work, the buttons steer the Ghostbuster and each shape names its figure');
    assert.deepEqual(errors, []);
  } finally {
    await stop();
  }
})().catch(e => { console.error(e); process.exit(1); });
