'use strict';
const assert = require('assert');
const crypto = require('crypto');
const {game} = require('../../../kit/scripts/port_check.js');

// The story screens and credits on How it works: the words, pictures and font they draw with.
const g = game(__dirname);
const html = g.read('index.html');
const match = html.match(/<script id="story-screens-data" type="application\/json">([^<]+)<\/script>/);
assert(match, 'story screens are embedded in the page');
const data = JSON.parse(match[1]);
const bytes = s => Uint8Array.from(Buffer.from(s, 'base64'));
const {storyPicturePixels} = g.run('index.html', 'story-picture-pixels', 'storyPicturePixels');
const {storyLetterCodes} = g.run('index.html', 'story-lettering', 'storyLetterCodes');
const title = g.listing('parts/title/listing.json');

assert.deepStrictEqual(Array.from(bytes(data.font)), Array.from(title.ram.slice(0x3000, 0x3000 + 0x76 * 8)), 'story font');
const credits = bytes(data.credits.text);
assert.equal(credits.length, 36 * 40);
assert.deepStrictEqual(Array.from(credits), Array.from(title.ram.slice(0xC200, 0xC200 + 1440)), 'title credits');
assert.equal(title.ram[0xC200 + 1440], 0, 'credits end with a zero');

assert.deepStrictEqual(data.screens.map(s => s.label), ['First story', 'Before Broadway', 'Before the museum', 'The ending']);
for (const screen of data.screens) {
  for (const p of screen.passages) {
    const text = bytes(p.text);
    assert.equal(text.length, p.rows * 40);
    if (p.part) {
      const listing = g.listing(`parts/${p.part}/listing.json`);
      for (let i = 0; i < text.length; i++) {
        assert(listing.has[p.at + i], `missing story byte at $${(p.at + i).toString(16)}`);
        assert.equal(text[i], listing.ram[p.at + i], `story byte at $${(p.at + i).toString(16)}`);
      }
      assert.equal(listing.ram[p.at + text.length], 0, `passage at $${p.at.toString(16)} ends with a zero`);
    } else assert(text.every(b => b >= 0x20 && b < 0x7F), 'original disk text is printable');
  }
  for (const picture of screen.pictures) {
    const listing = g.listing(`parts/${picture.part}/listing.json`);
    const [bitmap, matrix, colour] = picture.at;
    assert.deepStrictEqual(Array.from(bytes(picture.bitmap)), Array.from(listing.ram.slice(bitmap, bitmap + 4800)));
    assert.deepStrictEqual(Array.from(bytes(picture.matrix)), Array.from(listing.ram.slice(matrix, matrix + 600)));
    assert.equal(picture.colour, listing.ram[colour]);
  }
}
// Before Broadway's words come from the original disk: the cracked copies' second story load
// holds a cracker's note instead (parts/second-story/facts.md). The five passages joined with
// the zero bytes between them are the first 3,284 bytes of the original's text file.
const second = data.screens[1].passages.map(p => Buffer.from(bytes(p.text)));
const joined = Buffer.concat(second.flatMap((t, i) => i ? [Buffer.from([0]), t] : [t]));
assert.equal(joined.length, 3284);
assert.equal(crypto.createHash('sha256').update(joined).digest('hex'), '4df11385cd866d0f673b1a6bf10908d4034e16b19e7dd45b6694a959ca06aca9', 'original second story text');
console.log('OK - credits, story words and pictures match their listings and the original disk');

// Hashes of the 15 rows of the first story's second picture in a frame captured from the
// game; the page's picture renderer must draw the same pixels.
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
const first = data.screens[0].pictures[1];
assert.deepStrictEqual(first.at, [0x7B00, 0x8F00, 0x9180]);
const picture = {bitmap: bytes(first.bitmap), matrix: bytes(first.matrix), colour: first.colour};
for (let row = 0; row < expectedRows.length; row++) {
  const hash = crypto.createHash('sha256').update(Buffer.from(storyPicturePixels(picture, row))).digest('hex');
  assert.equal(hash, expectedRows[row], `story picture row ${row}`);
}
console.log('OK - the page draws the first story picture as the game showed it');

const {CPU} = require('../../../kit/cpu/cpu6502.js');
const engine = game(__dirname).listing('parts/story-engine/listing.json');
// Every row the page shows, through the game's own renderer at $1A12: the pairs the page
// draws each character with must be the two codes the renderer writes for it.
const texts = [credits, ...data.screens.flatMap(screen => screen.passages.map(p => bytes(p.text)))];
const glyphs = new Set(), punctuation = new Map();
let checkedRows = 0;
for (const text of texts) {
  for (let offset = 0; offset < text.length; offset += 40) {
    const ram = engine.ram.slice();
    const row = text.slice(offset, offset + 40);
    ram.set(row, 0x300);
    new CPU(ram, {port: 0x35}).call(0x1A12, {x: 0, y: 3});
    const [top, bottom] = storyLetterCodes(row, data.pairs);
    for (let i = 0; i < 40; i++) {
      const pair = [ram[0x1A67 + i], ram[0x1A8F + i]];
      assert.deepStrictEqual([top[i], bottom[i]], pair, `codes for ${JSON.stringify(String.fromCharCode(row[i]))}`);
      punctuation.set(row[i], pair);
      for (const code of pair) glyphs.add(code);
    }
    checkedRows++;
  }
}
assert.equal(checkedRows, 36 + 39 + 82 + 20 + 16);
for (const [character, code] of [['!', 2], ['&', 12], ["'", 14], ['(', 16], [')', 18], [',', 24], ['-', 26], ['.', 28], ['?', 62]]) {
  assert.deepStrictEqual(punctuation.get(character.charCodeAt(0)), [code, code + 1], `punctuation ${character}`);
}
assert([...glyphs].every(code => code <= 0x75), 'stored text stays within the declared alphabet');

const logo = engine.ram.slice();
new CPU(logo, {port: 0x35, io: {write: () => {}}}).call(0x13D8, {}, {hooks: {0x142B: () => true}});
for (let code = 0; code < 240; code++) {
  assert.equal(logo[0x568 + code], code, `title logo cell ${code}`);
}

assert(title.ram.slice(0x2780, 0x2800).every(byte => byte === 0), 'final sixteen logo characters are blank');
console.log(`OK - ${checkedRows} rows on the page draw with the codes the game's renderer writes; title setup selects 240 logo characters`);
