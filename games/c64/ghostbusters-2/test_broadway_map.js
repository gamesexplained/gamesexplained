'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const g = game(__dirname);
const html = fs.readFileSync(path.join(__dirname, 'levels.html'), 'utf8');
assert(html.includes('id="broadway-map"'), 'Broadway canvas is present');
const match = html.match(/<script id="broadway-map-data" type="application\/json">([^<]+)<\/script>/);
assert(match, 'Broadway backdrop is embedded in the Levels page');
const data = JSON.parse(match[1]);
const listing = g.listing('parts/broadway/listing.json');
const {broadwayMapColumn: columnAt} = g.run('levels.html', 'broadway-map-column', 'broadwayMapColumn');
// The Censor Broadway load retains the first 298 bytes from the airshaft.
const inherited = g.listing('parts/airshaft/listing.json');
const ram = listing.ram.slice();
for (let a = 0x0900; a < 0x0a2a; a++) {
  assert(inherited.has[a], `missing inherited airshaft byte at $${a.toString(16)}`);
  ram[a] = inherited.ram[a];
}
assert.deepStrictEqual(data.codes, Array.from(ram.slice(0x0900, 0x1f80)));
assert.deepStrictEqual(data.charset, Array.from(listing.ram.slice(0x7000, 0x7800)));
const alternate = g.listing('parts/broadway-jondi/listing.json');
assert.deepStrictEqual(data.jondiCodes, Array.from(alternate.ram.slice(0x0900, 0x1f80)));
assert.notDeepStrictEqual(data.jondiCodes.slice(0, 298), data.codes.slice(0, 298));
const vice = JSON.parse(fs.readFileSync(path.join(__dirname, 'broadway-map-vice.json'), 'utf8'));
for (const fixture of vice) assert.deepStrictEqual(columnAt(data.codes, fixture.column), fixture.values,
  `VICE column ${fixture.column}`);
const cpu = new CPU(ram, {port: 0x35});
for (let column = 0; column < 480; column++) {
  const pointer = 0x0900 + column;
  ram[0x87f7] = pointer & 255; ram[0x87fb] = pointer >> 8;
  cpu.pc = 0x87f4;
  cpu.run({until: 0x88c9, maxInstructions: 1000});
  assert.equal(cpu.pc, 0x88c9);
  assert.deepStrictEqual(columnAt(data.codes, column), Array.from({length: 12}, (_, row) => ram[0x4517 + row * 40]),
    `CPU column ${column}`);
}
ram.set(data.jondiCodes, 0x0900);
for (const column of [0, 78, 479]) {
  const pointer = 0x0900 + column;
  ram[0x87f7] = pointer & 255; ram[0x87fb] = pointer >> 8;
  cpu.pc = 0x87f4; cpu.run({until: 0x88c9, maxInstructions: 1000});
  assert.equal(cpu.pc, 0x88c9);
  assert.deepStrictEqual(columnAt(data.jondiCodes, column), Array.from({length: 12}, (_, row) => ram[0x4517 + row * 40]));
}
console.log(`OK - both Broadway disks match the fetch routine; ${vice.length} Censor columns have VICE fixtures`);
