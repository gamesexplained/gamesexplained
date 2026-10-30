#!/usr/bin/env node
// Hold the skating mark calculator on index.html and discoveries.html against the game's own code.
// Both pages carry the wg-marks block (wgMark), which runs base_mark ($1CFA) on the skating part's
// listing with the mode, falls, awkward moves and elements set where the program leaves them. Here
// base_mark runs on the kit's simulator over the whole listing with the same variables set, for
// both modes, falls from 0 to 60, awkward moves from 0 to 140 in steps, and lists of elements from
// none to all seven three times over; the page's answer must be the routine's. Then the cases that
// must come out as the game was seen to score them live: Figure Skating with 22 falls and nothing
// else scores 6.0, and with 40 falls 0.0.
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
console.log(`${n} cases on ${shared.pages.join(' and ')}: ` + (bad ? bad + ' differences' : 'every mark matches base_mark, and the live cases hold'));
process.exit(bad ? 1 : 0);
