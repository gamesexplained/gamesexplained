'use strict';
const assert = require('assert');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const g = game(__dirname);
const html = g.read('graphics.html');
const match = html.match(/<script id="fireball-data" type="application\/json">([^<]+)<\/script>/);
assert(match, 'the graphics page must include the sprite bytes');
const shapes = JSON.parse(match[1]);
const listing = g.listing('parts/broadway/listing.json');
assert.equal(shapes.length, 3);
for (let n = 0; n < shapes.length; n++) {
  const address = 0x40c0 + n * 64;
  assert.deepStrictEqual(shapes[n], Array.from(listing.ram.slice(address, address + 63)),
    `sprite shape at $${address.toString(16)} must match the listing`);
}
console.log('OK - three Broadway sprite shapes match the listing');
const charsetMatch = html.match(/<script id="charset-data" type="application\/json">([^<]+)<\/script>/);
assert(charsetMatch, 'the graphics page must include the character sets');
const sets = JSON.parse(charsetMatch[1]);
assert.equal(sets.length, 2);
for (let n = 0; n < sets.length; n++) {
  const address = n ? 0x7800 : 0x7000;
  assert.equal(sets[n].length, 2048);
  assert.deepStrictEqual(sets[n], Array.from(listing.ram.slice(address, address + 2048)),
    `character set at $${address.toString(16)} must match the listing`);
}
console.log('OK - both Broadway character sets match the listing');
const airshaftMatch = html.match(/<script id="airshaft-charset-data" type="application\/json">([^<]+)<\/script>/);
assert(airshaftMatch, 'the graphics page must include the airshaft character set');
const airshaft = JSON.parse(airshaftMatch[1]);
const airshaftListing = g.listing('parts/airshaft/listing.json');
assert.equal(airshaft.length, 2048);
assert.deepStrictEqual(airshaft, Array.from(airshaftListing.ram.slice(0x7000, 0x7800)),
  'airshaft character set must match the listing');
console.log('OK - airshaft character set matches the listing');
const museumMatch = html.match(/<script id="museum-charset-data" type="application\/json">([^<]+)<\/script>/);
assert(museumMatch, 'the graphics page must include the museum character set');
const museum = JSON.parse(museumMatch[1]);
const museumListing = g.listing('parts/museum/listing.json');
assert.equal(museum.length, 2048);
assert.deepStrictEqual(museum, Array.from(museumListing.ram.slice(0x7000, 0x7800)),
  'museum character set must match the listing');
console.log('OK - museum character set matches the listing');
const slotsMatch = html.match(/<script id="airshaft-sprite-slots-data" type="application\/json">([^<]+)<\/script>/);
assert(slotsMatch, 'airshaft sprite inspector has its data');
const slots = JSON.parse(slotsMatch[1]);
const expectedSlots = [
  0x01, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0d, 0x0e,
  ...Array.from({length: 0x7a}, (_, n) => n + 0x20),
  ...Array.from({length: 4}, (_, n) => n + 0x9a),
  ...Array.from({length: 10}, (_, n) => n + 0x9e),
  ...Array.from({length: 12}, (_, n) => n + 0xa8),
  0xb4,
  ...Array.from({length: 6}, (_, n) => n + 0xb5),
  ...Array.from({length: 5}, (_, n) => n + 0xbb),
];
assert.deepStrictEqual(slots.map(slot => slot.pointer), expectedSlots);
for (const slot of slots) {
  const start = 0x4000 + 64 * slot.pointer;
  for (let i = 0; i < 63; i++) assert(airshaftListing.has[start + i]);
  assert.deepStrictEqual(slot.bytes, Array.from(airshaftListing.ram.slice(start, start + 63)));
}
assert.equal(airshaftListing.ram[0xc730], 0xa7, 'sprite 6 alternate initializer selects slot $A7');
assert.deepStrictEqual(Array.from(airshaftListing.ram.slice(0xcb63, 0xcb6b)), [0xb1, 0xb2, 0xb3, 0xb2, 0xae, 0xaf, 0xb0, 0xaf], 'sprite 4 frame sequences select the six added slots');
const effectRam = airshaftListing.ram.slice();
effectRam[0x94bd] = 0; effectRam[0xa767] = 1; effectRam[0xa76a] = 0;
new CPU(effectRam, {port: 0x35}).call(0xa8a5);
assert.deepStrictEqual([0xa976, 0xa991, 0xa9a7, 0xa9b9].map(address => effectRam[address]), [0x96, 0x97, 0x98, 0x99], 'sprite 5 effect patches all four pointers');
console.log('OK - 169 airshaft sprite slots match the listing');

const poseMatch = html.match(/<script id="airshaft-pose-data" type="application\/json">([^<]+)<\/script>/);
assert(poseMatch, 'airshaft pose viewer has its pointer records');
const poses = JSON.parse(poseMatch[1]);
assert.equal(poses.length, 30);
for (let i = 0; i < poses.length; i++) {
  assert.deepStrictEqual(poses[i], Array.from(airshaftListing.ram.slice(0x919f + 8 * i, 0x91a5 + 8 * i)));
  for (const pointer of poses[i]) assert(pointer === 0x0f || expectedSlots.includes(pointer));
}
console.log('OK - 30 character arrangements match their pointer records');

