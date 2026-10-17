#!/usr/bin/env node
// The title's ticker as the Play tab draws it. The page's machine (reference/jsw-play.js) runs from
// the crackers' start-up with no input, so it sits on the title, and each frame it hands over is
// drawn as play.html draws it, sixty times a second, with the kit's video chip (site/lib/c64.js).
// From one drawing to the next the ticker's row (raster lines 235-242) may only stand still or move
// left 1 or 2 pixels: the interrupt at line $EA moves it a pixel a frame with the fine scroll in
// $D016, and a character at a time in screen memory when the fine scroll comes round. The game copies
// the row after the video chip has fetched it for the frame, so the moved row shows from the next
// frame on; drawn in the frame the copy began, the text jumps left 9 pixels and back 7.
//   node games/c64/jet-set-willy/test_screen.js [drawings]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
require(path.join(ROOT, 'site/lib/c64.js'));
const C64 = globalThis.C64;
const g = game(__dirname);
const { JSWPort } = g.run('reference/jsw-port.js', 'jsw-port', 'JSWPort');
const { JSWCollide } = g.run('reference/jsw-collide.js', 'jsw-collide', 'JSWCollide');
const { JSWPlay } = g.run('reference/jsw-play.js', 'jsw-play', 'JSWPlay');
const DRAWS = +process.argv[2] || 900;

const keep = {}, moves = {};
const play = JSWPlay.create({ M: g.listing().ram.slice(), Port: JSWPort, Collide: JSWCollide, keep });
let target = 0, prev = null, compared = 0, wrong = 0;
for (let i = 0; i < DRAWS; i++) {
  play.run(target += 985248 / 60);
  const f = play.shown;
  if (!f || ((f.cia2[0] | ~f.cia2[1]) & 3) === 3) { prev = null; continue; }
  const r = C64.renderFrame({ lines: 312, cycles: 63, vic: f.vic, cia2: f.cia2, writes: f.writes,
    mem: f.mem, colourMem: f.colour, keep });
  const rows = [];
  for (let y = 235; y < 243; y++) rows.push(r.px.subarray((y - r.line0) * r.w + r.x0, (y - r.line0) * r.w + r.x0 + 320).slice());
  const lit = rows.some((row) => row.subarray(24, 296).some((p) => p !== row[24]));
  if (prev && lit && play.M[0x0315] === 0xA8) {
    // the shift that best lays this drawing's row over the last one's
    let best = 0, bestErr = Infinity;
    for (let d = -16; d <= 16; d++) {
      let err = 0;
      for (let y = 0; y < 8; y++) for (let x = 24; x < 296; x++) if (rows[y][x] !== prev[y][x - d]) err++;
      if (err < bestErr) { bestErr = err; best = d; }
    }
    moves[best] = (moves[best] || 0) + 1;
    compared++;
    if (best > 0 || best < -2) wrong++;
  }
  prev = lit ? rows : null;
}
console.log(`${compared} drawings of the ticker compared; moves (pixels: drawings) ${JSON.stringify(moves)}`);
if (compared < DRAWS / 2) { console.log('FAIL: too few drawings of the title to compare'); process.exit(1); }
if (!moves[-1]) { console.log('FAIL: the ticker never moved'); process.exit(1); }
if (wrong) { console.log(`FAIL: ${wrong} drawings moved the ticker by something other than 0, 1 or 2 pixels left`); process.exit(1); }
console.log('ok');
