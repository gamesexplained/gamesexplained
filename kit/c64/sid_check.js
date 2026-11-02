'use strict';
// Every SID music player on the built site, played. Each button of every C64Sid.mount
// (site/lib/sid.js) is started as a reader's click starts it, through the player's own
// AudioWorklet, in an OfflineAudioContext that renders --seconds of its sound (10 by default) in
// a fraction of that. A button fails when
// - its driver stops in the worklet, which runs createDriver from its source text alone and has
//   none of the page's names (the page's console then says "C64Sid: the sound driver stopped"), or
// - nothing is heard: no voice's envelope is above 0 while the chip's volume is above 0, and the
//   output never moves. Most often the game sets the volume ($D418) once, at start-up, outside
//   its driver, and the page's driver leaves that step out: its writes match the game's frame by
//   frame, and the chip, at volume 0, plays none of them.
// A button whose label says it is silent ("Silent ...", "... (silent)") may be.
//
//   node kit/c64/sid_check.js [<site>] [<page> ...] [--seconds 10] [--jobs 4] [--chromium <path>]
//                             [--cdp <url>]
//
// <site> is the built site's folder (_site, from kit/scripts/build.py), served here on a free
// port of 127.0.0.1. <page> is a path under it, such as c64/<slug>/index.html; with none, every
// game page that loads lib/sid.js. Exits 1 on a failing button. It needs Playwright (the
// playwright or playwright-core package), which the kit does not install, as kit/scripts/shoot.js
// does: --chromium <path> launches that browser, --cdp <url> drives one already running, and with
// neither it launches Playwright's own. CI installs playwright-core and passes the runner's Chrome.
// Checked by kit/c64/test_sid_check.js.
const fs = require('fs');
const http = require('http');
const path = require('path');

const USAGE = 'usage: node kit/c64/sid_check.js [<site>] [<page> ...] [--seconds 10] [--jobs 4] [--chromium <path>] [--cdp <url>]';
const RATE = 22050;
const MOVES = 0.01;            // output that never spans more than this has not sounded

function args(argv) {
  const o = { site: null, pages: [], seconds: 10, jobs: 4, chromium: null, cdp: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') return null;
    if (['--seconds', '--jobs', '--chromium', '--cdp'].includes(a)) {
      const v = argv[++i];
      if (v === undefined) throw new Error(a + ' needs a value');
      const k = a.slice(2);
      o[k] = k === 'seconds' || k === 'jobs' ? Number(v) : v;
      if ((k === 'seconds' || k === 'jobs') && !(o[k] > 0)) throw new Error(a + ' needs a number above 0');
    } else if (a.startsWith('--')) throw new Error('unknown option ' + a);
    else if (o.site === null && !a.endsWith('.html')) o.site = a;
    else o.pages.push(a);
  }
  o.site = path.resolve(o.site || '_site');
  return o;
}

// The game pages under the site that load the SID player
function pagesWithSid(site) {
  const out = [];
  for (const platform of fs.readdirSync(site, { withFileTypes: true })) {
    if (!platform.isDirectory()) continue;
    for (const slug of fs.readdirSync(path.join(site, platform.name), { withFileTypes: true })) {
      if (!slug.isDirectory()) continue;
      const dir = path.join(site, platform.name, slug.name);
      for (const f of fs.readdirSync(dir).sort()) {
        if (f.endsWith('.html') && /lib\/sid\.js/.test(fs.readFileSync(path.join(dir, f), 'utf8'))) {
          out.push([platform.name, slug.name, f].join('/'));
        }
      }
    }
  }
  return out.sort();
}

// What one button's run found, as a line: null when it sounded or its label says it is silent
function verdict(r, seconds) {
  if (r.error) return 'the driver stopped in the AudioWorklet: ' + r.error;
  if (r.heard || r.moves >= MOVES) return null;
  if (/\bsilen(t|ce)\b/i.test(r.name)) return null;
  if (r.env && !r.vol) return `silent: its voices play, but the chip's volume ($D418) stays at 0 for ${seconds} s`;
  if (!r.env) return `silent: no voice's envelope rises in ${seconds} s`;
  return `silent for ${seconds} s`;
}

