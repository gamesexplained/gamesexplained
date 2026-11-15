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
for (const selection of [0, 1, 2]) {
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
  driver.init(selection); cpu.call(0xe000, {a: selection});
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
  if (selection) assert(!driver.playing(), `selection ${selection} should finish`);
  console.log(`OK - selection ${selection}: 500 driver updates match the listing, first 30 match VICE`);
}

const endingMatch = html.match(/<script id="ending-sound-data" type="application\/json">([^<]+)<\/script>/);
assert(endingMatch, 'the player must include the ending sound data');
const ending = JSON.parse(endingMatch[1]);
const endingDriver = createGhostSound({mem, ending}, {CPU});
endingDriver.init(3);
const endingWrites = [Array.from(endingDriver.writes)];
for (let frame = 0; frame <= 500; frame++) {
  if (frame) { endingDriver.play(); endingWrites.push(Array.from(endingDriver.writes)); }
  if (frame < vice.ending.states.length) {
    const state = vice.ending.states[frame];
    assert.equal(Buffer.from(endingDriver.mem.slice(0xe0c2, 0xe13b)).toString('hex'), state.variables,
      `ending update ${frame}: VICE channel state`);
    assert.deepStrictEqual([0, 7, 14].map(n => endingDriver.sid[n] | endingDriver.sid[n + 1] << 8), state.frequencies,
      `ending update ${frame}: VICE frequencies`);
  }
}
const digest = require('crypto').createHash('sha256').update(JSON.stringify(endingWrites)).digest('hex');
assert.equal(digest, vice.ending.writes_sha256_500, 'ending SID writes must match the captured ending driver');
console.log('OK - ending: 500 driver updates match the captured scene, first 30 match VICE');

const broadwayMatch = html.match(/<script id="broadway-sound-data" type="application\/json">([^<]+)<\/script>/);
assert(broadwayMatch, 'the player must include the Broadway sound data');
const broadway = JSON.parse(broadwayMatch[1]);
const broadwayDriver = createGhostSound({mem, broadway}, {CPU});
broadwayDriver.init(4);
const broadwayWrites = [Array.from(broadwayDriver.writes)];
for (let frame = 0; frame <= 500; frame++) {
  if (frame) { broadwayDriver.play(); broadwayWrites.push(Array.from(broadwayDriver.writes)); }
  if (frame < vice.broadway.states.length) {
    const state = vice.broadway.states[frame];
    assert.equal(Buffer.from(broadwayDriver.mem.slice(0xe0c2, 0xe13b)).toString('hex'), state.variables,
      `Broadway update ${frame}: VICE channel state`);
    assert.deepStrictEqual([0, 7, 14].map(n => broadwayDriver.sid[n] | broadwayDriver.sid[n + 1] << 8), state.frequencies,
      `Broadway update ${frame}: VICE frequencies`);
  }
}
const broadwayDigest = require('crypto').createHash('sha256').update(JSON.stringify(broadwayWrites)).digest('hex');
assert.equal(broadwayDigest, vice.broadway.writes_sha256_500, 'Broadway SID writes must match the captured prompt');
console.log('OK - Broadway: 500 driver updates match the captured scene, first 30 match VICE');

const censorMatch = html.match(/<script id="censor-sound-data" type="application\/json">([^<]+)<\/script>/);
assert(censorMatch, 'the player must include the Censor intro sound data');
const censorData = JSON.parse(censorMatch[1]);
const {createCensorSound} = g.run('index.html', 'censor-sound-driver', 'createCensorSound');
const censorDriver = createCensorSound(censorData, {CPU});
censorDriver.init(0);
assert.deepStrictEqual(Array.from(censorDriver.sid), vice.censor.initial_sid, 'initial intro SID state');
const addresses = censorData.mem.flatMap(([base, bytes]) => bytes.map((_, i) => base + i))
  .filter(address => address >= 0x0fe8 && address < 0x1770);
const censorWrites = [];
for (let frame = 0; frame < 500; frame++) {
  censorDriver.play(); censorWrites.push(Array.from(censorDriver.writes));
  if (frame < vice.censor.states.length) {
    const state = vice.censor.states[frame];
    const bytes = Buffer.from(addresses.map(address => censorDriver.mem[address]));
    const stateHash = require('crypto').createHash('sha256').update(bytes).digest('hex');
    assert.equal(stateHash, state.state_sha256, `intro update ${frame + 1}: VICE driver state`);
    const zp = Buffer.from([0x14, 0x15, 0xf8, 0xf9].map(address => censorDriver.mem[address])).toString('hex');
    assert.equal(zp, state.zp, `intro update ${frame + 1}: VICE zero page`);
    assert.deepStrictEqual(Array.from(censorDriver.sid), state.sid, `intro update ${frame + 1}: VICE SID`);
  }
}
const censorDigest = require('crypto').createHash('sha256').update(JSON.stringify(censorWrites)).digest('hex');
assert.equal(censorDigest, vice.censor.writes_sha256_500, 'intro SID writes must match the captured sound driver');
console.log('OK - Censor intro: 500 driver updates match the capture, first 30 match VICE');

const jondiMatch = html.match(/<script id="jondi-sound-data" type="application\/json">([^<]+)<\/script>/);
assert(jondiMatch, 'the player must include the Jondi intro sound data');
const jondiData = JSON.parse(jondiMatch[1]);
const jondiDriver = createCensorSound(jondiData, {CPU});
jondiDriver.init(0);
assert.deepStrictEqual(Array.from(jondiDriver.sid), vice.jondi.initial_sid);
const jondiWrites = [];
for (let frame = 0; frame < 500; frame++) {
  jondiDriver.play();
  jondiWrites.push(Array.from(jondiDriver.writes));
  if (frame < vice.jondi.states.length) {
    const state = vice.jondi.states[frame];
    const actualSid = Array.from(jondiDriver.sid, (value, reg) => [3, 10, 17].includes(reg) ? value & 15 : value);
    assert.deepStrictEqual(actualSid, state.sid, `Jondi update ${frame + 1}: VICE SID`);
    const bytes = Buffer.from(vice.jondi.state_addresses.map(address => jondiDriver.mem[address]));
    assert.equal(require('crypto').createHash('sha256').update(bytes).digest('hex'), state.state_sha256,
      `Jondi update ${frame + 1}: VICE driver state`);
  }
}
assert.equal(require('crypto').createHash('sha256').update(JSON.stringify(jondiWrites)).digest('hex'),
  vice.jondi.writes_sha256_500, 'Jondi SID writes match the captured driver');
console.log('OK - Jondi intro: 500 driver updates match the capture, first 30 match VICE');
