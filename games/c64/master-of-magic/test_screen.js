#!/usr/bin/env node
// The title's story line as the Play tab draws it. The page's machine (reference/mom-play.js) runs
// from the cold start with no input, so it sits on the title, and the frame due at the page's clock
// (frameAt) is drawn as play.html draws it, sixty times a second, with the kit's video chip
// (site/lib/c64.js). From one drawing to the next the story line (row 24, raster lines $F0-$F7) may
// only stand still or move left 2 pixels: the title's interrupt moves it 2 pixels a frame, the
// picture half at line $30 stepping the fine scroll and moving the row a character in screen memory
// when it comes round, the scroller half at line $EE writing the fine scroll to $D016. The picture
// half shows video bank 3 and the row is in bank 0, so a frame that took the row's change only once
// bank 0 was on show again drew it after the beam had passed: the line a character behind for a
// frame, the text jumping 6 pixels right and 10 left every fourth frame. And a frame shown because
// the clock had run past the end of the one due skips a frame: a move of 4 pixels.
//   node games/c64/master-of-magic/test_screen.js [drawings]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
require(path.join(ROOT, 'site/lib/c64.js'));
require(path.join(ROOT, 'site/lib/collide.js'));
const { C64, C64Collide } = globalThis;
const g = game(__dirname);
g.run('reference/mom-music.js', 'mom-music', 'MoMMusic');
const { MoMPort } = g.run('reference/mom-port.js', 'mom-port', 'MoMPort');
const { MoMPlay } = g.run('reference/mom-play.js', 'mom-play', 'MoMPlay');
const IMG = JSON.parse(/window\.MOM_PLAY = (\{.*?\});\n/.exec(g.read('play.html'))[1]);
const DRAWS = +process.argv[2] || 600;

const keep = {}, moves = {};
const play = MoMPlay.create({ M: MoMPort.memory(g.listing().ram, IMG), Port: MoMPort, Collide: C64Collide, IMG, keep });
let target = 0, prev = null, compared = 0, wrong = 0;
for (let i = 0; i < DRAWS; i++) {
  play.run(target += 985248 / 60);
  const f = play.frameAt(target);
  if (!f || (play.M[0x314] | play.M[0x315] << 8) !== 0x5D08) { prev = null; continue; }
  const r = C64.renderFrame({ lines: 312, cycles: 63, vic: f.vic, cia2: f.cia2, writes: f.writes,
    mem: f.mem, colourMem: f.colour, keep });
  const rows = [];
  for (let y = 0xF0 - r.line0; y < 0xF8 - r.line0; y++) rows.push(r.px.subarray(y * r.w + 40, y * r.w + 344).slice());
  const lit = rows.some((row) => row.subarray(20, 284).some((p) => p !== row[0]));
  if (prev && lit) {
    // the shift that best lays this drawing's line over the last one's
    let best = 0, bestErr = Infinity;
    for (let d = -16; d <= 16; d++) {
      let err = 0;
      for (let y = 0; y < 8; y++) for (let x = 20; x < 284; x++) if (rows[y][x] !== prev[y][x - d]) err++;
      if (err < bestErr) { bestErr = err; best = d; }
    }
    moves[best] = (moves[best] || 0) + 1;
    compared++;
    if (best !== 0 && best !== -2) wrong++;
  }
  prev = lit ? rows : null;
}
console.log(`${compared} drawings of the story line compared; moves (pixels: drawings) ${JSON.stringify(moves)}`);
if (compared < DRAWS / 2) { console.log('FAIL: too few drawings of the title to compare'); process.exit(1); }
if (!moves[-2]) { console.log('FAIL: the story never moved'); process.exit(1); }
if (wrong) { console.log(`FAIL: ${wrong} drawings moved the story by something other than 0 or 2 pixels left`); process.exit(1); }
console.log('ok');
