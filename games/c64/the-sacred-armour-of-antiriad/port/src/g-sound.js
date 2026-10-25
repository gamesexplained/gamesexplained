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
    }
    cpu = new SoundCPU(M, { port: { dir: 0x2F, data: M[1] }, io: { read: a => io.read(a), write: (a, v) => io.write(a, v) } });
    return cpu;
  };
  // A routine of the driver, run on the core; its cycles counted for the page's clock (P.NI.sound,
  // or P.N.sound from the main program).
  const run = (address, r, counts) => {
    const c = core();
    c.portWrite(0, 0x2F); c.portWrite(1, M[1]);
    const regs = { d: 0 };
    for (const k of ['a', 'x', 'y', 'c']) if (r && r[k] !== undefined) regs[k] = r[k];
    const c0 = c.cycles;
    c.call(address, regs, { maxSteps: 100000 });
    counts.sound = (counts.sound || 0) + c.cycles - c0;
    return { a: c.a, x: c.x, y: c.y };
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
