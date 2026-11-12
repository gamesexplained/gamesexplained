#!/usr/bin/env node
// Hold graphics.html's loading picture (the block bd-loading-data) to the cassette. The block is one frame
// recorded in VICE 3.10 with vice-mcp 3.14.0 (kit/c64/frame.py capture, then trim) on 12 November 2026,
// 80 seconds into Statesoft's 1984 cassette, the Ultimate Tape Archive's "Boulder_Dash.tap" (257,112 bytes,
// SHA-256 f5b3692803a718cbe139b78cbc3fa90a5a3fa30d50a44fd249dd4468e9b661b1), with the picture up.
// `frame.py compare` found C64.renderFrame's drawing of it equal to VICE's own picture in 104,425 of its
// 104,448 pixels; 12 of the others are VICE's grey dots where the loader stores to the border colour
// mid-line, and 11 are a pixel where a stripe changes colour a pixel away from VICE's.
// The tape is not in the repository, so the test holds the page to the recording by its hashes:
// - the video chip as the tape sets it: a multicolour bitmap ($D011 = $3B, $D016 = $D8) in bank 3
//   ($DD00 = $C4), screen at $CC00 and bitmap at $E000 ($D018 = $39), white background;
// - the border: the frame's 60 writes are all to $D020, each storing the next of the sixteen colours
//   ($F0 to $FF, and 0 in $F0's place), as the loader's INC of the border colour leaves it;
// - the bitmap, the screen colours and colour RAM by their hashes, and the picture drawn by its hash;
// - memory read every 10 frames from 60 seconds in showed the bitmap whole by then with the screen off,
//   the screen colours in from 60.8 to 64.2 seconds and colour RAM from 66.4 to 69.6, still with the
//   screen off ($D011 bit 4 clear), the bitmap screen on, the picture whole, at 74.0 seconds, and the
//   picture gone at 127.4 seconds; the sound chip's volume was 0 in the recorded frame.
// It exits 1 on any difference.
//   node games/c64/boulder-dash/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="bd-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no bd-loading-data block'); process.exit(1); }
const F = JSON.parse(m[1]);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), 'cc00:1000,e000:8000,ffff:1');
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '3b,d8,39');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '13,1');
check('$DD00', F.cia2[0], 0xC4);
check('register writes in the frame', F.writes.length, 60);
check('every write is to $D020', F.writes.every((w) => w[2] === 0xD020), true);
check('each moves the border on one colour', F.writes.every((w, i) => !i || (w[3] & 15) === ((F.writes[i - 1][3] + 1) & 15)), true);
check('bitmap $E000-$FF3F', sha(mem.subarray(0xE000, 0xFF40)), '01e5c1d5c2f8ac5770a18ee31e343d72cd87e0c4225a711d4c572246921a1a4b');
check('screen colours $CC00-$CFE7', sha(mem.subarray(0xCC00, 0xCFE8)), '4d3f0714707003bacf00c13f47ee43091d418222dff4a2168d7de635e549f1b7');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), 'fc8ba87e04d4ee562236ccec1a0de6c31907c463cc641d591bb42900bbf9b5c9');
check('the picture, with the border as the loader left it', sha(C64.renderFrame(F).px), 'ec29ae709cbd6f9d490a0a2ca5aae696f5f02f0fca346646564d563b0dc04719');
check('the page says so', ['puts it up whole, 74 seconds into the tape', 'for 53 seconds'].filter((s) => !page.includes(s)).join(), '');

console.log(bad ? bad + ' difference(s)' : "boulder-dash loading picture: the page's picture and its border are the frame recorded from the tape");
process.exit(bad ? 1 : 0);
