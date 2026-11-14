'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const g = game(__dirname);
const html = fs.readFileSync(path.join(__dirname, 'levels.html'), 'utf8');
const match = html.match(/<script id="shaft-map-data" type="application\/json">([^<]+)<\/script>/);
assert(match, 'shaft data is embedded in the Levels page');
const data = JSON.parse(match[1]);
const listing = g.listing('parts/airshaft/listing.json');
const {airshaftExpandRow: expand, airshaftMapInner: inner} = g.run('levels.html', 'airshaft-map-expand', 'airshaftExpandRow', 'airshaftMapInner');
assert.equal(data.rows.length, 153);
for (let row = 0; row < 153; row++) {
  const address = 0x1000 + row * 20;
  assert.deepStrictEqual(data.rows[row], Array.from(listing.ram.slice(address, address + 14)));
}
assert.deepStrictEqual(data.inner, Array.from(listing.ram.slice(0xa35a, 0xa47a)));
assert.deepStrictEqual(data.outer, Array.from(listing.ram.slice(0xa47a, 0xa5da)));
assert.deepStrictEqual(data.charset, Array.from(listing.ram.slice(0x7000, 0x7800)));
for (const [address, half, expected] of [
  [0x1ab4, 0, false], [0x1ab4, 1, false], [0x1aa0, 0, false], [0x1aa0, 1, true],
  [0x1a8c, 0, true], [0x1a8c, 1, true], [0x1118, 0, true], [0x1118, 1, true],
  [0x1104, 0, true], [0x1104, 1, false], [0x10f0, 0, false], [0x10f0, 1, false],
]) assert.equal(inner(address, half), expected, `table switch $${address.toString(16)}, half ${half}`);
const switches = JSON.parse(fs.readFileSync(path.join(__dirname, 'airshaft-map-switch-vice.json'), 'utf8'));
assert(switches.some(row => row.forced) && switches.some(row => !row.forced));
for (const row of switches) {
  assert.equal(row.row, row.edge);
  assert.equal(inner(row.row, row.half), row.mode === 0x1e,
    `VICE table switch $${row.row.toString(16)}, half ${row.half}`);
}
const vice = JSON.parse(fs.readFileSync(path.join(__dirname, 'airshaft-map-vice.json'), 'utf8'));
for (const fixture of vice) {
  const row = (fixture.address - 0x1000) / 20;
  assert(Number.isInteger(row) && row >= 0 && row < 153);
  assert.deepStrictEqual(expand(data.rows[row], fixture.mode === 0x1e ? data.inner : data.outer), fixture.result,
    `VICE row $${fixture.address.toString(16)}, mode $${fixture.mode.toString(16)}`);
}
const ram = listing.ram.slice();
const cpu = new CPU(ram, {port: 0x35});
let cases = 0;
for (let row = 0; row < 153; row++) {
  const address = 0x1000 + row * 20;
  for (const [mode, table] of [[0x1e, data.inner], [0x1d, data.outer]]) {
    if (Math.max(...data.rows[row]) * 4 + 3 >= table.length) continue;
    ram[0xf8] = address & 255; ram[0xf9] = address >> 8; ram[0x801c] = mode;
    cpu.call(0xa2c0);
    assert.deepStrictEqual(expand(data.rows[row], table), Array.from(ram.slice(0xcf00, 0xcf38)),
      `CPU row $${address.toString(16)}, mode $${mode.toString(16)}`);
    if ([0, 13, 64, 136, 152].includes(row)) {
      for (let half = 0; half < 2; half++) {
        ram[0x8025] = half;
        cpu.call(0xa5da);
        const expected = [0];
        const decoded = expand(data.rows[row], table);
        for (let column = 1; column < 27; column++) expected.push(decoded[column * 2 + half]);
        expected.push(0);
        assert.deepStrictEqual(Array.from(ram.slice(0x47c6, 0x47e2)), expected,
          `screen row $${address.toString(16)}, mode $${mode.toString(16)}, half ${half}`);
      }
    }
    cases++;
  }
}
console.log(`OK - ${cases} shaft expansions match the game, including ${vice.length} VICE fixtures`);
