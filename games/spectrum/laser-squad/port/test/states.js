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
// and from each, the bot plays on: a state every 400 frames for 4,000
const ON = +(process.env.FRAMES || 4000), EVERY = 400;
for (const f of fs.readdirSync(W).filter(f => /^s\d.*\.sna$/.test(f)).sort()) {
  const m = lib.fromSna(f.replace(/\.sna$/, ''));
  if (m.cpu.pc >= 0x028E && m.cpu.pc < 0x02BF) m.cpu.pc = 0x028E;
  if (m.cpu.pc < 0x4000 && m.cpu.pc !== 0x028E) throw new Error(f + ': the snapshot is in the ROM at ' + lib.hex(m.cpu.pc));
  const name = f.replace(/\.sna$/, '');
  lib.writeState(name, m);
  n++;
  bot.attach(m, n);
  for (let k = EVERY; k <= ON; k += EVERY) {
    try { m.runFrames(EVERY); } catch (e) { console.log(name + ': ' + e.message); break; }
    lib.writeState(name + '-' + String(k).padStart(5, '0'), m);
    n++;
  }
}
console.log(n + ' states in ' + path.relative(lib.GAME, lib.STATES));
