// The sound: Castle Master's own driver ($C800-$CFEE, its tables $065A-$1046), run on the kit's 6502
// (kit/c64/cpu6502.js, the site's lib/cpu6502.js as C64Cpu) over the game's memory, as the How it
// works page's tune player runs it (cm-music). A music driver run on the kit's 6502 counts as a port
// (kit/skills/core/70-minisite). Its four entries are the game's: SID_PLAYER_INITIALIZE ($CF1B, a
// tune or an effect in A), SID_PLAYER_TICK ($C885, once a frame from the raster interrupt),
// SID_INITIALIZE_IF_ENABLED ($CFD8, an effect when the sound switch is on effects) and
// SID_CLEAR_REGISTERS ($CFE4). It keeps its state where the game does, at $C800-$CFFF and in the
// zero page ($F7-$FE), patches its own operands, and writes the SID through P.io; a read of a
// voice's register gets the chip's bus, as the game's decrement in place at $CF1B does. A call
// returns through $01FE-$01FF, which the game's own stack never reaches in a call from the
// interrupt or from the routines that start an effect.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.sound = function (P) {
  const C64Cpu = root.C64Cpu || require('../../../../../kit/c64/cpu6502.js');
  const sid = ad => {
    if (ad < 0xD400 || ad >= 0xD800) throw new Error('the sound driver: $' + ad.toString(16) + ' is not the SID');
    return ad & 0x1F;
  };
  const cpu = new C64Cpu.CPU(P.M, { port: 0x35, io: {
    read: ad => P.io.sidRead(sid(ad)),
    write: (ad, v) => P.io.sidWrite(sid(ad), v),
  } });
  // a call of the driver with A, X, Y and the carry, from the stack's top; the registers it leaves
  function call(entry, r) {
    cpu.call(entry, { a: r.a, x: r.x, y: r.y, c: r.c, n: 0, v: 0, d: 0, z: 0 }, { maxSteps: 200000 });
    return Object.assign({}, r, { a: cpu.a, x: cpu.x, y: cpu.y, c: cpu.c, z: cpu.z, n: cpu.n });
  }
  const regs = r => Object.assign({ a: 0, x: 0, y: 0, c: 0 }, r);
  P.SID_PLAYER_INITIALIZE = r => call(0xCF1B, regs(r));
  P.SID_PLAYER_TICK = r => call(0xC885, regs(r));
  P.SID_INITIALIZE_IF_ENABLED = r => call(0xCFD8, regs(r));
  P.SID_CLEAR_REGISTERS = r => call(0xCFE4, regs(r));
};
})(typeof window !== 'undefined' ? window : globalThis);
