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
console.log('OK - airshaft selection cycles through the three VICE-observed modes');
