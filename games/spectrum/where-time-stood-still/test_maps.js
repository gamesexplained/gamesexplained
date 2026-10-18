'use strict';
// The areas the Maps tab draws, and the view the How it works page rebuilds. Each area's map is
// what the game's own load_area ($87CF) builds in bank 0 ($C000-$C8EF) and the operand it writes at
// $9C13, run here on the kit's Z80 from the parts' listings with the 128K's paging; the pages embed
// them in <script id="wtss-areas">, and this test fails if those differ. The pages' renderer, the
// block /* wtss-view */, is then held to the game's draw_view ($A012) run on the same machine: the
// view of the start of play, and a view in every area, pixel for pixel.
// node games/spectrum/where-time-stood-still/test_maps.js [--write]   (--write updates the pages)
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..', '..');
const { game } = require(path.join(ROOT, 'kit', 'scripts', 'port_check.js'));
const g = game(__dirname);
const machine = () => require('./wtss_machine.js').machine(g);

function bankOf(part) {
  const a = new Uint8Array(0x4000), r = g.listing(`parts/${part}/listing.json`).ram;
  a.set(r.subarray(0xC000));
  return a;
}
// Areas 12 and 15 have no scenery record: bank 7's words for them point into the ROM ($DB00).
const AREAS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14];
function area(n) {
  const M = machine();
  M.mem[0x8D1F] = n;
  M.call(0x87CF);
  M.page(0);
  return { M, data: { split: M.mem[0x9C13], b0: Buffer.from(M.mem.subarray(0xC000, 0xC8F0)).toString('base64') } };
}

const built = {}, machines = {};
for (const n of AREAS) { const a = area(n); built[n] = a.data; machines[n] = a.M; }
const RE = /(<script type="application\/json" id="wtss-areas">)([\s\S]*?)(<\/script>)/;
const PAGES = { 'levels.html': AREAS, 'index.html': [13] };
const want = page => Object.fromEntries(PAGES[page].map(n => [n, built[n]]));
if (process.argv.includes('--write')) {
  for (const page of Object.keys(PAGES)) {
    const file = path.join(__dirname, page), html = fs.readFileSync(file, 'utf8');
    if (!RE.test(html)) { console.log(`FAIL ${page} has no <script type="application/json" id="wtss-areas">`); process.exit(1); }
    fs.writeFileSync(file, html.replace(RE, (_, a, b, c) => a + JSON.stringify(want(page)) + c));
    console.log('wrote', page);
  }
  process.exit(0);
}

let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.log('FAIL ' + what); } else console.log('ok   ' + what); };
for (const page of Object.keys(PAGES)) {
  const m = g.read(page).match(RE);
  check(m && JSON.stringify(JSON.parse(m[2])) === JSON.stringify(want(page)), `${page}: areas ${PAGES[page].join(', ')} as load_area builds them`);
}

// The renderer, against draw_view: the start of play (area 13 at column 150, row 54), and in each
// area a view at a place picked by a generator with a fixed seed.
const { wtssView } = g.run('levels.html', 'wtss-view', 'wtssView');
g.sameBlock('wtss-view');
const B0 = bankOf('main'), B4 = bankOf('bank-04');
let seed = 20261017;
const rand = k => { seed = Math.imul(seed ^ (seed >>> 15), 0x2C1B3C6D) + 0x297A2D39 | 0; return (seed >>> 8) % k; };
for (const n of AREAS) {
  const views = n === 13 ? [[150, 54], [rand(228), rand(109)]] : [[rand(228), rand(109)]];
  for (const [col, row] of views) {
    const M = machines[n];
    for (let i = 0x9630; i < 0x963B; i++) M.mem[i] = 0;
    M.mem[0x9633] = col; M.mem[0x9634] = row;
    M.call(0xA012);
    const V = wtssView(B0, B4, { split: built[n].split, b0: Uint8Array.from(Buffer.from(built[n].b0, 'base64')) });
    let bad = 0;
    for (let y = 0; y < 152; y++) for (let x = 0; x < 28; x++)
      if (V.charBytes(col + x, row + (y >> 3))[y & 7] !== M.mem[0xAE10 + y * 28 + x]) bad++;
    check(bad === 0, `area ${n}, the view at column ${col}, row ${row}: ${bad} of 4256 bytes differ from draw_view's`);
  }
}
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
