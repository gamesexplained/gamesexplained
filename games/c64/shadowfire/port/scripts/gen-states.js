'use strict';
// The moments of play the port's tests start from, saved to work/states (never committed), each
// stopped where a pass of the command loop starts (lib.PASS, icon_poll) with no choice under way
// (icon_group, $543E, clear), so that the port's main program can take up the loop there:
// - win-NNNNNN: the Solution tab's game (solution-input.json) replayed from the game's first
//   instruction, a moment every 6,000 frames, on a copy of the machine, so that the replay goes on
//   as recorded;
// - demo-NNNNN: the demonstration, which starts when no key is pressed on the control menu, a
//   moment every 1,500 frames.
//   node port/scripts/gen-states.js
const fs = require('fs');
const lib = require('../test/lib.js');

const out = [];
// a copy of m run on to the next pass with no choice under way, saved as name
function keep(m, name) {
  const c = lib.restore(m.save());
  const S = lib.player(c);
  for (let n = 0; n < 50; n++) {
    S.stopAt(lib.PASS, 600);
    if (!c.ram[0x543E]) { lib.save(c, name); out.push(name); return; }
    c.runCycles(200);
  }
  console.log(name + ': no pass outside a choice');
}

fs.mkdirSync(lib.STATES, { recursive: true });
for (const f of lib.states()) fs.unlinkSync(require('path').join(lib.STATES, f));

{
  const rec = lib.solution(), m = lib.boot({ dma: rec.dma });
  for (let f = 0; f < rec.joy.length; f++) {
    if (f === rec.f3[0]) m.press(lib.KEY.F3);
    if (f === rec.f3[1]) m.release(lib.KEY.F3);
    m.joy1 = 0x1F & ~rec.joy[f];
    m.runFrames(1);
    if (f && f % 6000 === 0) keep(m, 'win-' + String(f).padStart(6, '0'));
  }
  keep(m, 'win-end');
}
{
  const m = lib.boot();
  for (let f = 1; f <= 12000; f++) {
    m.runFrames(1);
    if (f % 1500 === 0) keep(m, 'demo-' + String(f).padStart(5, '0'));
  }
}
console.log(out.length + ' moments in ' + lib.STATES);
