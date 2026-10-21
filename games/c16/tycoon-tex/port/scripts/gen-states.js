'use strict';
// Moments of play for the routine tests (port/test/lib.js): the game on the kit's C16
// (kit/c16/machine.js), booted from listing.json (lib.js, boot) and played by the lockstep's
// script (test/lockstep.js, player): every menu choice, the demo, deaths, levels finished up to
// 12, the pressure run out and a name typed for the high scores. Its whole state is saved at the
// main loop's pass ($2A28) now and then. The states hold the game's memory, so they go in the
// gitignored work/states/ and nowhere else.
// node games/c16/tycoon-tex/port/scripts/gen-states.js [frames]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '../../../..');
const { Machine } = require(path.join(REPO, 'kit/c16/machine.js'));
const { boot } = require('../test/lib.js');
const { player, PASS, CHROUT } = require('../test/lockstep.js');

const OUT = path.join(ROOT, '../work/states');
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.json')) fs.unlinkSync(path.join(OUT, f));

const frames = +process.argv[2] || 30000;
const ram = boot();
const m = new Machine({ ram, pc: 0x1800, passAt: PASS, hooks: { 0xFFD2: CHROUT(ram) } });
const pl = player(7);
Object.assign(m.hooks, pl.hooks(m));
let saved = 0, n = 0, keep = false;
m.onPass = mm => { pl.onPass(n, mm, null); if (++n % 40 === 0) keep = true; };
while (m.frames < frames) {
  m.runFrames(1);
  // a pass begun in this frame: run on to the next and save it there
  if (keep && m.ram[0x38] === 0 && m.runPasses(1, 50)) {
    fs.writeFileSync(path.join(OUT, 's' + String(saved++).padStart(4, '0') + '.json'), JSON.stringify(m.save()));
  }
  keep = false;
}
console.log(saved + ' states in ' + m.frames + ' frames, ' + (pl.S.game + 1) + ' games');
