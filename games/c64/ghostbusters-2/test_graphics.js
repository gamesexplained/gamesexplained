'use strict';
// The Graphics tab draws every figure from two embedded blocks: each episode's sprite memory
// and the tables that choose shapes from it. Both must be the listing's bytes, and the code
// facts the cards rest on must hold in the listing.
const assert = require('assert');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const g = game(__dirname);
const html = g.read('graphics.html');
const block = id => {
  const m = html.match(new RegExp(`<script id="${id}" type="application/json">([^<]+)</script>`));
  assert(m, `the graphics page must include ${id}`);
  return JSON.parse(m[1]);
};
const hex = h => Array.from(h.match(/../g), x => parseInt(x, 16));
const listing = g.listing('parts/broadway/listing.json');
const airshaftListing = g.listing('parts/airshaft/listing.json');
const museumListing = g.listing('parts/museum/listing.json');
const byPart = {airshaft: airshaftListing, broadway: listing, museum: museumListing};
const bytes = (l, a, n) => Array.from(l.ram.slice(a, a + n));

const banks = block('sprite-bank-data');
for (const [name, l, start, length] of [['airshaft', airshaftListing, 0x4000, 0x3000], ['broadway', listing, 0x4000, 0x3000],
  ['museum', museumListing, 0x4000, 0x3000], ['broadway-street', listing, 0xf000, 0x800], ['museum-panel', museumListing, 0x0d40, 0x280]]) {
  assert.deepStrictEqual(hex(banks[name]), bytes(l, start, length), `${name} sprite memory must match the listing`);
}
assert.deepStrictEqual(Object.keys(banks).sort(), ['airshaft', 'broadway', 'broadway-street', 'museum', 'museum-panel']);
console.log('OK - the sprite memory of all three episodes, the road frames and the museum panel match the listings');

const tables = block('sprite-table-data');
let count = 0;
for (const part in tables) for (const address in tables[part]) {
  const t = hex(tables[part][address]);
  assert.deepStrictEqual(t, bytes(byPart[part], parseInt(address, 16), t.length), `${part} table at $${address}`);
  count++;
}
console.log(`OK - ${count} shape tables match the listings`);

// The airshaft panel: the raster handler at $90E7 sets five sprites on one line.
const op = a => airshaftListing.ram[a];
assert.equal(op(0x90fb), 0x17, 'sprites 0, 1, 2 and 4 are multicolour on the panel; 3 is single-colour');
assert.deepStrictEqual([op(0x9105), op(0x910a)], [0x06, 0x0e], 'the panel multicolours');
assert.deepStrictEqual([0x910f, 0x9114, 0x9119, 0x911e, 0x9123].map(op), [0x68, 0xf2, 0x80, 0xac, 0xda], 'the panel sprites’ places');
assert.deepStrictEqual([0x9139, 0x913e, 0x9143, 0x9148, 0x914d].map(op), [0x07, 0x01, 0x03, 0x0c, 0x0a], 'the panel sprites’ colours');
assert.deepStrictEqual([0x9152, 0x9157, 0x915c, 0x9161].map(op), [0x07, 0xb4, 0x09, 0x06], 'courage, cable, scoop and counts pointers');
assert.deepStrictEqual(bytes(airshaftListing, 0x9165, 3), [0xa9, 0x01, 0x8d], 'the weapon number is the operand of the instruction that sets the picture');
for (const a of [0x94c1, 0xa9e6, 0xab73]) assert.deepStrictEqual(bytes(airshaftListing, a, 3), [0xad, 0x66, 0x91], `$${a.toString(16)} reads the weapon number`);
console.log('OK - the airshaft panel’s sprites, colours and places match the raster handler');

// Pointer $A8 opens the hit sequence at $C6FF, and every reader steps its count before reading.
const readers = [];
for (let a = 0x0800; a < 0xfffd; a++) {
  const r = airshaftListing.ram;
  if (r[a + 1] === 0xff && r[a + 2] === 0xc6 && [0xad, 0xb9, 0xbd, 0xbe, 0xbc].includes(r[a]) && airshaftListing.has[a]) readers.push(a);
}
assert.deepStrictEqual(readers, [0xc6af, 0xc762, 0xc840, 0xc952, 0xca6d], 'the five readers of the hit sequence');
for (const [inc, counter] of [[0xc697, 0xc621], [0xc74a, 0xc61f], [0xc81f, 0xc7b5], [0xc93c, 0xc90b], [0xca4a, 0xc908]]) {
  assert.deepStrictEqual(bytes(airshaftListing, inc, 3), [0xee, counter & 0xff, counter >> 8], `$${inc.toString(16)} steps the count first`);
}
assert.equal(airshaftListing.ram[0xc6ff], 0xa8);
console.log('OK - each of the five readers of the hit sequence steps past its first shape, $A8');

