#!/usr/bin/env node
// Hold the page's pictures and riding courses against the game's own code. The kane-gfx block of
// index.html (KANE) unpacks each of the four pictures as show_picture ($0C1B) does and builds both
// riding courses as build_ride_screen ($2D08) does. The test runs those routines on the kit's
// simulator over the listing's bytes, with the video chip and colour RAM answered by a plain
// register file, and compares what they leave:
// - a picture, run from show_picture to $0D81, before start_stage: the screen colours at
//   $4400-$47E7, the bitmap at $6000-$7F3F, the stages' sprite shapes at $4800-$5FFF, the
//   colour-RAM nibbles at $8010-$820F and the 1,000 cells of colour RAM;
// - a course, run from build_ride_screen to its return: the map buffer $8010-$880F, the character
//   set at $7800-$7FFF and the ride's sprite shapes at $4400-$72FF.
// It also checks KANE_PICTURES' cycles: the cycles unpack_bitmap takes on the simulator, from the
// JSR at $0D65 to its return at $0D68. Every page that carries the block must carry the same one.
// It exits 1 on any difference.
//   node games/c64/kane/test_pictures.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
g.sameBlock('kane-gfx');
const { KANE, KANE_PICTURES } = g.run(page, 'kane-gfx', 'KANE', 'KANE_PICTURES');
const L = g.listing();
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
function sim(stage, entry, until) {
  const m = L.ram.slice(), regs = new Uint8Array(0x1000);
  m[0x907B] = stage;
  regs[0x011] = 0x1B; regs[0xD02] = 0x3F; regs[0xD00] = 0x97;
  const io = { read(a) { return regs[a - 0xD000]; }, write(a, v) { regs[a - 0xD000] = v; } };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x36 }, io });
  const marks = {};
  if (until) {
    cpu.pc = entry; cpu.sp = 0xFF;
    for (const stop of [0x0D65, 0x0D68, until]) { cpu.run({ until: stop, maxSteps: 5e7 }); marks[stop] = cpu.cycles; }
  } else cpu.call(entry, {}, { maxSteps: 5e7 });
  return { m, colour: regs.slice(0x800, 0xC00), cycles: marks[0x0D68] - marks[0x0D65] };
}
function same(a, b, from, to, what) {
  for (let i = from; i <= to; i++) if (a[i] !== b[i]) { fail(what, 'at $' + i.toString(16), 'game', a[i], 'page', b[i]); return false; }
  return true;
}
for (const p of KANE_PICTURES) {
  const s = sim(p.stage, 0x0C1B, 0x0D81), m = L.ram.slice(), r = KANE.picture(m, p.stage);
  same(s.m, m, 0x4400, 0x47E7, p.name + ' screen colours');
  same(s.m, m, 0x6000, 0x7F3F, p.name + ' bitmap');
  same(s.m, m, 0x4800, 0x5FFF, p.name + ' sprite shapes');
  same(s.m, m, 0x8010, 0x820F, p.name + ' colour nibbles');
  for (let i = 0; i < 1000; i++) if ((s.colour[i] & 15) !== (r.colour[i] & 15)) { fail(p.name, 'colour RAM cell', i); break; }
  if (s.cycles !== p.cycles) fail(p.name, 'cycles', s.cycles, 'page', p.cycles);
  const order = new Set(r.order.filter((a) => a < 0x7F40));
  if (order.size !== 8000) fail(p.name, 'the drawing order covers', order.size, 'bytes of 8000');
}
for (const stage of [1, 2]) {
  const s = sim(stage, 0x2D08), m = L.ram.slice(), placed = KANE.course(m, stage);
  same(s.m, m, 0x8010, 0x880F, 'course ' + stage + ' map');
  same(s.m, m, 0x7800, 0x7FFF, 'course ' + stage + ' character set');
  same(s.m, m, 0x4400, 0x72FF, 'course ' + stage + ' sprite shapes');
  if (!placed.length) fail('course ' + stage, 'no objects placed');
}
console.log(bad ? bad + ' differences' : `${KANE_PICTURES.length} pictures and 2 courses: every byte matches the game's code`);
process.exit(bad ? 1 : 0);
