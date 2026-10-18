#!/usr/bin/env node
// Hold the page's chance test against the game's code. index.html's nes-chance block ports
// COND_RANDOM ($1222), the scripts' test $88, which compares its operand with the raster line
// READ_RASTER_LINE ($0695) reads from $D012. The routine runs on the kit's 6502 over the engine's
// listing, $01 = $06 as in play, with SCRIPT_PC ($4E/$4F) at the operand and $D012 answered by the
// test with the low eight bits of the line, as the chip gives them, for every operand 0-255 on
// every one of a PAL frame's 312 lines (0-311). The carry it returns must be nesChance's answer,
// SCRIPT_PC must move past the one operand, and nesChanceLines must count the lines it passes on.
// It exits 1 on any difference.
//   node games/c64/neverending-story/test_chance.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
g.sameBlock('nes-chance');
const { nesChance, nesChanceLines } = g.run(page, 'nes-chance', 'nesChance', 'nesChanceLines');
const E = g.listing('parts/engine/listing.json');
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const m = E.ram.slice();
let line = 0;
const io = { read(a) { if (a === 0xD012) return line & 255; throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x06 }, io });
for (let n = 0; n < 256; n++) {
  let passes = 0;
  for (line = 0; line < 312; line++) {
    m[0xC000] = n; m[0x4E] = 0x00; m[0x4F] = 0xC0;
    cpu.call(0x1222, { c: line & 1 }, {});
    cases++;
    if (m[0x4E] !== 0x01 || m[0x4F] !== 0xC0) fail(`operand ${n} on line ${line}: SCRIPT_PC moved to $${(m[0x4E] | m[0x4F] << 8).toString(16)}`);
    if (cpu.c !== (nesChance(n, line) ? 1 : 0)) fail(`operand ${n} on line ${line}: the routine says ${cpu.c}, the page ${nesChance(n, line)}`);
    passes += cpu.c;
  }
  if (nesChanceLines(n) !== passes) fail(`operand ${n}: it passes on ${passes} lines, the page counts ${nesChanceLines(n)}`);
}
const shown = [200, 125, 50, 25].map((n) => `${n}: ${nesChanceLines(n)}`).join(', ');
console.log(`${cases} cases, every operand on every line: ` + (bad ? bad + ' differences' : 'every answer matches') + ` (lines of 312 it passes on, for the operands the page offers: ${shown})`);
process.exit(bad ? 1 : 0);
