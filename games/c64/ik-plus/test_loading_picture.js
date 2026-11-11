#!/usr/bin/env node
// Hold fighters.html's loading pictures (the block ik-loading-data) to the cassette. Each picture is
// one frame recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py capture, then trim) while
// the 1987 cassette loads, the Ultimate Tape Archive's "IK+.tap" (745,527 bytes, SHA-256
// 8c02b1bdb2e4c79e1e387899a29e70ca307ac011cb9e9e6d93295da26efc2a32), on 11 November 2026: System 3's
// logo 160 seconds into the tape and the fist 194 seconds in. `frame.py compare` found
// C64.renderFrame's drawing of each recording equal to VICE's own picture of the frame in all
// 104,448 pixels. The tape is not in the repository, so the test holds the page to the recordings
// by their hashes:
// - the video chip as the tape sets it for both: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in
//   bank 3 ($DD00 = $C4), bitmap at $E000 and screen at $D000 ($D018 = $49), and no register
//   written during the frame;
// - each picture's bitmap, screen colours and colour RAM by their hashes;
// - the picture site/lib/c64.js draws from each by the hash of the recording's drawing;
// - how each comes on (the block ik-blinds). Memory read every frame in the same session, while the
//   fist came back after the credits (191.5 to 192.4 seconds in), showed the bitmap filling a pixel
//   row at a time: the top row of every character cell in screen order, then the second row, to the
//   eighth, with every byte not yet reached 0. Each frame's bitmap was the picture's first n bytes
//   in that order, n as IK_FRONT gives it, from 0 to 8,000 in 41 frames. The logo came on, and both
//   pictures went off, in the same order at the same pace. A partial picture must be the
//   picture's bytes in that order up to the front and 0 after, and the whole one the recording.
// It exits 1 on any difference.
//   node games/c64/ik-plus/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { ikBlinds, IK_FRONT } = g.run('fighters.html', 'ik-blinds', 'ikBlinds', 'IK_FRONT');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = /<script type="application\/json" id="ik-loading-data">([^<]*)<\/script>/.exec(g.read('fighters.html'));
if (!m) { console.log('fighters.html has no ik-loading-data block'); process.exit(1); }
const P = JSON.parse(m[1]);
const WANT = {
  fist: { bitmap: '498e9746c1a4301cc18b15f183f1ce3f70628466bafc94080d3e9b4ce5bdba87',
    screen: '7263e8ea8cbac888d6df23a00d1b82bb7a2150f97d24422ea9b2e156b7aa46a1',
    colour: '6c15d1fa1194d147458ca7ee4e17633a67aafe9d789b9da1832afd78b276b9d3',
    picture: '1c40118aa97301541df445f110c36ac58d441c900c73f5bdc36611cbf866b652' },
  logo: { bitmap: '7f9a2dd48b89ae7a08b22d23001c90e1597d6b82a47c9e9d395859bbcc808308',
    screen: '0eec4185f5179c121c34e08c9ed8ce683dab7ff689cf3b0da32345568a23cb74',
    colour: 'eddcad0815e21f15fd9438b4a174fd28da24ce69841c470f521cbc4872b699c3',
    picture: '711dcc8aa9a055ff3b2fe1be5ea527706876aa4f8824da9f9a995fae51f5879d' },
};
check('pictures', Object.keys(P).join(), Object.keys(WANT).join());
for (const [k, w] of Object.entries(WANT)) {
  const F = P[k];
  if (!F) continue;
  check(k + ' $D011', F.vic[0x11], 0x3B);
  check(k + ' $D016', F.vic[0x16], 0xD8);
  check(k + ' $D018', F.vic[0x18], 0x49);
  check(k + ' $DD00', F.cia2[0], 0xC4);
  check(k + ' register writes in the frame', F.writes.length, 0);
  const mem = new Uint8Array(0x10000);
  for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
  check(k + ' bitmap $E000-$FF3F', sha(mem.subarray(0xE000, 0xFF40)), w.bitmap);
  check(k + ' screen colours $D000-$D3E7', sha(mem.subarray(0xD000, 0xD3E8)), w.screen);
  check(k + ' colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), w.colour);
  check(k + ' picture', sha(C64.renderFrame(F).px), w.picture);
  const colourMem = Buffer.from(F.colour, 'base64');
  check(k + ' picture, all of it in', sha(C64.renderFrame(Object.assign({}, F, { mem: ikBlinds(mem, 8000), colourMem })).px), w.picture);
  for (const n of [0, 191, 2942, 7999]) {
    const m = ikBlinds(mem, n);
    let wrong = 0;
    for (let i = 0; i < 8000; i++) {
      const a = 0xE000 + (i % 1000) * 8 + (i / 1000 | 0);
      if (m[a] !== (i < n ? mem[a] : 0)) wrong++;
    }
    check(`${k} with ${n} bytes in`, wrong, 0);
  }
}
check('front: frames', IK_FRONT.length, 42);
check('front: from 0 to 8,000', [IK_FRONT[0], IK_FRONT[IK_FRONT.length - 1]].join(), '0,8000');
check('front: never goes back', IK_FRONT.every((v, i) => !i || v > IK_FRONT[i - 1]), true);

console.log(bad ? bad + ' difference(s)' : "ik-plus loading pictures: the page's two frames are those recorded from the tape, each draws its 104,448 pixels, and each comes on in the cassette's order");
process.exit(bad ? 1 : 0);
