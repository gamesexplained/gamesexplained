#!/usr/bin/env node
// Hold the Discoveries tab's time bonus against the game's own code. discoveries.html's pd-bonus
// block (pdBonus) is a port of show_bonus ($10B4) and count_bonus ($10DA). Here those two routines
// run on the kit's simulator over the listing's memory, for every second on the clock from 00 to 59
// (a byte of two decimal digits at $53E0) and for the minutes ($53DF) at 0, 1 and 9, with the score
// at 0: wait_frame ($5018) is stood in for, and draw_bonus_digits ($1105) is watched, so the test
// sees each byte the panel's two bonus digits are drawn from. The port must show the same byte
// first, the same byte after every count, the same number of counts, and pay what the game adds to
// the score. It exits 1 on any difference.
//   node games/c64/power-drift/test_bonus.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { pdBonus } = g.run('discoveries.html', 'pd-bonus', 'pdBonus');
const L = g.listing();
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
const fromBcd = (b) => (b >> 4) * 10 + (b & 15);
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const mins of [0x00, 0x01, 0x09]) for (let s = 0; s < 60; s++) {
  const secs = Math.floor(s / 10) << 4 | s % 10;
  const m = L.ram.slice(), cpu = new CPU(m, { port: 0x35, io });
  m[0x53DF] = mins; m[0x53E0] = secs; m[0x53DC] = m[0x53DD] = m[0x53DE] = 0;
  const drawn = [];
  const watch = { 0x1105: (c) => { drawn.push(c.m ? c.m[0x53EC] : m[0x53EC]); } };
  cpu.call(0x10B4, {}, { hooks: watch, maxSteps: 1e5 });
  let waits = 0;
  cpu.call(0x10DA, {}, { hooks: Object.assign({ 0x5018: (c) => { waits++; c.rts(); } }, watch), maxSteps: 1e7 });
  const score = fromBcd(m[0x53DE]) * 10000 + fromBcd(m[0x53DD]) * 100 + fromBcd(m[0x53DC]);
  const P = pdBonus(secs), want = [P.shown, ...P.counts];
  const t = mins.toString(16) + "'" + secs.toString(16).padStart(2, '0');
  if (drawn.join() !== want.join()) fail(t, 'game drew', drawn.join(' '), '| page', want.join(' '));
  if (waits !== P.counts.length) fail(t, 'game counted', waits, '| page', P.counts.length);
  if (score * 10 !== P.points) fail(t, 'game paid', score * 10, '| page', P.points);
  if (m[0xE080] !== P.counts[P.counts.length - 1] >> 4 || m[0xE081] !== (P.counts[P.counts.length - 1] & 15)) fail(t, 'panel digits', m[0xE080], m[0xE081]);
  cases++;
}
console.log(`${cases} race times: ` + (bad ? bad + ' differences' : 'every count and every payment matches the game\'s code'));
process.exit(bad ? 1 : 0);
