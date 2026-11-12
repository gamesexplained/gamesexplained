#!/usr/bin/env node
// Hold graphics.html's loading pictures (the blocks sb-loading-data and sb-loading) to the cassette,
// Mirrorsoft's 1989 tape, the Ultimate Tape Archive's "Speedball.tap" (507,239 bytes, SHA-256
// a761db0f63e8019ce967688ae3061a918d554785ad278ac2a8baa6d30e7565d3), in VICE 3.10 with vice-mcp 3.14.0 on
// 12 November 2026:
// - each picture is one frame recorded with kit/c64/frame.py capture, then trim: the first 100 seconds in,
//   the second 135 seconds in with the fist in place. `frame.py compare` found the drawing of each equal
//   to VICE's own picture in every pixel but VICE's grey dots where the loader stores to the border colour
//   mid-line, 8 in the first and 14 in the second;
// - both are multicolour bitmaps ($D011 = $3B, $D016 = $D8) in bank 3 ($DD00 = $94), screen at $DC00 and
//   bitmap at $E000 ($D018 = $79), on black, and each frame's writes are to the border, flipping it between
//   two colours, red and yellow for the first and brown and grey for the second, and one to a sprite's
//   colour ($D02E) with no sprite on;
// - memory read every 5 frames from 80 seconds in showed the first picture come up whole about 83 seconds
//   in, the screen turned off about 38 seconds later, the second picture's bytes written with it off, and
//   the screen turned back on with them in, about 124 seconds in. In another run, read every frame, the
//   bitmap did not change from the frame that turned the screen on until 65 frames later; then, in each
//   of five steps 4 frames apart, two frames running changed it, all where the fist goes, and then it did
//   not change again for as long as it was read (to 130 seconds). A third run, reading one byte of the
//   fist every frame, saw it change first 65 frames after the screen came on. The block's fist holds those bytes as
//   they were when the screen came on and each change at the frame it was read in, and sbFist rebuilds the
//   bitmap at each of those frames: the eleven bitmaps must hash as VICE's did, the last must be the
//   recorded frame's, and the first drawn must hash as below.
// It exits 1 on any difference.
//   node games/c64/speedball/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { sbFist } = g.run('graphics.html', 'sb-loading', 'sbFist');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="sb-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no sb-loading-data block'); process.exit(1); }
const D = JSON.parse(m[1]);
const memOf = (F) => { const mem = new Uint8Array(0x10000); for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a); return mem; };
const want = {
  credits: ['cfb507b0977fb4923528f7134ad39f3a3600b262e38d01e2f760b16ce523e5a1', 'aef867cad239e48fd2d29d067069ddd4fe099e5e193c13dbb57beb2e3d6241a2',
    '10b9e2b24ea979dac25213ce8445c5271f8f4db91a799d0dcda4dca0342a8aa1', '0c7de06d31c5237843b70ffc2c4f0643331fd2155beb40e5b4148c407352a7a9', '2,7'],
  title: ['af94ae5f9862282cfc48e6f2116c89b5c5aff1bb61c72fb0fcd2ce157e0061a6', '8c0e15466defac7e6e9be04f704ddbb4d36c3ae521d06a5458cd82b650b01110',
    '608e13a2fbd68d89049279f6931447cacf4d086c60439b8c47b9f0b38bc13f9b', '5fb65b02a4e9d3c1df7515491f089c1316665fbe45a686b62168e2adc44771a1', '12,9'],
};
for (const k of ['credits', 'title']) {
  const F = D[k], mem = memOf(F), w = want[k];
  check(k + ': $D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '3b,d8,79');
  check(k + ': background, $DD00, sprites on', [F.vic[0x21] & 15, F.cia2[0], F.vic[0x15]].join(), '0,148,0');
  check(k + ': the writes are to the border and a sprite colour', F.writes.every((x) => x[2] === 0xD020 || x[2] === 0xD02E), true);
  check(k + ': the border\'s two colours', [...new Set(F.writes.filter((x) => x[2] === 0xD020).map((x) => x[4] & 15))].sort((a, b) => b - a).join(), w[4].split(',').map(Number).sort((a, b) => b - a).join());
  check(k + ': bitmap', sha(mem.subarray(0xE000, 0xFF40)), w[0]);
  check(k + ': screen colours', sha(mem.subarray(0xDC00, 0xDFE8)), w[1]);
  check(k + ': colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), w[2]);
  check(k + ': the picture drawn', sha(C64.renderFrame(F).px), w[3]);
}

// the fist
const frames = sbFist(D.title), title = memOf(D.title);
check('the fist: frames after the screen came on', frames.map((f) => f.at).join(), '0,65,66,69,70,73,74,77,78,81,82');
check('the fist: bytes it changes', Buffer.from(D.title.fist.before, 'base64').length / 3, 1060);
check('the fist: the eleven bitmaps, as VICE read them', sha(Buffer.concat(frames.map((f) => Buffer.from(f.mem.subarray(0xE000, 0xFF40))))), '52b53a2fbf4d183f9d19c00f1a5082004a12796e9e6f17463c8684038b30f233');
check('the fist: the last is the recorded frame\'s', Buffer.compare(Buffer.from(frames[10].mem.subarray(0xE000, 0xFF40)), Buffer.from(title.subarray(0xE000, 0xFF40))), 0);
check('the fist: nothing but the bitmap changes', frames.every((f) => Buffer.compare(Buffer.from(f.mem.subarray(0xDC00, 0xDFE8)), Buffer.from(title.subarray(0xDC00, 0xDFE8))) === 0), true);
check('the picture with the screen just on', sha(C64.renderFrame(Object.assign({}, D.title, { mem: frames[0].mem })).px), '992fd58b9754653b470f3d8473b86a4648b6def265b9f72d2ffc84ae1a45bd4f');
check('the page says so', ['about 83 seconds in', 'about 41 seconds later', 'A second and a third later', 'the fist arrives in five steps, four frames apart, each drawn in two halves a frame apart']
  .filter((s) => !page.includes(s)).join(), '');

console.log(bad ? bad + ' difference(s)' : "speedball loading pictures: the page's pictures are the frames recorded from the tape, and its fist arrives as VICE drew it");
process.exit(bad ? 1 : 0);
