'use strict';
// The moments of play the routine checks start from (check.js), in work/states: every snapshot of
// play in work/ (orientation.md names them), as the machine's JSON. A snapshot taken inside the
// ROM's KEY-SCAN, which pushes nothing, starts the scan again from its entry, where the tests' machine
// stands in for it.
//   node port/test/states.js
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const W = path.join(lib.GAME, 'work');
const bot = require('./bot.js');
let n = 0;
// and from each, the bot plays on: a state every 400 frames for 4,000; from the moments in play of
// each scenario a longer game too, a state every 2,000 frames for 24,000, where the units meet
// and fight
const ON = +(process.env.FRAMES || 4000), EVERY = 400;
const LONG = +(process.env.LONG || 24000), LONG_EVERY = 2000;
const long = name => /^s1-play$|-controls$/.test(name);
const RARE = [[0x80CD, 'closeCombat'], [0x7F0B, 'attackTerrain'], [0x8E09, 'fireMode'], [0x8F9B, 'shoot'],
  [0x9232, 'autoFire'], [0x8742, 'unitInfo'], [0x8495, 'scanner'], [0x9696, 'explode'], [0x8229, 'unitDies'],
  [0xA4D9, 'gameOver'], [0x9A9C, 'throw'], [0x9D01, 'option5'], [0x9C42, 'option6'], [0x7A37, 'changeItem'],
  [0x7CAC, 'pickUp'], [0x7C0A, 'dropItem'], [0x79F7, 'openDoor'], [0x7A19, 'lockDoor'], [0x8F2C, 'shotSound']];
for (const f of fs.readdirSync(W).filter(f => /^s\d.*\.sna$/.test(f)).sort()) {
  const m = lib.fromSna(f.replace(/\.sna$/, ''));
  if (m.cpu.pc >= 0x028E && m.cpu.pc < 0x02BF) m.cpu.pc = 0x028E;
  if (m.cpu.pc < 0x4000 && m.cpu.pc !== 0x028E) throw new Error(f + ': the snapshot is in the ROM at ' + lib.hex(m.cpu.pc));
  const name = f.replace(/\.sna$/, '');
  lib.writeState(name, m);
  n++;
  bot.attach(m, n);
  // in a long game, the moments just before the rare routines run as well: the machine kept at
  // each of the bot's reads of the controls, and written when one of them is called, three a game
  let last = null;
  if (long(name)) {
    const prevC = m.hooks[0xB0C8];
    const at = mm => mm.ram[mm.cpu.sp] | mm.ram[mm.cpu.sp + 1 & 0xFFFF] << 8;
    // the bot's decisions before a rare routine: a unit's move ($6CEC), a menu ($68CE), aiming ($6223)
    m.hooks[0xB0C8] = mm => { const c = at(mm); if (c === 0x6CEC || c === 0x68CE || c === 0x6223) last = mm.save(); return prevC ? prevC(mm) : false; };
    for (const [a, label] of RARE) {
      let k = 0;
      const prev = m.hooks[a];
      m.hooks[a] = mm => {
        if (last && k < 3) { fs.writeFileSync(path.join(lib.STATES, name + '-at-' + label + '-' + k + '.json'), JSON.stringify(last)); k++; n++; }
        return prev ? prev(mm) : false;
      };
    }
  }
  const end = long(name) ? LONG : ON, every = long(name) ? LONG_EVERY : EVERY;
  for (let k = every; k <= end; k += every) {
    try { m.runFrames(every); } catch (e) { console.log(name + ': ' + e.message); break; }
    lib.writeState(name + '-' + String(k).padStart(5, '0'), m);
    n++;
  }
}
console.log(n + ' states in ' + path.relative(lib.GAME, lib.STATES));
