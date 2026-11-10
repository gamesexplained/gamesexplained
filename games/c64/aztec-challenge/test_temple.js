#!/usr/bin/env node
// Hold the Graphics tab's temple (graphics.html, block az-temple, azTemple) against the game's own
// temple_grow ($62E0) run on the kit's 6502 over the listing. The game's path: the Gauntlet's set-up
// stores the start values ($6073-$6083: $40/$41 = $05B8, $42/$43 = $D9B8, $44 = 120) and the
// progress stage $45 is 0 (the level's music_reset, $1CA0, clears it); then $62E0 is called, once
// at the start ($6097) and every 88 steps after ($6216). After each call up to the eighth, every
// screen byte and every colour byte the routine has written must be what the port says for that
// stage, and nothing else written; and both must agree on every colour the phase gives ($5E: 11 by
// day, 8 at night). A ninth call would end the level ($6347), which the port leaves out.
// It exits 1 on any difference.
//   node games/c64/aztec-challenge/test_temple.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { azTemple } = g.run('graphics.html', 'az-temple', 'azTemple');
const L = g.listing();
let bad = 0, checked = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const colour of [11, 8]) {
  const m = L.ram.slice(), col = new Map();
  const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a, v) { if (a >= 0xD800 && a < 0xDC00) col.set(a, v); else throw new Error('write $' + a.toString(16)); } };
  const cpu = new CPU(m, { port: 0x37, io });
  Object.assign(m, { 0x40: 0xB8, 0x41: 0x05, 0x42: 0xB8, 0x43: 0xD9, 0x44: 0x78, 0x45: 0, 0x5E: colour });
  const before = L.ram.slice(0x0400, 0x0800);
  for (let stage = 0; stage < 8; stage++) {
    cpu.call(0x62E0, {}, { maxSteps: 10000 });
    const want = azTemple(L.ram, stage, colour);
    for (let a = 0x0400; a < 0x0800; a++) {
      const got = m[a] !== before[a - 0x400] || want.scr.has(a) ? m[a] : null;
      const exp = want.scr.has(a) ? want.scr.get(a) : (m[a] !== before[a - 0x400] ? before[a - 0x400] : null);
      if (got !== exp) fail('colour', colour, 'stage', stage, 'screen $' + a.toString(16), 'game', got, 'page', exp);
      checked++;
    }
    for (const [a, v] of col) if (want.col.get(a) !== v) fail('colour', colour, 'stage', stage, 'colour $' + a.toString(16), 'game', v, 'page', want.col.get(a));
    for (const [a, v] of want.col) if (col.get(a) !== v) fail('colour', colour, 'stage', stage, 'colour $' + a.toString(16), 'page', v, 'game', col.get(a));
    if (m[0x45] !== stage + 1) fail('stage', stage, 'the game\'s $45 is', m[0x45]);
  }
}
console.log(`2 colours x 8 stages, ${checked} screen bytes: ` + (bad ? bad + ' differences' : 'every byte the page draws is the one the game writes'));
process.exit(bad ? 1 : 0);