// Broadway's knocked-down frames at $A283 begin with $96, and the same holds for its three readers.
const downReaders = [];
for (let a = 0x0800; a < 0xfffd; a++) {
  const r = listing.ram;
  if (r[a + 1] === 0x83 && r[a + 2] === 0xa2 && [0xad, 0xb9, 0xbd, 0xbe, 0xbc].includes(r[a]) && listing.has[a]) downReaders.push(a);
}
assert.deepStrictEqual(downReaders, [0xa27c, 0xa2e5, 0xa338], 'the three readers of the knocked-down frames');
for (const [inc, counter, reset] of [[0xa257, 0x9c83, 0xa272], [0xa2c0, 0x9c84, 0xa2db], [0xa313, 0x9c85, 0xa32e]]) {
  assert.deepStrictEqual(bytes(listing, inc, 3), [0xee, counter & 0xff, counter >> 8], `$${inc.toString(16)} steps the count first`);
  assert.deepStrictEqual(bytes(listing, reset - 2, 5), [0xa9, 0x00, 0x8d, counter & 0xff, counter >> 8], `$${reset.toString(16)} resets the count to zero`);
}
assert.deepStrictEqual(bytes(listing, 0xa283, 22), [0x96, 0x97, 0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9d, ...Array(14).fill(0x08)]);
console.log('OK - each of the three readers of the knocked-down frames steps past its first shape, $96');

assert.equal(airshaftListing.ram[0xc730], 0xa7, 'sprite 6 alternate initializer selects slot $A7');
assert.deepStrictEqual(bytes(airshaftListing, 0xcb63, 8), [0xb1, 0xb2, 0xb3, 0xb2, 0xae, 0xaf, 0xb0, 0xaf], 'the creature’s two sequences');
const effectRam = airshaftListing.ram.slice();
effectRam[0x94bd] = 0; effectRam[0xa767] = 1; effectRam[0xa76a] = 0;
new CPU(effectRam, {port: 0x35}).call(0xa8a5);
assert.deepStrictEqual([0xa976, 0xa991, 0xa9a7, 0xa9b9].map(address => effectRam[address]), [0x96, 0x97, 0x98, 0x99], 'the shield routine patches all four arc pointers');
console.log('OK - the dropping ghost, the creature and the shield arcs use the shapes the page draws');

const sets = block('charset-data');
assert.equal(sets.length, 2);
sets.forEach((set, n) => assert.deepStrictEqual(set, bytes(listing, n ? 0x7800 : 0x7000, 2048), `Broadway character set ${n + 1}`));
assert.deepStrictEqual(block('airshaft-charset-data'), bytes(airshaftListing, 0x7000, 2048), 'airshaft character set');
assert.deepStrictEqual(block('museum-charset-data'), bytes(museumListing, 0x7000, 2048), 'museum character set');
console.log('OK - the character sets match the listings');

const museumStatusMatch = html.match(/<script id="museum-status-data" type="application\/json">([^<]+)<\/script>/);
assert(museumStatusMatch, "museum status shapes are embedded");
const museumStatus = JSON.parse(museumStatusMatch[1]);
for (const [name, addresses] of [["ok", [0x0e40, 0x0e80]], ["dead", [0x0d40, 0x0d80]], ["dazed", [0x0dc0, 0x0e00]]]) {
  assert.deepStrictEqual(museumStatus[name], addresses.map(address => Array.from(museumListing.ram.slice(address, address + 63))));
}
console.log("OK - museum status words match the listing");

const secondAirshaftMatch = html.match(/<script id="airshaft-second-charset-data" type="application\/json">([^<]+)<\/script>/);
assert(secondAirshaftMatch, 'airshaft second character set is available');
assert.deepStrictEqual(JSON.parse(secondAirshaftMatch[1]), Array.from(airshaftListing.ram.slice(0x7800, 0x8000)));
console.log('OK - the second airshaft character set matches the listing');
