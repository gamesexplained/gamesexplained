'use strict';
// The Opponents tab in Chromium, on the built page (python3 kit/scripts/build.py first), on a
// desktop screen and on a phone (390 by 844, touch):
// - every widget draws: the eight pictures hold more than one colour, the seven charts a line or
//   bars, and the readouts say something;
// - the 3D view of the computer's car on its springs moves while it plays, and another run-up
//   changes what its readout says; a click on it stops it, the game's view of the car draws
//   another picture, and on the banked bend the run-up buttons are off;
// - Fast CPU on the springs draws seven times as many points on the chart;
// - picking a row of the drivers' table puts that driver's car on its own line;
// - dragging the computer's car on the map of racing lines changes what the readout says;
// - Swerve now starts a swerve, and the pictures of the car turn;
// - on the phone the page is no wider than the screen;
// - nothing in the console is an error.
// CI runs it after building the site, with the runner's Chrome; elsewhere it needs Playwright
// (kit/scripts/play_browser.js).
//   node games/c64/stunt-car-racer/port/test/opponents-browser.js [built site, _site] [--chromium <path>]
const path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const { start } = require(path.join(ROOT, 'kit/scripts/play_browser.js'));
const PAGE = '/c64/stunt-car-racer/opponents.html';
const CANVASES = ['op-mv-cv', 'op-map', 'op-sw-cv', 'op-dr-cv', 'op-bo-cv', 'op-bu-cv', 'op-tow', 'op-ln-cv'];
const CHARTS = ['op-mv-chart', 'op-mv-springs', 'op-dr-chart', 'op-bo-chart', 'op-en-chart', 'op-tow-chart', 'op-li-chart'];
const READS = ['op-mv-read', 'op-read', 'op-sw-read', 'op-bu-read', 'op-en-read', 'op-tow-read', 'op-li-read', 'op-ln-read'];

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const wait = ms => new Promise(r => setTimeout(r, ms));

