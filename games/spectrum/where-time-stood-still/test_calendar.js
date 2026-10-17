'use strict';
// The Discoveries tab's calendar, the block /* wtss-calendar */, against the game's own page turn
// (bank 0 $F465, in main) run on the kit's Z80 from the listing: every day from 1 to 31 in every
// month byte from 0 to 3 and $FF, the byte new game leaves. Exits 1 on any difference.
// node games/spectrum/where-time-stood-still/test_calendar.js
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const { CPU } = require(path.join(ROOT, 'kit', 'spectrum', 'z80.js'));
const { game } = require(path.join(ROOT, 'kit', 'scripts', 'port_check.js'));
const g = game(__dirname);
const { turnPage } = g.run('discoveries.html', 'wtss-calendar', 'turnPage');
let fails = 0, cases = 0;
for (const month of [0, 1, 2, 3, 0xFF]) for (let day = 1; day <= 31; day++) {
  const m = g.listing('parts/main/listing.json').ram;
  const cpu = new CPU(m, { io: { out(port) { throw new Error('out to ' + port.toString(16)); }, in(port) { throw new Error('in from ' + port.toString(16)); } } });
  m[0x8D14] = day; m[0x8D15] = month; m[0xBF29] = 4;   // the clock sets $BF29 to 4 at midnight
  cpu.setRegs({ pc: 0xF465, sp: 0x5FF0 }); m[0x5FF0] = 0; m[0x5FF1] = 0;
  for (let n = 0; cpu.pc !== 0; n++) { if (n > 1e6) throw new Error('runaway'); cpu.step(); }
  const [d, mo] = turnPage(day, month);
  cases++;
  if (d !== m[0x8D14] || mo !== m[0x8D15]) { fails++; console.log(`FAIL day ${day}, month ${month}: the game gives ${m[0x8D14]}, ${m[0x8D15]}, the page ${d}, ${mo}`); }
}
console.log(fails ? `${fails} of ${cases} differ` : `ok   all ${cases} page turns are the game's`);
process.exit(fails ? 1 : 0);
