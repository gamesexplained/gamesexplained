'use strict';
// The Play tab's Chase cam in Chromium, on the built page (python3 kit/scripts/build.py first),
// with the page's own refreshes:
// - the Chase cam button switches it on and off, and the page remembers it on the next visit;
// - in a practice race on Little Ramp, driven forward with the up arrow, the page draws Chase cam
//   (SCRChase.draw) over the view about every refresh while it is on, and never while it is off;
//   the view's top rows show the sky and the race's own picture is replaced;
// - nothing in the console is an error.
// The menus are run on the page's machine in one go, the page paused, as test_fast.js runs them.
// CI runs it after building the site, with the runner's Chrome; elsewhere it needs Playwright
// (kit/scripts/play_browser.js).
//   node games/c64/stunt-car-racer/port/test/chase-browser.js [built site, _site] [--chromium <path>]
const path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const { start } = require(path.join(ROOT, 'kit/scripts/play_browser.js'));
const PAGE = '/c64/stunt-car-racer/play.html';

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
  const crtOff = async () => { if (await page.$eval('[data-crt]', b => b.getAttribute('aria-pressed')) === 'true') await page.click('[data-crt]'); };
  await crtOff();

  // the switch, and the next visit
  await page.click('[data-cam="chase"]');
  if (await page.$eval('[data-cam="chase"]', b => b.getAttribute('aria-pressed')) !== 'true') fail('the Chase cam button does not show it on');
  await page.reload();
  await crtOff();
  if (await page.$eval('[data-cam="chase"]', b => b.getAttribute('aria-pressed')) !== 'true') fail('on the next visit, Chase cam is off');
  else console.log('ok   the Chase cam button switches it on, and the next visit keeps it on');

  // the menus to a practice race, on the page's machine, paused
  await page.click('#pl-over button');
  await page.click('[data-act="pause"]');
  await page.evaluate(() => {
    const rt = window.SCRPlay.rt, J = { none: 0x1F, fire: 0x0F };
    const tap = (joy, hold = 8, after = 40) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
    const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
    const S = [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...type('A'), ...type('RETURN'), { frames: 200 }, ...tap(J.fire), { frames: 100 },
      ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 600 }, { frames: 180, joy: J.fire }];
    for (const s of S) { rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy; for (let i = 0; i < s.frames; i++) rt.runFrame(); }
    // count the pictures Chase cam draws, and keep the last frame it drew into
    const draw = window.SCRChase.draw;
    window.chaseDraws = 0;
    window.SCRChase.draw = (v, s, cam, px) => { window.chaseDraws++; const q = draw(v, s, cam, px); window.chasePx = px; return q; };
  });
  await page.click('[data-act="pause"]');
  await page.focus('#pl-screen');
  await page.keyboard.down('ArrowUp');
  try { await page.waitForFunction(() => window.SCRPlay.rt.M[0xC378] === 1, null, { timeout: 60000 }); }
  catch (e) { fail('the car did not reach the line in a minute'); }
  const count = async ms => {
    const a = await page.evaluate(() => ({ n: window.chaseDraws, t: performance.now() }));
    await wait(ms);
    const z = await page.evaluate(() => ({ n: window.chaseDraws, t: performance.now() }));
    return (z.n - a.n) / ((z.t - a.t) / 1000);
  };
  const on = await count(3000);
  if (on < 20) fail('with Chase cam on, ' + on.toFixed(1) + ' pictures a second; the page refreshes about 50 times a second');
  else console.log('ok   with Chase cam on, ' + on.toFixed(1) + ' pictures a second');
  // the view's top rows are sky (the game's own picture has the cockpit's frame there), and the
  // middle of the view is not the game's picture: the camera is behind the car
  const look = await page.evaluate(() => {
    const px = window.chasePx, sky = [], at = (x, y) => px[y * 384 + x];
    for (let x = 40; x < 344; x += 8) sky.push(at(x, 36));
    const seen = window.SCRPlay.seen;
    return { sky: sky.filter(c => c === 14).length / sky.length, car: !!(seen && seen.s && seen.s.car) };
  });
  if (look.sky < 0.9) fail('the view\'s top row is sky in ' + (100 * look.sky).toFixed(0) + ' % of it');
  else console.log('ok   the view\'s top row is sky, the camera behind the car');
  await page.click('[data-cam="chase"]');
  await page.focus('#pl-screen');
  const off = await count(2000);
  if (off !== 0) fail('with Chase cam off, ' + off.toFixed(1) + ' pictures a second');
  else console.log('ok   with Chase cam off, the game\'s own picture');
  await page.keyboard.up('ArrowUp');
  if (errors.length) fail('the console: ' + errors.join(' | '));
  await stop();
  console.log(fails ? fails + ' failed' : 'all passed');
  process.exitCode = fails ? 1 : 0;
})();
