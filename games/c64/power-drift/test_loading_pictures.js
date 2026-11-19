#!/usr/bin/env node
// Hold graphics.html's loading pictures (the blocks pd-loading-jason and pd-loading-logo) to the
// recordings they came from. Each is one frame recorded in VICE 3.10 with vice-mcp 3.14.0
// (kit/c64/frame.py capture, then trim) on 11 November 2026:
// - Jason: the disk, the C64 Preservation Project's G64 that orientation.md names, 22 seconds after
//   the autostart. `frame.py compare` found C64.renderFrame's drawing equal to VICE's picture in
//   104,415 of 104,448 pixels; the 33 others are flecks in the border.
// - The logo: the 1989 Activision cassette, the Ultimate Tape Archive's "Power_Drift.tap" (805,770
//   bytes, SHA-256 85a89286612581b24ad43c6d23d5781d96d36efec7df00c60fdb00c5b938abbf), 140 seconds
//   in. The drawing matched VICE's picture in 104,439 pixels, and the other 9 are VICE's grey dots
//   where the loader changed the border's colour in mid-line.
// Memory read every 5 frames showed each picture come on in one frame, when $D011 went from $1B to
// $3B, the whole bitmap, screen colours and colour RAM already in place: Jason at frame 870 of the
// disk, the logo at frame 6,120 of the cassette, and the cassette's Jason, the disk's byte for byte
// in all three, at frame 10,810. The images are not in the repository, so the test holds the page
// to the recordings by their hashes:
// - the video chip: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in the bank at $4000 ($DD00's
//   low bits 2), bitmap at $4000 and screen at $6000 ($D018 = $81), a black background;
// - the bitmap, the screen colours and colour RAM, and the drawing of the picture inside the border.
// It exits 1 on any difference.
//   node games/c64/power-drift/test_loading_pictures.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const WANT = {
  'pd-loading-jason': ['8754c6b81bbe49c438db6f20cfb3b340b42e35976f924c4793be4bebd04e8ac1', 'f4d9785f39757095273c239744f8062d2f5f7afe5f7e73051b8308b4715e137f',
    '64ac12c3e66bf9f9dc9086fbf4ba69306ed1dc2a57594ea934cccf4fa962f9a4', '956e986cbf915dfe30ca3e0b5ca1dd9b5c5724d7245c702735c25f440407e8b7'],
  'pd-loading-logo': ['2de1b54c4dfb5ce577ed8eb42518fbc139c3b426653295e80907bacfbfe07462', 'eeb058bfdcbbeb6ab4b3e30914a9d7a3a252c021e9e5805bdce6e770fb7f837d',
    '33c9cfb8902adf5105f0fdc259a8d8e1d8db03e0286165063a532959417b3525', 'f194ef2f8f1a09e49ac3b36253bd693567851e66caca1bed7f6b83251a57353f'],
};
for (const [id, [bitmap, screen, colour, picture]] of Object.entries(WANT)) {
  const m = new RegExp('<script type="application/json" id="' + id + '">([^<]*)</script>').exec(g.read('graphics.html'));
  if (!m) { bad++; console.log('graphics.html has no ' + id + ' block'); continue; }
  const F = JSON.parse(m[1]);
  check(id + ' $D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].join(), '59,216,129');
  check(id + ' background', F.vic[0x21] & 15, 0);
  check(id + ' bank', F.cia2[0] & 3, 2);
  check(id + ' writes to $D011, $D016, $D018 or $DD00', F.writes.filter((w) => [0xD011, 0xD016, 0xD018, 0xDD00].includes(w[2])).length, 0);
  const mem = new Uint8Array(0x10000);
  for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
  check(id + ' bitmap $4000-$5F3F', sha(mem.subarray(0x4000, 0x5F40)), bitmap);
  check(id + ' screen colours $6000-$63E7', sha(mem.subarray(0x6000, 0x63E8)), screen);
  check(id + ' colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), colour);
  const r = C64.renderFrame(F), inner = [];
  for (let y = 35; y < 235; y++) for (let x = 32; x < 352; x++) { const i = (y * r.w + x) * 4; inner.push(r.px[i], r.px[i + 1], r.px[i + 2]); }
  check(id + ' the picture inside the border', sha(Buffer.from(inner)), picture);
}

console.log(bad ? bad + ' difference(s)' : "power-drift loading pictures: the page's frames are the ones recorded from the disk and the cassette");
process.exit(bad ? 1 : 0);