const motionMatch = html.match(/<script id="museum-motion-data" type="application\/json">([^<]+)<\/script>/);
assert(motionMatch, 'museum movement inspector has its data');
const motionShapes = JSON.parse(motionMatch[1]);
assert.deepStrictEqual(motionShapes.map(shape => shape.pointer), Array.from({length: 8}, (_, n) => n + 0x7c));
for (const shape of motionShapes) {
  const start = 0x4000 + 64 * shape.pointer;
  assert.deepStrictEqual(shape.bytes, Array.from(museumListing.ram.slice(start, start + 63)));
}
console.log('OK - eight museum movement shapes match the listing');

const broadwayMotionMatch = html.match(/<script id="broadway-motion-data" type="application\/json">([^<]+)<\/script>/);
assert(broadwayMotionMatch, 'Broadway movement inspector has its data');
const broadwayMotionFrames = JSON.parse(broadwayMotionMatch[1]);
assert.deepStrictEqual(broadwayMotionFrames.map(frame => frame.address), Array.from({length: 32}, (_, n) => 0xf000 + n * 64));
for (const frame of broadwayMotionFrames) {
  assert.deepStrictEqual(frame.bytes, Array.from(listing.ram.slice(frame.address, frame.address + 63)));
}
console.log('OK - 32 Broadway movement frames match the listing');

const museumPairMatch = html.match(/<script id="museum-pair-data" type="application\/json">([^<]+)<\/script>/);
assert(museumPairMatch, 'museum sprite-pair viewer has its data');
const museumPairs = JSON.parse(museumPairMatch[1]);
assert.equal(museumPairs.length, 8);
for (let i = 0; i < museumPairs.length; i++) {
  assert.deepStrictEqual(museumPairs[i].map(shape => shape.pointer), [museumListing.ram[0x9618 + i], museumListing.ram[0x9620 + i]]);
  for (const shape of museumPairs[i]) {
    const start = 0x4000 + 64 * shape.pointer;
    assert.deepStrictEqual(shape.bytes, Array.from(museumListing.ram.slice(start, start + 63)));
  }
}
console.log('OK - eight museum sprite pairs match the tables and listing');


const broadwayAnimationMatch = html.match(/<script id="broadway-animation-data" type="application\/json">([^<]+)<\/script>/);
assert(broadwayAnimationMatch, "Broadway animation shapes are embedded");
const broadwayAnimation = JSON.parse(broadwayAnimationMatch[1]);
assert.deepStrictEqual(broadwayAnimation.map(shape => shape.pointer), [0x08, 0x0c, ...Array.from({length: 28}, (_, i) => 0x28 + i), ...Array.from({length: 7}, (_, i) => 0x44 + i), ...Array.from({length: 11}, (_, i) => 0x4c + i), ...Array.from({length: 70}, (_, i) => 0x58 + i), ...Array.from({length: 32}, (_, i) => 0x9e + i)]);
for (const shape of broadwayAnimation) {
  const address = 0x4000 + 64 * shape.pointer;
  assert.deepStrictEqual(shape.bytes, Array.from(listing.ram.slice(address, address + 63)));
}
for (let group = 0; group < 6; group++) {
  const bytes = listing.ram.slice(0xc597 + 72 * group, 0xc597 + 72 * (group + 1));
  const pointers = new Set(); let terminators = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    if (bytes[i] === 0xff) { assert.equal(bytes[i + 1], 0xff); terminators++; }
    else { assert.equal(bytes[i + 1], 0); pointers.add(bytes[i]); }
  }
  assert.equal(terminators, 4);
  assert.deepStrictEqual([...pointers].sort((a, b) => a - b), Array.from({length: 8}, (_, i) => 0x60 + group * 8 + i));
}
console.log("OK - 150 Broadway animation slots and six sequence groups match the listing");

const museumWalkMatch = html.match(/<script id="museum-walk-data" type="application\/json">([^<]+)<\/script>/);
assert(museumWalkMatch, "museum walking frames are embedded");
const museumWalk = JSON.parse(museumWalkMatch[1]);
assert.deepStrictEqual(museumWalk.map(shape => shape.pointer), Array.from({length: 64}, (_, i) => 0x20 + i));
for (const shape of museumWalk) {
  const address = 0x4000 + shape.pointer * 64;
  assert.deepStrictEqual(shape.bytes, Array.from(museumListing.ram.slice(address, address + 63)));
}
for (const [operand, base] of [[0xb46e, 0x48], [0xb4bf, 0x28], [0xb509, 0x20], [0xb564, 0x58], [0xb5b5, 0x38], [0xb5ff, 0x40], [0xb650, 0x50], [0xb69e, 0x30]]) {
  assert.equal(museumListing.ram[operand], base);
}
console.log("OK - 64 museum walking frames match the listing and direction operands");

const museumExtraMatch = html.match(/<script id="museum-extra-data" type="application\/json">([^<]+)<\/script>/);
assert(museumExtraMatch, "additional museum sprite shapes are embedded");
const museumExtra = JSON.parse(museumExtraMatch[1]);
assert.deepStrictEqual(museumExtra.map(shape => shape.pointer), [...Array.from({length: 20}, (_, i) => 0x68 + i), ...Array.from({length: 19}, (_, i) => 0x84 + i), ...Array.from({length: 16}, (_, i) => 0x98 + i)]);
for (const shape of museumExtra) {
  const address = 0x4000 + shape.pointer * 64;
  assert.deepStrictEqual(shape.bytes, Array.from(museumListing.ram.slice(address, address + 63)));
}
console.log("OK - 55 additional museum sprite shapes match the listing");

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
