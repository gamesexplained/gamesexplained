'use strict';
// The Play tab's Fast CPU in Chromium, on the built page (python3 kit/scripts/build.py first):
// real key presses, the page's own refreshes, Fast CPU at 1x.
// - I pressed for 20 to 150 ms opens the information screen, which stays open until another key
//   closes it: a key that comes up is let go although the information screen goes round no loop;
// - 0 or Ctrl pressed for 50 ms fires the laser, and the screens the page draws show its four
//   lines while its sound plays;
// - nothing in the console is an error.
// CI runs it after building the site, with the runner's Chrome; elsewhere it needs Playwright
// (kit/scripts/play_browser.js).
//   node games/spectrum/driller/port/test/fast-browser.js [built site, _site] [--chromium <path>]
const path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const { start } = require(path.join(ROOT, 'kit/scripts/play_browser.js'));
const PAGE = '/spectrum/driller/play.html';

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const { browser, base, stop } = await start(process.argv.slice(2));
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  // the fonts are the only thing from elsewhere: answered empty, off the network
  await page.route(u => !u.href.startsWith('http://127.0.0.1'), r => r.fulfill({ status: 200, body: '' }));
  await page.goto(base + PAGE);
  // the CRT screen off: without a graphics card its shader would hold the refreshes to a few a second
  if (await page.$eval('[data-crt]', b => b.getAttribute('aria-pressed')) === 'true') await page.click('[data-crt]');
  await page.click('#pl-over button');
  // the security question answered with Type it, and ENTER at the control options, to play in Amethyst
  await page.waitForFunction(() => { const rt = window.DRPlay.rt; return rt && rt.M[0xCB6F] === 0x23 && !document.getElementById('pl-answer').hidden; }, null, { timeout: 120000 });
  await page.click('#pl-type');
  await wait(4000);
  await page.focus('#pl-screen');
  await page.keyboard.down('Enter'); await wait(150); await page.keyboard.up('Enter');
  await page.waitForFunction(() => window.DRPlay.rt.M[0x8862] === 1 && window.DRPlay.rt.M[0x891F] !== 3, null, { timeout: 60000 });
  await wait(3000);
  // the Speed slider turns Fast CPU on, at 1x
  await page.$eval('#pl-speed', el => { el.value = '0'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  const on = await page.$eval('[data-act="fast"]', b => b.getAttribute('aria-pressed'));
  if (on !== 'true') fail('the Speed slider left Fast CPU ' + on);
  await page.focus('#pl-screen');
  await wait(1000);
  // when each information screen opened and closed; each shot, the bytes its lines change as its
  // sound begins, and the screens the page draws while it plays
  await page.evaluate(() => {
    const rt = window.DRPlay.rt, P = rt.P, M = rt.M;
    const is = P.info_screen, ac = P.aim_command, ps = P.play_sound, ff = rt.fastFrame;
    window.__info = []; window.__shots = [];
    P.info_screen = function* (r) { const e = { from: performance.now() }; window.__info.push(e); try { return yield* is.call(this, r); } finally { e.to = performance.now(); } };
    let before = null, shot = null;
    P.aim_command = function* (r) { if ((r.a & 255) === 0x16) { before = M.slice(0x4000, 0x5800); shot = null; } return yield* ac.call(this, r); };
    P.play_sound = function (q) {
      if ((q.a & 255) === 1 && before && !shot) {
        shot = { lines: [], shown: 0, drawn: 0 }; window.__shots.push(shot);
        for (let i = 0; i < 0x1800; i++) if (M[0x4000 + i] !== before[i]) shot.lines.push([i, M[0x4000 + i]]);
        const T0 = P.T, res = ps.call(this, q);
        shot.secs = (P.T - T0) / 3500000;
        return res;
      }
      return ps.call(this, q);
    };
    rt.fastFrame = function () {
      const F = ff.call(this);
      if (shot && shot.drawn < 60) { shot.drawn++; if (shot.lines.filter(([i, v]) => F.screen[i] === v).length >= 0.9 * shot.lines.length) shot.shown++; }
      return F;
    };
  });

  // I, pressed 20 to 150 ms
  {
    const bad = [];
    for (const ms of [20, 40, 60, 100, 150]) {
      const n0 = await page.evaluate(() => window.__info.length);
      await page.keyboard.down('KeyI'); await wait(ms); await page.keyboard.up('KeyI');
      await wait(2000);
      const opened = await page.evaluate(n0 => window.__info.slice(n0).map(e => (e.to ? Math.round(e.to - e.from) : null)), n0);
      if (opened.length !== 1 || opened[0] !== null) bad.push(ms + ' ms: ' + (opened.length ? 'closed after ' + opened.join(', ') + ' ms' : 'never opened'));
      // another key closes it
      await page.keyboard.down('KeyN'); await wait(100); await page.keyboard.up('KeyN');
      await wait(2000);
      if (await page.evaluate(() => window.__info.some(e => !e.to))) { bad.push(ms + ' ms: N left it open'); break; }
    }
    if (bad.length) fail('I pressed: ' + bad.join('; '));
    else console.log('I pressed for 20, 40, 60, 100 and 150 ms: the information screen opens and stays open until N closes it');
  }

  // the laser, from 0 and from Ctrl (the cursor keys' fire)
  for (const key of ['Digit0', 'ControlLeft']) {
    const n0 = await page.evaluate(() => window.__shots.length);
    await page.keyboard.down(key); await wait(50); await page.keyboard.up(key);
    await wait(1500);
    const s = await page.evaluate(n0 => window.__shots.slice(n0).map(x => ({ shown: x.shown, drawn: x.drawn, secs: x.secs })), n0);
    if (s.length !== 1) fail(key + ' pressed for 50 ms fired ' + s.length + ' shots');
    else if (s[0].shown * 1000 / 60 < 1000 * s[0].secs / 2) fail(key + ' pressed for 50 ms: the laser\'s lines showed in ' + s[0].shown + ' of the screens drawn, while its sound played ' + s[0].secs.toFixed(3) + ' s');
    else console.log(key + ' pressed for 50 ms: one shot, its lines in ' + s[0].shown + ' of the screens drawn while its sound plays ' + s[0].secs.toFixed(3) + ' s');
  }

  if (errors.length) fail('the console: ' + errors.slice(0, 3).join(' | '));
  else console.log('the console: no errors');
  await stop();
  if (fails) { console.log(fails + ' failed'); process.exit(1); }
  console.log('ok');
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
