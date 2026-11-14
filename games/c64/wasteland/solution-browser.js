'use strict';
// The Solution tab in Chromium: the plate runs the whole walk in the page, on the game's own code,
// and draws each leg on its map. test_solution.js holds the walk itself in node; this holds what
// only a browser shows, that the page's blocks find each other and the listings, and that the
// tables and the map are drawn. CI runs it after building the site (kit/scripts/play_browser.js).
//   node games/c64/wasteland/solution-browser.js [<site>] [--chromium <path>]
const assert = require('assert/strict'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { start } = require(path.join(ROOT, 'kit/scripts/play_browser.js'));

async function check(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('fonts.googleapis')) errors.push(m.text()); });
  await page.goto(`${base}/c64/wasteland/solution.html`);
  const data = await page.evaluate(() => JSON.parse(document.getElementById('wl-solution').textContent));
  assert.equal(await page.locator('.wl-so-leg').count(), data.legs.length, 'a button for every leg');
  assert.equal(await page.locator('#wl-so-locks tbody tr').count(), data.locks.length, 'a row for every lock');
  assert.equal(await page.locator('#wl-so-throws tbody tr').count(), data.throws.length, 'a row for every throw');
  const now = page.locator('.wl-so-now'), say = page.locator('#wl-so-plate .wl-xp-say');
  const shown = async n => {
    await page.waitForFunction(k => document.querySelector('.wl-so-now').textContent.startsWith('Leg ' + k + ' of ') || /stopped/.test(document.querySelector('#wl-so-plate .wl-xp-say').textContent), n, { timeout: 120000 });
    assert.equal(await say.textContent(), '', 'the walk did not stop');
  };
  const drawn = () => page.locator('#wl-so-plate canvas').evaluate(el => { const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data; const seen = new Set(); for (let i = 0; i < d.length; i += 4 * 97) seen.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); return seen.size; });
  // one leg: the temple, drawn from the map's own tiles, with the path over it
  await page.locator('.wl-so-leg').nth(7).click(); await shown(8);
  assert.match(await now.textContent(), /The temple · Two high security doors, blown open · 16 moves/);
  assert.ok(await drawn() > 8, 'the map is drawn');
  assert.match(await page.locator('.wl-so-log').innerText(), /The door is all over the place, in little pieces\./);
  // the last leg runs every leg before it: the whole walk, in the page
  await page.locator('.wl-so-leg').nth(data.legs.length - 1).click(); await shown(data.legs.length);
  assert.ok((await now.textContent()).includes(data.moves.toLocaleString('en-GB') + ' moves so far'), 'the walk\'s moves');
  assert.match(await now.textContent(), /the countdown has run out/);
  assert.match(await page.locator('.wl-so-log').innerText(), /Module 4 is the ending/);
  assert.equal(await page.locator('.wl-so-leg.wl-so-done').count(), data.legs.length, 'every leg walked');
  // back a leg, and a map link in the table of locks
  await page.locator('[data-act=prev]').click(); await shown(data.legs.length - 1);
  assert.match(await now.textContent(), /Over the dome wall and off the grounds/);
  assert.match(await page.locator('#wl-so-locks tbody tr a').first().getAttribute('href'), /^levels\.html#map-\d+-\d+-\d+$/);
  // a phone: nothing wider than the screen
  await page.setViewportSize({ width: 390, height: 800 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scroll at 390 px');
  assert.deepEqual(errors, [], 'browser errors');
  console.log('OK: the Solution tab walks all ' + data.legs.length + ' legs in the page and draws them');
  await ctx.close();
}

(async () => {
  const session = await start(process.argv.slice(2));
  try { await check(session.browser, session.base); } finally { await session.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
