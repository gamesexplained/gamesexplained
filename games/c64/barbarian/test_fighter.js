#!/usr/bin/env node
// Hold the moves section's fighter (index.html's bb-fighter block, which runs the game's own
// routines on the kit's 6502) to the game's tables and to what it must draw. For each fighter and
// each of the 18 joystick positions with and without fire, from standing, after one pass: the move
// it has started is the one bbStickMove (bb-rules, held to the game by test_rules.js) reads from
// the standing rows, and the fighter is drawn: the strip in the bitmap ($71A0-$7A9F) differs from
// the clean copy save_strip took, and only inside the fighter's nine columns. For the right-hand
// fighter, sprite 7 carries a body piece in the skill level's colour (level_colours, $C78A). Each of
// the 30 moves started by hand runs ten passes, and each pass draws through C64.renderFrame. It
// exits 1 on any difference.
//   node games/c64/barbarian/test_fighter.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
g.sameBlock('bb-fighter');
const { bbArena, BB_FRAME } = Object.assign(g.run(page, 'bb-fighter', 'bbArena'), g.run(page, 'bb-frame', 'BB_FRAME'));
const { bbStickMove } = g.run(page, 'bb-rules', 'bbStickMove');
g.lib('cpu6502'); g.lib('c64');
const L = g.listing('parts/practice/listing.json');
const F = Object.assign({}, BB_FRAME, { colourMem: Buffer.from(BB_FRAME.colour, 'base64') });
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const h = (n) => '$' + n.toString(16);
const START = [12, 20];
for (const fx of [0, 1]) for (let v = 0; v < 0x20; v++) {
  if ((v & 3) === 3 || (v & 12) === 12) continue;               // a joystick cannot be up and down, or back and forward
  const A = bbArena(L.ram, globalThis.C64Cpu, F);
  A.reset(fx, START[fx], 5);
  A.stick(v); A.pass();
  const want = bbStickMove(L.ram, 0x80, v).move;
  if (A.move !== want) fail('fighter', fx, 'stick', h(v), 'started', h(A.move), 'rows say', h(want));
  let drawn = 0, outside = 0;
  for (let row = 0; row < 8; row++) for (let k = 0; k < 256; k++) {
    const a = 0x71A0 + 320 * row + k, col = 4 + (k >> 3);
    if (A.mem[a] !== A.mem[0xAF71 + 320 * row + k]) { drawn++; if (col < A.column || col > A.column + 8) outside++; }
  }
  if (!drawn) fail('fighter', fx, 'stick', h(v), 'nothing drawn in the strip');
  if (outside) fail('fighter', fx, 'stick', h(v), outside + ' bytes drawn outside columns', A.column, 'to', A.column + 8);
  if (fx === 1 && (!(A.vic[0x15] & 0x80) || (A.vic[0x2E] & 15) !== (L.ram[0xC78A + 5] & 15))) fail('fighter 1 body piece', h(v), h(A.vic[0x15]), h(A.vic[0x2E]));
  cases++;
}
for (const fx of [0, 1]) for (let mv = 0x80; mv <= 0x9D; mv++) {
  const A = bbArena(L.ram, globalThis.C64Cpu, F);
  A.reset(fx, START[fx], 2); A.start(mv);
  try { for (let i = 0; i < 10; i++) { A.pass(); C64.renderFrame(A.frame()); } } catch (e) { fail('move', h(mv), 'fighter', fx, e.message); }
  cases++;
}
console.log(`${cases} cases: ` + (bad ? bad + ' differences' : 'every move starts and draws as the game does'));
process.exit(bad ? 1 : 0);
