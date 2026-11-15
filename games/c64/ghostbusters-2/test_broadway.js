'use strict';
const assert = require('assert');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const g = game(__dirname);
const {broadwayMove} = g.run('index.html', 'broadway-movement', 'broadwayMove');
const listing = g.listing('parts/broadway/listing.json');
for (const address of [0x91dd, 0x91ee, 0x91ff, 0x9210]) assert(listing.has[address]);
const ram = listing.ram.slice();
const cpu = new CPU(ram, {port: 0x35});
let cases = 0;
for (let value = 0; value < 256; value++) for (let bits = 0; bits < 16; bits++) {
  const position = {x: value, y: 255 - value};
  const directions = {up: !!(bits & 1), down: !!(bits & 2), left: !!(bits & 4), right: !!(bits & 8)};
  ram[0x851f] = position.x; ram[0x8524] = position.y;
  if (directions.up) cpu.call(0x91dd);
  if (directions.down) cpu.call(0x91ee);
  if (directions.left) cpu.call(0x91ff);
  if (directions.right) cpu.call(0x9210);
  const actual = broadwayMove(position, directions);
  assert.deepStrictEqual({x: actual.x, y: actual.y}, {x: ram[0x851f], y: ram[0x8524]}, `value ${value}, directions ${bits}`);
  cases++;
}
console.log(`OK - ${cases} Broadway movement cases match the game's helpers`);
