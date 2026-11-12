'use strict';
const assert = require('assert');
const crypto = require('crypto');
const {game} = require('../../../kit/scripts/port_check.js');
const stash = game(__dirname).listing('parts/resident-stash/listing.json');
// Offsets of the 602 bytes compared with the captured opening-story state.
// The digest was recorded from that state, before its inherited bytes were
// removed from the opening-story listing. These five bytes differed from
// the stored source because the story state had already changed them.
const ranges = [[1117, 1181], [1236, 1242], [1778, 1952], [2007, 2339], [2467, 2488]];
const changed = new Map([[0x145e, 1], [0x1903, 7], [0x1905, 0x3b], [0x1906, 0x1b], [0x19a3, 0xff]]);
const sourceValues = new Map([[0x145e, 0], [0x1903, 0], [0x1905, 0x7b], [0x1906, 0x7b], [0x19a3, 0]]);
const bytes = [];
for (const [first, last] of ranges) for (let offset = first; offset <= last; offset++) {
  const source = 0xd000 + offset, target = 0x1000 + offset;
  assert(stash.has[source], `stash byte $${source.toString(16)} must be listed`);
  if (sourceValues.has(target)) assert.equal(stash.ram[source], sourceValues.get(target));
  bytes.push(changed.has(target) ? changed.get(target) : stash.ram[source]);
}
assert.equal(bytes.length, 602);
assert.equal(crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex'),
  '1378c0ec88d5440a114329581d1828689d56ca6c8f377b333cc3912eb3e80c9b');
console.log('OK - stored bytes match the independently captured story-state digest');
