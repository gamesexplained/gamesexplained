'use strict';
// The KERNAL's interrupt and GETIN in port/src/kernal.js beside KERNAL 901227-03's own code, run by
// the kit's simulator on the same memory with the same keys held: random states of the clock, the
// buffer, the keyboard's bytes and the repeat counters, with up to three keys and the modifiers
// held, each run through several interrupts in a row so that repeats and releases come round. The
// memory and every write to CIA 1 must agree. The ROM is read from the kit's emulator folder and
// never committed; without it the test says so (and fails under KIT_REQUIRE_TOOLS).
//   node games/c64/alter-ego/port/test/t-kernal.js [trials]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
require('../src/kernal.js');
const K = globalThis.AEKernal;
const ROM = path.join(ROOT, 'tools/vice-mcp/share/vice/C64/kernal-901227-03.bin');
if (!fs.existsSync(ROM)) {
  console.log((process.env.KIT_REQUIRE_TOOLS ? 'FAIL' : 'skip') + ': no KERNAL ROM at ' + ROM);
  process.exit(process.env.KIT_REQUIRE_TOOLS ? 1 : 0);
}
const rom = new Uint8Array(fs.readFileSync(ROM));

// CIA 1 as the keyboard sees it: port A drives the rows low, port B reads the columns of the keys
// held in the rows driven; the other chips' registers kept as written
function chips(keys) {
  const c = { pra: 0x7F, regs: new Uint8Array(0x10000), log: [] };
  c.read = a => {
    if (a === 0xDC01) {
      let v = 0xFF;
      for (const k of keys) if (!(c.pra & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
      return v;
    }
    if (a === 0xDC00) return c.pra;
    return c.regs[a];
  };
  c.write = (a, v) => { c.log.push([a, v]); if (a === 0xDC00) c.pra = v; else c.regs[a] = v; };
  return c;
}

let seed = 12345;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
const LETTERS = [0x0A, 0x1C, 0x14, 0x12, 0x0E, 0x15, 0x1A, 0x1D, 0x21, 0x22, 0x25, 0x2A, 0x24, 0x27, 0x26, 0x29, 0x3E,
  0x11, 0x0D, 0x16, 0x1E, 0x1F, 0x09, 0x17, 0x19, 0x0C];
const OTHERS = [0x00, 0x01, 0x02, 0x07, 0x03, 0x04, 0x05, 0x06, 0x3C, 0x3F, 0x38, 0x3B, 0x08, 0x2C, 0x2F, 0x37];
const SHIFTS = [0x0F, 0x34, 0x3D, 0x3A];

function state() {
  const m = new Uint8Array(65536);
  for (let a = 0; a < 0x400; a++) m[a] = rnd(256);
  m[0x01] = 0x37; m[0xCC] = 1; m[0xC6] = rnd(11); m[0x0289] = 10;
  m[0x028A] = [0, 0, 0, 0x80, 0x40][rnd(5)];
  m[0x028F] = 0x48; m[0x0290] = 0xEB; m[0x0314] = 0x31; m[0x0315] = 0xEA; m[0x032A] = 0x3E; m[0x032B] = 0xF1;
  m[0xC5] = rnd(3) ? 0x40 : [...LETTERS, ...OTHERS][rnd(42)];
  m[0x0291] = rnd(2) ? 0x80 : 0;
  m[0x99] = 0;
  return m;
}
function keysFor() {
  const keys = new Set();
  const n = rnd(4);
  for (let i = 0; i < n; i++) keys.add(rnd(2) ? LETTERS[rnd(LETTERS.length)] : OTHERS[rnd(OTHERS.length)]);
  if (rnd(3) === 0) keys.add(SHIFTS[rnd(4)]);
  if (rnd(6) === 0) keys.add(SHIFTS[rnd(4)]);
  return keys;
}

let fails = 0, runs = 0;
const trials = +(process.argv[2] || 300);
for (let t = 0; t < trials && fails < 5; t++) {
  const m0 = state();
  const romSide = { m: Uint8Array.from(m0) }, model = { m: Uint8Array.from(m0) };
  const holds = [keysFor()];
  for (let i = 1; i < 6; i++) holds.push(rnd(3) ? holds[i - 1] : keysFor());
  for (let i = 0; i < holds.length; i++) {
    runs++;
    const cg = chips(holds[i]), cm = chips(holds[i]);
    cg.pra = romSide.pra === undefined ? 0x7F : romSide.pra; cm.pra = model.pra === undefined ? 0x7F : model.pra;
    // the ROM: an interrupt through $FF48 and $0314 to $EA31, out by its RTI
    const cpu = new CPU(romSide.m, { port: { dir: 0x2F, data: 0x37 }, io: { read: a => cg.read(a), write: (a, v) => cg.write(a, v) }, rom: { kernal: rom } });
    cpu.pc = 0x1000; cpu.sp = 0xF0;
    cpu.irq(0xFF48, { maxSteps: 100000 });
    // the model
    const k = { rd: a => (a >= 0xDC00 && a < 0xDD00) || a === 0xD018 ? cm.read(a) : model.m[a], wr: (a, v) => { if ((a >= 0xDC00 && a < 0xDD00) || a === 0xD018) cm.write(a, v & 255); else model.m[a] = v & 255; } };
    K.irq(k);
    romSide.pra = cg.pra; model.pra = cm.pra;
    // and GETIN, now and then
    let ga = null, ma = null;
    if (rnd(2)) {
      const c2 = new CPU(romSide.m, { port: { dir: 0x2F, data: 0x37 }, io: { read: a => cg.read(a), write: (a, v) => cg.write(a, v) }, rom: { kernal: rom } });
      c2.call(0xFFE4, { sp: 0xF0 }, { maxSteps: 10000 }); ga = c2.a;
      ma = K.K.GETIN(k, { a: 0, x: 0, y: 0 }).a;
    }
    const diffs = [];
    for (let a = 2; a < 0x400; a++) if (a < 0x100 || a >= 0x200) if (romSide.m[a] !== model.m[a]) diffs.push(a);
    const chipsDiffer = JSON.stringify(cg.log.filter(([a]) => a !== 0xDC0D)) !== JSON.stringify(cm.log.filter(([a]) => a !== 0xDC0D));
    if (diffs.length || chipsDiffer || ga !== ma) {
      fails++;
      console.log('FAIL trial ' + t + ' interrupt ' + i + ' keys ' + [...holds[i]].map(x => x.toString(16)).join(',') +
        ': ' + diffs.slice(0, 12).map(a => '$' + a.toString(16) + ' rom ' + romSide.m[a].toString(16) + ' model ' + model.m[a].toString(16)).join(', ') +
        (chipsDiffer ? ' chips: rom ' + JSON.stringify(cg.log.slice(0, 12)) + ' model ' + JSON.stringify(cm.log.slice(0, 12)) : '') +
        (ga !== ma ? ' GETIN rom ' + ga + ' model ' + ma : ''));
      break;
    }
  }
}
// the decode tables against the ROM's own
for (const [name, at] of [['plain', 0xEB81], ['shift', 0xEBC2], ['cbm', 0xEC03], ['ctrl', 0xEC78]]) {
  const t = K.decode[name];
  for (let i = 0; i < 65; i++) if (t[i] !== rom[at - 0xE000 + i]) { fails++; console.log('FAIL ' + name + ' table key ' + i + ': model ' + t[i].toString(16) + ' rom ' + rom[at - 0xE000 + i].toString(16)); }
}
console.log(fails ? fails + ' failed' : 'ok   the KERNAL\'s interrupt and GETIN as the ROM does them, ' + runs + ' interrupts; each key alone, with SHIFT, C= and CTRL as its tables give them');
process.exitCode = fails ? 1 : 0;
