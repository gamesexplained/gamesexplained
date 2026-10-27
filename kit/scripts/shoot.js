'use strict';
// One picture of each section of a built page, and what the page said on its console, for
// kit/skills/core/70-minisite, "Check it in a browser". A full-page screenshot is blank below the
// first screen, because a game page skips drawing a section that is off the screen
// (content-visibility, site/lib/site.css), so this scrolls each `main > section` into view and
// waits before taking it (#537). Checked by kit/scripts/test_shoot.js.
//
//   node kit/scripts/shoot.js <page url> <output prefix> [--click] [--width 1100] [--height 900]
//                             [--wait 500] [--cdp <url>]
//
// - Each section goes to <output prefix>-01-<name>.png, -02-..., named by its id or its heading.
// - Every console message and page error is printed as it comes, and the run exits 1 when the
//   page threw or logged an error, so one cannot pass unseen.
// - --click first clicks every button in main and steps every select through its options, then
//   sets each select back: a smoke test, since a widget that throws does so on the console.
// - Opened with ?listing-reads (site/lib/listing-reads.js), the page's ListingReads.report() is
//   printed last, after the clicks, since a byte only a click reads is read only then.
// - --width 390 takes the narrow-screen layout.
//
// It needs Playwright (the playwright or playwright-core package), which the kit does not install:
// the hosted containers have it, with its Chromium. Without --cdp it starts that Chromium, with
// its profile and temporary files under tools/shoot/. --cdp <url> drives a Chromium already
// running with a debugging port instead, such as the one KIT_BROWSER_CHROMIUM=<executable>
// python3 kit/scripts/tools.py browser starts at http://127.0.0.1:9222 (kit/INSTALL.md, "Browser
// checks"). Nothing is downloaded. Playwright does not drive the kit's Firefox.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const STATE = path.join(ROOT, 'tools/shoot');
const USAGE = 'usage: node kit/scripts/shoot.js <page url> <output prefix> [--click] [--width 1100] [--height 900] [--wait 500] [--cdp <url>]';

function args(argv) {
  const o = { click: false, width: 1100, height: 900, wait: 500, cdp: null, rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') return null;
    if (a === '--click') o.click = true;
    else if (['--width', '--height', '--wait'].includes(a)) {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 0) throw new Error(`${a} takes a whole number`);
      o[a.slice(2)] = n;
    } else if (a === '--cdp') { o.cdp = argv[++i]; if (!o.cdp) throw new Error('--cdp takes the browser\'s address'); }
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else o.rest.push(a);
  }
  if (o.rest.length !== 2) throw new Error('give a page url and an output prefix');
  [o.url, o.prefix] = o.rest;
  return o;
}

