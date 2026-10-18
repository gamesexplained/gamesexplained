#!/usr/bin/env node
// Hold the page's pictures against the game's code. index.html's nes-blit block ports
// BLIT_ROOM_GRAPHIC ($05BF), RESTORE_GAMEPLAY_DISPLAY ($07A2) and RENDER_ROOM_GRAPHICS ($0570);
// the routines themselves run on the kit's 6502 over the engine's listing with the part's laid
// over it, with $01 = $06 as in play (colour RAM answered by the test, four bits a byte).
// 1. Every one of the 57 picture records ($0BF9) with the part that holds its picture, and each of
//    the 36 icon slots ($A560 + 160 n) through icon record 0 ($2943), blitted on its own: the
//    port must leave memory and colour RAM as the routine does, byte for byte.
// 2. The whole band, for every picture of every part with the icon records filled as play fills
//    them (five object icons and the companion, chosen round the slots): the routine restores the
//    backdrop from $BC00, where the test copies $E000-$EF9F as $070F does when the opening ends;
//    the port restores it from the listing's $E000, $EC80 and $EE10, as the page does. The band,
//    screen and colour RAM must come out the same.
// It exits 1 on any difference.
//   node games/c64/neverending-story/test_pictures.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
g.sameBlock('nes-blit');
const { nesBlit, nesRender } = g.run(page, 'nes-blit', 'nesBlit', 'nesRender');
const E = g.listing('parts/engine/listing.json');
const parts = [1, 2, 3].map((p) => g.listing(`parts/part-${p}/listing.json`));
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const mem = (p) => { const m = E.ram.slice(); for (let a = 0x2F00; a < 0x9600; a++) if (parts[p].has[a]) m[a] = parts[p].ram[a]; m[0x2940] = p; return m; };

// the routine on the simulator; returns its memory and colour RAM
function game64(m, entry, regs) {
  const colour = new Uint8Array(1024);
  const io = {
    read(a) { if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800]; throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD800 && a < 0xDC00) colour[a - 0xD800] = v & 15; else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x06 }, io });
  Object.assign(cpu.m, regs || {});
  cpu.call(entry, {}, { maxSteps: 2e6 });
  return { ram: cpu.m, colour };
}
function compare(what, a, b) {
  cases++;
  for (let x = 0x200; x < 0x10000; x++) if (a.ram[x] !== b.ram[x]) return fail(what, 'at $' + x.toString(16), a.ram[x], b.ram[x]);
  for (let x = 0; x < 1024; x++) if (a.colour[x] !== b.colour[x]) return fail(what, 'colour RAM +' + x, a.colour[x], b.colour[x]);
}
const partOf = (i) => i <= 20 ? 0 : i <= 36 ? 1 : 2;

// 1. each record, and each icon, on its own
for (let i = 0; i < 57; i++) {
  const m = mem(partOf(i)), at = 0x0BF9 + 6 * i;
  const sim = game64(m.slice(), 0x05BF, { 0x5A: at & 255, 0x5B: at >> 8 });
  const port = { ram: m.slice(), colour: new Uint8Array(1024) };
  nesBlit(m, at, port);
  compare('picture ' + i, sim, port);
  let changed = 0;
  for (let x = 0xE000; x < 0xEC80; x++) if (sim.ram[x] !== m[x]) changed++;
  if (changed < m[at + 4] * m[at + 5]) fail('picture ' + i, 'the routine changed only', changed, 'bitmap bytes');
}
for (let k = 0; k < 36; k++) {
  const m = mem(0), src = 0xA560 + 160 * k;
  m[0x2945] = src & 255; m[0x2946] = src >> 8;
  const sim = game64(m.slice(), 0x05BF, { 0x5A: 0x43, 0x5B: 0x29 });
  const port = { ram: m.slice(), colour: new Uint8Array(1024) };
  nesBlit(m, 0x2943, port);
  compare('icon ' + k, sim, port);
}
// 2. the band, built as RENDER_ROOM_GRAPHICS builds it
for (let i = 0; i < 57; i++) {
  const p = i === 0 ? i % 3 : partOf(i), m = mem(p);
  for (let r = 0; r < 6; r++) {           // icon records: objects in 0-4 and the companion in 5
    const slot = r === 5 ? 23 + (i & 1) : (i * 5 + r * 7) % 36, src = 0xA560 + 160 * slot;
    m[0x2943 + 6 * r + 2] = src & 255; m[0x2943 + 6 * r + 3] = (i + r) % 4 === 3 ? 0 : src >> 8;
  }
  m[0x2942] = i;
  const sm = m.slice();
  sm.copyWithin(0xBC00, 0xE000, 0xEFA0);  // $070F's copy of the backdrop as it loaded
  const sim = game64(sm, 0x0570);
  const port = { ram: m.slice(), colour: new Uint8Array(1024) };
  nesRender(m, port, { screen: 0xEC80, colour: 0xEE10, bitmap: 0xE000 });
  // compare the band, its screen bytes and colour RAM: the routine's copy at $BC00 is the test's
  cases++;
  const ranges = [[0xE000, 0xEC7F], [0xCC00, 0xCD8F]];
  let ok = true;
  for (const [lo, hi] of ranges) for (let x = lo; x <= hi && ok; x++) if (sim.ram[x] !== port.ram[x]) { fail('band with picture ' + i, 'at $' + x.toString(16)); ok = false; }
  for (let x = 0; x < 400 && ok; x++) if (sim.colour[x] !== port.colour[x]) { fail('band with picture ' + i, 'colour +' + x); ok = false; }
}
console.log(`${cases} cases: 57 pictures and 36 icons on their own, and the band with each picture: ` + (bad ? bad + ' differences' : 'every byte matches'));
process.exit(bad ? 1 : 0);
