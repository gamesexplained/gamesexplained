'use strict';
const assert = require('assert');
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
const storyMatch = html.match(/<script id="story-picture-data" type="application\/json">([^<]+)<\/script>/);
assert(storyMatch, 'the graphics page must include the story picture data');
const picture = JSON.parse(storyMatch[1]);
const storyListing = g.listing('parts/opening-story/listing.json');
assert.deepStrictEqual(picture.bitmap, Array.from(storyListing.ram.slice(0x7b00, 0x8dc0)));
assert.deepStrictEqual(picture.matrix, Array.from(storyListing.ram.slice(0x8f00, 0x9158)));
assert.equal(picture.colour.length, 600);
console.log('OK - story bitmap and colour matrix match the listing');
// Hashes of the 15 rows in the frame reconstructed from the VICE capture. The
// whole reconstruction differs from VICE by two pixels (raster lines 32 and 122).
const expectedRows = [
  'fa3e293546b5d09eddac53edb9d49d17e4b0944e402e1a0e500376dd9bd8d19f',
  '790f0950b404c0d4ccf604f2ea40153c591ec3bbdad067ad276cd57719a19f0b',
  '00242320fe42e0aa7ed9bf01d194b0f551f0b122644cee9fdd0e0d0de2cc5326',
  '6741374660ef17f0ecff1e4d9dcbf4a0b0b0cf66070b56789dc3ca10fd51ea62',
  '443fa0d43cc804f6c308e48c6429fc2103494b3e29132785663a9e4ccf08ae06',
  '4a8fe999d2bcd23f12a446e4f2c28c3c6bb73a1aa20523cb786dd8084a686c5d',
  '13a18197faae5ba6fdcd03ec878407e6002d64c874e1b8b8e79615e478c588be',
  '4371bc65812c57d3ab4ec6c72d8fb123f8b1efbfcf407268c9d072d793fa482e',
  '1c545f9c93fe73d55e6e68298243c7a2fe6ff2e77ed589d4a84bd07887c91725',
  '8ff797ccb0078c6f1fa82f55e2d7d8e65f8b07ec0085fc2988e0b1fd233ac096',
  '712f09c958bb60c8b2b48fec608443fad2b2df745b44147a94618dc941a034db',
  'c671a86d136b1ac9c4a1e875874876aa9dcebfe568651d52ca4421e572ac4868',
  '2e2e09b270399006100b63f7b5a08015acddee9846738ca970a4c3b58fc777ca',
  'e2e99d142aa4d581d248b1071e878d1891012234df0f32b92095574cdf65cb59',
  '55593b52f2143b862e865264bc28f55141de05f435f1c1173264c5f84154bfaa',
];
const {storyPicturePixels} = g.run('graphics.html', 'story-picture-pixels', 'storyPicturePixels');
for (let row = 0; row < expectedRows.length; row++) {
  const hash = require('crypto').createHash('sha256').update(Buffer.from(storyPicturePixels(picture, row))).digest('hex');
  assert.equal(hash, expectedRows[row], `reconstructed story picture row ${row}`);
}
console.log('OK - story picture rows match the reconstructed VICE frame');
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
  ...Array.from({length: 0x1f}, (_, n) => n + 0x20),
  ...Array.from({length: 4}, (_, n) => n + 0x9a),
  0xa2,
  ...Array.from({length: 6}, (_, n) => n + 0xa8),
  0xb4,
  ...Array.from({length: 5}, (_, n) => n + 0xbb),
];
assert.deepStrictEqual(slots.map(slot => slot.pointer), expectedSlots);
for (const slot of slots) {
  const start = 0x4000 + 64 * slot.pointer;
  for (let i = 0; i < 63; i++) assert(airshaftListing.has[start + i]);
  assert.deepStrictEqual(slot.bytes, Array.from(airshaftListing.ram.slice(start, start + 63)));
}
console.log('OK - 57 airshaft sprite slots match the listing');

const poseMatch = html.match(/<script id="airshaft-pose-data" type="application\/json">([^<]+)<\/script>/);
assert(poseMatch, 'airshaft pose viewer has its pointer records');
const poses = JSON.parse(poseMatch[1]);
assert.equal(poses.length, 5);
for (let i = 0; i < poses.length; i++) {
  assert.deepStrictEqual(poses[i], Array.from(airshaftListing.ram.slice(0x919f + 8 * i, 0x91a5 + 8 * i)));
  for (const pointer of poses[i]) assert(pointer === 0x0f || expectedSlots.includes(pointer));
}
console.log('OK - five character poses match their pointer records');

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

const storyGlyphMatch = html.match(/<script id="story-lower-glyph-data" type="application\/json">([^<]+)<\/script>/);
assert(storyGlyphMatch, 'story lower-band glyph viewer has its data');
const storyGlyphs = JSON.parse(storyGlyphMatch[1]);
const titleListing = g.listing('parts/title/listing.json');
assert.equal(storyGlyphs.length, 36);
for (const glyph of storyGlyphs) {
  const code = /^[A-Z]$/.test(glyph.character) ? 0x42 + 2 * (glyph.character.charCodeAt(0) - 65) : 0x20 + 2 * Number(glyph.character);
  assert.equal(glyph.code, code);
  assert.deepStrictEqual(glyph.bytes, Array.from(titleListing.ram.slice(0x3000 + 8 * code, 0x3010 + 8 * code)));
}
console.log('OK - 36 lower-band story glyphs match the listing');

const broadwayAnimationMatch = html.match(/<script id="broadway-animation-data" type="application\/json">([^<]+)<\/script>/);
assert(broadwayAnimationMatch, "Broadway animation shapes are embedded");
const broadwayAnimation = JSON.parse(broadwayAnimationMatch[1]);
assert.deepStrictEqual(broadwayAnimation.map(shape => shape.pointer), Array.from({length: 48}, (_, i) => 0x60 + i));
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
console.log("OK - 48 Broadway animation shapes and six sequence groups match the listing");
