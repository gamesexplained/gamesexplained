'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const listing = game(__dirname).listing('parts/airshaft/listing.json');
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'airshaft-charset-animation-vice.json'), 'utf8'));
for (let frame = 0; frame < 7; frame++) {
  const ram = listing.ram.slice();
  const source = 0x2000 + 0xd0 * frame;
  ram[0x87d8] = source & 255; ram[0x87d9] = source >> 8;
  const vice = fixtures.find(f => f.frame === frame);
  ram[0x7b90] = vice ? vice.before : 0xa5;
  const before = ram[0x7b90];
  const cpu = new CPU(ram, {port: 0x35});
  cpu.pc = 0x87d5;
  cpu.run({until: 0x87e0, maxSteps: 2000});
  assert.equal(cpu.pc, 0x87e0);
  assert.equal(ram[0x7b90], before, 'copy leaves byte zero untouched');
  assert.deepStrictEqual(ram.slice(0x7b91, 0x7c60), ram.slice(source + 1, source + 0xd0));
  if (vice) assert.deepStrictEqual([...ram.slice(0x7b90, 0x7c60)], vice.result, `VICE frame ${frame}`);
}
console.log('OK - seven airshaft character frames and two VICE captures');
