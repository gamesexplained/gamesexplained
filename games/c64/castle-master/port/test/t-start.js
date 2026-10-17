'use strict';
// The start alone in lockstep with the game: from the loader's jump (work/entry.vsf), the title's
// menus with a language and a character chosen (each of the six), RETURN on each, a key to open the
// view, and then
// passes of play with random controls as test/lockstep.js holds them. Memory is compared at every
// pass from the first, so the language's messages copied and the new session are checked there.
//   node t-start.js [passes]
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));
const standin = require('./standin.js');
const { loadPort } = require('./port.js');
const { IRQ_BYTES, IGNORE } = require('./lockstep.js');

function run(lang, who, passes, seed, o = {}) {
  const CM = loadPort();
  const m = lib.machine('entry');
  const P = CM.makePort(new Uint8Array(65536), {});
  standin.install(P, IRQ_BYTES);
  if (o.onPort) o.onPort(P, m);
  const ls = new Lockstep({ machine: m, port: P, program: P => P.start(), checkpoints: P.CHECKPOINTS,
    irqs: { 0xFF48: 'IRQ_DISPATCH' }, irqBytes: IRQ_BYTES, chips: ['colour', 'vic', 'sid'], ignore: IGNORE, maxFrames: 1500, timing: o.timing });
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  // each key where the game waits for it: the two menus, then the view's opening
  const steps = [[String(lang), 0x9B1C], ['RETURN', 0x9B1C], [String(who), 0x9C97], ['RETURN', 0x9C97], ['SPACE', 0x8333]];
  let step = 0, held = null, at = 0, s = seed;
  const rnd = n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return Math.floor(s / 4294967296 * n); };
  const KEYS = ['UP', 'UP', '=', 'Z', 'X', 'P', 'L', 'C', 'W', 'R', 'U', 'SPACE'];
  let play = null, until = 0;
  const res = ls.run({ passes, stopOnDiff: true,
    onFrame: (f, mm, l) => {
      const still = l.matched && l.at >= 0;
      if (!still) return;
      if (held && f - at > 5) { mm.release(held); held = null; at = f; return; }
      if (!held && step < steps.length && f - at > 40 && l.at === steps[step][1]) { held = steps[step++][0]; mm.press(held); at = f; }
      if (play && l.res.passes === 0) { mm.release(play); play = null; }
    },
    onPass: (n, mm) => {
      if (play && n >= until) { mm.release(play); play = null; }
      if (!play && rnd(5) === 0) { play = KEYS[rnd(KEYS.length)]; mm.press(play); until = n + 1 + rnd(6); }
    } });
  return res;
}
module.exports = { run };
if (require.main === module) {
  const passes = +(process.argv[2] || 40);
  let bad = 0, n = 0;
  for (const lang of [1, 2, 3]) for (const who of [1, 2]) {
    n++;
    const r = run(lang, who, passes, lang * 7 + who);
    console.log('language ' + lang + ', character ' + who + ': ' + describe(r).split('\n').join('\n  '));
    if (!r.ok) bad++;
  }
  console.log((n - bad) + '/' + n + ' starts in step');
  process.exitCode = bad ? 1 : 0;
}
