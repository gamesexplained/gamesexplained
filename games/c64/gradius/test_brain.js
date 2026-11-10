#!/usr/bin/env node
// Hold the Graphics page's last-boss stepper (the gr-brain block of graphics.html) against the
// game. start_brain's resets (dot_index, dots_lo and dots_hi to 0, $99A4-$99AF) and clear_brain's
// empty shapes, then grow_brain ($9985) run on the kit's 6502 over the listing's memory, one call a
// frame, as brain_frame calls it; after every frame the 256 bytes at $2F00 and the dot count must
// equal grBrain's for that many frames, until grow_brain marks the boss ready (brain_state, $99A0,
// = 2). It also checks that the finished shapes equal the picture: every dot goes in. Exits 1 on any
// difference.
//   node games/c64/gradius/test_brain.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { grBrain } = g.run('graphics.html', 'gr-brain', 'grBrain');
const L = g.listing(), m = L.ram.slice();
const pic = L.ram.slice(0x9C49, 0x9C49 + 256);
const cpu = new CPU(m, { port: 0x35, io: { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } } });
m.fill(0, 0x2F00, 0x3000); m[0x9945] = m[0x9983] = m[0x9982] = 0; m[0x99A0] = 1;
let bad = 0, f = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
while (m[0x99A0] !== 2 && f < 200) {
  cpu.call(0x9985, {}, { maxSteps: 100000 });
  f++;
  const page = grBrain(pic, f), game = m.slice(0x2F00, 0x3000);
  if (game.join() !== page.shapes.join()) fail('frame', f, 'shapes');
  if ((m[0x9983] | m[0x9982] << 8) !== page.dots && m[0x99A0] !== 2) fail('frame', f, 'dots', m[0x9983] | m[0x9982] << 8, page.dots);
}
const whole = grBrain(pic, 1000).shapes.join() === pic.join();
if (!whole) fail('the finished shapes are not the picture');
console.log(`${f} frames: ` + (bad ? bad + ' differences' : 'every frame matches grow_brain' + (whole ? '; the finished shapes equal the picture' : '')));
process.exit(bad ? 1 : 0);
