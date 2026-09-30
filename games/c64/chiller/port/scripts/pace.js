'use strict';
// The pace check: from a new game on each level, main-loop passes in the same frames with the same
// joystick, on the machine (the game's code) and in the page's runtime (the port with cost.json).
// node scripts/pace.js [frames]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { boot } = require(path.join(ROOT, 'machine.js')), { toLevel } = require(path.join(ROOT, 'jump.js'));
for (const f of ['kernal', 'core', 'g-fabric', 'g-player', 'g-energy', 'g-enemies', 'g-screens', 'screen', 'runtime']) require(path.join(ROOT, 'src', f + '.js'));
const cost = JSON.parse(fs.readFileSync(path.join(ROOT, 'cost.json'), 'utf8'));
const frames = +(process.argv[2] || 400), FRAME = 63 * 312;
const INPUT = [['standing', 0x1F], ['walking right', 0x17], ['walking left', 0x1B]];
console.log('level, input: passes on the machine / in the runtime');
for (let n = 0; n < 10; n++) for (const [what, joy] of INPUT) {
  const m = boot();
  m.runUntilPass(() => true);
  toLevel(m, n);
  m.joy = joy;
  const p0 = m.passes; m.runFrames(frames); const game = m.passes - p0;
  // the runtime from its own boot to the game's first pass, the jump, then the same input
  const rt2 = globalThis.ChillerRuntime.create(require(path.join(ROOT, 'machine.js')).boot().ram, { cost });
  rt2.jump(n); rt2.busy = true;
  while (rt2.busy) rt2.runTo(rt2.cycles + FRAME);
  let passes = 0; const ps = rt2.P.collect_check; rt2.P.collect_check = function (...a) { passes++; return ps.apply(this, a); };
  rt2.chips.joy = joy;
  rt2.runTo(rt2.cycles + frames * FRAME);
  console.log(n + ', ' + what + ': ' + game + ' / ' + passes);
}
