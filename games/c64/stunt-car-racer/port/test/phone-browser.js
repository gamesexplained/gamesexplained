'use strict';
// The Play tab on a phone in Chromium (a touch screen 390 by 844), on the built page (python3
// kit/scripts/build.py first), with the page's own refreshes:
// - the buttons are right under the picture, over the touch joystick and the keys to tap;
// - in the menus the pad's fire is fire alone;
// - in a practice race on Little Ramp the pad's fire is fire with the stick forward, the boost
//   forward ($66 = 1 + 16, READ_CONTROLS), and fire with the stick back stays the boost back
//   ($66 = 2 + 16);
// - nothing in the console is an error.
// The menus are run on the page's machine in one go, the page paused, as test_fast.js runs them.
// CI runs it after building the site, with the runner's Chrome; elsewhere it needs Playwright
// (kit/scripts/play_browser.js).
//   node games/c64/stunt-car-racer/port/test/phone-browser.js [built site, _site] [--chromium <path>]
const path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const { start } = require(path.join(ROOT, 'kit/scripts/play_browser.js'));
const PAGE = '/c64/stunt-car-racer/play.html';

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const { browser, base, stop } = await start(process.argv.slice(2));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  // the fonts are the only thing from elsewhere: answered empty, off the network
  await page.route(u => !u.href.startsWith('http://127.0.0.1'), r => r.fulfill({ status: 200, body: '' }));
  await page.goto(base + PAGE);
  // the CRT screen off: without a graphics card its shader would hold the refreshes to a few a second
  if (await page.$eval('[data-crt]', b => b.getAttribute('aria-pressed')) === 'true') await page.click('[data-crt]');

  // the order down the page: the picture, the buttons, the joystick, the keys
  const order = await page.evaluate(() => {
    const at = e => e ? e.getBoundingClientRect().top + scrollY : NaN;
    return { screen: at(document.getElementById('pl-screen')), bar: at(document.getElementById('pl-bar')), pad: at(document.querySelector('.pc.pc-touch')), keys: at(document.getElementById('pl-keys')) };
  });
  if (!(order.screen < order.bar && order.bar < order.pad && order.pad < order.keys)) fail('down the page: ' + JSON.stringify(order));
  else console.log('ok   the buttons are right under the picture, over the joystick and the keys');

  // a finger on the pad's fire, or on the joystick low down, put there and lifted as touches are
  const touch = (sel, down, id, low) => page.evaluate(([sel, down, id, low]) => {
    const e = document.querySelector(sel), b = e.getBoundingClientRect();
    e.dispatchEvent(new PointerEvent(down ? 'pointerdown' : 'pointerup', { bubbles: true, pointerId: id, pointerType: 'touch',
      clientX: b.left + b.width / 2, clientY: low ? b.bottom - 6 : b.top + b.height / 2 }));
  }, [sel, down, id, low]);
  const reads = () => page.evaluate(() => window.SCRPlay.rt.M[0x66]);
  await page.click('#pl-over button');
  await page.click('[data-act="pause"]');
  // the menus to a practice race, on the page's machine, paused; then the race let go
  await page.evaluate(() => {
    const rt = window.SCRPlay.rt, J = { none: 0x1F, fire: 0x0F };
    const tap = (joy, hold = 8, after = 40) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
    const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
    const S = [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...type('A'), ...type('RETURN'), { frames: 200 }, ...tap(J.fire), { frames: 100 },
      ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 600 }];
    for (const s of S) { rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy; for (let i = 0; i < s.frames; i++) rt.runFrame(); }
  });
  await page.click('[data-act="pause"]');
  if (!await page.evaluate(() => !!(window.SCRPlay.rt.M[0x3DF8] & 0x80))) fail('the practice race has not begun');
  // the boost forward: fire alone
  await touch('.pc-fire', true, 5); await wait(600);
  const forward = await reads();
  await touch('.pc-fire', false, 5); await wait(600);
  if (forward !== (1 | 16)) fail('in a race, the pad\'s fire gives $66 = ' + forward);
  else console.log('ok   in a race, the pad\'s fire is fire with the stick forward, the boost forward');
  // the boost back: the stick back with fire
  await touch('.pc-pad', true, 7, true);
  await touch('.pc-fire', true, 5); await wait(600);
  const back = await reads();
  await touch('.pc-fire', false, 5); await touch('.pc-pad', false, 7);
  if (back !== (2 | 16)) fail('in a race, the stick back with fire gives $66 = ' + back);
  else console.log('ok   in a race, the stick back with fire stays the boost back');
  // started again, in the main menu: fire alone
  await page.click('[data-act="restart"]');
  await wait(500);
  await touch('.pc-fire', true, 5); await wait(100);
  const menu = await page.evaluate(() => ({ joy: window.SCRPlay.rt.input.joy, race: !!(window.SCRPlay.rt.M[0x3DF8] & 0x80) }));
  await touch('.pc-fire', false, 5);
  if (menu.race || menu.joy !== 0x0F) fail('in the menus, the pad\'s fire gives the stick ' + menu.joy.toString(16) + (menu.race ? ', in a race' : ''));
  else console.log('ok   in the menus, the pad\'s fire is fire alone');
  if (errors.length) fail('the console: ' + errors.join(' | '));
  await stop();
  console.log(fails ? fails + ' failed' : 'all passed');
  process.exitCode = fails ? 1 : 0;
})();
