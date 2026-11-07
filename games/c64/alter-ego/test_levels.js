'use strict';
// The Stages tab (levels.html) on a clean checkout: its maps drawn by the port's drawing routines
// the page carries, against the game's own p-code drawing them in the kit's 6502 from the listing.
// - the page's copies of the port (port/src/core.js, natives.js, ui.js) are the Play page's;
// - each stage's header in the page is the one at the start of its MAP file on the disk the Play
//   page carries (load_stage_header's order: four words of ages and the stages left, the 24
//   choices, the map's length and words, the starting cell, the number of scene blocks);
// - for each stage, every pixel row of every age of its map (the row above the first age, then
//   six for each), drawn by render_life_map_cell_or_connector ($57BA) in the page's port and by the
//   game's own procedure, run by its interpreter ($713C) on the listing's memory with the stage's
//   choices ($81C5) and map ($81F7) put in: the 320 bytes of the bitmap row the same.
//   node games/c64/alter-ego/test_levels.js
const path = require('path');
const { game, differ } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;
const PAGE = 'levels.html', page = g.read(PAGE);
for (const b of ['port/src/core.js', 'port/src/natives.js', 'port/src/ui.js']) { g.sameBlock(b); g.run(PAGE, b, 'AEPort'); }
const { AEPort } = globalThis;
g.lib('cpu6502');
const { CPU } = globalThis.C64Cpu;
const STAGES = JSON.parse(/<script type="application\/json" id="ae-stages">([^<]*)<\/script>/.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="ae-data">([^<]*)<\/script>/.exec(g.read('play.html'))[1]);
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };

// ---- the headers, read again from the MAP files: 252 bytes of each 254-byte record
function payload(b) {
  const out = [];
  for (let i = 0; i < b.length; i += 254) for (let j = i + 1; j < Math.min(i + 253, b.length); j++) out.push(b[j]);
  return out;
}
STAGES.forEach((s, i) => {
  const st = i + 1, file = st === 1 ? 'MAP1' : st === 2 || st === 7 ? 'MAP27' : 'MAP' + st;
  const b = payload(Buffer.from(data.files[file], 'base64')), w = o => b[o] | b[o + 1] << 8;
  let o = st === 1 || st === 7 ? w(0) + w(2) * 65536 : st === 2 ? 4 : 0;
  const h8 = [0, 2, 4, 6].map(k => w(o + k)); o += 8;
  const choices = Array.from({ length: 24 }, (_, k) => w(o + 2 * k)); o += 48;
  const n = w(o); o += 2;
  const grid = Array.from({ length: n }, (_, k) => w(o + 2 * k)); o += 2 * n;
  const want = { file, h8, choices, grid, start: w(o), blocks: w(o + 2) };
  const bad = Object.keys(want).filter(k => JSON.stringify(want[k]) !== JSON.stringify(s[k]));
  if (bad.length) fail('stage ' + st + ': the page\'s ' + bad.join(', ') + ' differ from ' + file + '\'s header');
});
console.log('ok   the seven stages\' headers are their MAP files\'');

// ---- the maps
const L = g.listing('parts/main/listing.json');
const EDGES = [8, 72, 136, 200, 264, 320];
if (EDGES.some((v, i) => (L.ram[0x82AF + 2 * i] | L.ram[0x82B0 + 2 * i] << 8) !== v)) fail('the boxes\' edges at $82AF are not the page\'s');
if ((L.ram[0x81F5] | L.ram[0x81F6] << 8) !== 0xE800) fail('the map\'s pictures are not at $E800 ($81F5)');
function memory(s) {
  const M = L.ram.slice();
  s.choices.forEach((v, i) => { M[0x81C5 + 2 * i] = v & 255; M[0x81C6 + 2 * i] = v >> 8; });
  s.grid.forEach((v, i) => { M[0x81F7 + 2 * i] = v & 255; M[0x81F8 + 2 * i] = v >> 8; });
  return M;
}
const IO = { read: () => 0, write: () => {} };
// the game's procedure, called from a p-code program of its own: the six arguments pushed, the last
// first, the call ($AC) and an opcode with no handler ($80), whose BRK at $7893 ends the run
function gameRow(M, cell, row) {
  const prog = [];
  for (const v of [40, 0, row, cell, 0, 0x2000].map(v => v & 0xFFFF)) prog.push(0x8E, v & 255, v >> 8);
  prog.push(0xAC, 0xBA, 0x57, 0x80);
  M.set(prog, 0x0200);
  M.fill(0, 0x2000, 0x2140);
  M[0x04] = 0x00; M[0x05] = 0xCF; M[0x06] = 0x00; M[0x07] = 0xCF; M[0x08] = 0x00; M[0x09] = 0x02;
  const cpu = new CPU(M, { port: { dir: 0x2F, data: 0x35 }, io: IO });
  cpu.pc = 0x713C; cpu.sp = 0xFF;
  cpu.run({ until: 0x7893, cycles: 5e6 });
  if (cpu.pc !== 0x7893) throw new Error('the game\'s drawing did not return');
  return M.slice(0x2000, 0x2140);
}
let rows = 0;
STAGES.forEach((s, i) => {
  const A = memory(s), B = memory(s);
  const P = AEPort.create(A, IO, { cpuPort: 0x35, cpuDir: 0x2F });
  P.sp = P.fp = 0xCE00;
  for (let age = 0; age < s.grid.length / 3; age++) for (let r = age ? 0 : -1; r < 6; r++) {
    const cell = (age * 6 + 0x81F7) & 0xFFFF;
    A.fill(0, 0x2000, 0x2140);
    P.render_life_map_cell_or_connector(0x2000, 0, cell, r & 0xFFFF, 0, 40);
    const page = A.slice(0x2000, 0x2140), want = gameRow(B, cell, r);
    const d = differ(page, want, [[0, 320]]);
    if (d >= 0) { fail('stage ' + (i + 1) + ', age row ' + age + ', pixel row ' + r + ': byte ' + d + ' of the row is ' + page[d] + ' on the page, ' + want[d] + ' in the game'); return; }
    rows++;
  }
});
if (!fails) console.log('ok   ' + rows + ' character rows of the seven maps drawn as the game draws them');
console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
