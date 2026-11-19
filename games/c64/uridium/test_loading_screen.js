#!/usr/bin/env node
// Hold graphics.html's loading screen (the blocks ur-loading-data and ur-loading) to the cassette, Hewson's 1986
// tape, the Ultimate Tape Archive's "Uridium.tap" (444,526 bytes, SHA-256
// 54a008f50887d385dc0f44f15e7f0ae89d04a6393bf88e3102858318598ea7eb), loaded in VICE 3.10 with vice-mcp 3.14.0
// on 12 November 2026:
// - the tape loads two files, each after a four-byte header the loader stores at $FB-$FE (read at $03A2):
//   $E000-$EBFF, with the screen, its characters and the loop that runs it at $E037-$E0C6, and then the game,
//   $0900-$BEFF. The loader stores each byte at ($FB) and counts the address on;
// - the frame in the block is one frame recorded with kit/c64/frame.py capture, then trim, 100 seconds in.
//   `frame.py compare` found the drawing of it equal to VICE's own picture in all 104,448 pixels. Its
//   writes are the loop's: the background yellow at line 176, then, at line 256, the background put back and
//   the three colours moved round;
// - VICE stopped at every pass of the loop ($E04E), 7,107 of them, and at each time it picked a new set of
//   colours ($E037) and at its exit ($E0C6), and the colours ($D021-$D023), the bar ($E750-$E76F), $FB and
//   $FC were read at each stop. urLoading, run with the block's D.fb and D.fc, must hold the same colours
//   and the same bar at every one of the 7,107 passes: the hash below is of the recording. Memory read every
//   10 frames on another load showed one pass to a frame, the screen whole from the frame it came on,
//   41.8 seconds in, and off 142 seconds later; the sound chip's volume, read every 25 frames, was 0 until
//   183.5 seconds in, when the game had started;
// - the loop's colour table ($E0C9-$E0E0) must hash as it read from the tape's memory;
// - the page's drawing (urRoles, then urPixels) of the recorded frame's own memory and colours must be the
//   recorded frame's drawing, pixel for pixel, and the bar urBar draws for the frame's $FC must be its bar.
// It exits 1 on any difference.
//   node games/c64/uridium/test_loading_screen.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const { urLoading, urBar, urRoles, urPixels, UR_YELLOW } = g.run('graphics.html', 'ur-loading', 'urLoading', 'urBar', 'urRoles', 'urPixels', 'UR_YELLOW');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const page = g.read('graphics.html');
const m = /<script type="application\/json" id="ur-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('graphics.html has no ur-loading-data block'); process.exit(1); }
const D = JSON.parse(m[1]), F = D.frame;
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
const colour = Buffer.from(F.colour, 'base64');

// the recorded frame
check('$D011, $D016, $D018', [F.vic[0x11], F.vic[0x16], F.vic[0x18]].map((x) => x.toString(16)).join(), '1b,d8,9b');
check('$DD00: bank 3, screen $E400, characters $E800', F.cia2[0] & 3, 0);
check('border, sprites on', [F.vic[0x20] & 15, F.vic[0x15]].join(), '0,0');
check('colours at the frame\'s start', [0x21, 0x22, 0x23].map((a) => F.vic[a] & 15).join(), '14,6,1');
check('the frame\'s writes', JSON.stringify(F.writes.map((w) => [w[0], w[2].toString(16), w[4]])),
  JSON.stringify([[176, 'd021', 0xF7], [256, 'd021', 0xFE], [256, 'd023', 0xFE], [256, 'd021', 0xF6], [256, 'd022', 0xF1]]));
check('the yellow write', JSON.stringify(UR_YELLOW), JSON.stringify(F.writes[0]));
check('colour RAM: multicolour, black', [...colour.subarray(0, 1000)].every((v) => (v & 15) === 8), true);
check('screen $E400-$E7E7', sha(mem.subarray(0xE400, 0xE7E8)), '83c552604c6e491f06da7e53bad4721eb7401f3d46147258fc800bc3d6655561');
check('characters the page carries', sha(Buffer.concat(F.ram.filter((r) => r.a >= 0xE800 && r.a < 0xF000).map((r) => Buffer.from(r.b, 'base64')))), '31e0823b810e6b90f86752a6e7e4ff3a5f480bec79705f5338926418873db83a');
check('the frame drawn', sha(C64.renderFrame(F).px), 'f56bb37859f62e787580400fff6243d5b913db2754150ede0dd19caef88a8e2e');

// the loop's table and the recorded load
check('colour table $E0C9-$E0E0', sha(Buffer.from(D.tables)), 'aceae831fe319cc05cb7a9d309197e31c2f73bd27659b3f64038c2dbaf5355f2');
check('sets picked', sha(Buffer.from(D.fb)), 'c46dabc80ec8722b0b544d499512cbd5331e3c25965d185d139d515558de5110');
check('passes', D.frames, 7107);
const L = urLoading(D), h = crypto.createHash('sha256');
for (let k = 0; k < D.frames; k++) {
  h.update(Buffer.from(L.colours)); h.update(Buffer.from(L.mem.subarray(0xE750, 0xE770)));
  L.step();
}
check('every pass, as VICE recorded it', h.digest('hex'), '18f2df0b769b3af34ce818bd266699214bfb2220f388a5589881141bafd3b4cd');
check('the bar at the end', [...L.mem.subarray(0xE74F, 0xE769)].map((v) => v.toString(16)).join(' '), '75 ' + Array(23).fill('55').join(' ') + ' 59 76');
check('the bar: first draw, last draw', [D.fc[1].join(), D.fc[D.fc.length - 1].join()].join(' '), '34,9 7067,190');
check('bytes a second, $0900-$BEFF from the first draw to the exit', Math.round((0xBF00 - 0x0900) / ((D.frames - D.fc[1][0]) / 50) / 10) * 10, 330);

// the page's drawing
const roles = urRoles(D, mem);
check('the page draws the recorded frame', Buffer.compare(Buffer.from(urPixels(roles, [14, 6, 1])), Buffer.from(C64.renderFrame(F).px)), 0);
const bar = mem.slice(); bar.fill(0x3F, 0xE751, 0xE768); urBar(bar, 83);
check('the bar for the frame\'s $FC ($53)', Buffer.compare(Buffer.from(bar.subarray(0xE750, 0xE770)), Buffer.from(mem.subarray(0xE750, 0xE770))), 0);
check('nothing but the cycled colours is drawn in 2, 3 or 4', [...C64.renderFrame(F).px].some((v) => v === 2 || v === 3 || v === 4), false);

check('the page says so', ['About 42 seconds into the 1986 cassette', 'two minutes and 22 seconds, in silence', 'Every 256 frames, about five seconds',
  'last three bits of the address the tape has reached', 'empty line under ANDREW BRAYBROOK', 'Each of its 24 cells stands for 2 KB of memory',
  'from <code>$0900</code> to <code>$BEFF</code>, about 330 bytes a second'].filter((s) => !page.includes(s)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "uridium loading screen: the page's loop holds the colours and the bar VICE recorded at every pass, and draws the recorded frame");
process.exit(bad ? 1 : 0);
