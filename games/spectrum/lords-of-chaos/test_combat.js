'use strict';
// The page's blow (the block loc-combat, index.html) against the game's own strike_hit from $8645,
// run on the kit's Z80 from the committed listing: every combat and defence from 0 to 255, with the
// random number (random_below_a $A734) fixed at each value below the limit the game asks for, in
// steps; the damage the game passes to damage_and_rider ($78D6), or none, compared with the page's.
//   node games/spectrum/lords-of-chaos/test_combat.js
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { memory, call } = require('./port/test/game.js');
const g = game(__dirname);
const { LOCCombat } = g.run('index.html', 'loc-combat', 'LOCCombat');

const ret = cpu => { cpu.pc = cpu.m[cpu.sp] | cpu.m[(cpu.sp + 1) & 0xFFFF] << 8; cpu.sp = (cpu.sp + 2) & 0xFFFF; return true; };
const M = memory(1);
let fails = 0, cases = 0;
for (let c = 0; c < 256; c++) for (let d = 0; d < 256; d += 3) {
  let limit = -1, roll = 0, dealt = 0;
  const hooks = {
    0xA734: cpu => { limit = cpu.a || 256; cpu.a = roll; return ret(cpu); },
    0x78D6: cpu => { dealt = cpu.a; return ret(cpu); },
    0x798B: cpu => ret(cpu),
  };
  for (roll = 0; ; roll += 7) {
    M[0xFF62] = c; M[0xD1FF] = d; dealt = 0;
    call(M, 0x8645, {}, { hooks });
    if (roll >= limit) break;
    cases++;
    const want = LOCCombat.damage(c, d, roll);
    if (dealt !== want || limit !== LOCCombat.limit(c)) {
      if (fails++ < 5) console.log(`FAIL combat ${c}, defence ${d}, roll ${roll}: game limit ${limit}, damage ${dealt}; page limit ${LOCCombat.limit(c)}, damage ${want}`);
    }
  }
}
console.log(fails ? `FAIL: ${fails} of ${cases} blows differ` : `ok - ${cases} blows as the game strikes them`);
process.exit(fails ? 1 : 0);
