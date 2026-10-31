#!/usr/bin/env node
// Hold the skating mark calculator on index.html and discoveries.html against the game's own code.
// Both pages carry the wg-marks block (wgMark), which runs base_mark ($1CFA) on the skating part's
// listing with the mode, falls, awkward moves and elements set where the program leaves them. Here
// base_mark runs on the kit's simulator over the whole listing with the same variables set, for
// both modes, falls from 0 to 60, awkward moves from 0 to 140 in steps, and lists of elements from
// none to all seven three times over; the page's answer must be the routine's. Then the cases that
// must come out as the game was seen to score them live: Figure Skating with 22 falls and nothing
// else scores 6.0, and with 40 falls 0.0.
// Then the move tiles on index.html: each counts what the game's records for its move count.
// It exits 1 on any difference.
//   node games/c64/winter-games/test_marks.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const shared = g.sameBlock('wg-marks');
const { wgMark } = g.run('index.html', 'wg-marks', 'wgMark');
const L = g.listing('parts/skating/listing.json');
function routine(mode, falls, awk, elems) {
  const m = L.ram.slice();
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: { read() { throw new Error('io'); }, write() { throw new Error('io'); } } });
  m[0x70] = mode; m[0x46] = falls; m[0x47] = awk; m[0x49] = elems.length;
  elems.forEach((e, i) => { m[0x4A + i] = e; });
  cpu.call(0x1CFA, {});
  return m[0x26];
}
const all = [1, 2, 3, 4, 5, 6, 7];
const lists = [[], [7], [1], [1, 1, 1], all, all.concat(all), all.concat(all, all), [3, 5, 4, 6], [2, 2, 2, 2, 2]];
let n = 0, bad = 0;
for (const mode of [0, 1]) for (let falls = 0; falls <= 60; falls++) for (let awk = 0; awk <= 140; awk += 7) for (const list of lists) {
  const a = wgMark(L.ram, kit, mode, falls, awk, list), b = routine(mode, falls, awk, list);
  n++;
  if (a !== b && bad++ < 10) console.log('DIFFERS mode', mode, 'falls', falls, 'awkward', awk, 'elements', list.join(','), 'page', a, 'game', b);
}
for (const [falls, want] of [[22, 60], [40, 0]]) {
  const a = wgMark(L.ram, kit, 0, falls, 0, []);
  n++;
  if (a !== want && bad++ < 10) console.log('DIFFERS from the live test: Figure Skating,', falls, 'falls, page', a, 'want', want);
}
// The move tiles on index.html (WG_MOVES): each tile adds to the run what its records make the
// game count. A record's +6 is the element begun, +7 a fall (1) or an awkward move (any other), +8
// its action (1 a turn counted, 4 the camel spin becoming element 7 at one turn); start_move,
// $15F0. An element's tile is clean (no record counts a fall or an awkward move), and a spin's tile
// turns as often as spin_turns ($167F) wants, so its ending is clean too.
const { WG_MOVES } = g.run('index.html', 'WG_MOVES', 'WG_MOVES');
const sym = (name) => { const r = L.listing.records.find((x) => x.l === name); if (!r) throw new Error('no symbol ' + name); return r.a; };
for (const mv of WG_MOVES) {
  const recs = []; for (const [name, k] of mv.recs) for (let i = 0; i < k; i++) recs.push(sym(name));
  let e = 0, falls = 0, awk = 0, turns = 0;
  for (const r of recs) {
    if (L.ram[r + 6]) { e = L.ram[r + 6]; turns = 0; }
    if (L.ram[r + 7] === 1) falls++; else if (L.ram[r + 7]) awk++;
    if (L.ram[r + 8] === 1) turns++;
    if (L.ram[r + 8] === 4) { e = 7; turns = 1; }
  }
  const want = mv.fall ? [0, 1, 0] : mv.awk ? [0, 0, 1] : [mv.e, 0, 0];
  n++;
  if ((e !== want[0] && !mv.fall && !mv.awk) || falls !== want[1] || awk !== want[2]) {
    if (bad++ < 10) console.log('DIFFERS: the tile', mv.name, 'counts element', mv.e || '-', 'but its records give element', e, falls, 'falls,', awk, 'awkward');
  }
  const need = mv.e ? L.ram[sym('spin_turns') + mv.e] : 0;
  if (need && turns !== need && bad++ < 10) console.log('DIFFERS: the tile', mv.name, 'spins', turns, 'turns, and spin_turns wants', need);
}
console.log(`${n} cases on ${shared.pages.join(' and ')}: ` + (bad ? bad + ' differences' : 'every mark matches base_mark, the live cases hold, and each move tile counts what its records count'));
process.exit(bad ? 1 : 0);
