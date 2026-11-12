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
for (const first of [true, false]) {
  const ram = listing.ram.slice();
  ram[first ? 0xb03a : 0xb054] = first ? 0x70 : 0x38;
  ram[0xb0d6] = ram[0xb0f0] = 0x80;
  ram[0xb0d7] = ram[0xb0f1] = 1;
  const cpu = new CPU(ram, {port: 0x35});
  for (let phase = 0; phase < 256; phase++) {
    const raw = ram[(first ? 0x2ccf : 0x32ff) + phase];
    const signed = raw < 128 ? raw : raw - 256;
    const expected = (0x180 + (first ? signed : -signed)) & 0xffff;
    cpu.call(first ? 0xad07 : 0xad39, {x: 0, y: phase});
    const dest = first ? 0xaf9e : 0xafb8;
    assert.equal(ram[dest] + 256 * ram[dest + 1], expected, `phase ${phase}`);
  }
}
const views = [
  [[0x00,0x2b88],[0x08,0x2000],[0x10,0x2148],[0x1c,0x2a40],[0x20,0x2290],[0x30,0x23d8],[0x40,0x2520],[0x50,0x2668],[0x60,0x27b0],[0x70,0x2ccf],[0x2f,0x31f7],[0x3f,0x30ef],[0x4f,0x2fe7],[0x5f,0x2edf],[0x6f,0x2dd7],[0x7f,0x28f8]],
  [[0x00,0x2bc8],[0x10,0x2188],[0x30,0x2418],[0x20,0x22d0],[0x38,0x32ff],[0x40,0x2560],[0x48,0x3407],[0x50,0x26a8],[0x58,0x350f],[0x18,0x3617],[0x7f,0x2938],[0x60,0x27f0],[0x35,0x371f],[0x08,0x2040],[0x28,0x3827],[0x1c,0x2a80]]
];
for (let axis = 0; axis < views.length; axis++) {
  const ram = listing.ram.slice();
  const cpu = new CPU(ram, {port: 0x35});
  for (const [selector, base] of views[axis]) {
    ram[axis ? 0xb054 : 0xb03a] = selector;
    for (let phase = 0; phase < 256; phase++) {
      cpu.call(axis ? 0xadee : 0xad6b, {x: 0, y: phase});
      assert.equal(cpu.a, ram[base + phase], `selector ${selector}, phase ${phase}`);
    }
  }
}
console.log('OK - 32 Broadway lookup views, 512 coordinate inputs and eight VICE observations');
