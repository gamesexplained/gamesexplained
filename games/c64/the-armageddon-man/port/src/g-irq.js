// The raster interrupt (irq, $624C) and the sound. Once a frame on line $EB the interrupt
// acknowledges itself, sets its line again, plays the sound, runs its hook (the routine whose address
// is at $6286: nothing, the radio's scan, or the unscrambling of a radio message) with the main
// program's pointers at $80-$89 kept, and counts delay_count down.
//
// The sound is the game's own driver ($4000-$4DE7), run on the kit's 6502 over the port's memory, its
// writes going to the SID through P.io: a music driver run on the kit's processor counts as a port
// (kit/skills/core/70-minisite, "The sound"). The game calls it in two places, the interrupt's
// sound_irq ($413A) and the options panel's mus_start_tune ($4000); its effects start from the
// tune's own commands.
(function (root) {
'use strict';
const G = root.AMGroups = root.AMGroups || {};
G.irq = function (P) {
  const M = P.M;
  P.inIrq = 0;
  P.count = (k, n = 1) => { const c = P.inIrq ? P.NI : P.N; c[k] = (c[k] || 0) + n; };
  const HOOKS = { 0x8DDA: 'no_hook', 0x74A5: 'radio_scan_irq', 0x7AA6: 'unscramble_irq' };
  P.irq = function () {
    for (const k in P.NI) P.NI[k] = 0;   // the counts are this interrupt's own
    P.inIrq++;
    try {
      const s01 = M[1];
      P.io_in();
      P.io.vicWrite(0x19, 0x01);
      P.io.vicWrite(0x12, M[0x4E8F]);
      P.sound_irq();
      const keep = [0x84, 0x85, 0x82, 0x83, 0x80, 0x81, 0x86, 0x87, 0x88, 0x89].map(a => M[a]);
      const at = M[0x6286] | M[0x6287] << 8;
      const hook = HOOKS[at];
      if (!hook) throw new Error('irq: no hook at $' + at.toString(16));
      P[hook]();
      [0x84, 0x85, 0x82, 0x83, 0x80, 0x81, 0x86, 0x87, 0x88, 0x89].forEach((a, i) => { M[a] = keep[i]; });
      if (!(M[0x4E8E] & 0x80) && !M[0x4E90]) {
        P.io_out();
        if (M[0x734B]) M[0x734B]--;
      }
      P.io_in();
      M[1] = s01;
    } finally { P.inIrq--; }
  };

  // ---- the sound driver, on the kit's 6502
  let cpu = null;
  const core = () => {
    if (cpu) return cpu;
    const { CPU } = root.C64Cpu || require('../../../../../kit/cpu/cpu6502.js');
    cpu = new CPU(M, { port: { dir: 0x2F, data: M[1] }, io: { read: a => P.io.read(a), write: (a, v) => P.io.write(a, v) } });
    return cpu;
  };
  const run = (address, r) => {
    const c = core();
    c.portWrite(0, 0x2F); c.portWrite(1, M[1]);
    const regs = { d: 0 };
    for (const k of ['a', 'x', 'y', 'c']) if (r && r[k] !== undefined) regs[k] = r[k];
    const start = c.cycles;
    c.call(address, regs, { maxSteps: 100000 });
    P.count('sound', c.cycles - start);
    return { a: c.a, x: c.x, y: c.y };
  };
  P.sound_irq = r => run(0x413A, r);
  P.mus_start_tune = r => run(0x4000, r);
};
})(typeof window !== 'undefined' ? window : globalThis);
