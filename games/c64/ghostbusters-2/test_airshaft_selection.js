'use strict';
const assert = require('assert');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const fs = require('fs');
const path = require('path');
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
const graphics = fs.readFileSync(path.join(__dirname, 'graphics.html'), 'utf8');
const shapeMatch = graphics.match(/<script id="airshaft-mode-data" type="application\/json">([^<]+)<\/script>/);
assert(shapeMatch, 'captured mode shapes are embedded');
const digitMatch = graphics.match(/<script id="airshaft-digit-data" type="application\/json">([^<]+)<\/script>/);
assert(digitMatch, 'digit patterns are embedded');
assert.deepStrictEqual(JSON.parse(digitMatch[1]), Array.from(listing.ram.slice(0x928f, 0x92df)));
const shapes = JSON.parse(shapeMatch[1]);
assert.equal(shapes.length, 3);
// The observed mode-dependent drawing paths copy two eight-byte columns.
for (const [mode, left, right] of [[1, 0x92d7, 0x92d7], [2, 0x928f, 0x92b7], [3, 0x928f, 0x929f]]) {
  ram[0x9166] = mode;
  ram[0x94c0] = 3;
  ram[0x94ba] = ram[0x94be] = ram[0x94bf] = 0;
  cpu.call(0x94c1);
  assert.deepStrictEqual(Array.from(ram.slice(0x4180, 0x41bf)), shapes[mode - 1], `mode ${mode} captured shape`);
  for (let row = 0; row < 8; row++) {
    assert.equal(ram[0x41a8 + row * 3], ram[left + row], `mode ${mode}, left row ${row}`);
    assert.equal(ram[0x41a9 + row * 3], ram[right + row], `mode ${mode}, right row ${row}`);
  }
}
// VICE observed the mode-2 source operand step back by eight while firing.
ram[0x9166] = 2;
ram[0x9571] = 0xb7; ram[0x9572] = 0x92;
ram[0x94be] = 1;
cpu.call(0x956c);
assert.deepStrictEqual([ram[0x9571], ram[0x9572], ram[0x94be]], [0xaf, 0x92, 0]);
ram[0x9571] = 0x8f; ram[0x9572] = 0x92;
ram[0x94be] = 1; ram[0x94bc] = 0;
cpu.call(0x956c);
assert.deepStrictEqual([ram[0x9571], ram[0x9572], ram[0x94bc]], [0x8f, 0x92, 1]);
// The corresponding mode-3 pointer moves from the captured 02 to 01.
ram[0x95bf] = 0x9f; ram[0x95c0] = 0x92;
ram[0x94bf] = 1;
cpu.call(0x95ba);
assert.deepStrictEqual([ram[0x95bf], ram[0x95c0], ram[0x94bf]], [0x97, 0x92, 0]);
ram[0x95bf] = 0x8f; ram[0x95c0] = 0x92;
ram[0x94bf] = 1; ram[0x94bd] = 0;
cpu.call(0x95ba);
assert.deepStrictEqual([ram[0x95bf], ram[0x95c0], ram[0x94bd]], [0x8f, 0x92, 1]);
// The upper status counter rolls 99 to 100 and back by changing glyph pointers.
function operand(address, value) { ram[address] = value & 255; ram[address + 1] = value >> 8; }
function readOperand(address) { return ram[address] | (ram[address + 1] << 8); }
operand(0x8be3, 0x92d7); operand(0x8be9, 0x92d7); operand(0x8bef, 0x92df);
ram[0x8031] = 1;
cpu.call(0x8bde);
assert.deepStrictEqual([readOperand(0x8bef), readOperand(0x8be9), readOperand(0x8be3), ram[0x8031]],
  [0x9297, 0x928f, 0x928f, 0]);
ram[0x8031] = 2;
cpu.call(0x8bde);
assert.deepStrictEqual([readOperand(0x8bef), readOperand(0x8be9), readOperand(0x8be3), ram[0x8031]],
  [0x92df, 0x92d7, 0x92d7, 0]);
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const match = html.match(/<script id="frame-data" type="application\/json">([^<]+)<\/script>/);
assert(match, 'airshaft frame data is embedded');
const frame = JSON.parse(match[1]);
assert.equal((~frame.cia2[0] & 3) * 0x4000, 0x4000, 'VIC bank');
assert.equal(0x4000 + ((frame.vic[24] >> 4) & 15) * 1024, 0x4400, 'screen matrix');
assert(frame.writes.some(([line, cycle, address, value]) =>
  line === 251 && cycle === 8 && address === 0x47fb && value === 6), 'sprite 3 selects slot 6');
assert.equal(0x4000 + 6 * 64, 0x4180, 'selected sprite slot contains the drawn bytes');
console.log('OK - airshaft selection and drawing match the three VICE-observed modes');
