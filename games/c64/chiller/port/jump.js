'use strict';
// Put the machine on level n (0-9) as finishing each level before it does: next_screen with the
// level byte of the one being left, entered at a main-loop pass as crosses_left enters it. Each
// level on the way to the house is stored as it is left, so the way home finds them.
function nextLevel(m) {
  if (m.cpu.pc !== 0xCA00) throw new Error('nextLevel: not at a pass');
  const c = m.cpu, ret = 0xCA00 - 1, x = m.ram[(m.ram[0x11] | m.ram[0x12] << 8) + 0x73];
  c.push(ret >> 8); c.push(ret & 255);
  c.x = x === 0x12 ? 0xFE : x; c.pc = 0x7680;
  m.skipOnce = false;
}
function toLevel(m, n) {
  for (let i = 0; i < n; i++) { nextLevel(m); m.runUntilPass(() => true); }
}
module.exports = { toLevel, nextLevel };
