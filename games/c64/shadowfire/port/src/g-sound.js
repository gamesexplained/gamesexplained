// The music ($1600-$1FC5): Fred Gray's driver, the game's own code, run on the kit's 6502 over
// the port's memory, its writes going to the SID through P.io. A music driver run on the kit's
// processor counts as a port (kit/skills/core/70-minisite, "The sound"); the page carries the
// driver's bytes for it, as its music player does.
(function (root) {
'use strict';
const G = root.SFGroups = root.SFGroups || {};
G.sound = function (P) {
  const M = P.M, io = P.io;
  let cpu = null;
  const core = () => {
    if (cpu) return cpu;
    const { CPU } = root.C64Cpu || require('../../../../../kit/cpu/cpu6502.js');
    cpu = new CPU(M, { port: { dir: 0x2F, data: M[1] }, io: { read: a => io.read(a), write: (a, v) => io.write(a, v) } });
    return cpu;
  };
  // play_music ($1606): a frame of the music, called by the interrupt. Its cycles on the core are
  // counted for the page's clock (P.N.music).
  P.play_music = function () {
    const c = core();
    c.portWrite(0, 0x2F); c.portWrite(1, M[1]);
    const c0 = c.cycles;
    c.call(0x1606, { d: 0 }, { maxSteps: 100000 });
    P.N.music += c.cycles - c0;
    return { a: c.a, x: c.x, y: c.y };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
