'use strict';
const assert = require('assert');
const {game} = require('../../../kit/scripts/port_check.js');
const g = game(__dirname);
const story = g.listing('parts/opening-story/listing.json');
const stash = g.listing('parts/resident-stash/listing.json');
let compared = 0;
const different = [];
for (let offset = 0; offset < 0x0c00; offset++) {
  const live = 0x1000 + offset, source = 0xd000 + offset;
  if (!story.has[live]) continue;
  assert(stash.has[source], `stash byte $${source.toString(16)} must be listed`);
  compared++;
  if (story.ram[live] !== stash.ram[source]) different.push([live, story.ram[live], stash.ram[source]]);
}
assert(compared >= 571, 'compare the described story image with its stored copy');
// These bytes differ in the later story snapshot.
assert.deepStrictEqual(different, [
  [0x145e, 0x01, 0x00], [0x1903, 0x07, 0x00], [0x1905, 0x3b, 0x7b],
  [0x1906, 0x1b, 0x7b], [0x19a3, 0xff, 0x00],
]);
console.log(`OK - ${compared} listed story bytes compared with their resident copy`);
