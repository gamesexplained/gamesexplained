'use strict';
// The Play tab's Far view and its row of buttons in Chromium, on the built page (python3
// kit/scripts/build.py first), with the page's own refreshes:
// - Far view, Chase cam and Heli cam are buttons in the bar under the picture, beside Fast CPU,
//   and full screen shows them;
// - on a screen with a keyboard the name's field is not shown;
// - the Far view button switches it on, the page remembers it on the next visit, and a started
//   game has 6 at $173E (the count of LDA #$02 at $173D in DRAW_VIEW), 2 with it off;
// - in a practice race on Little Ramp, driven forward with the up arrow: with Far view on, about
//   eight pieces of track drawn a pass and fewer passes a second than the C64's seven; with Fast
//   CPU on as well, about a pass a video frame and the race's clock keeping real time; off, four
//   pieces a pass;
// - Z held in the race is forward and fire on the stick, and the left arrow held with it still
//   reaches the game ($66, READ_CONTROLS);
// - nothing in the console is an error.
// The menus are run on the page's machine in one go, between two of the page's frames, as
// test_fast.js runs them.
// CI runs it after building the site, with the runner's Chrome; elsewhere it needs Playwright
// (kit/scripts/play_browser.js).
//   node games/c64/stunt-car-racer/port/test/far-browser.js [built site, _site] [--chromium <path>]
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
  const crtOff = async () => { if (await page.$eval('[data-crt]', b => b.getAttribute('aria-pressed')) === 'true') await page.click('[data-crt]'); };
  // the CRT screen off: without a graphics card its shader would hold the refreshes to a few a second
  await crtOff();

  // the buttons under the picture
  const inBar = await page.evaluate(() => ['[data-act="fast"]', '[data-act="far"]', '[data-cam="chase"]', '[data-cam="heli"]']
    .map(s => { const b = document.querySelector(s); return b && b.closest('#pl-bar') ? '' : s; }).filter(Boolean));
  if (inBar.length) fail('not in the bar under the picture: ' + inBar.join(' '));
  else console.log('ok   Fast CPU, Far view, Chase cam and Heli cam are buttons in the bar under the picture');
  if (await page.$eval('.pl-name', li => getComputedStyle(li).display !== 'none')) fail('with a keyboard, the name\'s field is shown');
  else console.log('ok   with a keyboard, the name\'s field is not shown');
  // full screen carries them: each inside it and on the screen
  await page.click('[data-fullscreen]');
  await wait(300);
  const offFull = await page.evaluate(() => ['[data-act="far"]', '[data-cam="chase"]', '[data-cam="heli"]'].filter(sel => {
    const b = document.querySelector(sel), r = b.getBoundingClientRect();
    return !b.closest('.pc-full') || !(r.width > 0 && r.bottom <= innerHeight && r.right <= innerWidth);
  }));
  if (offFull.length) fail('in full screen, not shown: ' + offFull.join(' '));
  else console.log('ok   in full screen, Far view, Chase cam and Heli cam are on the screen');
  await page.click('[data-fullscreen]');
  await wait(300);

  // the switch, and the next visit
  await page.click('[data-act="far"]');
  if (await page.$eval('[data-act="far"]', b => b.getAttribute('aria-pressed')) !== 'true') fail('the Far view button does not show it on');
  await page.reload();
  await crtOff();
  if (await page.$eval('[data-act="far"]', b => b.getAttribute('aria-pressed')) !== 'true') fail('on the next visit, Far view is off');
  else console.log('ok   the Far view button switches it on, and the next visit keeps it on');
  if (await page.$eval('[data-act="fast"]', b => b.getAttribute('aria-pressed')) === 'true') await page.click('[data-act="fast"]');

  // the menus to a practice race, on the page's machine, in one go
  await page.click('#pl-over button');
  if (await page.evaluate(() => window.SCRPlay.rt.M[0x173E]) !== 6) fail('a game started with Far view on has ' + await page.evaluate(() => window.SCRPlay.rt.M[0x173E]) + ' at $173E');
  await page.evaluate(() => {
    const rt = window.SCRPlay.rt, J = { none: 0x1F, fire: 0x0F };
    const tap = (joy, hold = 8, after = 40) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
    const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
    const S = [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...type('A'), ...type('RETURN'), { frames: 200 }, ...tap(J.fire), { frames: 100 },
      ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 600 }, { frames: 180, joy: J.fire }];
    for (const s of S) { rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy; for (let i = 0; i < s.frames; i++) rt.runFrame(); }
    window.passes = 0; window.pieces = 0;
    const c = rt.P.CONTROLS; rt.P.CONTROLS = function (...x) { window.passes++; return c.apply(this, x); };
    const d = rt.P.DRAW_PIECE; rt.P.DRAW_PIECE = function (...x) { window.pieces++; return d.apply(this, x); };
  });
  await page.focus('#pl-screen');
  await page.keyboard.down('ArrowUp');
  // passes, pieces drawn and the race's clock over real time
  const now = () => page.evaluate(() => {
    const M = window.SCRPlay.rt.M, b = v => (v >> 4) * 10 + (v & 15);
    return { n: window.passes, p: window.pieces, clock: b(M[0x8398]) * 6000 + b(M[0x82B0]) * 100 + b(M[0x8298]), t: performance.now() };
  });
  const measure = async ms => {
    const a = await now();
    await wait(ms);
    const z = await now(), secs = (z.t - a.t) / 1000;
    return { rate: (z.n - a.n) / secs, pieces: (z.p - a.p) / Math.max(1, z.n - a.n), clock: (z.clock - a.clock) / 100 / secs };
  };
  try { await page.waitForFunction(() => window.SCRPlay.rt.M[0xC378] === 1, null, { timeout: 60000 }); }
  catch (e) { fail('the car did not reach the line in a minute'); }
  await wait(500);
  const far = await measure(4000);
  if (far.pieces < 7.5 || far.pieces > 8.5) fail('with Far view, ' + far.pieces.toFixed(2) + ' pieces of track drawn a pass');
  else console.log('ok   with Far view, ' + far.pieces.toFixed(2) + ' pieces of track drawn a pass');
  if (far.rate > 6.6 || far.rate < 4) fail('with Far view, ' + far.rate.toFixed(1) + ' passes a second; the C64 runs about 5.7 with the cheat');
  else console.log('ok   with Far view, ' + far.rate.toFixed(1) + ' passes a second, the C64\'s with the cheat');
  await page.click('[data-act="fast"]');
  await page.focus('#pl-screen');
  const fast = await measure(4000);
  if (fast.rate < 35 || fast.rate > 52 || fast.clock < 0.85 || fast.clock > 1.1) fail('with Far view and Fast CPU, ' + fast.rate.toFixed(1) + ' passes a second and the race\'s clock ran ' + fast.clock.toFixed(2) + ' s a second');
  else console.log('ok   with Far view and Fast CPU, ' + fast.rate.toFixed(1) + ' passes a second, the race\'s clock ' + fast.clock.toFixed(2) + ' s a second');
  await page.click('[data-act="fast"]');
  await page.click('[data-act="far"]');
  if (await page.evaluate(() => window.SCRPlay.rt.M[0x173E]) !== 2) fail('Far view off leaves ' + await page.evaluate(() => window.SCRPlay.rt.M[0x173E]) + ' at $173E');
  await page.focus('#pl-screen');
  await wait(500);
  const off = await measure(3000);
  if (off.pieces < 3.5 || off.pieces > 4.5) fail('with Far view off, ' + off.pieces.toFixed(2) + ' pieces of track drawn a pass');
  else console.log('ok   with Far view off, ' + off.pieces.toFixed(2) + ' pieces a pass and ' + off.rate.toFixed(1) + ' passes a second');
  await page.keyboard.up('ArrowUp');

  // Z: forward and fire on the stick, the left arrow still read with it
  await page.keyboard.down('z');
  await page.keyboard.down('ArrowLeft');
  try {
    await page.waitForFunction(() => window.SCRPlay.rt.M[0x66] === (1 | 4 | 16), null, { timeout: 5000 });
    console.log('ok   Z held with the left arrow: the game reads forward, left and fire');
  } catch (e) { fail('Z held with the left arrow: the game read $66 = ' + await page.evaluate(() => window.SCRPlay.rt.M[0x66])); }
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.up('z');
  if (errors.length) fail('the console: ' + errors.join(' | '));
  await stop();
  console.log(fails ? fails + ' failed' : 'all passed');
  process.exitCode = fails ? 1 : 0;
})();
