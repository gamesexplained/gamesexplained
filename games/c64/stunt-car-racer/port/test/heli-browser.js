'use strict';
// The Play tab's Heli Replay in Chromium, on the built page (python3 kit/scripts/build.py first),
// with the page's own refreshes:
// - pressed before a race, it says to start one and plays nothing;
// - in a practice race on Little Ramp, driven forward with the up arrow for a few seconds, it
//   stops the race (the C64's frame stands still), plays the recording from the race's start in
//   real time (SCRChase.draw about every refresh, from the first pictures on), and the view's top
//   row is sky;
// - pressed again, the race goes on from where it stood; left to play, it ends by itself;
// - nothing in the console is an error.
// The menus are run on the page's machine in one go, the page paused, as test_fast.js runs them.
// CI runs it after building the site, with the runner's Chrome; elsewhere it needs Playwright
// (kit/scripts/play_browser.js).
//   node games/c64/stunt-car-racer/port/test/heli-browser.js [built site, _site] [--chromium <path>]
const path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const { start } = require(path.join(ROOT, 'kit/scripts/play_browser.js'));
const PAGE = '/c64/stunt-car-racer/play.html';
const SHOT = process.env.HELI_SHOT;                  // a screenshot of the replay to this file, if set

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
  if (await page.$eval('[data-crt]', b => b.getAttribute('aria-pressed')) === 'true') await page.click('[data-crt]');
  const heli = () => page.$eval('[data-mod="heli"]', b => b.getAttribute('aria-pressed'));

  // before a race: nothing to play
  await page.click('#pl-over button');
  await page.click('[data-mod="heli"]');
  if (await heli() !== 'false' || await page.evaluate(() => !!window.SCRPlay.replay)) fail('before a race, Heli Replay started');
  else console.log('ok   before a race, Heli Replay says to start one');

  // the menus to a practice race, on the page's machine, paused
  await page.click('[data-act="pause"]');
  await page.evaluate(() => {
    const rt = window.SCRPlay.rt, J = { none: 0x1F, fire: 0x0F };
    const tap = (joy, hold = 8, after = 40) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
    const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
    const S = [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...type('A'), ...type('RETURN'), { frames: 200 }, ...tap(J.fire), { frames: 100 },
      ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 600 }, { frames: 180, joy: J.fire }];
    for (const s of S) { rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy; for (let i = 0; i < s.frames; i++) rt.runFrame(); }
    const draw = window.SCRChase.draw;
    window.heliDraws = 0;
    window.SCRChase.draw = (v, s, cam, px) => { if (window.SCRPlay.replay) { window.heliDraws++; window.heliPx = px; } return draw(v, s, cam, px); };
  });
  await page.click('[data-act="pause"]');
  await page.focus('#pl-screen');
  await page.keyboard.down('ArrowUp');
  try { await page.waitForFunction(() => window.SCRPlay.rt.M[0xC378] === 1, null, { timeout: 60000 }); }
  catch (e) { fail('the car did not reach the line in a minute'); }
  await wait(3000);
  await page.keyboard.up('ArrowUp');

  // the replay: the race stands still while the recording plays
  await page.click('[data-mod="heli"]');
  if (await heli() !== 'true') fail('the Heli Replay button does not show it playing');
  const before = await page.evaluate(() => ({ frame: window.SCRPlay.rt.frame, rec: window.SCRPlay.view.rec.length }));
  await wait(3000);
  const during = await page.evaluate(() => {
    const r = window.SCRPlay.replay, px = window.heliPx, sky = [];
    if (px) for (let x = 40; x < 344; x += 8) sky.push(px[36 * 384 + x]);
    return { frame: window.SCRPlay.rt.frame, draws: window.heliDraws, at: r && r.f - r.rec[0].frame, sky: sky.filter(c => c === 14).length / (sky.length || 1) };
  });
  if (SHOT) await (await page.$('#game')).screenshot({ path: SHOT });
  if (during.frame !== before.frame) fail('during the replay the race went on, from frame ' + before.frame + ' to ' + during.frame);
  else console.log('ok   during the replay the race stands still at frame ' + before.frame + ', ' + before.rec + ' pictures recorded');
  if (during.draws < 60) fail('the replay drew ' + during.draws + ' pictures in three seconds');
  else console.log('ok   the replay drew ' + during.draws + ' pictures in three seconds, and is ' + (during.at / 50.12).toFixed(1) + ' s into the race');
  if (during.at < 120 || during.at > 175) fail('three seconds in, the replay is ' + during.at.toFixed(0) + ' frames into the race');
  if (during.sky < 0.9) fail('the view\'s top row is sky in ' + (100 * during.sky).toFixed(0) + ' % of it');
  // pressed again: back to the race, which goes on
  await page.click('[data-mod="heli"]');
  await page.focus('#pl-screen');
  await wait(1000);
  const after = await page.evaluate(() => ({ frame: window.SCRPlay.rt.frame, replay: !!window.SCRPlay.replay }));
  if (after.replay || await heli() !== 'false') fail('pressed again, the replay goes on');
  else if (after.frame - before.frame < 30) fail('after the replay the race moved ' + (after.frame - before.frame) + ' frames in a second');
  else console.log('ok   pressed again, the race goes on');
  // left to play, it ends by itself at the moment it was pressed
  await page.click('[data-mod="heli"]');
  await page.evaluate(() => { const r = window.SCRPlay.replay; r.f = r.end - 25; });
  await wait(1500);
  if (await page.evaluate(() => !!window.SCRPlay.replay)) fail('the replay did not end at the moment it was started');
  else console.log('ok   left to play, the replay ends and the race goes on');
  if (errors.length) fail('the console: ' + errors.join(' | '));
  await stop();
  console.log(fails ? fails + ' failed' : 'all passed');
  process.exitCode = fails ? 1 : 0;
})();
