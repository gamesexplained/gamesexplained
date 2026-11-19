#!/usr/bin/env node
// Hold graphics.html's loading picture (the blocks pl-loading-data and pl-loading) to the cassette.
// The block pl-loading-data is one frame recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py
// capture, then trim) on 12 November 2026, 170 seconds into the cassette, the Ultimate Tape Archive's
// "Platoon_Side_1.tap" (1,723,966 bytes, SHA-256
// 44b301644775e53b478cc829acef4c16d7c6ff59a590cb4f4d8225b928270502), with the picture whole.
// `frame.py compare` found C64.renderFrame's drawing of it equal to VICE's own picture in all
// 104,448 pixels.
// The tape is not in the repository, so the test holds the page to the recording by its hashes:
// - the video chip as the tape sets it: a multicolour bitmap ($D011 = $3B, $D016 = $D8)
//   in bank 1 ($DD00 = $96), screen at $5C00 and bitmap at $6000 ($D018 = $79), black border, white
//   background, and no writes in the frame;
// - the bitmap, the screen colours and colour RAM by their hashes, and the picture drawn by its hash;
// - how it arrives (the block pl-loading): memory read every 10 frames from 112 seconds in showed
//   the screen turn on at about 116 seconds with the screen colours and colour RAM whole, and the
//   bitmap filling from $6000 upward, every byte past the front 0, from the first byte at about
//   122.2 seconds to the last at 151.2. PL_FRONT holds the front at each read from 122.0 seconds on;
//   a partial picture must be the picture's bytes up to it and 0 after.
// The 1987 disk, the C64 Preservation Project's "platoon_s1[ocean_1987](pal)(!).g64" (325,814 bytes,
// SHA-256 c6676a42fec1aeda3bd158d4481f126e954c6d8b9d048a15175bc924f4e11411), recorded the same way
// 30 seconds in, showed the same video chip settings and the same bitmap, screen colours and colour
// RAM, byte for byte, so the hashes below hold the page's text about the disk too.
// It exits 1 on any difference.
//   node games/c64/platoon/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { plLoadingFrame, PL_FRONT } = g.run('graphics.html', 'pl-loading', 'plLoadingFrame', 'PL_FRONT');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="pl-loading-data">([^<]*)<\/script>/.exec(g.read('graphics.html'));
if (!m) { console.log('graphics.html has no pl-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '3b,d8,79');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '0,1');
check('$DD00', F.cia2[0], 0x96);
check('register writes in the frame', F.writes.length, 0);
check('bitmap $6000-$7F3F', sha(mem.subarray(0x6000, 0x7F40)), '7a22bd3fdc8a3b991fd9a550de1bb934cf61b2c6f2a9caa7f6f67d76e560132c');
check('screen colours $5C00-$5FE7', sha(mem.subarray(0x5C00, 0x5FE8)), '8f3e78bc930c34604bae44991e9b7c50a6fac8ecbf2cb4fc3a0a1d5bfe8b2513');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '541b3e9daa09b20bf85fa273e5cbd3e80185aa4ec298e765db87742b70138a53');
const whole = sha(C64.renderFrame(F).px);
check('the picture', whole, '6b6fd91a607d06ecb9e3d0f917e6ad31d4505d564760fa694f217cf4ea519094');
check('the picture, all of it in', sha(C64.renderFrame(plLoadingFrame(F, mem, 8000)).px), whole);
check('the screen before the first byte', sha(C64.renderFrame(plLoadingFrame(F, mem, 0)).px), 'a416d0d7f6539581909a782b0188538c8c8e394c3f1bb6d4f9bb9bfd88756635');

const [reads, , , hash] = '147,0,8000,6ad3fba4d13af6506bfb6088e6ab2dc36ee63d1145c408d7a7763b53ca6e4f11'.split(',');
check('front: reads', PL_FRONT.length, +reads);
check('front: from 0 to 8,000', [PL_FRONT[0], PL_FRONT[PL_FRONT.length - 1]].join(), '0,8000');
check('front: never goes back', PL_FRONT.every((x, i) => !i || x >= PL_FRONT[i - 1]), true);
check('front', sha(JSON.stringify(PL_FRONT)), hash);
for (const n of [0, 25, 4321, 7999]) {
  const P = plLoadingFrame(F, mem, n);
  let wrong = 0;
  for (let i = 0; i < 8000; i++) if (P.mem[0x6000 + i] !== (i < n ? mem[0x6000 + i] : 0)) wrong++;
  check(`picture with ${n} bytes in`, wrong, 0);
}

console.log(bad ? bad + ' difference(s)' : "platoon loading picture: the page's picture is the one recorded from the tape, and fills in at the recorded pace");
process.exit(bad ? 1 : 0);
