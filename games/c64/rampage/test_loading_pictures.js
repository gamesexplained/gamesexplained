#!/usr/bin/env node
// Hold graphics.html's two loading pictures to the disk. The page carries the files PART2 and
// PART6 of Activision's 1987 disk as base64 (the element rp-g-load-data): each is 10,240 bytes
// that load at $4000, a multicolour bitmap with its screen colours at $6000 and its colour memory
// at $6400. The disk is not in the repository, so the test holds the page to the files (each without its two-byte load
// address) by their SHA-256, and to the drawing by the SHA-256 of the picture C64.renderFrame makes of the frame the
// block rp-loading (rpLoading) builds: bank $4000 ($DD00 = $96), $D018 = $80, $D011 = $3B,
// $D016 = $D8, border and background black, as the loader sets the video chip.
// It exits 1 on any difference.
//   node games/c64/rampage/test_loading_pictures.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { rpLoading } = g.run('graphics.html', 'rp-loading', 'rpLoading');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };
const m = /<script type="application\/json" id="rp-g-load-data">([^<]*)<\/script>/.exec(g.read('graphics.html'));
if (!m) { console.log('graphics.html has no rp-g-load-data element'); process.exit(1); }
const D = JSON.parse(m[1]);
const WANT = {
  PART2: ['edfbb90dbb13679fcd02b4beea172f289d6c0dbed73265277dbd4eb563c7bf47', '34f151c005489b8f413bf2af8560d00b0485bc87a589c255fa29c0bfdfbfbf17'],
  PART6: ['a5f5159161039199f2e3c08fc828ba9a62d9ac90738bd2c89df3ed030fea348c', '74ce66a307d3992763f89dc525ae2a32104b9d1cc298909de0970ed273f4a07c'],
};
for (const name of Object.keys(WANT)) {
  const b = Buffer.from(D[name] || '', 'base64');
  check(name + ' length', b.length, 10240);
  check(name + ' bytes', sha(b), WANT[name][0]);
  const F = rpLoading(b);
  check(name + ' registers', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.vic[0x20], F.vic[0x21], F.cia2[0]].join(), '59,216,128,0,0,150');
  check(name + ' picture', sha(C64.renderFrame(F).px), WANT[name][1]);
}
console.log(bad ? bad + ' difference(s)' : 'rampage loading pictures: both are the disk\'s files, drawn as the loader shows them');
process.exit(bad ? 1 : 0);
