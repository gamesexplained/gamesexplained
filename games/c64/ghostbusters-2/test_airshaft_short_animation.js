'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const listing = game(__dirname).listing('parts/airshaft/listing.json');
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'airshaft-short-animation-vice.json'), 'utf8'));
const groups = [
  [0x2b60, 6, 0x89b2, 0x89b5, 0x89bd, 0x7d30],
  [0x2da0, 6, 0x8a46, 0x8a49, 0x8a51, 0x7df0],
  [0x2fe0, 5, 0x8ae7, 0x8aea, 0x8af2, 0x7d90],
  [0x31c0, 5, 0x8b73, 0x8b76, 0x8b7e, 0x7e50]
];
function check(group, frame, full) {
  let [base, , pc, operand, end, dest] = groups[group];
  if (full) [pc, operand, end] = group === 0 ? [0x8995, 0x8998, 0x89a0] : [0x8a29, 0x8a2c, 0x8a34];
  const vice = fixtures.find(f => f.group === group && f.frame === frame && !!f.full === full);
  const ram = listing.ram.slice(), source = base + 0x60 * frame;
  ram[operand] = source & 255; ram[operand + 1] = source >> 8;
  ram[dest] = vice ? vice.before : 0xa5;
  const before = ram[dest], cpu = new CPU(ram, {port: 0x35});
  cpu.pc = pc;
  cpu.run({until: end, maxSteps: 1000});
  assert.equal(cpu.pc, end);
  const skipsFirst = group < 2 && !full;
  assert.equal(ram[dest], skipsFirst ? before : ram[source]);
  assert.deepStrictEqual(ram.slice(dest + 1, dest + 0x60), ram.slice(source + 1, source + 0x60));
  if (vice) assert.deepStrictEqual([...ram.slice(dest, dest + 0x60)], vice.result);
}
groups.forEach(([, count], group) => {
  for (let frame = 0; frame < count; frame++) {
    check(group, frame, false);
    if (group < 2) check(group, frame, true);
  }
});
console.log('OK - short airshaft frame copies and ten VICE observations');
