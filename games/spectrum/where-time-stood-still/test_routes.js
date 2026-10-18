'use strict';
// The zones and routes the Maps page draws over the plateau. Its data, <script id="wtss-routes">,
// is bank 1's packed grounds ($D000-$E300), bank 3's zones ($FB1E), routes ($ED68) and their
// points ($EDB0), and the records as the game's new_game ($85E2) leaves them, run here on the
// kit's Z80 from the listings (with --write, this test puts them in the page). Its blocks are held
// to the game's own code: /* wtss-ground */'s grounds to what the area loader ($87CF) unpacks into
// bank 1 for every area; its cell and projection, at every place the page draws (each place of
// each zone, each route's points, each record's start), to ground_cell_at ($90DE) and project
// (bank 3 $C362); and /* wtss-routes */'s zoneAt, at every place of every zone and two places
// round it, to the search in zones_pass (bank 3 $FB9E).
// node games/spectrum/where-time-stood-still/test_routes.js [--write]   (--write updates the page)
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..', '..');
const { game } = require(path.join(ROOT, 'kit', 'scripts', 'port_check.js'));
const g = game(__dirname);
const { machine } = require('./wtss_machine.js');
const b64 = a => Buffer.from(a).toString('base64');

// the records as new_game leaves them: it copies records 0 to 7 and $2B and $2C from bank 0's
// starting values by $8628
const M = machine(g), mem = M.mem;
M.run({ pc: 0x85E2 }, 0x8628);
const B1 = M.bank(1), B3 = M.bank(3);
const data = {
  grounds: b64(B1.subarray(0x1000, 0x2301)),           // area 14's ground reads on to $E300
  zones: b64(B3.subarray(0x3B1E, 0x3B1E + 45)),
  routes: b64(B3.subarray(0x2D68, 0x2D68 + 72)),
  points: b64(B3.subarray(0x2DB0, 0x2DB0 + 573)),
  records: b64(B3.subarray(0x2B05, 0x2B05 + 46 * 8)),
};

const RE = /(<script type="application\/json" id="wtss-routes">)([\s\S]*?)(<\/script>)/;
if (process.argv.includes('--write')) {
  const file = path.join(__dirname, 'levels.html'), html = fs.readFileSync(file, 'utf8');
  if (!RE.test(html)) { console.log('FAIL levels.html has no <script type="application/json" id="wtss-routes">'); process.exit(1); }
  fs.writeFileSync(file, html.replace(RE, (_, a, b, c) => a + JSON.stringify(data) + c));
  console.log('wrote levels.html');
  process.exit(0);
}

let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.log('FAIL ' + what); } else console.log('ok   ' + what); };
const m = g.read('levels.html').match(RE);
check(m && JSON.stringify(JSON.parse(m[2])) === JSON.stringify(data), 'levels.html: the grounds, zones, routes and records as the listings and new_game give them');

const { wtssGround } = g.run('levels.html', 'wtss-ground', 'wtssGround');
const { wtssRoutes } = g.run('levels.html', 'wtss-routes', 'wtssRoutes');
const GR = wtssGround(Uint8Array.from(Buffer.from(data.grounds, 'base64')));
const W = wtssRoutes(data, GR);

// The places the page draws, by area
const drawn = {};
const add = (area, a, d, what) => (drawn[area] = drawn[area] || []).push({ a, d, what });
for (const z of W.zones) for (let a = z.a0; a < z.a1; a++) for (let d = z.d0; d < z.d1; d++) add(z.area, a, d, `zone ${z.n}`);
for (const r of W.routes) r.points.forEach((p, i) => add(p.area, p.a, p.d, `route ${r.n}, point ${i}`));
W.records.forEach((r, i) => add(r.area, r.a, r.d, `record ${i}`));

const SCRATCH = 0x5E00;                       // five words for project: across, down, height, x, y
for (let n = 0; n < 15; n++) {
  // the area loader, as far as the ground: unpacked into bank 1 and its offsets written
  mem[0x8D1F] = n;
  M.run({ pc: 0x87CF }, 0x8817);
  const want = M.bank(1).subarray(0, 0x1000), got = GR.ground(n);
  let bad = 0;
  for (let i = 0; i < 0x1000; i++) if (want[i] !== got.g[i]) bad++;
  check(bad === 0, `area ${n}: the ground as the loader unpacks it (${bad} of 4096 cells differ)`);
  const pts = drawn[n] || [];
  if (!pts.length) continue;
  let badCell = 0, badXY = 0, first = '';
  for (const p of pts) {
    const P = W.place(n, p.a, p.d);
    M.page(1);
    const w = (a, v) => { mem[a] = v & 255; mem[a + 1] = v >> 8 & 255; };
    w(0x8ED1, 4 * p.a); w(0x8ED3, 4 * p.d);
    M.run({ pc: 0x90DE }, 0x9103);
    const c = M.cpu.a;
    // the height: an ordinary cell's byte times 8, and 0 on $7C ($93EB); the page's own choice on
    // the rest of the special ground, which holds no height
    const h = c < 0x72 ? 8 * c : c === 0x7C ? 0 : P.height;
    if (c !== P.cell || h !== P.height) { badCell++; if (!first) first = ` (first: ${p.what}, cell ${c} against ${P.cell})`; }
    M.page(3);
    w(SCRATCH, 4 * p.a); w(SCRATCH + 2, 4 * p.d); w(SCRATCH + 4, h);
    M.run({ pc: 0xC362, h: SCRATCH >> 8, l: SCRATCH & 255 }, 0xC38D);
    const x = mem[SCRATCH + 6] | mem[SCRATCH + 7] << 8, y = mem[SCRATCH + 8] | mem[SCRATCH + 9] << 8;
    if (x !== P.x || y !== P.y) { badXY++; if (!first) first = ` (first: ${p.what}, ${x},${y} against ${P.x},${P.y})`; }
  }
  check(!badCell && !badXY, `area ${n}: ${pts.length} places drawn, their ground cells and heights, and places on the map, as $90DE and $C362 give them (${badCell} cells and ${badXY} places differ)${first}`);
}

// zoneAt against zones_pass's search: the area at $8D1F, the leader's place at $DB05, from $FB9E
// to $FBCA (in none) or $FBD9 (in the zone numbered 9 less B)
M.page(3);
let n = 0, bad = 0, first = '';
for (const z of W.zones) for (let a = Math.max(0, z.a0 - 2); a < Math.min(256, z.a1 + 2); a++) for (let d = Math.max(0, z.d0 - 2); d < Math.min(256, z.d1 + 2); d++) {
  mem[0x8D1F] = z.area; mem[0xDB05] = a; mem[0xDB06] = d;
  const pc = M.run({ pc: 0xFB9E }, [0xFBCA, 0xFBD9]);
  const game = pc === 0xFBCA ? -1 : 9 - M.cpu.b, page = W.zoneAt(z.area, a, d);
  n++;
  if (game !== page) { bad++; if (!first) first = ` (first: area ${z.area}, ${a}, ${d}: the game's ${game}, the page's ${page})`; }
}
check(bad === 0, `the zone at ${n} places in and around the nine zones, as zones_pass finds it: ${bad} differ${first}`);
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
