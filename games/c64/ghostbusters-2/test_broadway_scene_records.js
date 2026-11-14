'use strict';
const assert = require('assert');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const {ram: source} = game(__dirname).listing('parts/broadway/listing.json');
const word = (ram, a) => ram[a] | ram[a + 1] << 8;

for (let scene = 0; scene < 29; scene++) {
  const ram = source.slice();
  const expected = new Map();
  let pos = word(source, 0xb33d + 2 * scene);
  while (source[pos] !== 0xff) {
    const index = source[pos] * 2;
    expected.set(index, {
      x: word(source, pos + 2), y: word(source, pos + 4),
      value: source[pos + 6], path: word(source, 0xbd8b + 2 * source[pos + 8]),
      animation: word(source, 0xc4f5 + 2 * source[pos + 10]),
      other: source[pos + 12], active: source[pos] === 0x0c ? 3 : 1,
    });
    pos += 14;
  }
  const cpu = new CPU(ram, {port: 0x35});
  cpu.a = scene; cpu.pc = 0xa367;
  cpu.run({until: 0xa42e, maxInstructions: 10000});
  assert.equal(cpu.pc, 0xa42e, `scene ${scene} reaches the end of its list`);
  assert.equal(ram[0x16], source[pos + 2], `scene ${scene} trailer`);
  for (const [i, record] of expected) {
    assert.equal(word(ram, 0xaf9e + i), record.x);
    assert.equal(word(ram, 0xafb8 + i), record.y);
    assert.equal(ram[0xb006 + i], record.value);
    assert.equal(word(ram, 0xaf6a + i), record.path);
    assert.equal(word(ram, 0xb088 + i), record.animation);
    assert.equal(ram[0xb13e + i], record.other);
    assert.equal(ram[0xb172 + i], record.active);
  }
}
console.log('OK - all 29 Broadway record lists agree with the initializer');
