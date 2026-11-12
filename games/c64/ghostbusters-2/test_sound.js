'use strict';
const assert = require('assert');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const g = game(__dirname);
const {createGhostSound} = g.run('index.html', 'airshaft-sound-driver', 'createGhostSound');
const html = g.read('index.html');
const dataMatch = html.match(/<script id="sound-data" type="application\/json">([^<]+)<\/script>/);
assert(dataMatch, 'the player must include its sound data');
const mem = JSON.parse(dataMatch[1]);
const listing = g.listing('parts/airshaft/listing.json');
for (const [address, bytes] of mem) {
  assert.deepStrictEqual(bytes, Array.from(listing.ram.slice(address, address + bytes.length)),
    `sound data at $${address.toString(16)} must match the listing`);
}
const vice = g.json('sound-vice.json');
for (const selection of [1, 2]) {
  const driver = createGhostSound({mem}, {CPU});
  const reference = listing.ram.slice(), written = [], sid = new Uint8Array(25);
  const cpu = new CPU(reference, {port: 0x35, io: {
    read: () => 0xff,
    write: (address, value) => {
      assert(address >= 0xd400 && address <= 0xd418, `unexpected I/O write $${address.toString(16)}`);
      const reg = address - 0xd400;
      sid[reg] = value; written.push(reg, value);
    },
  }});
  driver.init(selection - 1); cpu.call(0xe000, {a: selection});
  assert.deepStrictEqual(Array.from(driver.writes), written, 'initializer writes');
  for (let frame = 0; frame <= 500; frame++) {
    if (frame) {
      written.length = 0;
      cpu.call(0xe13a, {}); driver.play();
      assert.deepStrictEqual(Array.from(driver.writes), written, `selection ${selection}, update ${frame}`);
    }
    if (frame < vice.states[String(selection)].length) {
      const state = vice.states[String(selection)][frame];
      assert.equal(Buffer.from(driver.mem.slice(0xe0c2, 0xe13b)).toString('hex'), state.variables,
        `selection ${selection}, update ${frame}: VICE channel state`);
      const frequencies = [0, 7, 14].map(offset => sid[offset] | sid[offset + 1] << 8);
      assert.deepStrictEqual(frequencies, state.frequencies, `selection ${selection}, update ${frame}: VICE frequencies`);
    }
  }
  assert(!driver.playing(), `selection ${selection} should finish`);
  console.log(`OK - selection ${selection}: 500 driver updates match the listing, first 30 match VICE`);
}
