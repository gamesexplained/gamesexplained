#!/usr/bin/env node
// The message line as the Play tab draws it. The page's machine (reference/en-play.js) runs from the
// hand-over, fire takes it through the title, the mission select and the floor select, and in play
// the stick moves at random; each frame it hands over is drawn as play.html draws it, sixty times a
// second, with the kit's video chip (site/lib/c64.js). The message line is the bottom two rows of
// the screen (raster lines 235 to 250: the rows start at line 51 with $D011 = $1B), its letters two
// cells wide. The play interrupt ($4B4C) moves it 4 pixels left with the fine scroll in $D016 and, when the fine scroll comes round, a cell on in
// screen memory ($4B35), so from one drawing to the next a message may only stand still or move
// left 4 or 8 pixels. A message that repeats a letter lays over itself at more than one shift, so a
// drawing counts as right when one of those moves lays it exactly over the last, and as wrong when
// only some other shift does.
//   node games/c64/into-the-eagles-nest/test_screen.js [drawings]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
require(path.join(ROOT, 'site/lib/c64.js'));
const C64 = globalThis.C64;
globalThis.C64Sid = null;
const { loadListing } = require(path.join(ROOT, 'kit/c64/machine.js'));
const fs = require('fs');
require(path.join(__dirname, 'reference/en-core.js'));
const groups = fs.readdirSync(path.join(__dirname, 'reference')).filter((f) => /^en-g.*\.js$/.test(f)).sort()
  .map((f) => require(path.join(__dirname, 'reference', f)));
const EaglePlay = require(path.join(__dirname, 'reference/en-play.js'));
const DRAWS = +process.argv[2] || 6000;

const keep = {}, moves = {};
const play = EaglePlay.create({ M: loadListing(path.join(__dirname, 'listing.json')), groups, keep });
let seed = 9, j = 0x1F;
const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7FFFFFFF) / 0x7FFFFFFF;
const WAYS = [0x1F, 0x1E, 0x1D, 0x1B, 0x17, 0x1F, 0x1F];
let target = 0, prev = null, compared = 0, wrong = 0;
for (let i = 0; i < DRAWS; i++) {
  if (play.M[0x0315] !== 0x4A) play.joy = i % 90 < 6 ? 0x0F : 0x1F;
  else { if (i % 20 === 0) j = WAYS[Math.floor(rnd() * WAYS.length)]; play.joy = j; }
  play.run(target += 985248 / 60);
  const f = play.shown;
  if (!f || play.M[0x0315] !== 0x4A) { prev = null; continue; }
  const r = C64.renderFrame({ lines: 312, cycles: 63, vic: f.vic, cia2: f.cia2, writes: f.writes, mem: f.mem, colourMem: f.colour, keep });
  const rows = [];
  for (let y = 235; y < 251; y++) rows.push(r.px.subarray((y - r.line0) * r.w + r.x0, (y - r.line0) * r.w + r.x0 + 320).slice());
  const lit = rows.some((row) => row.subarray(16, 304).some((p) => p !== row[16]));
  if (prev && lit) {
    // the shifts that lay this drawing's line exactly over the last one's
    const exact = [];
    for (let d = -24; d <= 24; d++) {
      let same = true;
      for (let y = 0; y < 16 && same; y++) for (let x = 32; x < 288; x++) if (rows[y][x] !== prev[y][x - d]) { same = false; break; }
      if (same) exact.push(d);
    }
    if (exact.length) {
      const move = [0, -4, -8].find((d) => exact.includes(d));
      const k = move === undefined ? exact[0] : move;
      moves[k] = (moves[k] || 0) + 1;
      compared++;
      if (move === undefined) wrong++;
    }
  }
  prev = lit ? rows : null;
}
console.log(`${compared} drawings of the message line compared; moves (pixels: drawings) ${JSON.stringify(moves)}`);
if (compared < 200) { console.log('FAIL: too few drawings of a message to compare'); process.exit(1); }
if (!moves[-4]) { console.log('FAIL: the message line never moved'); process.exit(1); }
if (wrong) { console.log(`FAIL: ${wrong} drawings moved the message line by something other than 0, 4 or 8 pixels left`); process.exit(1); }
console.log('ok');
