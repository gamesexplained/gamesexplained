'use strict';
// A self-test of kit/scripts/shoot.js on a stand-in for a Playwright page, so it needs no browser:
// each section is scrolled into view and waited for before its picture is taken, the pictures are
// named by id or heading, console errors and page errors are counted, --click clicks what can be
// clicked and sets each select back, and ListingReads.report() is read only with ?listing-reads.
// Exits 1 on any failure.  node kit/scripts/test_shoot.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { args, file, shoot } = require('./shoot.js');
let fails = 0;
const check = (what, ok, detail = '') => { if (!ok) { fails++; console.log('FAIL', what, detail); } else console.log('ok  ', what); };

// What the page does is pushed to calls, in order
function fakePage({ sections, buttons = [], selects = [], report = null, onLoad = () => {} }) {
  const calls = [], on = {};
  let url = '';
  const message = (type, text) => ({ type: () => type, text: () => text, location: () => ({ url: 'page.js', lineNumber: 4 }) });
  const page = {
    calls,
    emit: { console: (type, text) => on.console(message(type, text)), error: text => on.pageerror(new Error(text)) },
    on(ev, fn) { on[ev] = fn; },
    url: () => url,
    async goto(u) { calls.push(['goto', u]); url = u; onLoad(page); },
    async waitForTimeout(ms) { calls.push(['wait', ms]); },
    async evaluate(fn) {
      const src = String(fn);
      if (src.includes('main > section')) return sections;
      if (src.includes('requestAnimationFrame')) { calls.push(['frames']); return undefined; }
      if (src.includes('ListingReads')) { calls.push(['report']); return report; }
      throw new Error('the fake page does not know ' + src);
    },
    async screenshot(o) { calls.push(['page', o.path]); },
    locator(sel) {
      if (sel === 'main > section') return { nth: i => ({
        async evaluate() { calls.push(['scroll', i]); },
        async screenshot(o) { calls.push(['shot', i, path.basename(o.path)]); } }) };
      if (sel === 'main button') return { count: async () => buttons.length, nth: i => ({
        isVisible: async () => buttons[i].visible !== false, isEnabled: async () => true,
        textContent: async () => buttons[i].label,
        async click() { calls.push(['click', i]); if (buttons[i].go) url = buttons[i].go; if (buttons[i].throws) throw new Error('covered\nby another'); } }) };
      if (sel === 'main select') return { count: async () => selects.length, nth: i => ({
        isVisible: async () => true, isEnabled: async () => true,
        inputValue: async () => selects[i].value, evaluate: async () => selects[i].options,
        async selectOption(v) { calls.push(['select', i, v]); selects[i].value = v; } }) };
      throw new Error('the fake page has no locator ' + sel);
    },
  };
  return page;
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shoot-'));
const quiet = lines => s => lines.push(s);

(async () => {
  // The options
  const o = args(['http://x/c64/g/index.html', 'out/g', '--click', '--width', '390', '--cdp', 'http://127.0.0.1:9222']);
  check('the options are read', o.url === 'http://x/c64/g/index.html' && o.prefix === 'out/g' && o.click && o.width === 390
    && o.height === 900 && o.wait === 500 && o.cdp === 'http://127.0.0.1:9222');
  check('-h gives the usage', args(['-h']) === null);
  for (const bad of [['only-a-url'], ['u', 'p', '--width', 'wide'], ['u', 'p', '--zoom']]) {
    let threw = false;
    try { args(bad); } catch (e) { threw = true; }
    check(`${bad.join(' ')} is refused`, threw);
  }
  check('a picture is named by its id, else its heading', file('o/g', 3, { id: 'frame', heading: 'The frame' }) === 'o/g-03-frame.png'
    && file('o/g', 12, { id: '', heading: 'Weather & hazards!' }) === 'o/g-12-weather-hazards.png'
    && file('o/g', 1, { id: '', heading: '' }) === 'o/g-01-section.png');

  // Every section is in view, and drawn, before its picture
  {
    const lines = [];
    const page = fakePage({ sections: [{ id: 'frame', heading: '' }, { id: '', heading: 'The map' }],
      onLoad: p => { p.emit.console('log', 'hello'); p.emit.console('error', 'no canvas'); p.emit.error('x is undefined'); } });
    const r = await shoot(page, { url: 'http://x/c64/g/index.html', prefix: path.join(dir, 'g'), wait: 300 }, quiet(lines));
    const seq = page.calls.filter(c => c[0] !== 'goto').map(c => c.join(' '));
    check('each section is scrolled to, given two frames and the wait, then taken',
      seq.join(', ') === 'scroll 0, frames, wait 300, shot 0 g-01-frame.png, scroll 1, frames, wait 300, shot 1 g-02-the-map.png', seq.join(', '));
    check('two errors are counted: the console\'s and the page\'s', r.errors === 2 && r.files.length === 2, JSON.stringify(r));
    check('every console message is printed, with where it came from', lines.includes('console.log: hello (page.js:5)')
      && lines.includes('console.error: no canvas (page.js:5)') && lines.includes('page error: x is undefined'), lines.join('\n'));
    check('without ?listing-reads the report is not read', !page.calls.some(c => c[0] === 'report'));
  }

  // --click, then the pictures, then the report
  {
    const lines = [];
    const page = fakePage({ sections: [{ id: 'run', heading: '' }],
      buttons: [{ label: 'Play' }, { label: 'Hidden', visible: false }, { label: 'Covered', throws: true }, { label: 'Elsewhere', go: 'http://x/c64/g/levels.html' }, { label: 'Top', go: 'http://x/c64/g/index.html?listing-reads#top' }],
      selects: [{ value: 'b', options: ['a', 'b', 'c'] }],
      report: { 'listing.json': { ranges: [], labels: [], where: {} } } });
    const url = 'http://x/c64/g/index.html?listing-reads';
    const r = await shoot(page, { url, prefix: path.join(dir, 'g'), wait: 0, click: true }, quiet(lines));
    const did = page.calls.map(c => c.join(' '));
    check('every visible button is clicked', ['click 0', 'click 2', 'click 3', 'click 4'].every(c => did.includes(c)) && !did.includes('click 1'), did.join(', '));
    check('a button that leaves the page is followed by a return to it, a #fragment is not',
      did.filter(c => c === `goto ${url}`).length === 2, did.join(', '));
    check('a button that cannot be clicked is reported', lines.some(l => l.startsWith('could not click button 3 "Covered": covered')), lines.join('\n'));
    check('a select is stepped through its options and set back', did.filter(c => c.startsWith('select')).join(', ') === 'select 0 a, select 0 b, select 0 c, select 0 b');
    check('the clicks come before the pictures, the report after them',
      did.indexOf('click 4') < did.indexOf('scroll 0') && did.indexOf('shot 0 g-01-run.png') < did.indexOf('report'), did.join(', '));
    check('the report is printed', lines.some(l => l.startsWith('ListingReads.report(): {')), lines.join('\n'));
    check('no errors', r.errors === 0);
  }

  // A page with no sections
  {
    const lines = [];
    const page = fakePage({ sections: [] });
    const r = await shoot(page, { url: 'http://x/about.html', prefix: path.join(dir, 'about'), wait: 0 }, quiet(lines));
    check('a page with no sections gets one picture of its first screen', r.files.length === 1 && page.calls.some(c => c[0] === 'page' && c[1].endsWith('about-page.png')));
  }

  fs.rmSync(dir, { recursive: true, force: true });
  if (fails) { console.log(`${fails} failed`); process.exit(1); }
  console.log('all passed');
})().catch(e => { console.error(e); process.exit(1); });