// <prefix>-NN-<id or heading>.png
function file(prefix, n, s) {
  const slug = (s.id || s.heading || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'section';
  return `${prefix}-${String(n).padStart(2, '0')}-${slug}.png`;
}

const sameDoc = (a, b) => a.split('#')[0] === b.split('#')[0];

async function exercise(page, o, say) {
  const start = page.url();
  const buttons = page.locator('main button');
  const nb = await buttons.count();
  let clicked = 0;
  for (let i = 0; i < nb; i++) {
    const b = buttons.nth(i);
    if (!(await b.isVisible().catch(() => false)) || !(await b.isEnabled().catch(() => false))) continue;
    const label = ((await b.textContent().catch(() => '')) || '').trim().slice(0, 30);
    try { await b.click({ timeout: 2000 }); clicked++; }
    catch (e) { say(`could not click button ${i + 1} "${label}": ${String(e.message).split('\n')[0]}`); }
    await page.waitForTimeout(100);
    if (!sameDoc(page.url(), start)) {
      say(`button ${i + 1} "${label}" left the page for ${page.url()}; back to ${start}`);
      await page.goto(start, { waitUntil: 'load' });
    }
  }
  const selects = page.locator('main select');
  const ns = await selects.count();
  let stepped = 0;
  for (let i = 0; i < ns; i++) {
    const s = selects.nth(i);
    if (!(await s.isVisible().catch(() => false)) || !(await s.isEnabled().catch(() => false))) continue;
    const was = await s.inputValue();
    for (const v of await s.evaluate(el => [...el.options].map(x => x.value))) {
      await s.selectOption(v);
      await page.waitForTimeout(100);
    }
    await s.selectOption(was);
    stepped++;
  }
  say(`clicked ${clicked} of ${nb} buttons, stepped ${stepped} of ${ns} selects`);
}

// Drives an open Playwright page: returns the pictures taken and the number of errors
async function shoot(page, o, say = console.log) {
  let errors = 0;
  page.on('console', m => {
    if (m.type() === 'error') errors++;
    const at = m.location && m.location();
    say(`console.${m.type()}: ${m.text()}${at && at.url ? ` (${at.url}:${at.lineNumber + 1})` : ''}`);
  });
  page.on('pageerror', e => { errors++; say(`page error: ${e.message}`); });
  page.on('dialog', d => { say(`dialog (dismissed): ${d.message()}`); d.dismiss().catch(() => {}); });
  await page.goto(o.url, { waitUntil: 'load' });
  if (o.click) await exercise(page, o, say);

  const sections = await page.evaluate(() => [...document.querySelectorAll('main > section')].map(s => {
    const h = s.querySelector('h1, h2, h3');
    return { id: s.id, heading: h ? h.textContent.trim() : '' };
  }));
  fs.mkdirSync(path.dirname(path.resolve(o.prefix)), { recursive: true });
  const files = [];
  if (!sections.length) {
    say('no main > section on the page: one picture of the first screen');
    const f = `${o.prefix}-page.png`;
    await page.screenshot({ path: f });
    files.push(f);
  }
  for (let i = 0; i < sections.length; i++) {
    const s = page.locator('main > section').nth(i);
    await s.evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.waitForTimeout(o.wait);
    const f = file(o.prefix, i + 1, sections[i]);
    await s.screenshot({ path: f });
    files.push(f);
    say(f);
  }

  if (new URL(o.url).searchParams.has('listing-reads')) {
    const r = await page.evaluate(() => (globalThis.ListingReads ? globalThis.ListingReads.report() : null));
    say(r === null ? 'ListingReads.report(): the page has no ListingReads (site/lib/listing-reads.js)'
                   : 'ListingReads.report(): ' + JSON.stringify(r, null, 2));
  }
  say(`${files.length} pictures, ${errors} errors`);
  return { files, errors };
}

function playwright() {
  for (const name of ['playwright', 'playwright-core']) {
    try { return require(name); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  }
  return null;
}

// The launched browser's profile, temporary files and XDG state stay under tools/shoot/
function contain() {
  const env = { ...process.env };
  for (const [k, d] of [['TMPDIR', 'tmp'], ['XDG_CONFIG_HOME', 'config'], ['XDG_CACHE_HOME', 'cache'],
                        ['XDG_DATA_HOME', 'data'], ['XDG_STATE_HOME', 'state']]) {
    env[k] = path.join(STATE, d);
    fs.mkdirSync(env[k], { recursive: true });
  }
  process.env.TMPDIR = env.TMPDIR;     // Playwright makes the profile in os.tmpdir()
  return env;
}

async function main(argv) {
  let o;
  try { o = args(argv); } catch (e) { console.error(`${e.message}\n${USAGE}`); return 2; }
  if (!o) {   // this file's opening comment
    const head = fs.readFileSync(__filename, 'utf8').split('\n').slice(1).filter((l, i, a) => a.slice(0, i + 1).every(x => x.startsWith('//')));
    console.log(head.map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
    return 0;
  }
  const pw = playwright();
  if (!pw) {
    console.error('Playwright is not installed here, and the kit does not install it. Use the session\'s own browser tool, or ask the contributor (kit/INSTALL.md, "Browser checks").');
    return 2;
  }
  let browser;
  try {
    browser = o.cdp ? await pw.chromium.connectOverCDP(o.cdp) : await pw.chromium.launch({ env: contain() });
  } catch (e) {
    console.error(`no browser: ${String(e.message).split('\n')[0]}\nNothing is downloaded. Start one with KIT_BROWSER_CHROMIUM=<executable> python3 kit/scripts/tools.py browser and pass --cdp http://127.0.0.1:9222`);
    return 2;
  }
  try {
    const context = await browser.newContext({ viewport: { width: o.width, height: o.height } });
    const { errors } = await shoot(await context.newPage(), o);
    await context.close();
    return errors ? 1 : 0;
  } finally {
    await browser.close();
  }
}

module.exports = { args, file, shoot };

if (require.main === module) main(process.argv.slice(2)).then(code => process.exit(code), e => { console.error(e); process.exit(2); });
