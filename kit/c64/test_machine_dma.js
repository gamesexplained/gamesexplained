'use strict';
// The cycles the video chip takes from the processor, held against the emulator (#217): every case
// in kit/c64/fixtures/vic-dma.json, which kit/c64/frame.py recorded in VICE (`frame.py dma
// --record`), run through kit/c64/machine.js with dma: true on the program frame.py ran there.
// The stores case is not run: machine.js takes every cycle as a read (its header). Exits 1 on any
// failure. node kit/c64/test_machine_dma.js
const fs = require('fs');
const path = require('path');
const { Machine, LINE, FRAME } = require('./machine.js');

const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'vic-dma.json'), 'utf8'));
const P = F.program;
const ENTRIES = { 6: [0xEA, 0xEA, 0xEA], 5: [0x24, 0xEA, 0xEA], 4: [0xAD, 0xEA, 0xEA] };   // frame.py's
let fails = 0, checked = 0;
function check(ok, what) { checked++; if (!ok) { fails++; console.log('FAIL ' + what); } }
const at = p => `line ${Math.floor(p / LINE)} cycle ${p % LINE + 1}`;

// frame.py's dma_table: $D011, $D015, $D017, the line to wait for, then $D000-$D00F
function table(c, line) {
  const t = [c.d011 === undefined ? 0x0B : c.d011, c.sprites || 0, c.expand || 0, line > 255 ? 0x80 : 0, line & 255];
  for (let n = 0; n < 8; n++) t.push(100, c.y || 0);
  return t;
}
// The program as frame.py lays it: the code, the slide of NOPs that jumps back to frame, the table.
function machine(c, line) {
  const ram = new Uint8Array(65536);
  ram.set(Buffer.from(P.code, 'hex'), P.org);
  ram.fill(0xEA, P.slide, P.slide + P.nops);
  ram.set([0x4C, P.frame & 255, P.frame >> 8], P.slide + P.nops);
  if (c.patch !== undefined) ram.set([0xA9, c.patch, 0x8D, 0x11, 0xD0], P.slide + P.patch);
  ram.set(table(c, line), P.table);
  return new Machine({ ram, pc: P.org, dma: true });
}

// A whole frame of NOPs: the cycles held, from the slide's start to its end.
function frame(c, { split } = {}) {
  let m = machine(c, P.frame_line), t0 = null, t1 = null;
  const hooks = mm => {
    mm.hooks[P.slide] = cpu => { if (t0 === null) t0 = cpu.cycles; return false; };
    mm.hooks[P.slide + P.nops] = cpu => { if (t0 !== null && t1 === null) t1 = cpu.cycles; return false; };
  };
  hooks(m);
  for (let f = 0; f < 5 && t1 === null; f++) {
    m.runFrames(1);
    if (split && t0 !== null && t1 === null) { m = Machine.restore(m.save()); hooks(m); split = false; }
  }
  return t1 - t0 - 2 * P.nops + (c.patch !== undefined ? 4 : 0);
}

for (const c of F.frames) {
  const held = frame(c);
  check(held === c.held, `a frame, ${c.name}: machine.js held ${held} cycles, VICE ${c.held}`);
}
const last = F.frames[F.frames.length - 1];
check(frame(last, { split: true }) === last.held, `a frame, ${last.name}, saved and restored partway: as VICE`);

// An interrupt handler runs whole, and the holds it ran past are added when it returns: a handler
// of NOPs taken on line 100, across bad lines, leaves the frame held as VICE's stream of NOPs is.
// The handler at $8000: INC $02; 1,000 NOPs; LDA #$FF; STA $D019; RTI, 2,024 cycles with the entry.
{
  const c = F.frames[0];
  const m = machine(c, P.frame_line), r = m.ram;
  r.set([0xE6, 0x02], 0x8000); r.fill(0xEA, 0x8002, 0x8002 + 1000);
  r.set([0xA9, 0xFF, 0x8D, 0x19, 0xD0, 0x40], 0x8002 + 1000);
  r[0xFFFE] = 0x00; r[0xFFFF] = 0x80; m.cmp = 100; m.enable = 1;
  let t0 = null, t1 = null, irqs = 0;
  m.hooks[P.slide] = cpu => { if (t0 === null) { t0 = cpu.cycles; cpu.i = 0; m.latch = 0; r[2] = 0; } return false; };
  m.hooks[P.slide + P.nops] = cpu => { if (t0 !== null && t1 === null) { t1 = cpu.cycles; irqs = r[2]; cpu.i = 1; } return false; };
  for (let f = 0; f < 5 && t1 === null; f++) m.runFrames(1);
  const held = t1 - t0 - 2 * P.nops - irqs * 2024;
  check(irqs === 1 && held === c.held, `a frame, ${c.name}, with an interrupt of NOPs across its bad lines: ` +
    `machine.js held ${held} cycles in ${irqs} interrupt(s), VICE ${c.held} in a stream of NOPs`);
}

// A window: passes entered by the clock's parity, as frame.py's are, each timed NOP by NOP from the
// slide's fill. A NOP that took 2 + n cycles met a hold of n. machine.js adds a hold at the first
// instruction boundary at or past its start, so the hold began in the NOP's second cycle or at its
// end; the passes run until one cycle is left.
for (const c of F.windows) {
  const m = machine(c, c.line);
  let pass = -1, times = null;
  const done = [];
  m.hooks[P.slide] = cpu => {                     // a hook is given the processor
    if (times) done.push(times);
    pass++; times = [];
    const e = Object.keys(ENTRIES).map(Number).find(k => (cpu.cycles + k - pass) % 2 === 0);
    m.ram.set(ENTRIES[e], P.slide);
    return false;
  };
  for (let a = P.slide + 3; a < P.slide + 103; a++) m.hooks[a] = cpu => { if (times) times.push(cpu.cycles); return false; };
  let first = null, held = new Set();
  for (let f = 0; f < 20 && (first === null || first.size > 1 || done.length < 2); f++) {
    m.runFrames(1);
    while (done.length) {
      const t = done.shift();
      const k = t.findIndex((v, i) => i && v - t[i - 1] > 2);
      if (k < 0) { check(false, `${c.name}: no NOP held in a pass`); continue; }
      const a = t[k - 1] % FRAME, n = t[k] - t[k - 1] - 2;
      const both = new Set([a + 1, a + 2]);
      first = first === null ? both : new Set([...first].filter(p => both.has(p)));
      held.add(n);
    }
  }
  const want = c.first[0] * LINE + c.first[1] - 1;
  const got = first && first.size === 1 ? [...first][0] : null;
  check(got === want, `${c.name}: machine.js held from ${got === null ? 'an uncertain cycle' : at(got)}, VICE from ${at(want)}`);
  check(held.size === 1 && held.has(c.held), `${c.name}: machine.js held ${[...held].join(' or ')} cycles, VICE ${c.held}`);
}

console.log(`${checked - fails} of ${checked} checks agree with VICE (${F.recorded}, ${F.emulator})`);
process.exit(fails ? 1 : 0);
