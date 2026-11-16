#!/usr/bin/env node
// Hold graphics.html's loading screen (the block sd-loading-data) to the cassette, Electric Dreams' 1986 tape,
// the Ultimate Tape Archive's "Spindizzy.tap" (501,177 bytes, SHA-256
// b59f029354da0478cbe64b7807e62ee7070ef8dbf20b4ea8b2d54252327a0941), loaded in VICE 3.10 with vice-mcp 3.14.0 on
// 12 November 2026. D.frame is one frame recorded with kit/c64/frame.py capture, then trim, about 100 seconds in:
// multicolour text ($D011 = $1B, $D016 = $D8) in bank 3 ($DD00 = $94), screen at $E800 and characters at $E000
// ($D018 = $A9), black background, purple in $D022. The big letters are drawn in $D023, which the loader adds
// 1 to 53 times in the frame. `frame.py compare` found the drawing equal to VICE's own picture in 104,445 of its
// 104,448 pixels; the rest are VICE's grey dot where $D023 changed mid-line, and two single pixels.
// - The loader's byte routine, at $034A while the screen is up, reads ten pulses, timing each with CIA 2's timer
//   A set to 384 cycles, so a longer pulse is a 1; after each it adds 1 to $D023. The byte is the last eight
//   bits, the highest first. The 52 gaps between the frame's writes are those pulses: the end of one byte's two
//   long ones, then the bytes the loader stored at $4258-$425C, then the start of $425D. The test reads them
//   back from the recorded writes and holds the page's stream to them.
// - While the screen is up the tape loads the rooms' records to $1400-$4D00, which the game moves down $1000
//   before it starts: 11,867 of the 11,869 bytes stored by the end of the frame are the listing's, from $0400.
//   The page's 1,024 bytes are the listing's $3258-$3657.
// - The pulse lengths are the means of 195 gaps over four frames recorded after this one: 272.8 cycles for a
//   short pulse and 497.1 for a long one.
// - The video chip read every 5 frames: the screen came on between 41.0 and 41.1 seconds and the game's title
//   replaced it between 224.8 and 224.9; the sound chip read every 10 seconds was silent all that time.
// - The disk the listing comes from, the C64 Preservation Project's spindizzy[electric_dreams_1986](pal).g64,
//   shows the same screen from 5.5 to 11.9 seconds, with $D023 red and nothing written to it.
// It exits 1 on any difference.
//   node games/c64/spindizzy/test_loading_picture.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="sd-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no sd-loading-data block'); process.exit(1); }
const D = JSON.parse(m[1]), F = D.frame;
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('the memory the drawing reads', F.ram.map((r) => r.a.toString(16) + ':' + Buffer.from(r.b, 'base64').length).join(),
  'e000:80,e100:8,e140:16,e170:8,e188:8,e1b0:8,e1c0:16,e208:40,e240:16,e260:16,e280:8,e290:32,e2c8:8,e800:1000,ffff:1');
check('$D011, $D016, $D018, $DD00', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].map((x) => x.toString(16)).join(), '1b,d8,a9,94');
check('border, background, $D022', [F.vic[0x20] & 15, F.vic[0x21] & 15, F.vic[0x22] & 15].join(), '0,0,4');
check('register writes in the frame: all to $D023, each the colour after the one before', [F.writes.length,
  F.writes.every((w) => w[2] === 0xD023), F.writes.every((w, i) => !i || (w[4] & 15) === ((F.writes[i - 1][4] + 1) & 15))].join(), '53,true,true');
check('the characters $E000-$E2C7', sha(mem.subarray(0xE000, 0xE2C8)), '935afc72ccb5bf1c8ec330e738eb0b325d10fad217452c54edf546a89d15f35c');
check('the screen $E800-$EBE7', sha(mem.subarray(0xE800, 0xEBE8)), '687df51ccf871db862ed1e55f495d5fe7ac358406aefab6a25c5e508569ab4f7');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '11010057c1aa340240339a852b8c5a1121ad0cd25d0f5187ab1672f1b9ca22cf');
check('the picture drawn', sha(C64.renderFrame(F).px), 'b7851d1a19de8d81acb5ccddbd2e353d3acf5efb7458cea964a58ef12708a728');

// the stream of pulses the page draws the stripes from
const { sdBit, sdNext } = g.run('graphics.html', 'sd-stripes', 'sdBit', 'sdNext');
D.bytes = Buffer.from(D.b64, 'base64');
const L = g.listing();
check('where the bytes load, the first pulse, the two lengths', [D.at.toString(16), D.p0, D.short, D.long].join(), '4258,0,273,497');
check('the page\'s 1,024 bytes are the listing\'s $3258-$3657', [D.bytes.length, Buffer.compare(D.bytes, Buffer.from(L.ram.subarray(0x3258, 0x3658)))].join(), '1024,0');
const t = F.writes.map((w) => w[0] * F.cycles + w[1]);
const gaps = t.slice(1).map((x, i) => x - t[i]);
check('the recorded frame\'s 52 pulses are the stream\'s, read as the loader reads them (over 384 cycles is a 1)',
  gaps.map((x) => (x > 384 ? 1 : 0)).join(''), gaps.map((x, i) => sdBit(D, D.p0 + 1 + i)).join(''));
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sh = gaps.filter((x) => x <= 384), lo = gaps.filter((x) => x > 384);
check('the page\'s lengths are within 2 % of this frame\'s means', [Math.abs(D.short - mean(sh)) / D.short < 0.02, Math.abs(D.long - mean(lo)) / D.long < 0.02].join(), 'true,true');

// the frames after it, as the page makes them
const LEN = F.lines * F.cycles, last = F.writes[F.writes.length - 1];
const s = { p: D.p0 + F.writes.length, v: last[3] & 15 };
s.t = t[t.length - 1] + (sdBit(D, s.p) ? D.long : D.short);
let ok = true, prev = last[3] & 15, counts = [];
const frames = [];
for (let k = 1; k <= 250; k++) {
  const v0 = s.v, w = sdNext(D, s, k * LEN, LEN);
  counts.push(w.length);
  for (const x of w) {
    if (x[0] < 0 || x[0] >= F.lines || x[1] < 0 || x[1] >= F.cycles || (x[3] & 15) !== ((prev + 1) & 15)) ok = false;
    prev = x[3] & 15;
  }
  if (k <= 2) frames.push({ v0, w });
}
check('five seconds of frames after it: every write on the screen, each the colour after the one before', ok, true);
check('the fewest and most writes in a frame', [Math.min(...counts), Math.max(...counts)].join(), '44,59');
const vic = F.vic.slice(); vic[0x23] = 0xF0 | frames[0].v0;
const next = Object.assign({}, F, { vic, writes: frames[0].w });
check('the frame after it, drawn', sha(C64.renderFrame(next).px), '4a15d7120d20a0050ceddc79ec457e6abd0b383f48f24ba5e8a44e1007e9c65f');
check('the page says so', ['puts up this screen 41 seconds in', 'for three minutes while the game loads', 'paints a thin stripe',
  'two long ones that mark its start', 'with its letters plain red'].filter((x) => !page.replace(/\s+/g, ' ').includes(x)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "spindizzy loading screen: the page's frame is the one recorded from the tape, and its stripes are the tape's bits");
process.exit(bad ? 1 : 0);
