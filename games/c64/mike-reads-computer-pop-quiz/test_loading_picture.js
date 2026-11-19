#!/usr/bin/env node
// Holds graphics.html's loading picture (PQ_LOADING) to the cassette. On 14 November 2026 the tape's file "0"
// (work/novaload.py on the contributor's TAP, 12,096 bytes loaded at $1000-$3F3F, the file itself with its load
// address hashing 29f4786e0139154b88c1cc24004badf0b622c48fde54cb1f24e1b8f148c30cfd) gave the page its 10,000 bytes:
// the screen colours $1000-$13E7, the colour RAM $13E8-$17CF and the bitmap $2000-$3F3F, which the loader's second
// stage shows ($4018-$4067: screen colours copied to $0400, colour RAM to $D800, $D018 |= 8 for the bitmap at $2000,
// multicolour). The test checks the page carries exactly those bytes, by their hash, and that each part looks like
// what it should: the bitmap not empty.
//   node games/c64/mike-reads-computer-pop-quiz/test_loading_picture.js
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const html = g.read('graphics.html');
const m = html.match(/const PQ_LOADING = "([A-Za-z0-9+/=]+)";/);
let bad = 0;
const fail = (...w) => { bad++; console.log('DIFFERS', ...w); };
if (!m) { fail('graphics.html carries no PQ_LOADING'); process.exit(1); }
const d = Buffer.from(m[1], 'base64');
if (d.length !== 10000) fail('PQ_LOADING is', d.length, 'bytes, not 10,000');
const h = crypto.createHash('sha256').update(d).digest('hex');
if (h !== 'a34fc5aadbdee1eed41e30df6f5cbf885730baaf39cc16337f990500dbfeb850') fail('PQ_LOADING hashes', h);
if (d.subarray(2000).every((v) => v === 0)) fail('the bitmap is empty');
console.log(bad ? bad + ' difference(s)' : 'loading picture test passed: the page carries the 10,000 bytes of the tape\'s file "0"');
process.exit(bad ? 1 : 0);
