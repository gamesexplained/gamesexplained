'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const listing = game(__dirname).listing('parts/broadway/listing.json');
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'broadway-curve-vice.json'), 'utf8'));
for (const f of fixtures) {
  const ram = listing.ram.slice();
  const first = f.axis === 'first';
  ram[first ? 0xb03a : 0xb054] = first ? 0x70 : 0x38;
  ram[0xb0d6] = ram[0xb0f0] = 0x80;
  ram[0xb0d7] = ram[0xb0f1] = 1;
  ram[(first ? 0x2ccf : 0x32ff) + f.phase] = f.value;
  const cpu = new CPU(ram, {port: 0x35});
  cpu.call(first ? 0xad07 : 0xad39, {x: 0, y: f.phase});
  const dest = first ? 0xaf9e : 0xafb8;
  assert.deepStrictEqual([...ram.slice(dest, dest + 2)], f.result, `${f.axis}, phase ${f.phase}`);
}
console.log('OK - Broadway curve calculations match eight VICE observations');
