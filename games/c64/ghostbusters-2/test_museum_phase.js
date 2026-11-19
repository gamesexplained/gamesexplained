'use strict';
const assert = require('assert');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const listing = game(__dirname).listing('parts/museum/listing.json');
for (const phase of [1, 2]) {
  const ram = listing.ram.slice();
  ram[0xa2f7] = ram[0xa2f8] = 0;
  ram[0x8050] = phase;
  const cpu = new CPU(ram, {port: 0x35});
  let success = false;
  for (let n = 1; n <= 25; n++) {
    cpu.call(0xae13, {}, {hooks: {0x0a16: () => { success = true; return true; }}});
    assert.equal(success, phase === 2 && n === 25, `phase ${phase}, call ${n}`);
    if (n < 25) {
      assert.equal(ram[0xa2f7], n % 5);
      assert.equal(ram[0xa2f8], Math.floor(n / 5));
    }
  }
  assert.equal(ram[0x8050], 2);
  assert.equal(ram[0xa2f7], 0);
  assert.equal(ram[0xa2f8], phase === 2 ? 5 : 0);
}
console.log('OK - forced museum phases match the two 25-call VICE trials');
