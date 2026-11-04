'use strict';
// The Play tab's Fast CPU in Chromium, on the built page (python3 kit/scripts/build.py first),
// with the page's own refreshes:
// - the Fast CPU button switches it on and off, and the page remembers it on the next visit;
// - in a practice race on Little Ramp, driven forward with the up arrow, Fast CPU runs about one
//   pass of the race a video frame of real time, where the C64 runs one in seven or more, and the
//   race's clock keeps real time;
// - nothing in the console is an error.
// The menus are run on the page's machine in one go, the page paused, as test_fast.js runs them.
// CI runs it after building the site, with the runner's Chrome; elsewhere it needs Playwright
// (kit/scripts/play_browser.js).
//   node games/c64/stunt-car-racer/port/test/fast-browser.js [built site, _site] [--chromium <path>]
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
  if (await page.$eval('[data-crt]', b => b.getAttribute('aria-pressed')) === 'true') await page.click('[data-crt]');

  // the switch, and the next visit
  await page.click('[data-act="fast"]');
  if (await page.$eval('[data-act="fast"]', b => b.getAttribute('aria-pressed')) !== 'true') fail('the Fast CPU button does not show it on');
  await page.reload();
  if (await page.$eval('[data-crt]', b => b.getAttribute('aria-pressed')) === 'true') await page.click('[data-crt]');
  if (await page.$eval('[data-act="fast"]', b => b.getAttribute('aria-pressed')) !== 'true') fail('on the next visit, Fast CPU is off');
  else console.log('ok   the Fast CPU button switches it on, and the next visit keeps it on');

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
  });
  await page.click('[data-act="pause"]');
  await page.focus('#pl-screen');
  await page.keyboard.down('ArrowUp');
  // passes and the race's clock over real time, Fast CPU on, then off
  const measure = async ms => {
    const a = await page.evaluate(() => {
      const rt = window.SCRPlay.rt, M = rt.M, b = v => (v >> 4) * 10 + (v & 15);
      if (!window.passes) { window.passes = 0; const c = rt.P.CONTROLS; rt.P.CONTROLS = function (...x) { window.passes++; return c.apply(this, x); }; }
      return { n: window.passes, clock: b(M[0x8398]) * 6000 + b(M[0x82B0]) * 100 + b(M[0x8298]), t: performance.now() };
    });
    await wait(ms);
    const z = await page.evaluate(() => {
      const M = window.SCRPlay.rt.M, b = v => (v >> 4) * 10 + (v & 15);
      return { n: window.passes, clock: b(M[0x8398]) * 6000 + b(M[0x82B0]) * 100 + b(M[0x8298]), t: performance.now() };
    });
    const secs = (z.t - a.t) / 1000;
    return { rate: (z.n - a.n) / secs, clock: (z.clock - a.clock) / 100 / secs };
  };
  // the crane sets the car down, and the car crosses the line: the lap's clock starts from 0
  try { await page.waitForFunction(() => window.SCRPlay.rt.M[0xC378] === 1, null, { timeout: 60000 }); }
  catch (e) { fail('the car did not reach the line in a minute'); }
  await wait(500);
  const on = await measure(4000);
  if (on.rate < 35 || on.rate > 52) fail('with Fast CPU, ' + on.rate.toFixed(1) + ' passes a second; one a video frame is 50');
  else console.log('ok   with Fast CPU, ' + on.rate.toFixed(1) + ' passes a second');
  if (on.clock < 0.85 || on.clock > 1.1) fail('with Fast CPU, the race\'s clock ran ' + on.clock.toFixed(2) + ' s a second');
  else console.log('ok   with Fast CPU, the race\'s clock ran ' + on.clock.toFixed(2) + ' s a second');
  await page.click('[data-act="fast"]');
  await page.focus('#pl-screen');
  const off = await measure(4000);
  if (off.rate > 8) fail('with Fast CPU off, ' + off.rate.toFixed(1) + ' passes a second; the C64 runs about seven');
  else console.log('ok   with Fast CPU off, ' + off.rate.toFixed(1) + ' passes a second, as the C64 runs them');
  await page.keyboard.up('ArrowUp');
  if (errors.length) fail('the console: ' + errors.join(' | '));
  await stop();
  console.log(fails ? fails + ' failed' : 'all passed');
  process.exitCode = fails ? 1 : 0;
})();
