#!/usr/bin/env node
// The title's scrolling message as the Play tab draws it. The page's machine (reference/storm-play.js)
// runs from the loader's hand-over with no input, so it sits on the title, and each frame it hands
// over is drawn as play.html draws it, sixty times a second, with the kit's video chip
// (site/lib/c64.js). From one drawing to the next the message line (raster lines 90-97) may only
// stand still or move left 2 pixels: the game moves it 2 pixels a frame with the fine scroll in
// $D016, and a character at a time in screen memory when the fine scroll comes round. A frame drawn
// over memory the game has moved on since shows the line a character ahead, and the text jumps
// right and back: the ghost characters at the line's left end.
//   node games/c64/storm/test_screen.js [drawings]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
require(path.join(ROOT, 'site/lib/c64.js'));
const C64 = globalThis.C64;
const g = game(__dirname);
g.lib('cpu6502');                   // the 6502 the port's title music runs on, as play.html loads it
const { StormPort } = g.run('reference/storm-port.js', 'storm-port', 'StormPort');
const { StormPlay } = g.run('reference/storm-play.js', 'storm-play', 'StormPlay');
const DRAWS = +process.argv[2] || 600;

const char = new Uint8Array(4096);
char.set(StormPort.FONT);
const charrom = Buffer.from(char).toString('base64');
const keep = {}, moves = {};
const play = StormPlay.create({ M: g.listing().ram, Port: StormPort, keep });
let target = 0, prev = null, compared = 0, wrong = 0;
for (let i = 0; i < DRAWS; i++) {
  play.run(target += 985248 / 60);
  const f = play.shown;
  if (!f) continue;
  const r = C64.renderFrame({ lines: 312, cycles: 63, vic: f.vic, cia2: [0xC7, 0x3F], writes: f.writes,
    mem: f.mem, colourMem: f.colour, charrom, keep });
  const rows = [];
  for (let y = 74; y < 82; y++) rows.push(r.px.subarray(y * r.w + 40, y * r.w + 344).slice());
  // the 33 characters compared below, left of where the text comes in, have something on them
  const lit = rows.some((row) => row.subarray(20, 284).some((p) => p !== row[0]));
  if (prev && lit && play.M[0x8106]) {
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
console.log(`${compared} drawings of the message line compared; moves (pixels: drawings) ${JSON.stringify(moves)}`);
if (compared < DRAWS / 2) { console.log('FAIL: too few drawings of the title to compare'); process.exit(1); }
if (!moves[-2]) { console.log('FAIL: the message never moved'); process.exit(1); }
if (wrong) { console.log(`FAIL: ${wrong} drawings moved the message by something other than 0 or 2 pixels left`); process.exit(1); }
console.log('ok');
