'use strict';
// The start-up ($3FFB-$42C6) against the game's, from the loader's hand-over (work/entry.vsf) to
// START, in the lockstep: memory and colour RAM compared where START begins. And the sum alone,
// on moments of play with the sum it expects set to theirs.
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));
const { loadPort } = require('./port.js');
const { check } = require('./check.js');
let f = 0;
{
  const m = lib.machine('entry', { passAt: 0x3B22 });
  const CM = loadPort();
  const P = CM.makePort(new Uint8Array(65536), {});
  P.START = function* () { yield { cp: 0x3B22 }; for (;;) yield { cp: 0x3B22 }; };
  const ls = new Lockstep({ machine: m, port: P, passAt: 0x3B22, checkpoints: [0x3B22],
    program: P => P.STARTUP({}), hooks: m.hooks, irqs: { 0xEA31: null } });
  const r = ls.run({ passes: 1 });
  console.log((r.ok && !r.diverged ? 'ok   ' : 'FAIL ') + 'STARTUP: ' + String(describe(r)).slice(0, 1500));
  if (!r.ok || r.diverged) f++;
}
// the sum on a moment of play, the start-up's bytes put back from the hand-over (the bitmap has
// drawn over them) and $42C5 set to the sum it comes to there
const ENTRY = lib.machine('entry', { passAt: 0x3B22 }).ram.slice(0x3FFB, 0x42C7);
const sum = M => {
  let s = 0;
  for (const [a, b] of [[0x0840, 0x42C5], [0x4F00, 0x5700], [0x5780, 0x8000], [0x80C0, 0xA200], [0xA380, 0xC000], [0xC780, 0xD000], [0xE000, 0xFFE2]])
    for (let i = a; i < b; i++) s += M[i];
  return s & 0xFFFF;
};
f += check({ name: 'CHECKSUM', cases: 20, outs: ['a', 'x', 'y'], setup: M => {
  M.set(ENTRY, 0x3FFB);
  const s = sum(M); M[0x42C5] = s & 255; M[0x42C6] = s >> 8;
} }).fails ? 1 : 0;
process.exitCode = f ? 1 : 0;
