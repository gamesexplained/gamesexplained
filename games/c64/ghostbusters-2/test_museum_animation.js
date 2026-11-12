'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const listing = game(__dirname).listing('parts/museum/listing.json');
const html = fs.readFileSync(path.join(__dirname, 'graphics.html'), 'utf8');
const match = html.match(/<script id="museum-detail-data" type="application\/json">([^<]+)<\/script>/);
assert(match, 'museum animation data is embedded');
const data = JSON.parse(match[1]);
assert.deepStrictEqual(data.glyphs, Array.from(listing.ram.slice(0x7800, 0x78b8)));
assert.deepStrictEqual(data.patterns, Array.from(listing.ram.slice(0x8372, 0x8396)));
assert.deepStrictEqual(data.colours, [502, 503, 504, 542, 543, 544, 582, 583, 584].map(i => listing.ram[0x1c00 + i] >> 4));
const ram = listing.ram.slice();
const cpu = new CPU(ram, {port: 0x35});
const observed = JSON.parse(fs.readFileSync(path.join(__dirname, 'museum-alt-observed.json'), 'utf8'));
const frames = JSON.parse(fs.readFileSync(path.join(__dirname, 'museum-animation-vice.json'), 'utf8'));
assert.equal(frames.length, 20);
for (let i = 0; i < 1000; i++) ram[0x4400 + i] = observed.screen[i];
ram[0x8041] = 1; ram[0x9485] = 0;
ram[0x8044] = 4; ram[0x8045] = 0; ram[0x8046] = 0;
function cells() {
  return [0x45f6, 0x461e, 0x4646].flatMap(address => Array.from(ram.slice(address, address + 3)));
}
for (const frame of frames) {
  cpu.call(0x82e8);
  assert.deepStrictEqual(cells(), frame.values, `screen cells at frame ${frame.frame}`);
  assert.deepStrictEqual(Array.from(ram.slice(0x8044, 0x8047)), frame.flags, `state at frame ${frame.frame}`);
  assert.equal(frame.hits, frame.frame, `VICE calls at frame ${frame.frame}`);
}
ram[0x8046] = 1;
cpu.call(0x82e8);
assert.deepStrictEqual(cells(), [88, 89, 60, 90, 91, 92, 94, 95, 96]);
console.log('OK - museum screen animation matches 20 VICE frames and its held state');
