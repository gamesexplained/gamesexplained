// The sound driver ($AFC5-$B499): the music sequencer (music_tick), on CIA 1's timer B, and the
// sound update (sound_tick), on timer A, the game's own code run on the kit's 6502 over the port's
// memory, its writes going to the SID through P.io. A music driver run on the kit's processor
// counts as a port (kit/skills/core/70-minisite, "The sound"); the page carries the driver's bytes
// for it, as its music player does. The two share the driver's state, and one may come inside
// the other: the core reads that state, and every other byte in IRQ_BYTES, through P.irqByte, as
// the port's own code does where an interrupt can change a byte under it.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.sound = function (P) {
  const M = P.M, io = P.io;
  let cpu = null;
  const core = () => {
    if (cpu) return cpu;
    const { CPU } = root.C64Cpu || require('../../../../../kit/cpu/cpu6502.js');
    const B = new Uint8Array(65536);
    for (const a of P.IRQ_SET) B[a] = 1;
    class SoundCPU extends CPU {
      rd(a) { return B[a] && this.rk[a >>> 8] === this.rk[2] ? P.irqByte(a) : super.rd(a); }
      rdz(a) { return B[a] ? P.irqByte(a) : super.rdz(a); }
      // before each instruction, a page's clock may take the interrupts that fall due inside the
      // routine (io.between): it pays the cycles to here, which are then not counted again
      step() { if (io.between && io.between(this.cycles - start)) start = this.cycles; return super.step(); }
    }
    // a page's clock is told how far into the routine each access to the chips falls (io.within),
    // so that a timer the driver stops and starts again stands still as long as on the C64
    const within = () => { if (io.within) io.within(cpu.cycles - start); };
    cpu = new SoundCPU(M, { port: { dir: 0x2F, data: M[1] }, io: { read: a => (within(), io.read(a)), write: (a, v) => (within(), io.write(a, v)) } });
    return cpu;
  };
  let start = 0, running = 0;
  // A routine of the driver, run on the core; its cycles counted for the page's clock (P.NI.sound,
  // or P.N.sound from the main program). One that comes inside another (io.between) runs on the
  // core's stack below it, and the other goes on as it was.
  const run = (address, r, counts) => {
    const c = core();
    const outer = running++ ? { pc: c.pc, sp: c.sp, a: c.a, x: c.x, y: c.y, p: c.p, start } : null;
    c.portWrite(0, 0x2F); c.portWrite(1, M[1]);
    const regs = { d: 0 };
    for (const k of ['a', 'x', 'y', 'c']) if (r && r[k] !== undefined) regs[k] = r[k];
    if (outer) regs.sp = (outer.sp - 8) & 0xFF;
    start = c.cycles;
    let out;
    try {
      c.call(address, regs, { maxSteps: 100000 });
      counts.sound = (counts.sound || 0) + c.cycles - start;
      out = { a: c.a, x: c.x, y: c.y };
    } finally {
      running--;
      if (io.within) io.within(null);
      if (outer) { c.pc = outer.pc; c.sp = outer.sp; c.a = outer.a; c.x = outer.x; c.y = outer.y; c.p = outer.p; start = outer.start; }
    }
    return out;
  };
  // music_tick ($AFC5): the sequencer's frame, the tracks' notes and commands, and the requests
  // the game made started.
  P.music_tick = r => run(0xAFC5, r, P.NI);
  // sound_tick ($B47D): the voices' effects and the filter's sweep, and the shadow SID copied in.
  P.sound_tick = r => run(0xB47D, r, P.NI);
  // silence_sid ($B43F): the shadow SID and the chip cleared, every track and request stopped, the
  // volume at 15. Called from the main program.
  P.silence_sid = r => run(0xB43F, r, P.N);
};
})(typeof window !== 'undefined' ? window : globalThis);
