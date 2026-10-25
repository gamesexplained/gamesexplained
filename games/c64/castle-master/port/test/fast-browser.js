'use strict';
// The Play tab's Fast CPU in Chromium, on the built page (python3 kit/scripts/build.py first):
// real key presses, the page's own refreshes.
// - after forward has been held and let go, the view stops at the first refresh after the key
//   comes up;
// - at every Speed, presses of U from 80 to 400 ms turn you about once;
// - nothing in the console is an error.
// It needs Playwright and its Chromium (require('playwright')), which CI does not install, so it is
// run by hand rather than by kit/scripts/test_kit.py.
//   node games/c64/castle-master/port/test/fast-browser.js [built site, _site]
const fs = require('fs'), http = require('http'), path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const SITE = path.resolve(process.argv[2] || path.join(ROOT, '_site'));
const PAGE = '/c64/castle-master/play.html';
if (!fs.existsSync(path.join(SITE, PAGE))) { console.log('FAIL: no ' + PAGE + ' in ' + SITE + ': build the site first (python3 kit/scripts/build.py)'); process.exit(1); }
const { chromium } = require('playwright');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(SITE, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(SITE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  // the fonts are the only thing from elsewhere: answered empty, off the network
  await page.route(u => !u.href.startsWith('http://127.0.0.1'), r => r.fulfill({ status: 200, body: '' }));
  await page.goto('http://127.0.0.1:' + server.address().port + PAGE);
  // the CRT screen off: without a graphics card its shader would hold the refreshes to a few a second
  if (await page.$eval('[data-crt]', b => b.getAttribute('aria-pressed')) === 'true') await page.click('[data-crt]');
  await page.click('#pl-over button');
  // through the title, the language and the character to the Wilderness, as test_play.js does
  await page.evaluate(() => {
    const rt = window.CMPlay.rt;
    const run = (n, keys = []) => { rt.input.keys = new Set(keys); for (let i = 0; i < n; i++) rt.runFrame(); rt.input.keys = new Set(); };
    const tap = (k, hold, after) => { run(hold, [k]); run(after); };
    run(60); tap('1', 6, 54); tap('RETURN', 6, 54); tap('2', 6, 54); tap('RETURN', 6, 454); tap('SPACE', 6, 300);
  });
  // each refresh, as the page runs it: the time, the loops, where the player stands and faces; and
  // when each key went up
  await page.evaluate(() => {
    const rt = window.CMPlay.rt, M = rt.M, run = window.FastCPU.run;
    window.__log = []; window.__ups = [];
    window.FastCPU.run = function (fx, ms, between) {
      const n = run(fx, ms, between);
      window.__log.push({ at: performance.now(), n, ticks: rt.ticks, joy: rt.input.joy, keys: [...rt.input.keys].join(), x: M[0x2407] | M[0x2408] << 8, z: M[0x240B] | M[0x240C] << 8, yaw: M[0x2411] + rt.P.plug.frac(0x2411) });
      return n;
    };
    document.addEventListener('keyup', e => window.__ups.push({ code: e.code, at: performance.now() }), true);
  });
  // the Speed slider turns Fast CPU on
  await page.$eval('#pl-speed', el => { el.value = '0'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  const on = await page.$eval('[data-act="fast"]', b => b.getAttribute('aria-pressed'));
  if (on !== 'true') fail('the Speed slider left Fast CPU ' + on);
  await page.focus('#pl-screen');
  await wait(500);

  // forward held and let go
  const log = async () => page.evaluate(() => { const l = window.__log; window.__log = []; return l; });
  const ups = async () => page.evaluate(() => { const u = window.__ups; window.__ups = []; return u; });
  await log(); await ups();
  await page.keyboard.down('ArrowUp'); await wait(1000); await page.keyboard.up('ArrowUp'); await wait(500);
  {
    const l = await log(), up = (await ups()).find(u => u.code === 'ArrowUp');
    const before = l.filter(r => r.at < up.at), after = l.filter(r => r.at > up.at);
    const moved = before.length > 1 && (before[before.length - 1].x !== before[0].x || before[before.length - 1].z !== before[0].z);
    const last = before[before.length - 1], still = after.every(r => r.x === last.x && r.z === last.z);
    if (!moved || !still) fail('forward let go: the walk ' + (moved ? 'moved' : 'did not move') + ', and after the key came up ' + after.filter(r => r.x !== last.x || r.z !== last.z).length + ' of ' + after.length + ' refreshes moved on');
    else console.log('forward let go: ' + before.length + ' refreshes (' + before.reduce((a, r) => a + r.n, 0) + ' loops) walking, then from the first refresh after the key came up the view stays where it was (' + after.length + ' refreshes)');
  }

  // U, pressed 80 to 400 ms, at every Speed
  const speeds = await page.$eval('#pl-speed', el => +el.max + 1);
  for (let s = 0; s < speeds; s++) {
    await page.$eval('#pl-speed', (el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, s);
    await page.focus('#pl-screen');
    const name = await page.$eval('#pl-speed-v', o => o.textContent);
    const bad = [];
    for (const ms of [80, 150, 250, 400]) {
      // the refreshes from the last before the key went down
      await wait(300);
      const was = (await log()).pop();
      await page.keyboard.down('KeyU'); await wait(ms); await page.keyboard.up('KeyU'); await wait(600);
      const l = [was, ...await log()];
      let turns = 0;
      for (let i = 1; i < l.length; i++) if (Math.floor(l[i].yaw) !== Math.floor(l[i - 1].yaw)) turns++;
      const by = l.length ? ((Math.floor(l[l.length - 1].yaw) - Math.floor(l[0].yaw)) % 72 + 72) % 72 : 0;
      if (turns !== 1 || by !== 36) bad.push(ms + ' ms: ' + turns + ' turns, by ' + by + (process.env.VERBOSE ? ' ' + JSON.stringify(l) : ''));
    }
    if (bad.length) fail('U at ' + name + ': ' + bad.join('; '));
    else console.log('U at ' + name + ': presses of 80, 150, 250 and 400 ms each turn about once');
  }

  if (errors.length) fail('the console: ' + errors.slice(0, 3).join(' | '));
  else console.log('the console: no errors');
  await browser.close();
  server.close();
  if (fails) { console.log(fails + ' failed'); process.exit(1); }
  console.log('ok');
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
