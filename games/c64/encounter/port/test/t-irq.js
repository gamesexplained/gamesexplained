'use strict';
// The raster handlers' cycles (src/g-irq.js) against the game's on the kit's C64: at every
// interrupt of a session, the port's handler run on a copy of the game's memory as the interrupt
// came, its chip writes, their values and the cycles they land on (io.cycle), and its whole
// length (P.irqCycles), beside the game's, counted from the interrupt's take as the port counts
// them from a take a cycle into the line, the video chip's cycles left out. The sessions are the
// lockstep's (test/lockstep.js): the title, the demonstration, play with its sounds, warps, deaths.
//   node t-irq.js [passes]
const lib = require('./lib.js');
const lockstep = require('./lockstep.js');

const passes = +(process.argv[2] || 400);
let irqs = 0, bad = 0;
const byName = {};
for (const session of Object.keys(lockstep.SESSIONS)) {
  const P = lib.EP.makePort(new Uint8Array(65536), {});
  let cyc = 0, got = [];
  P.io = { vicWrite: (r, v) => got.push([0xD000 + (r & 0x3F), v & 255, cyc]), sidWrite: (r, v) => got.push([0xD400 + (r & 0x1F), v & 255, cyc]),
    cycle: n => { cyc = n; } };
  let m = null, taken = 0, take = 0, dma0 = 0, name = null, want = [];
  const watch = (p, machine) => {
    m = machine;
    const cu = m.dmaCatchUp;
    m.dmaCatchUp = function () { const c = this.cpu.cycles; cu.call(this); taken += this.cpu.cycles - c; };
    const onInterrupt = m.onInterrupt, onReturn = m.onReturn, ioWrite = m.ioWrite;
    m.onInterrupt = (mm, v) => {
      if (onInterrupt) onInterrupt(mm, v);
      if (mm.depth) return;
      name = lockstep.IRQS[mm.ram[0x0314] | mm.ram[0x0315] << 8];
      take = mm.cpu.cycles; dma0 = taken; want = [];
      if (!name) return;
      P.M.set(mm.ram); got = []; cyc = 0;
      P[name]();
    };
    m.onReturn = (mm, v, c) => {
      if (onReturn) onReturn(mm, v, c);
      if (mm.depth || !name) return;
      const len = mm.cpu.cycles - take - (taken - dma0) + 1;
      want.push(['end', len]); got.push(['end', P.irqCycles]);
      const a = JSON.stringify(want), b = JSON.stringify(got);
      const s = byName[name] || (byName[name] = { n: 0, bad: 0 });
      s.n++; irqs++;
      if (a !== b) { s.bad++; if (++bad <= 5) console.log(session + ' ' + name + '\n  game ' + a + '\n  port ' + b); }
      name = null;
    };
    m.ioWrite = function (a, v) {
      if (name && this.depth === 1 && a >= 0xD000 && a < 0xD800) want.push([a & 0xFFFF, v & 255, this.cpu.cycles - 1 - take - (taken - dma0) + 1]);
      return ioWrite.call(this, a, v);
    };
  };
  lockstep.run({ session, passes, seed: 3, onPort: watch });
}
for (const [k, s] of Object.entries(byName)) console.log(k + ': ' + s.n + ' interrupts, ' + s.bad + ' differ');
console.log(irqs + ' interrupts, ' + bad + ' differ');
process.exitCode = bad || !irqs ? 1 : 0;
