'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {game} = require('../../../kit/scripts/port_check.js');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const match = html.match(/<script id="story-data" type="application\/json">([^<]+)<\/script>/);
assert(match, 'story data is embedded in the page');
const passages = JSON.parse(match[1]);
const ranges = [
  ['opening-story', 0xC200, 720], ['opening-story', 0xC4D1, 400], ['opening-story', 0xC662, 440],
  ['second-story', 0xC200, 440], ['third-story', 0xC200, 320], ['third-story', 0xC341, 480],
  ['ending', 0xC200, 640],
];
assert.equal(passages.length, ranges.length);
for (let i = 0; i < ranges.length; i++) {
  const [part, start, length] = ranges[i];
  const listing = game(__dirname).listing(`parts/${part}/listing.json`);
  assert.equal(passages[i].length, length);
  assert.equal(length % 40, 0);
  for (let offset = 0; offset < length; offset++) {
    assert(listing.has[start + offset], `missing story byte at $${(start + offset).toString(16)}`);
    assert.equal(passages[i][offset], listing.ram[start + offset], `story byte at $${(start + offset).toString(16)}`);
  }
  if (part === 'opening-story') {
    assert(listing.has[start + length]);
    assert.equal(listing.ram[start + length], 0);
  }
}
console.log('OK - all seven story passages match their source listings');

const {CPU} = require('../../../kit/cpu/cpu6502.js');
const engine = game(__dirname).listing('parts/story-engine/listing.json');
const allRanges = [['title', 0xC200, 1440], ...ranges];
const glyphs = new Set(), punctuation = new Map();
let checkedRows = 0;
for (const [part, start, length] of allRanges) {
  const source = game(__dirname).listing(`parts/${part}/listing.json`).ram;
  for (let offset = 0; offset < length; offset += 40) {
    const ram = engine.ram.slice();
    ram.set(source.slice(start + offset, start + offset + 40), 0x300);
    new CPU(ram, {port: 0x35}).call(0x1A12, {x: 0, y: 3});
    for (let i = 0; i < 40; i++) {
      const pair = [ram[0x1A67 + i], ram[0x1A8F + i]];
      punctuation.set(source[start + offset + i], pair);
      for (const code of pair) glyphs.add(code);
    }
    checkedRows++;
  }
}
assert.equal(checkedRows, 122);
for (const [character, code] of [['!', 2], ['&', 12], ["'", 14], ['(', 16], [')', 18], [',', 24], ['-', 26], ['.', 28], ['?', 62]]) {
  assert.deepStrictEqual(punctuation.get(character.charCodeAt(0)), [code, code + 1], `punctuation ${character}`);
}
assert([...glyphs].every(code => code <= 0x75), 'stored text stays within the declared alphabet');

const logo = engine.ram.slice();
new CPU(logo, {port: 0x35, io: {write: () => {}}}).call(0x13D8, {}, {hooks: {0x142B: () => true}});
for (let code = 0; code < 240; code++) {
  assert.equal(logo[0x568 + code], code, `title logo cell ${code}`);
}
const title = game(__dirname).listing('parts/title/listing.json');
assert(title.ram.slice(0x2780, 0x2800).every(byte => byte === 0), 'final sixteen logo characters are blank');
console.log('OK - 122 text rows identify punctuation; title setup selects 240 logo characters');
