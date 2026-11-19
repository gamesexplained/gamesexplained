#!/usr/bin/env node
// Hold graphics.html's loading picture (the block kane-loading-data) to the cassette, Mastertronic's 1985 tape,
// the Ultimate Tape Archive's "Kane.tap" (760,374 bytes, SHA-256
// d6c066a6cdc3380026ace9cd5ecd7c4af98cf90851fb48b3b23777b328c48093), loaded in VICE 3.10 with vice-mcp 3.14.0
// on 12 November 2026. Its two frames were recorded with kit/c64/frame.py capture, then trim:
// - D.ghost, 97 seconds in: a text screen ($D011 = $1B, $D016 = $C8, $D018 = $15) in bank 3 ($DD00 = $C4),
//   so the screen is at $C400 and the characters at $D000, on a blue background. Its colour RAM is the
//   picture's, byte for byte. `frame.py compare` found the drawing equal to VICE's picture in 104,421 of its
//   104,448 pixels; 14 of the others are VICE's grey dots where the loader stores to the border colour
//   mid-line, and 13 a pixel where a stripe changes colour a pixel away from VICE's;
// - D.picture, 130 seconds in: a multicolour bitmap ($D011 = $3B, $D016 = $D8, $D018 = $39) in the same
//   bank, screen at $CC00 and bitmap at $E000; compare found 104,425 pixels equal, 12 grey dots and 11 a
//   pixel away;
// - in both, every write in the frame is to $D020, each storing the next of the sixteen colours;
// - the video chip read every frame from 95 seconds in: the text screen at $0400 in bank 0 until frame
//   4,838, bank 3 from frame 4,839, and the bitmap screen from frame 4,935, 96 frames later (D.ghostFrames).
//   Memory read every 5 frames on another load showed the screen at $0400 all spaces while colour RAM
//   filled with the picture's colours, from 90.4 to 95.8 seconds in;
// - the video chip's mode and the sound chip read every 25 frames from the start of the tape: the bitmap
//   screen on between 97.5 and 98.0 seconds in, off between 231.0 and 231.5, and the sound chip silent
//   all that time.
// It exits 1 on any difference.
//   node games/c64/kane/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="kane-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no kane-loading-data block'); process.exit(1); }
const D = JSON.parse(m[1]);
const memOf = (F) => { const mem = new Uint8Array(0x10000); for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a); return mem; };
const regs = (F) => [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].map((x) => x.toString(16)).join();
const stripes = (F) => F.writes.every((w, i) => w[2] === 0xD020 && (!i || (w[3] & 15) === ((F.writes[i - 1][3] + 1) & 15)));
const colour = (F) => Buffer.from(F.colour, 'base64').subarray(0, 1000);

const G = D.ghost, Gm = memOf(G);
check('the stripes: $D011, $D016, $D018, $DD00', regs(G), '1b,c8,15,c4');
check('the stripes: border, background, writes', [G.vic[0x20] & 15, G.vic[0x21] & 15, G.writes.length].join(), '9,6,56');
check('the stripes: the border', stripes(G), true);
check('the stripes: screen $C400-$C7E7', sha(Gm.subarray(0xC400, 0xC7E8)), 'b6abf4191ff24e1f52c548995302bde58023466694965ba9b8d688b77b6908fb');
check('the stripes: the characters the page carries', sha(Buffer.concat(G.ram.filter((r) => r.a >= 0xD000 && r.a < 0xD800).map((r) => Buffer.from(r.b, 'base64')))), '1928f4770ab9271612da380afc5026608a198f1b0bd096b327fb51d1f1b67f12');
check('the stripes: drawn', sha(C64.renderFrame(G).px), '072e947bc5b9e6a15df6707844a41f6f760b1432a7a43f10ef8252c54a0cff36');

const P = D.picture, Pm = memOf(P);
check('the picture: the memory the drawing reads', P.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(), 'cc00:1000,e000:8000,ffff:1');
check('the picture: $D011, $D016, $D018, $DD00', regs(P), '3b,d8,39,c4');
check('the picture: border, background, writes', [P.vic[0x20] & 15, P.vic[0x21] & 15, P.writes.length].join(), '3,0,41');
check('the picture: the border', stripes(P), true);
check('the picture: bitmap $E000-$FF3F', sha(Pm.subarray(0xE000, 0xFF40)), 'f1acfb6ff10de66d7acfce244ad77d121de12a4f9d81c2ed4230ad3f8b47a6c9');
check('the picture: screen colours $CC00-$CFE7', sha(Pm.subarray(0xCC00, 0xCFE8)), '3ceccc834715abc16cf3576d5317d972071c8d3571e1c5ec8a0e214ad96c8ba8');
check('the picture: colour RAM', sha(colour(P)), 'eff342e4d3d60377125f5d9a5e3b83672a5f5c757a49973e696dd764611c0ea2');
check('the picture: drawn', sha(C64.renderFrame(P).px), 'e1cdaaa780c97c7834fd30bf3ed663fa00c61769ec8a8319829a21366ab6287f');

check('the stripes take their colours from the picture', Buffer.compare(colour(G), colour(P)), 0);
check('frames from bank 3 to the bitmap', D.ghostFrames, 96);
check('the page says so', ['About 98 seconds into Mastertronic\'s 1985 cassette', 'in silence, for two minutes and 13 seconds', 'For the two seconds before it',
  'Its colours are loaded first, while the screen is blank'].filter((s) => !page.replace(/\s+/g, ' ').includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "kane loading picture: the page's two frames are those recorded from the tape, two seconds apart");
process.exit(bad ? 1 : 0);
