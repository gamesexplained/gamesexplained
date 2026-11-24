'use strict';
// Turrican's pages in Chromium: every widget from its first state, and what it must show.
// How it works: the tune and effect players play, the frame's panel switch, the map's sliders and
// grid, the damage table and the level pictures. Levels: every map draws, each differently, with
// 2-1's extra row, the objects and hidden blocks, and the buttons and links that find the places
// the notes name.
// Graphics: the hero's six actions, both ways round; the shared shapes; every level's sprite sheet,
// with the count of shapes its file brings; the title's sparkles; the ending's 50 explosions and the
// broken top they leave; the loading picture. Discoveries: the hall of fame, the signature's two tunes and the
// ending's tune. On every page, no error and no sideways scrolling at phone width.
// Run after kit/scripts/build.py; argv as play_browser.js.
const assert = require('assert/strict'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { start, watchErrors } = require(path.join(ROOT, 'kit/scripts/play_browser.js'));

(async () => {
  const { browser, base, stop } = await start(process.argv.slice(2));
  const errors = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    watchErrors(page, base, errors);
    const url = f => base + '/c64/turrican/' + f;
    // a hash of what a canvas shows, and how many of its pixels differ from its top-left one
    const hash = sel => page.locator(sel).evaluate(c => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + 7 * d[i + 1] + 13 * d[i + 2]) >>> 0;
      return h;
    });
    const drawn = sel => page.locator(sel).evaluate(c => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2]) n++;
      return n;
    });
    const moves = async (sel, what) => {   // samples a repeating animation until it shows a second state
      const first = await hash(sel);
      for (let i = 0; i < 12; i++) { await page.waitForTimeout(150); if (await hash(sel) !== first) return; }
      assert.fail(what + ' does not move');
    };
    // a tune or effect button of a SID player: pressed, and its clock running
    const plays = async (root, button, name) => {
      await button.click();
      await button.evaluate(b => new Promise(ok => { const t = Date.now(), w = () => b.getAttribute('aria-pressed') === 'true' || Date.now() - t > 3000 ? ok() : setTimeout(w, 50); w(); }));
      assert.equal(await button.getAttribute('aria-pressed'), 'true', name + ' is pressed');
      await page.waitForFunction(r => { const t = document.querySelector(r + ' [data-g="time"]'); return t && t.textContent !== '0:00.0'; },
        root, { timeout: 5000 }).catch(() => assert.fail(name + ': the player\'s clock does not move'));
      await page.locator(root + ' [data-stop]').first().click();
    };

    // How it works
    await page.goto(url('index.html'));
    await page.waitForFunction(() => document.querySelectorAll('#tu-music [data-tune]').length > 0, null, { timeout: 15000 });
    const tunes = page.locator('#tu-music [data-tune]');
    assert.equal(await tunes.count(), 6, 'six tunes');
    for (let i = 0; i < 6; i++) await plays('#tu-music', tunes.nth(i), await tunes.nth(i).textContent());
    const effects = page.locator('#tu-effects [data-tune]');
    assert.equal(await effects.count(), 31, '31 effects');
    await plays('#tu-effects', effects.nth(0), await effects.nth(0).textContent());
    assert(await page.locator('#tu-damage tbody tr').count() >= 5, 'the damage table is filled from the listing');
    assert(await drawn('#tu-frame') > 20000, 'the frame of level 1-1 is drawn');
    const frame = await hash('#tu-frame');
    await page.locator('#tu-split').click();
    assert.equal(await page.locator('#tu-split').textContent(), 'Panel switch off');
    assert.notEqual(await hash('#tu-frame'), frame, 'leaving out the panel\'s switch changes the frame');
    assert(await drawn('#tu-map') > 5000, 'the map of level 1-1 is drawn');
    const map = await hash('#tu-map');
    await page.locator('#tu-map-x').evaluate(e => { e.value = 200; e.dispatchEvent(new Event('input')); });
    assert.notEqual(await hash('#tu-map'), map, 'the Across slider moves the view');
    assert.notEqual(await page.locator('#tu-map-at').textContent(), '', 'the view\'s place is shown');
    const plain = await hash('#tu-map');
    await page.locator('#tu-map-grid').check();
    assert.notEqual(await hash('#tu-map'), plain, 'Blocks and squares draws the lines');
    await page.locator('#tu-map-grid').uncheck();
    assert.equal(await hash('#tu-map'), plain, 'and takes them away');
    const widest = await page.locator('#tu-damage .tu-dmg').evaluateAll(b => Math.max(...b.map(x => x.offsetWidth)));
    assert(widest <= 110, 'the damage bars stay within 110 pixels: ' + widest);
    const shots = await page.locator('#shot-choice option').evaluateAll(o => o.map(x => x.value));
    for (const v of shots) {
      await page.selectOption('#shot-choice', v);
      await page.waitForFunction(() => { const i = document.getElementById('shot'); return i.complete && i.naturalWidth > 0; });
    }
    console.log('OK - How it works: 6 tunes and an effect play; the frame, the map and its grid, the damage table and', shots.length, 'level pictures');

    // Levels
    await page.goto(url('levels.html'));
    const levels = await page.locator('#map-choice option').evaluateAll(o => o.map(x => x.value));
    assert.equal(levels.length, 13, 'thirteen levels');
    let last = null;
    for (const v of levels) {
      await page.selectOption('#map-choice', v);
      await page.waitForFunction(() => !/Loading/.test(document.getElementById('map-state').textContent), null, { timeout: 20000 });
      assert(await drawn('#map-canvas') > 5000, 'level ' + v + ' is drawn');
      const h = await hash('#map-canvas');
      assert.notEqual(h, last, 'level ' + v + ' differs from the one before'); last = h;
    }
    // the extra row after 2-1's map, and the buttons that find the places the notes name
    await page.selectOption('#map-choice', { label: 'Level 2-1' });
    await page.waitForFunction(() => !/Loading/.test(document.getElementById('map-state').textContent), null, { timeout: 20000 });
    const high = Number((await page.locator('#map-facts').textContent()).match(/(\d+) high/)[1]);
    assert.equal(await page.locator('#map-canvas').evaluate(c => c.height / 32), high + 1, '2-1 is drawn one row taller than its map');
    assert.match(await page.locator('#map-facts').textContent(), /1 more row after it/, '2-1 draws the row after its map');
    const spots = { 'Level 1-1': 2, 'Level 1-2': 1, 'Level 1-3': 1, 'Level 2-2': 1, 'Level 4-3': 2 };
    for (const [lv, n] of Object.entries(spots)) {
      await page.selectOption('#map-choice', { label: lv });
      await page.waitForFunction(() => !/Loading/.test(document.getElementById('map-state').textContent), null, { timeout: 20000 });
      const b = page.locator('#map-spots button:not(#map-next-block)');
      assert.equal(await b.count(), n, lv + ' has ' + n + ' place buttons');
      for (let i = 0; i < n; i++) {
        await page.locator('#map-scroll').evaluate(e => { e.scrollLeft = 0; e.scrollTop = 0; });
        await b.nth(i).click();
        assert.equal(await page.locator('#map-mark').isVisible(), true, lv + ': the place is outlined');
        const at = await page.locator('#map-scroll').evaluate(e => e.scrollLeft + e.scrollTop);
        assert(at > 0, lv + ': the map scrolls to the place');
      }
    }
    await page.selectOption('#map-choice', { label: 'Level 1-1' });
    await page.waitForFunction(() => !/Loading/.test(document.getElementById('map-state').textContent), null, { timeout: 20000 });
    assert.match(await page.locator('#map-facts').textContent(), /Objects\d+/, 'the objects are counted');
    const marked = await hash('#map-canvas');
    await page.locator('#map-objects').uncheck();
    assert.notEqual(await hash('#map-canvas'), marked, 'Objects takes the marks away');
    await page.locator('#map-objects').check();
    assert.equal(await hash('#map-canvas'), marked, 'and puts them back');
    // the hidden blocks: marked, counted, and stepped through one at a time
    assert.match(await page.locator('#map-facts').textContent(), /Hidden blocks3/, '1-1 has three hidden blocks');
    const nb = page.locator('#map-next-block');
    await nb.click();
    assert.equal(await nb.textContent(), 'Next hidden block (1 of 3)');
    assert.equal(await page.locator('#map-mark').isVisible(), true, 'the first block is outlined');
    const first = await page.locator('#map-mark').evaluate(e => e.style.left + e.style.top);
    await nb.click();
    assert.notEqual(await page.locator('#map-mark').evaluate(e => e.style.left + e.style.top), first, 'the button moves to the next block');
    await page.goto(url('levels.html?level=3-2&show=blocks'));
    await page.waitForFunction(() => !document.getElementById('map-mark').hidden, null, { timeout: 20000 });
    assert.equal(await page.locator('#map-next-block').textContent(), 'Next hidden block (1 of 21)', 'a link opens a level on its first block');
    await page.goto(url('levels.html?level=1-3&show=DTE'));
    await page.waitForFunction(() => !document.getElementById('map-mark').hidden, null, { timeout: 20000 });
    assert.equal(await page.locator('#map-choice').evaluate(s => s.options[s.selectedIndex].text), 'Level 1-3', 'a link opens its level');
    console.log('OK - Levels: all 13 maps draw, each its own; 2-1\'s extra row; the objects; the hidden blocks; 7 place buttons and two links');

    // Graphics
    await page.goto(url('graphics.html'));
    await page.waitForFunction(() => /Shapes/.test(document.getElementById('hero-state').textContent), null, { timeout: 15000 });
    const still = {};
    for (const mode of ['walk', 'stand', 'jump', 'crouch', 'wheel', 'shield']) {
      await page.locator(`[data-hero="${mode}"]`).click();
      assert.equal(await page.locator(`[data-hero="${mode}"]`).getAttribute('aria-pressed'), 'true');
      if (['walk', 'wheel', 'shield'].includes(mode)) await moves('#hero-canvas', 'the hero, ' + mode);
      else still[mode] = await hash('#hero-canvas');
      assert(await drawn('#hero-canvas') > 200, 'the hero is drawn, ' + mode);
    }
    assert.equal(new Set(Object.values(still)).size, 3, 'standing, jumping and crouching are three shapes');
    await page.locator('[data-hero="stand"]').click();
    const right = await hash('#hero-canvas');
    await page.locator('#hero-face').click();
    assert.equal(await page.locator('#hero-face').textContent(), 'Facing left');
    assert.notEqual(await hash('#hero-canvas'), right, 'the hero turns round');
    await page.locator('#hero-apart').check();
    assert.notEqual(await hash('#hero-canvas'), right, 'the three sprites drawn apart');
    for (const c of ['#boom-canvas', '#box-canvas']) await moves(c, c);
    assert(await drawn('#symbols-canvas') > 500 && await drawn('#message-canvas') > 500, 'the symbols and messages are drawn');
    const COUNT = { 1: 74, 4: 100, 6: 99 };   // level 1-2, 2-2 and 3-2, as their files and the ones beneath leave them
    for (const v of await page.locator('#sheet-choice option').evaluateAll(o => o.map(x => x.value))) {
      await page.selectOption('#sheet-choice', v);
      await page.waitForFunction(() => /^\d+ shapes/.test(document.getElementById('sheet-state').textContent), null, { timeout: 20000 });
      const n = +(await page.locator('#sheet-state').textContent()).match(/^(\d+)/)[1];
      if (COUNT[v]) assert.equal(n, COUNT[v], 'shapes in level option ' + v);
      assert(n > 20 && await drawn('#sheet-canvas') > 2000, 'level option ' + v + ' draws its shapes');
    }
    const sheet = await hash('#sheet-canvas');
    await page.selectOption('#sheet-mode', 'hr');
    assert.notEqual(await hash('#sheet-canvas'), sheet, 'drawn in single colour');
    await page.selectOption('#sheet-colour', '7');
    assert.notEqual(await hash('#sheet-canvas'), sheet, 'drawn in yellow');
    await moves('#spark-canvas', 'the sparkles');
    assert(await drawn('#tower-canvas') > 20000, 'the tower is drawn');
    assert.equal(await page.locator('#tower-broken').isChecked(), false, 'the tower starts whole');
    const whole = await hash('#tower-canvas');
    await page.locator('#tower-play').click();
    await page.waitForFunction(() => /All 50 explosions are over/.test(document.getElementById('tower-state').textContent), null, { timeout: 30000 });
    assert.equal(await page.locator('#tower-broken').isChecked(), true, 'the explosions broke the top');
    assert.notEqual(await hash('#tower-canvas'), whole, 'the top of the tower is broken');
    assert(await drawn('#load-canvas') > 50000, 'the loading picture is drawn');
    console.log('OK - Graphics: the hero\'s six actions both ways, the shared shapes, every level\'s sheet, the sparkles, the 50 explosions and the loading picture');

    // Discoveries
    await page.goto(url('discoveries.html'));
    await page.waitForFunction(() => document.querySelectorAll('#fame tr').length === 10, null, { timeout: 15000 });
    assert.equal(await page.locator('#tu-sig [data-tune]').count(), 2, 'the signature has two tunes');
    assert.equal(await page.locator('#tu-end [data-tune]').count(), 1, 'the ending\'s tune');
    await plays('#tu-sig', page.locator('#tu-sig [data-tune]').nth(1), 'SOMUZAK');
    await plays('#tu-end', page.locator('#tu-end [data-tune]').first(), 'the ending\'s tune');
    for (const img of await page.locator('img').all()) {
      await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(i => i.complete, await img.elementHandle());
      assert(await img.evaluate(i => i.naturalWidth > 0), 'a picture loads: ' + await img.getAttribute('src'));
    }
    console.log('OK - Discoveries: the hall of fame, the signature\'s tunes, the ending\'s tune and every picture');

    // At phone width, no page scrolls sideways.
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const p2 = await phone.newPage();
    p2.on('pageerror', e => errors.push(String(e)));
    for (const f of ['index.html', 'levels.html', 'graphics.html', 'discoveries.html']) {
      await p2.goto(url(f)); await p2.waitForTimeout(800);
      const w = await p2.evaluate(() => document.documentElement.scrollWidth);
      assert(w <= 391, f + ' is ' + w + ' pixels wide at 390');
    }
    console.log('OK - at 390 pixels wide, no page scrolls sideways');
    assert.deepEqual(errors, []);
  } finally {
    await stop();
  }
})().catch(e => { console.error(e); process.exit(1); });
