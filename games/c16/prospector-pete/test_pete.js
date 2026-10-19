#!/usr/bin/env node
// Hold reference/pete.js, the pages' engine, to the game's own code and tables in the committed
// listing, and to what the game did in plus4emu (facts.md, "Live tests"). The engine runs the game's
// routines on the kit's 6502; what it adds is how it calls them, and that is what this checks.
// - Pete.startLevel, every level, with seeded random numbers: the goodies of each kind the level's
//   tables ask for, plus the x2 from level 8; Pete at column 44, row 4; the shaft open; the big
//   charge at the bottom of it; the water list's first cell there.
// - Pete.Mine on level 1, nothing pressed: the big charge goes off after the level's fuse (255
//   frames), the flood starts 70 frames later and the water reaches Pete's cell at the top of the
//   shaft in frame 666, as it did live with the creatures switched off. Pete moves 8 rows in 64
//   frames on level 1 and 16 on level 10, as live. A stick burns for the level's fuse (120 frames),
//   explodes for 70, and leaves debris.
// - Pete.heads: a creature at column 44, row 12, with Pete 10 columns to its right and 6 rows below,
//   chasing up or down first, goes up, as the game reads its column at $27A6, and down with its row
//   read instead; with Pete 8 columns across it wanders, the two differences sharing no bits
//   ($27E0). A creature boxed in on all four sides never returns from move_creatures.
// (work/trace/test_trace.js holds the same engine to traces of the game in the emulator, frame by
// frame; the traces are game memory and stay in work/.) It exits 1 on any difference.
//   node games/c16/prospector-pete/test_pete.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c16'); g.lib('cpu6502');
const { Pete } = g.run('reference/pete.js', 'pete.js', 'Pete');
const L = g.listing();
let bad = 0;
const fail = (...w) => { bad++; console.log('DIFFERS', ...w); };
let seed = 4310;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) & 255; };

// Goodies by the character at their top left (place_goodies, chr_goodies)
const KIND = { small: [0x70, 0x71, 0x72, 0x73], wide: [0x74, 0x76, 0x78], x2: [0x7A], tall: [0x7C, 0x7E, 0x80, 0x82],
  large: [0x84, 0x88, 0x8C, 0x90, 0x98, 0x9C] };
for (let k = 0; k < 16; k++) {
  for (let roll = 0; roll < 20; roll++) {
    const m = Pete.fresh(L);
    Pete.startLevel(m, k, rnd);
    const n = { small: 0, wide: 0, x2: 0, tall: 0, large: 0 };
    for (let r = 3; r < 23; r++) for (let c = 0; c < 90; c++) {
      const ch = m[Pete.at(c, r)];
      for (const kind in KIND) if (KIND[kind].includes(ch)) n[kind]++;
    }
    const want = { small: Pete.table(m, 'small', k), wide: Pete.table(m, 'wide', k), x2: k >= 7 ? 1 : 0,
      tall: Pete.table(m, 'tall', k), large: Pete.table(m, 'large', k) };
    for (const kind in want) if (n[kind] !== want[kind]) fail(`level ${k + 1}, roll ${roll}: ${n[kind]} ${kind} goodies, the tables ${want[kind]}`);
    if (m[0x06] !== 44 || m[0x07] !== 4) fail(`level ${k + 1}: Pete at ${m[0x06]}, ${m[0x07]}`);
    for (let r = 4; r < 21; r++) if (m[Pete.at(44, r)] !== 0) fail(`level ${k + 1}: the shaft is shut at row ${r}`);
    if (m[0x3F78] !== 0x6F || m[0x0200] !== 0x78 || m[0x0201] !== 0x3F) fail(`level ${k + 1}: no big charge or water list at the shaft's bottom`);
  }
}

