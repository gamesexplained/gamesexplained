/* Regression checks for the register/byte-boundary annotation corrections.
 * Usage: node .../validation/audit_native_details.js [private-directory]
 */
'use strict';
const assert = require('assert');
const {create} = require('./engine_harness');
const display = create(0);
display.cpu.call(0x6c77, {d: 0});
assert.equal(display.io[0x16], 0xc8);
assert.equal(display.io[0x16] & 0x10, 0, 'character multicolor disabled');
assert.equal(display.io[0x11], 0x1b); assert.equal(display.io[0x18], 0x13);
for (const [entry, registers, value] of [[0x839a, [0x404, 0x40b, 0x412], 0x15], [0x982f, [0x40b], 0x13]]) {
  const s = create(0);
  // Omit only the key-sound delay and continuation into terrain rendering.
  s.cpu.call(entry, {d: 0}, {hooks: {0x8e58: c => c.rts(), 0x924f: c => c.rts()}});
  for (const register of registers) assert.equal(s.io[register], value);
}
for (let value = 0; value < 256; value++) {
  const s = create(0); s.m[0xb1] = value; s.cpu.call(0x841c, {d: 0});
  const expected = (value & 15) === 12 && value !== 0xfc ? value + 4 : (value & 15) === 15 ? value - 4 : value;
  assert.equal(s.m[0xb1], expected, 'packed note ' + value);
}
console.log(JSON.stringify({displaySetups: 1, soundSetups: 2, noteBytes: 256, passed: true}, null, 2));
