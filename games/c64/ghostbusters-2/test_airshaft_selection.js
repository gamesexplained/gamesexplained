'use strict';
const assert = require('assert');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const listing = game(__dirname).listing('parts/airshaft/listing.json');
assert(listing.has[0xaac0] && listing.has[0xaae1]);
const ram = listing.ram.slice();
const cpu = new CPU(ram, {port: 0x35});
for (const [before, selector, mode] of [[1, 2, 2], [2, 0, 3], [0, 1, 1]]) {
  ram[0xa775] = before;
  ram[0xa776] = 0;
  ram[0x9166] = 0;
  cpu.pc = 0xaac0;
  cpu.run({until: 0xaae1, maxInstructions: 100});
  assert.equal(cpu.pc, 0xaae1);
  assert.deepStrictEqual([ram[0xa775], ram[0x9166], ram[0xa776]], [selector, mode, 1]);
}
// The observed mode-dependent drawing paths copy two eight-byte columns.
for (const [mode, left, right] of [[1, 0x92d7, 0x92d7], [2, 0x928f, 0x92b7], [3, 0x928f, 0x929f]]) {
  ram[0x9166] = mode;
  ram[0x94c0] = 3;
  ram[0x94ba] = ram[0x94be] = ram[0x94bf] = 0;
  cpu.call(0x94c1);
  for (let row = 0; row < 8; row++) {
    assert.equal(ram[0x41a8 + row * 3], ram[left + row], `mode ${mode}, left row ${row}`);
    assert.equal(ram[0x41a9 + row * 3], ram[right + row], `mode ${mode}, right row ${row}`);
  }
}
console.log('OK - airshaft selection and drawing match the three VICE-observed modes');
