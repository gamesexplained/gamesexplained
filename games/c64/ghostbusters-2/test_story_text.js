'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {game} = require('../../../kit/scripts/port_check.js');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const match = html.match(/<script id="story-data" type="application\/json">([^<]+)<\/script>/);
assert(match, 'story data is embedded in the page');
const passages = JSON.parse(match[1]);
const listing = game(__dirname).listing('parts/opening-story/listing.json');
const ranges = [[0xC200, 720], [0xC4D1, 400], [0xC662, 440]];
assert.equal(passages.length, ranges.length);
for (let i = 0; i < ranges.length; i++) {
  const [start, length] = ranges[i];
  assert.equal(passages[i].length, length);
  assert.equal(length % 40, 0);
  for (let offset = 0; offset < length; offset++) {
    assert(listing.has[start + offset], `missing story byte at $${(start + offset).toString(16)}`);
    assert.equal(passages[i][offset], listing.ram[start + offset], `story byte at $${(start + offset).toString(16)}`);
  }
  assert(listing.has[start + length]);
  assert.equal(listing.ram[start + length], 0);
}
console.log('OK - all three story passages match the opening-story listing');