// Added to the player's worklet module (C64Sid.worklet): the player's own processor, started on
// the tune given, which tells the page once a voice is heard (its envelope above 0 with the
// chip's volume above 0), and the first time the volume or an envelope leaves 0
const CHECKER = `
class C64SidCheck extends C64SidProcessor {
  constructor(o) {
    super(o);
    this.said = { heard: false, vol: false, env: false };
    if (this.p) try { this.p.command({ cmd: 'start', tune: o.processorOptions.tune }); } catch (err) { this.fail(err); }
  }
  tell(k) { if (!this.said[k]) { this.said[k] = true; this.port.postMessage({ [k]: true }); } }
  process(inputs, outputs) {
    const go = super.process(inputs, outputs);
    if (this.p) {
      const vol = this.p.drv.sid[24] & 15, env = this.p.sid.V.some((v) => v.env > 0);
      if (vol) this.tell('vol');
      if (env) this.tell('env');
      if (vol && env) this.tell('heard');
    }
    return go;
  }
}
registerProcessor('c64-sid-check', C64SidCheck);`;

// Before the page's scripts: note every player the page mounts, with the options it passes
const CATCH = `(() => {
  const mounts = window.__sidMounts = [];
  let S;
  Object.defineProperty(globalThis, 'C64Sid', { configurable: true, get() { return S; }, set(x) {
    S = x;
    if (x && typeof x.mount === 'function' && !x.mount.caught) {
      const mount = x.mount;
      x.mount = function (root, o) { mounts.push({ id: root && root.id || '', o }); return mount.apply(this, arguments); };
      x.mount.caught = true;
    }
  } });
})();`;

// In the page: every button of every player it mounted, rendered through the worklet
async function inPage({ checker, seconds, rate }) {
  const out = [];
  for (const { id, o } of window.__sidMounts) {
    if (!o || typeof o.driver !== 'function') continue;
    const opts = { gain: o.gain, filter: ['6581', '8580'].includes(o.filter) ? o.filter : 'none', ntsc: !!o.ntsc,
      period: o.period, digi: o.digi };
    const url = URL.createObjectURL(new Blob([C64Sid.worklet(o.driver) + checker], { type: 'text/javascript' }));
    for (let t = 0; t < o.tunes.length; t++) {
      const r = { id, t, name: String(o.tunes[t]), error: null, heard: false, vol: false, env: false, moves: 0 };
      try {
        const ctx = new OfflineAudioContext(1, Math.round(rate * seconds), rate);
        await ctx.audioWorklet.addModule(url);
        const node = new AudioWorkletNode(ctx, 'c64-sid-check', { numberOfInputs: 0, outputChannelCount: [1],
          processorOptions: { data: o.data, opts, frames: false, tune: t } });
        node.port.onmessage = (e) => {
          if (e.data && e.data.driverError) r.error = r.error || e.data.driverError;
          else if (e.data) for (const k of ['heard', 'vol', 'env']) if (e.data[k]) r[k] = true;
        };
        node.connect(ctx.destination);
        const x = (await ctx.startRendering()).getChannelData(0);
        await new Promise((go) => setTimeout(go, 30));          // the worklet's last messages
        let lo = x[0], hi = x[0];
        for (let i = 1; i < x.length; i++) { if (x[i] < lo) lo = x[i]; else if (x[i] > hi) hi = x[i]; }
        r.moves = hi - lo;
      } catch (e) { r.error = 'the check could not run it: ' + e.message; }
      out.push(r);
    }
    URL.revokeObjectURL(url);
  }
  return out;
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.txt': 'text/plain' };
function serve(site) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(site, p);
    if (!f.startsWith(site + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (err, body) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      res.end(body);
    });
  });
  return new Promise((go) => server.listen(0, '127.0.0.1', () => go(server)));
}

