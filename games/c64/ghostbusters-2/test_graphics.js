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
