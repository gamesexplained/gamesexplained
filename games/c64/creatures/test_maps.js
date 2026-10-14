#!/usr/bin/env node
// Hold the Maps tab's stage maps against the game. levels.html's cr-map block (crStage) reads a
// stage from its level file: the map's columns, the colour set each column is drawn in, and the
// spawn records with the distance S scrolled when each is read. This checks that every byte the
// page's MAPS carries is the listing's (the engine with the world's first level file over it, and
// the second over that), and then holds the model against test_maps.json, what the emulator showed
// in a run of each stage, stopped at every record read: that every record was read, in order; that
// the screen's left edge was then where the model puts it, at map pixel S - 312 (to a pixel once
// the opening run is over, up to 7 pixels late during it, while the landscape scrolls faster than
// object_spawn runs); that the band colours were the set the model gives the column at the right
// edge; and that the screens taken matched the map's characters, character for character.
//   node games/c64/creatures/test_maps.js [page.html]
const path = require('path'), crypto = require('crypto'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'levels.html';
const { crStage } = g.run(page, 'cr-map', 'crStage');
const mm = g.read(page).match(/const MAPS = (\{.*?\});/);
if (!mm) { console.error('no MAPS data'); process.exit(1); }
const MAPS = JSON.parse(mm[1]), SEEN = g.json('test_maps.json');
const E = g.listing('parts/engine/listing.json');
const part = (p) => g.json('parts/' + p + '/part.json');
let bad = 0, records = 0, screens = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const hex = (n) => '$' + n.toString(16).toUpperCase();
// the game's memory once a stage is loaded: the engine, then each level file it lies over
function loaded(p) {
  const ram = E.ram.slice(), has = E.has.slice(), chain = [];
  for (let q = p; q && q !== 'engine'; q = part(q).over) chain.unshift(q);
  for (const q of chain) {
    const L = g.listing('parts/' + q + '/listing.json');
    for (let a = 0; a < 0x10000; a++) if (L.has[a]) { ram[a] = L.ram[a]; has[a] = true; }
  }
  return { ram, has };
}
const stages = {};
for (const W of MAPS.worlds) for (const St of W.stages) {
  const G = loaded(St.part), m = new Uint8Array(0x10000);
  for (const [a, h] of W.base.concat(St.over)) for (let i = 0; i < h.length / 2; i++) {
    const v = parseInt(h.substr(2 * i, 2), 16); m[a + i] = v;
    if (!G.has[a + i] || G.ram[a + i] !== v) fail(St.part, 'byte', hex(a + i), 'page', v, 'listing', G.has[a + i] ? G.ram[a + i] : 'none');
  }
  stages[St.part] = { m, model: crStage(m) };
}
for (const { part: p, seen } of SEEN.stages) {
  if (!stages[p]) { fail('the page has no stage', p); continue; }
  const { m, model } = stages[p], { rows, cols, sets, objs } = model;
  if (seen.length !== objs.length) fail(p, 'the game read', seen.length, 'records, the page has', objs.length);
  const scen = (c) => cols.filter((x) => x <= c).length - 1;
  const ch = (cc, row) => {
    const k = cc >> 2;
    if (cc < 0 || k >= cols.length) return null;
    const t = m[rows[row >> 2] + cols[k]];
    return m[0x8009 + 16 * t + 4 * (row & 3) + (cc & 3)];
  };
  let bands = '';
  seen.forEach(([a, c1273, c126e, fine, b, scr], i) => {
    records++;
    const o = objs[i];
    if (!o || o.a !== a) { fail(p, 'record', i, 'the game read', hex(a), 'the page has', o ? hex(o.a) : 'none'); return; }
    const left = 32 * scen(c1273) + 8 * c126e - fine - 312, late = o.S - 312 - left;
    if (left >= 16 ? Math.abs(late) > 1 : late < 0 || late > 7)
      fail(p, 'record', hex(a), 'S', o.S, 'read with the left edge at', left, 'not', o.S - 312);
    if (b) bands = b;
    const at = cols.findIndex((x) => x >= c1273), k = sets[at < 0 ? sets.length - 1 : at];
    const want = [0x8B97, 0x8BBB, 0x8BDF].map((t) => Array.from(m.slice(t + 6 * k, t + 6 * k + 6), (v) => v.toString(16).padStart(2, '0')).join('')).join('');
    if (want !== bands) fail(p, 'record', hex(a), 'band colours', bands, 'the page has set', k, want);
    if (scr) {
      screens++;
      const o8 = (left + fine) / 8, got = [];
      for (let row = 0; row < 24; row++) for (let j = 0; j < 40; j++) { const c = ch(o8 + j, row); if (c !== null) got.push(c); }
      const h = got.length + ':' + crypto.createHash('sha1').update(Buffer.from(got)).digest('hex').slice(0, 16);
      if (h !== scr) fail(p, 'record', hex(a), 'screen', scr, 'the page draws', h);
    }
  });
}
if (SEEN.stages.length !== Object.keys(stages).length) fail('the page has', Object.keys(stages).length, 'stages, the runs', SEEN.stages.length);
console.log(`${SEEN.stages.length} stages, ${records} records read and ${screens} screens held against the map: ${bad ? bad + ' differ' : 'all match'}`);
process.exit(bad ? 1 : 0);