function playwright() {
  for (const name of ['playwright', 'playwright-core']) {
    try { return require(name); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  }
  return null;
}

async function checkPage(context, base, p, seconds) {
  const page = await context.newPage();
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e.message).split('\n')[0]));
  try {
    await page.addInitScript(CATCH);
    await page.goto(base + p, { waitUntil: 'load', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(300);
    const runs = await page.evaluate(inPage, { checker: CHECKER, seconds, rate: RATE });
    return { p, runs, thrown };
  } catch (e) {
    return { p, runs: [], thrown, failed: String(e.message).split('\n')[0] };
  } finally {
    await page.close();
  }
}

async function main(argv) {
  let o;
  try { o = args(argv); } catch (e) { console.error(`${e.message}\n${USAGE}`); return 2; }
  if (!o) {   // this file's opening comment
    const head = fs.readFileSync(__filename, 'utf8').split('\n').slice(1);
    console.log(head.slice(0, head.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    return 0;
  }
  if (!fs.existsSync(o.site)) { console.error(`no site at ${o.site}: build it with python3 kit/scripts/build.py\n${USAGE}`); return 2; }
  const pages = o.pages.length ? o.pages : pagesWithSid(o.site);
  const pw = playwright();
  if (!pw) {
    console.error('Playwright is not installed here, and the kit does not install it (kit/INSTALL.md, "Browser checks").');
    return 2;
  }
  let browser;
  try {
    browser = o.cdp ? await pw.chromium.connectOverCDP(o.cdp)
      : await pw.chromium.launch(o.chromium ? { executablePath: o.chromium } : {});
  } catch (e) {
    console.error(`no browser: ${String(e.message).split('\n')[0]}`);
    return 2;
  }
  const server = await serve(o.site);
  const base = `http://127.0.0.1:${server.address().port}/`;
  let buttons = 0, players = 0, bad = 0, atZero = false;
  try {
    const context = await browser.newContext();
    const queue = pages.slice(), done = new Map();
    let next = 0;
    const report = () => {   // in the pages' order, as each is ready
      while (next < pages.length && done.has(pages[next])) {
        const { p, runs, thrown, failed } = done.get(pages[next++]);
        const lines = [];
        if (failed) { bad++; lines.push('  x  the page did not load: ' + failed); }
        for (const r of runs) {
          const why = verdict(r, o.seconds);
          if (why) { bad++; atZero = atZero || /\(\$D418\) stays at 0/.test(why); lines.push(`  x  ${r.id ? '#' + r.id + ' ' : ''}"${r.name}": ${why}`); }
        }
        players += runs.filter((r) => r.t === 0).length; buttons += runs.length;
        if (runs.length || lines.length) {
          console.log(`${lines.length ? 'FAIL' : 'ok  '} ${p}: ${runs.length} buttons` + (thrown.length ? ` (the page threw: ${thrown[0]})` : ''));
          for (const l of lines) console.log(l);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(o.jobs, pages.length) }, async () => {
      while (queue.length) {
        const p = queue.shift();
        done.set(p, await checkPage(context, base, p, o.seconds));
        report();
      }
    }));
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }
  if (atZero) console.log('A button whose voices play at volume 0 most often needs the step where the game sets $D418, once, ' +
    'at start-up, outside its driver: find the write (the register census) and run that step before each button.');
  console.log(`${pages.length} pages, ${players} players, ${buttons} buttons, ${o.seconds} s each: ` +
    (bad ? `${bad} failing` : 'every button sounds, or says it is silent'));
  return bad ? 1 : 0;
}

module.exports = { args, pagesWithSid, verdict, CHECKER, CATCH, MOVES };

if (require.main === module) main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(e); process.exit(2); });
