'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const listing = game(__dirname).listing('parts/airshaft/listing.json');
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'airshaft-charset-animation-vice.json'), 'utf8'));
for (const first of [true, false]) for (let frame = 0; frame < 7; frame++) {
  const ram = listing.ram.slice();
  const source = (first ? 0x2000 : 0x25b0) + 0xd0 * frame;
  const pointer = first ? 0x87d8 : 0x88bb;
  const dest = first ? 0x7b90 : 0x7c60;
  ram[pointer] = source & 255; ram[pointer + 1] = source >> 8;
  const vice = fixtures.find(f => f.axis === (first ? 'first' : 'second') && f.frame === frame);
  ram[dest] = vice ? vice.before : 0xa5;
  const before = ram[dest];
  const cpu = new CPU(ram, {port: 0x35});
  cpu.pc = first ? 0x87d5 : 0x88b8;
  const end = first ? 0x87e0 : 0x88c3;
  cpu.run({until: end, maxSteps: 2000});
  assert.equal(cpu.pc, end);
  assert.equal(ram[dest], before, 'copy leaves byte zero untouched');
  assert.deepStrictEqual(ram.slice(dest + 1, dest + 0xd0), ram.slice(source + 1, source + 0xd0));
  if (vice) assert.deepStrictEqual([...ram.slice(dest, dest + 0xd0)], vice.result, `VICE frame ${frame}`);
}
console.log('OK - fourteen airshaft character frames and four VICE captures');
