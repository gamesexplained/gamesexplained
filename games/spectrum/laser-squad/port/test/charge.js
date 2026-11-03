'use strict';
// Paradise Valley beside the game (lockstep.js), with the first side's placing squares moved to
// the marsh beside the river, where the Water Dwellers arrive, so that their charges and their
// close combat are played as well as their shots. Prints how often each of the computer's
// routines ran, those of a charge (charge:) apart, and who fought hand to hand (@0 the first
// side, @1 the second).
//   node charge.js [passes] [seed] [level]
const path = require('path');
const lib = require('./lib.js');
const tb = lib.tapeBlocks;
lib.tapeBlocks = () => {
  const blocks = tb();
  for (const b of blocks) {
    const x = b.bytes;
    if (x.length !== 18911 || x[0] !== 0xC3 || x[1] !== 0xD3 || x[2] !== 0xB8) continue;
    const map = 0xD6BF - 0xB621;
    let n = 0;
    for (let i = 0; i < 4000; i++) if (x[map + i] === 0x3D) x[map + i] = 0x01;
    for (let r = 3; r < 16; r++) for (let c = 70; c < 76; c++) {
      const v = x[map + 80 * r + c];
      if (v === 0x31 || v === 0x32) { x[map + 80 * r + c] = 0x3D; n++; }
    }
    if (process.env.LS8_LOG) console.log('placing squares by the river:', n);
  }
  return blocks;
};
const lsm = require('./lockstep.js');
const [passes, seed, level] = [6000, 3, 3].map((d, i) => +(process.argv[2 + i] || d));
const counts = {};
const t0 = Date.now();
let out;
try {
  out = lsm.run({ passes, scenario: 6, seed, players: 1, level, maxFrames: 40000, onPort: P => {
    for (const id of Object.keys(P.SC)) {
      const R = P.SC[id].ai;
      if (!R) continue;
      for (const k of Object.keys(R)) {
        const f = R[k];
        R[k] = f.constructor.name === 'GeneratorFunction'
          ? function* (...a) { counts[k] = (counts[k] || 0) + 1; if (P.M[0xBE24]) counts['charge:' + k] = (counts['charge:' + k] || 0) + 1; return yield* f.apply(this, a); }
          : function (...a) { counts[k] = (counts[k] || 0) + 1; if (k === 'aiCanGo' && P.M[0xBE24]) counts.chargeSet = (counts.chargeSet || 0) + 1; return f.apply(this, a); };
      }
    }
    for (const k of ['closeCombat', 'snapShot', 'aimedShot', 'autoOne']) {
      const f = P[k];
      P[k] = function* (...a) { const n = 'P.' + k + (P.M[0xB712] ? '@1' : '@0'); counts[n] = (counts[n] || 0) + 1; return yield* f.apply(this, a); };
    }
  } });
} catch (e) { console.log((e.stack || e.message).split('\n').slice(0, 8).join('\n')); process.exit(1); }
const { describe } = require(path.join(lib.ROOT, 'kit/spectrum/lockstep.js'));
if (out) console.log('paradise by the river, seed ' + seed + ' level ' + level + ' (' + (Date.now() - t0) + ' ms, turn ' + out.m.ram[0xB711] + '): ' + describe(out.res));
console.log(JSON.stringify(counts));
process.exitCode = out.res.ok ? 0 : 1;
