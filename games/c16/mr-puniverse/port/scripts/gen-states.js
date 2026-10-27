'use strict';
// Moments of play for the routine tests (port/test/lib.js): the game on the kit's C16
// (kit/c16/machine.js), booted as the tape hands over (lib.js, boot) and played by the lockstep's
// script (test/lockstep.js, player): each menu choice, the pokes, pauses, deaths and every room.
// Its whole state is saved at the main loop's pass ($32BC) now and then. The states hold the
// game's memory, so they go in the gitignored work/states/ and nowhere else.
// node games/c16/mr-puniverse/port/scripts/gen-states.js [frames]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { boot } = require('../test/lib.js');
const { player, machine } = require('../test/lockstep.js');

const OUT = path.join(ROOT, '../work/states');
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.json')) fs.unlinkSync(path.join(OUT, f));

const frames = +process.argv[2] || 40000;
const m = machine(boot());
const pl = player(7);
Object.assign(m.hooks, pl.hooks(m));
let saved = 0, n = 0, keep = false;
m.onPass = mm => { pl.onPass(n, mm, null); if (++n % 15 === 0) keep = true; return keep; };
while (m.frames < frames) {
  m.runFrames(1);
  // a pass has just begun: save it there
  if (keep && m.cpu.pc === 0x32BC) {
    fs.writeFileSync(path.join(OUT, 's' + String(saved++).padStart(4, '0') + '.json'), JSON.stringify(m.save()));
    keep = false;
  }
}
console.log(saved + ' states in ' + m.frames + ' frames, ' + (pl.S.game + 1) + ' games, rooms ' + [...pl.S.rooms].sort((a, b) => a - b).join(' '));
