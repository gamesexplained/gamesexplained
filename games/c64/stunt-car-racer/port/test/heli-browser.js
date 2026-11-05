'use strict';
// The Play tab's Heli cam in Chromium, on the built page (python3 kit/scripts/build.py first), with
// the page's own refreshes:
// - the Heli cam button switches it on, the Chase cam button then switches it off (one camera at a
//   time), and the page remembers the camera on the next visit; a visit that had only Chase View's
//   old setting comes back with Chase cam on;
// - in a practice race on Little Ramp, driven forward with the up arrow, the page draws Heli cam
//   (SCRChase.heli, SCRChase.draw) over the view about every refresh while the race goes on, the
//   view's top row sky; pressed again, the game's own picture;
// - nothing in the console is an error.
// The menus are run on the page's machine in one go, the page paused, as test_fast.js runs them.
// CI runs it after building the site, with the runner's Chrome; elsewhere it needs Playwright
// (kit/scripts/play_browser.js).
//   node games/c64/stunt-car-racer/port/test/heli-browser.js [built site, _site] [--chromium <path>]
const path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const { start } = require(path.join(ROOT, 'kit/scripts/play_browser.js'));
const PAGE = '/c64/stunt-car-racer/play.html';
const SHOT = process.env.HELI_SHOT;                  // a screenshot of Heli cam to this file, if set

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const { browser, base, stop } = await start(process.argv.slice(2));
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  // the fonts are the only thing from elsewhere: answered empty, off the network
  await page.route(u => !u.href.startsWith('http://127.0.0.1'), r => r.fulfill({ status: 200, body: '' }));
  await page.goto(base + PAGE);
  // the CRT screen off: without a graphics card its shader would hold the refreshes to a few a second
  const crtOff = async () => { if (await page.$eval('[data-crt]', b => b.getAttribute('aria-pressed')) === 'true') await page.click('[data-crt]'); };
  await crtOff();
  const pressed = () => page.evaluate(() => [...document.querySelectorAll('[data-cam]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.cam).join(' '));

  // the old setting: Chase View on, from before the cameras were two
  await page.evaluate(() => { localStorage.removeItem('gamesexplained.stunt-car-racer.cam'); localStorage.setItem('gamesexplained.stunt-car-racer.chase', '1'); });
  await page.reload();
  await crtOff();
  if (await pressed() !== 'chase') fail('with Chase View\'s old setting, the cameras on are "' + await pressed() + '"');
  else console.log('ok   with Chase View\'s old setting, Chase cam is on');
  // one at a time, and the next visit
  await page.click('[data-cam="heli"]');
  if (await pressed() !== 'heli') fail('after the Heli cam button, the cameras on are "' + await pressed() + '"');
  await page.click('[data-cam="chase"]');
  if (await pressed() !== 'chase') fail('after the Chase cam button, the cameras on are "' + await pressed() + '"');
  else console.log('ok   one camera at a time: Heli cam, then Chase cam in its place');
  await page.click('[data-cam="heli"]');
  await page.reload();
  await crtOff();
  if (await pressed() !== 'heli') fail('on the next visit, the cameras on are "' + await pressed() + '"');
  else console.log('ok   the next visit keeps Heli cam on');

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
    // count the pictures drawn from the helicopter, and keep the last frame drawn into
    const heli = window.SCRChase.heli, draw = window.SCRChase.draw;
    window.heliCams = 0; window.draws = 0;
    window.SCRChase.heli = (...a) => { window.heliCams++; return heli(...a); };
    window.SCRChase.draw = (v, s, cam, px) => { window.draws++; const q = draw(v, s, cam, px); window.drawPx = px; return q; };
  });
  await page.click('[data-act="pause"]');
  await page.focus('#pl-screen');
  await page.keyboard.down('ArrowUp');
  try { await page.waitForFunction(() => window.SCRPlay.rt.M[0xC378] === 1, null, { timeout: 60000 }); }
  catch (e) { fail('the car did not reach the line in a minute'); }
  const count = async ms => {
    const a = await page.evaluate(() => ({ h: window.heliCams, d: window.draws, f: window.SCRPlay.rt.frame, t: performance.now() }));
    await wait(ms);
    const z = await page.evaluate(() => ({ h: window.heliCams, d: window.draws, f: window.SCRPlay.rt.frame, t: performance.now() }));
    const s = (z.t - a.t) / 1000;
    return { heli: (z.h - a.h) / s, draws: (z.d - a.d) / s, frames: (z.f - a.f) / s };
  };
  const on = await count(3000);
  if (on.heli < 20 || on.draws < 20) fail('with Heli cam on, ' + on.heli.toFixed(1) + ' cameras and ' + on.draws.toFixed(1) + ' pictures a second; the page refreshes about 50 times a second');
  else console.log('ok   with Heli cam on, ' + on.draws.toFixed(1) + ' pictures a second from the helicopter');
  if (on.frames < 40) fail('with Heli cam on, the race ran ' + on.frames.toFixed(1) + ' C64 frames a second');
  else console.log('ok   with Heli cam on, the race goes on at ' + on.frames.toFixed(1) + ' C64 frames a second');
  const sky = await page.evaluate(() => { const px = window.drawPx, s = []; for (let x = 40; x < 344; x += 8) s.push(px[36 * 384 + x]); return s.filter(c => c === 14).length / s.length; });
  if (sky < 0.9) fail('the view\'s top row is sky in ' + (100 * sky).toFixed(0) + ' % of it');
  else console.log('ok   the view\'s top row is sky');
  if (SHOT) await (await page.$('#game')).screenshot({ path: SHOT });
  // pressed again: the game's own picture
  await page.click('[data-cam="heli"]');
  await page.focus('#pl-screen');
  const off = await count(2000);
  if (off.draws !== 0 || await pressed() !== '') fail('pressed again, ' + off.draws.toFixed(1) + ' pictures a second from outside the car');
  else console.log('ok   pressed again, the game\'s own picture');
  await page.keyboard.up('ArrowUp');
  if (errors.length) fail('the console: ' + errors.join(' | '));
  await stop();
  console.log(fails ? fails + ' failed' : 'all passed');
  process.exitCode = fails ? 1 : 0;
})();
