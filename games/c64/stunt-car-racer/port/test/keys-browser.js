'use strict';
// The Play tab's keys in Chromium, on the built page (python3 kit/scripts/build.py first): real key
// presses and the page's own refreshes.
// - Return pressed for 100 ms picks Single Player League, and the name's prompt that follows waits
//   for a name: the page has let Return go, as a finger would have, so it does not end the name
//   before a letter is typed;
// - A and Return then give the name A;
// - nothing in the console is an error.
// CI runs it after building the site, with the runner's Chrome; elsewhere it needs Playwright
// (kit/scripts/play_browser.js).
//   node games/c64/stunt-car-racer/port/test/keys-browser.js [built site, _site] [--chromium <path>]
const path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const { start } = require(path.join(ROOT, 'kit/scripts/play_browser.js'));
const PAGE = '/c64/stunt-car-racer/play.html';
const FRAME = 63 * 312;

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
  // each name's prompt as it begins and ends, with the name it ends with
  await page.evaluate(() => {
    const rt = window.SCRPlay.rt, P = rt.P, at = P.NAME_ENTRY_AT;
    window.names = [];
    P.NAME_ENTRY_AT = function* (r) {
      const e = {}; window.names.push(e);
      const q = yield* at.call(this, r);
      const a = 0xAE01 + (r.a & 255);
      e.name = String.fromCharCode(...rt.M.slice(a, a + 12)).trim();
      return q;
    };
  });
  // the first menu, Single Player League or Multiplayer, is up by frame 400
  await page.waitForFunction(f => window.SCRPlay.rt.t >= f, 420 * FRAME, { timeout: 120000 });
  await page.focus('#pl-screen');
  await page.keyboard.down('Enter'); await wait(100); await page.keyboard.up('Enter');
  try { await page.waitForFunction(() => window.names.length > 0, null, { timeout: 30000 }); }
  catch (e) { fail('Return at the first menu brought no name\'s prompt'); }
  await wait(2000);
  const after = await page.evaluate(() => window.names.map(e => e.name));
  if (after.length !== 1 || after[0] !== undefined) fail('the name\'s prompt ended before a letter was typed: ' + JSON.stringify(after));
  else console.log('ok   Return picks Single Player League, and the name\'s prompt waits');
  await page.keyboard.down('KeyA'); await wait(100); await page.keyboard.up('KeyA');
  await wait(500);
  await page.keyboard.down('Enter'); await wait(100); await page.keyboard.up('Enter');
  try {
    await page.waitForFunction(() => window.names[0].name !== undefined, null, { timeout: 10000 });
    const name = await page.evaluate(() => window.names[0].name);
    if (name.toUpperCase() !== 'A') fail('A and Return gave the name ' + JSON.stringify(name));
    else console.log('ok   A and Return give the name A');
  } catch (e) { fail('A and Return did not end the name\'s prompt'); }
  if (errors.length) fail('the console: ' + errors.join(' | '));
  await stop();
  console.log(fails ? fails + ' failed' : 'all passed');
  process.exitCode = fails ? 1 : 0;
})();