function level(k) { const m = Pete.fresh(L); Pete.startLevel(m, k, rnd); return [m, Pete.Mine(m, rnd)]; }
{
  const [m, mine] = level(0);
  let boom = 0, flood = 0, top = 0;
  while (!top && mine.frame < 2000) {
    mine.step({});
    if (!boom && m[0x3F78] === 0xA2) boom = mine.frame;
    if (!flood && m[0x6A]) flood = mine.frame;
    if (m[Pete.at(44, 4)] >= 0x5C && m[Pete.at(44, 4)] <= 0x6C) top = mine.frame;
  }
  // frame 1 is the rest of the frame start_level returned in, so the 255th count is in frame 256
  if (boom !== 256 || flood !== 326 || top !== 666) fail(`level 1: the big charge went off in frame ${boom}, the flood began in ${flood} and reached the top in ${top}; the game: 256, 326, 666`);
}
for (const [k, rows] of [[0, 8], [9, 16]]) {
  const [m, mine] = level(k);
  for (let f = 0; f < 64; f++) mine.step({ y: 1 });
  if (m[0x07] - 4 !== rows) fail(`level ${k + 1}: Pete went down ${m[0x07] - 4} rows in 64 frames, the game ${rows}`);
}
{
  const [m, mine] = level(0);
  for (let f = 0; f < 16; f++) mine.step({ y: 1 });                   // down two rows
  mine.step({ fire: true }); mine.step({});
  const cell = [5, 6, 7].map(r => Pete.at(44, r)).find(a => m[a] === 0x6F) || 0, life = [];
  for (let f = 0; f < 300; f++) { mine.step({ y: -1 }); life.push(m[cell]); }
  const stick = life.indexOf(0xA2), debris = life.indexOf(0xA3);
  if (!cell || stick !== 119 || debris - stick !== 70) fail(`a stick: ${cell ? 'laid' : 'not laid'}, an explosion after ${stick + 1} frames, debris ${debris - stick} later; the game: 120 and 70`);
}

// The creatures' chase. A creature at column 44, row 12, moving left; Pete 10 columns to the right
// and 6 rows below: across, 10; up and down, 18 - 44 = -26 as written, 6 as meant; ANDed, 2 and 2.
{
  const m = Pete.fresh(L);
  const as = Pete.heads(m, { col: 44, row: 12, dir: 3 }, { col: 54, row: 18 }, false);
  const meant = Pete.heads(m, { col: 44, row: 12, dir: 3 }, { col: 54, row: 18 }, true);
  if (as !== 'up' || meant !== 'down') fail(`the chase below Pete: ${as} as written, ${meant} as meant; up and down`);
  const wander = Pete.heads(m, { col: 44, row: 12, dir: 3 }, { col: 52, row: 18 }, false);
  if (wander !== 'wander') fail(`8 across and -26 down share no bits, so the creature wanders; it went ${wander}`);
}
// Boxed in: every way round the creature shut, and move_creatures never returns.
{
  const m = Pete.fresh(L);
  Pete.startLevel(m, 0, rnd);
  const cell = Pete.at(20, 12);
  for (const a of [cell - 90, cell + 90, cell - 1, cell + 1]) m[a] = 0x01;     // earth
  m[cell] = 0;
  m[0x06] = 44; m[0x07] = 4;
  for (let n = 0; n < 4; n++) m[0x23 + n] = 0;
  m[0x23] = 1; m[0x28] = 3; m[0x30] = cell & 255; m[0x31] = cell >> 8; m[0x4B] = 2; m[0x8A] = 20; m[0x8E] = 12;
  const c = new C64Cpu.CPU(m); c.sp = 0xFF;
  let looped = false;
  try { c.call(Pete.R.moveCreatures, { c: 1 }, { maxSteps: 100000 }); } catch (e) { looped = c.pc >= 0x281E && c.pc <= 0x2828; }
  if (!looped) fail('a creature boxed in: move_creatures returned, or stopped outside its loop at $281E-$2827');
}
console.log(bad ? `${bad} differences` : 'every level builds as its tables say, the flood, Pete and a stick keep the game\'s time, and the chase and the freeze are as the code reads');
process.exit(bad ? 1 : 0);
