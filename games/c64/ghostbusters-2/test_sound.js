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

// The sound effects. Every request in the three episodes loads the effect's number as an
// immediate and calls one of the starters ($E6AD, $E70C, $E76B for voices 1-3) or an episode's
// wrapper round them (number in X for the airshaft and Broadway, in A for the museum). The page's
// list must give the effects asked for, with the voice of each one's first request (the airshaft's
// first, then Broadway's, then the museum's), and its table only addresses that make that request.
{
  const {SOUND_EFFECTS} = g.run('index.html', 'sound-effects-list', 'SOUND_EFFECTS');
  const WRAP = {
    airshaft: {0x8CFF: 1, 0x8D04: 2, 0x8D09: 3, reg: 0xA2},
    broadway: {0x83FB: 1, 0x8400: 2, 0x8405: 3, reg: 0xA2},
    museum: {0x86E1: 1, 0x86F2: 2, 0x8703: 3, 0xE6AD: 1, 0xE70C: 2, 0xE76B: 3, reg: 0xA9},
  };
  const requests = [];
  for (const part of ['airshaft', 'broadway', 'museum']) {
    const L = require('./parts/' + part + '/listing.json');
    const recs = L.records;
    recs.forEach((r, i) => {
      const b = r.b || [];
      const to = b.length === 3 && (b[0] === 0x20 || b[0] === 0x4C) ? b[1] | b[2] << 8 : -1;
      if (to < 0 || !(to in WRAP[part])) return;
      if (part !== 'museum' && to >= 0xE000) return;
      if (part === 'museum' && r.a >= 0x86E1 && r.a <= 0x8713) return;   // the wrappers' own calls, with the number patched in
      // the immediate load of the number: the nearest LDX # (or LDA #) in the three instructions before
      let n = null;
      for (let j = i - 1; j >= i - 3 && n === null; j--) {
        const q = recs[j].b || [];
        if (q.length === 2 && q[0] === WRAP[part].reg) n = q[1];
      }
      if (part === 'airshaft' && r.a === 0xAE13) return;   // $AE04: TXA follows, and no caller is known
      assert(n !== null, part + ' $' + r.a.toString(16) + ' asks for an effect without an immediate number');
      requests.push({part, at: r.a, n, voice: WRAP[part][to]});
    });
  }
  const used = [...new Set(requests.map(q => q.n))].sort((a, b) => a - b);
  assert.deepStrictEqual(used, SOUND_EFFECTS.filter(e => e.name !== 'never played').map(e => e.n));
  for (const e of SOUND_EFFECTS) {
    const first = requests.filter(q => q.n === e.n)[0];
    assert.equal(e.voice, first ? first.voice : 1, 'voice of effect ' + e.n);
  }
  const rows = [...html.match(/<table class="sfx">([\s\S]*?)<\/table>/)[1].matchAll(/<tr><td[^>]*>([^<]+)<\/td><td>([^<]+)<\/td><td>(.*?)<\/td><\/tr>/g)];
  const listed = new Set();
  for (const [, nums, what, where] of rows) {
    const ns = nums.split(',').map(Number);
    ns.forEach(n => listed.add(n));
    if (what === 'never') assert.deepStrictEqual(ns, SOUND_EFFECTS.filter(e => e.name === 'never played').map(e => e.n));
    for (const m of where.matchAll(/\$([0-9A-F]{4})/g)) {
      const at = parseInt(m[1], 16);
      assert(requests.some(q => q.at === at && ns.includes(q.n)), 'the table gives $' + m[1] + ' for effect ' + nums);
    }
  }
  assert.equal(listed.size, 26, 'the table names all 26 effects');
  // Each effect through the page's driver: its 12-byte record ($E7CA points to it) copied to the
  // voice's state, the effect ending, and the music held off its voice while it plays.
  let frames = 0;
  for (const e of SOUND_EFFECTS) {
    const d = createGhostSound({mem, effects: SOUND_EFFECTS}, {CPU});
    d.init(e.n);
    const rec = listing.ram[0xE7CA + 2 * e.n] | listing.ram[0xE7CB + 2 * e.n] << 8;
    const state = [0xEAED, 0xEAFC, 0xEB0B][e.voice - 1];
    assert.deepStrictEqual(Array.from(d.mem.slice(state, state + 12)), Array.from(listing.ram.slice(rec, rec + 12)), 'record of effect ' + e.n);
    assert.equal(d.mem[0xE12F + e.voice - 1], 1, 'effect ' + e.n + ' is active');
    let n = 0;
    while (d.playing() && n < 3000) { d.play(); n++; }
    assert(!d.playing(), 'effect ' + e.n + ' ends');
    frames += n;
  }
  console.log('OK - ' + requests.length + ' requests ask for ' + used.length + ' effects; the six others are never asked for; all 26 play to their end (' + frames + ' frames)');
}
