'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const g = game(__dirname);
const html = fs.readFileSync(path.join(__dirname, 'levels.html'), 'utf8');
assert(html.includes('id="museum-screen-map"'), 'museum screen canvas is present');
const match = html.match(/<script id="museum-map-data" type="application\/json">([^<]+)<\/script>/);
assert(match, 'museum screen data is embedded');
const data = JSON.parse(match[1]);
const {museumMapDecode: decode} = g.run('levels.html', 'museum-map-decode', 'museumMapDecode');
const listing = g.listing('parts/museum/listing.json');
assert.deepStrictEqual(data.screens[0], Array.from(listing.ram.slice(0x1000, 0x13e8)));
assert.deepStrictEqual(data.screens[1], Array.from(listing.ram.slice(0x1400, 0x17e8)));
assert.deepStrictEqual(data.packed, Array.from(listing.ram.slice(0x1c00, 0x1fe8)));
assert.deepStrictEqual(data.charsets[0], Array.from(listing.ram.slice(0x7000, 0x7800)));
assert.deepStrictEqual(data.charsets[1], Array.from(listing.ram.slice(0x7800, 0x8000)));
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'museum-maps-vice.json'), 'utf8'));
assert.equal(fixtures.length, 2);
for (const fixture of fixtures) {
  const decoded = decode(data, fixture.flag);
  assert.deepStrictEqual(decoded.codes, fixture.screen, `VICE screen flag ${fixture.flag}`);
  assert.deepStrictEqual(decoded.colours, fixture.colour, `VICE colours flag ${fixture.flag}`);
  const ram = listing.ram.slice(), colours = new Uint8Array(1000);
  const cpu = new CPU(ram, {port: 0x35, io: {write(address, value) {
    assert(address >= 0xd800 && address < 0xdbe8, `unexpected I/O write at $${address.toString(16)}`);
    colours[address - 0xd800] = value & 15;
  }}});
  ram[0x8041] = fixture.flag; ram[0xa2d8] = 0;
  cpu.pc = 0x8396;
  const end = fixture.flag ? 0x8424 : 0x83da;
  cpu.run({until: end, maxInstructions: 20000});
  assert.equal(cpu.pc, end);
  assert.deepStrictEqual(Array.from(ram.slice(0x4400, 0x47e8)), fixture.screen, `CPU screen flag ${fixture.flag}`);
  assert.deepStrictEqual(Array.from(colours), fixture.colour, `CPU colours flag ${fixture.flag}`);
}
console.log('OK - both museum setup branches match VICE and the stored screen data');