async function look(browser, base, name, opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  // the fonts are the only thing from elsewhere: answered empty, off the network
  await page.route(u => !u.href.startsWith('http://127.0.0.1'), r => r.fulfill({ status: 200, body: '' }));
  await page.goto(base + PAGE);
  await page.waitForFunction(() => document.getElementById('op-read').textContent.length > 0, null, { timeout: 60000 });
  // each widget draws while it is on the screen: scroll past them all
  for (const id of CANVASES.concat(CHARTS)) { await page.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(250); }
  const drawn = await page.evaluate(ids => ids.map(id => {
    const c = document.getElementById(id), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, seen = new Set();
    for (let i = 0; i < d.length && seen.size < 3; i += 4 * 37) seen.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]);
    return [id, seen.size];
  }), CANVASES);
  for (const [id, n] of drawn) if (n < 2) fail(name + ': #' + id + ' is one colour');
  const charts = await page.evaluate(ids => ids.map(id => [id, document.getElementById(id).querySelectorAll('path, rect:not(.op-hit)').length]), CHARTS);
  for (const [id, n] of charts) if (!n) fail(name + ': #' + id + ' draws nothing');
  const reads = await page.evaluate(ids => ids.map(id => [id, document.getElementById(id).textContent.trim()]), READS);
  for (const [id, t] of reads) if (!t) fail(name + ': #' + id + ' says nothing');

  // the car on its springs: the picture changes as it plays, and the run-up of 45 says another
  // highest point
  const hash = id => page.$eval('#' + id, c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1]) | 0; return h; });
  await page.$eval('#op-mv-cv', e => e.scrollIntoView({ block: 'center' }));
  const views = [];
  for (let i = 0; i < 4; i++) { await wait(300); views.push(await hash('op-mv-cv')); }
  if (new Set(views).size < 3) fail(name + ': the springs\' picture changed ' + (new Set(views).size - 1) + ' times in four looks');
  const jumpRead = await page.$eval('#op-mv-read', e => e.textContent);
  await page.locator('#op-mv-speeds button', { hasText: /^45$/ }).click();
  await wait(300);
  if (await page.$eval('#op-mv-read', e => e.textContent) === jumpRead) fail(name + ': a run-up of 45 leaves the readout at "' + jumpRead + '"');
  // a click on the picture stops it; the game's view of the car is another picture
  await page.click('#op-mv-cv');
  const still = await hash('op-mv-cv');
  await wait(600);
  if (await hash('op-mv-cv') !== still) fail(name + ': the springs\' picture moves on after a click on it');
  await page.click('#op-mv-game');
  await wait(200);
  if (await hash('op-mv-cv') === still) fail(name + ': "As the game draws it" leaves the picture as it was');
  await page.click('#op-mv-on');
  await page.click('#op-mv-bend');
  const off = await page.$$eval('#op-mv-speeds button', bs => bs.filter(b => !b.disabled).length);
  if (off) fail(name + ': on the banked bend ' + off + ' run-up buttons are still on');
  await page.click('#op-mv-jump');

  // Fast CPU on the springs: seven points a pass on the chart, each line's path longer
  const points = () => page.$eval('#op-dr-chart', s => Math.max(0, ...[...s.querySelectorAll('path')].map(p => (p.getAttribute('d') || '').split(/[LM]/).length)));
  await page.$eval('#op-dr-fast', e => e.scrollIntoView({ block: 'center' }));
  await page.click('#op-dr-fast');
  await wait(1500);
  const fast = await points();
  if (fast < 14) fail(name + ': with Fast CPU the springs\' chart has ' + fast + ' points after 1.5 seconds');

  // the drivers' own lines: a row picked names its driver, and the car moves to its line
  await page.click('#drivers .op-tbl tr:nth-child(3) td');
  await page.$eval('#op-ln-cv', e => e.scrollIntoView({ block: 'center' }));
  await wait(1000);
  const lane = await hash('op-ln-cv');
  await wait(600);
  const whizz = await page.$eval('#op-ln-read', e => e.textContent);
  if (!/^Whizz Kid drives at \$BF/.test(whizz)) fail(name + ': picking Whizz Kid\'s row says "' + whizz + '"');
  if (await hash('op-ln-cv') === lane) fail(name + ': the drivers\' picture does not move');

  // the map: the computer's car dragged from ahead of the player to behind it
  const map = await page.$('#op-map');
  await map.scrollIntoViewIfNeeded();
  await wait(1000);                                 // the scroll is smooth: the map where it stops
  const box = await map.boundingBox(), before = await page.$eval('#op-read', e => e.textContent);
  const at = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
  await page.mouse.move(...at(0.35, 0.25)); await page.mouse.down();
  await page.mouse.move(...at(0.35, 0.6), { steps: 4 }); await page.mouse.move(...at(0.3, 0.92), { steps: 4 }); await page.mouse.up();
  await wait(300);
  const after = await page.$eval('#op-read', e => e.textContent);
  if (after === before) fail(name + ': dragging the computer\'s car leaves the readout at "' + before + '"');

  // a swerve: the picture of the car changes from pass to pass
  await page.$eval('#op-sw-go', e => e.scrollIntoView({ block: 'center' }));
  await page.click('#op-sw-go');
  const shots = [];
  for (let i = 0; i < 4; i++) {
    await wait(300);
    shots.push(await hash('op-sw-cv'));
  }
  if (new Set(shots).size < 3) fail(name + ': the swerve\'s picture changed ' + (new Set(shots).size - 1) + ' times in four looks');

  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  if (opts.isMobile && wide > opts.viewport.width) fail(name + ': the page is ' + wide + ' wide on a screen of ' + opts.viewport.width);
  for (const e of errors) fail(name + ': console: ' + e);
  await ctx.close();
  return !fails;
}

(async () => {
  const { browser, base, stop } = await start(process.argv.slice(2));
  try {
    if (await look(browser, base, 'desktop', { viewport: { width: 1280, height: 900 } }))
      console.log('ok   on a desktop screen every widget draws, the springs\' picture moves and stops, the map\'s readout follows a drag, a swerve turns the car and a driver\'s row puts its car on its line');
    const was = fails;
    await look(browser, base, 'phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    if (fails === was) console.log('ok   on a phone the same, and the page is no wider than the screen');
  } finally { await stop(); }
  console.log(fails ? fails + ' failed' : 'all passed');
  process.exitCode = fails ? 1 : 0;
})().catch(e => { console.log('FAIL', e.message); process.exitCode = 1; });
