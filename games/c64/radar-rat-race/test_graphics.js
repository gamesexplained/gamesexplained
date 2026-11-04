#!/usr/bin/env node
'use strict';
// The Graphics tab. Its rr-gfx block says which font entries and colours draw each piece of the
// cast, how a stunned red rat spins, how one turns back, what EEEK looks like by what caught the rat,
// how the X2 and a TIME bar cell change, and how long each of those takes. This runs the game from
// listing.json on the kit's machine model, starts it from the title screen with the fire button,
// plays it with the stick, and checks the block against what the game puts on the screen:
// - every tile the tab draws is on the screen at some point, in the tab's colour;
// - a red rat stunned for 15 or 7 moves shows rrStun's facings, and every U-turn rrTurnBack's;
// - EEEK is red after a red rat, blue after a cat, and stays RR_EEEK cycles;
// - the X2 and a TIME bar cell step as the tab steps them;
// - the moves, flashes and units take the tab's times, on average, give or take five per cent.
//   node games/c64/radar-rat-race/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine } = require(path.join(ROOT, 'kit/c64/machine.js'));
const g = game(__dirname);
const B = g.run('graphics.html', 'rr-gfx', 'RR_MOVE', 'RR_PMOVE', 'RR_X2', 'RR_UNIT', 'RR_EEEK', 'RR_COLOUR', 'RR_TILES',
  'rrTile', 'rrStun', 'rrTurnBack', 'rrTimeCell');
const { RR_COLOUR: C, RR_TILES: T, rrTile } = B;
const L = g.listing();
let bad = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };
const h2 = (n) => '$' + n.toString(16).toUpperCase().padStart(2, '0');

// The game, started as the machine starts it. The listing stops at $FF57; the vectors at $FFFA are
// the ones facts.md gives (NMI $EE21, reset $E037, IRQ $EE10), and every tick is the IRQ's.
const ram = L.ram;
ram.set([0x21, 0xEE, 0x37, 0xE0, 0x10, 0xEE], 0xFFFA);
const M = new Machine({ ram, pc: 0xE037, port: { dir: 0x2F, data: 0x35 }, passAt: 0xF271, dma: true, cia: true });
M.cpu.i = 1;
const cyc = () => M.cpu.cycles;
let life = 0;
const at = { red: [], player: [], unit: [], x2: [] }, moves = [], eeek = [], cleared = [], cells = [];
M.hooks[0xF236] = () => { life++; };                                        // start_life
M.hooks[0xE088] = () => { at.red.push([cyc(), life]); };                    // move_all_red_rats
M.hooks[0xE78C] = () => { at.player.push([cyc(), life]); };                 // move_player
M.hooks[0xF2A4] = () => { at.unit.push([cyc(), life]); };                   // main_loop's call of tick_round_timer
let flip = false;
M.hooks[0xEA0E] = () => { flip = true; };                                   // the X2 toggles
M.hooks[0xEA2B] = () => { if (flip) at.x2.push([cyc(), life, ram[0x05B5], ram[0x05B6]]); flip = false; };
M.hooks[0xE15A] = () => {                                                   // all red rats moved
  const st = []; for (let x = 0; x <= ram[0x81]; x++) st.push({ dir: ram[0x3A + x], facing: ram[0x42 + x], stun: ram[0x4A + x], life });
  moves.push(st);
};
M.hooks[0xE8C9] = () => {                                                   // EEEK stamped, and by what
  const px = ram[0x92], py = ram[0x93];
  let cat = false, red = false;
  for (let x = 0; x <= ram[0x0201]; x++) if (ram[0xC2 + x] === px && ram[0xD2 + x] === py) cat = true;
  for (let x = 0; x <= ram[0x81]; x++) if (ram[0x22 + x] === px && ram[0x2A + x] === py) red = true;
  eeek.push({ by: cat && !red ? 'cat' : red && !cat ? 'red' : '', at: cyc(), codes: [0x1C3, 0x1C4, 0x1EB, 0x1EC].map((o) => ram[0x400 + o]), colours: [0x1C3, 0x1C4, 0x1EB, 0x1EC].map((o) => M.colour[o] & 15) });
};
M.hooks[0xEC0A] = () => { cleared.push(cyc()); };                           // clear_screen_and_draw_hud
M.hooks[0xF18F] = () => { cells.push([life, ram[0xE4], ram[0x0432 + (ram[0xE4] >> 3)]]); };   // a TIME bar cell redrawn

// what is on the screen: every 2x2 block's codes and colours, and the single cells
const seen = new Map();
function look() {
  for (let r = 0; r < 24; r++) for (let c = 0; c < 39; c++) {
    const o = r * 40 + c, os = [o, o + 1, o + 40, o + 41];
    const k = os.map((q) => ram[0x400 + q]).join() + '/' + os.map((q) => M.colour[q] & 15).join();
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  for (let o = 0; o < 1000; o++) seen.set(ram[0x400 + o] + '@' + (M.colour[o] & 15), 1);
}
const has = (codes, colours) => seen.has(codes.join() + '/' + colours.join());
const one = (code, colour) => seen.has(code + '@' + colour);

M.runFrames(200); M.joy1 = 0x1F & ~0x10; M.runFrames(10); M.joy1 = 0x1F; M.runFrames(150);
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return seed; };
// stun red rat 0 for 15 moves, then for 7, as red_rat_hit_test would
const stunned = [];
for (const t of [15, 7]) {
  M.runPasses(20); ram[0x4A] = t;
  const from = moves.length;
  while (moves.length < from + t + 1) M.runPasses(1);
  stunned.push(moves.slice(from, from + t).map((st) => st[0].facing));
}
// play: the stick at random, lives topped up, the X2 kept flashing, stars dropped
for (let k = 0; k < 600; k++) {
  if (ram[0xC1] & 0x80) ram[0xC1] = 0x14;
  M.joy1 = [0x1E, 0x1D, 0x1B, 0x17, 0x0F][rnd() % 5];
  for (let f = 0; f < 12; f++) { M.runFrames(1); if (f % 4 === 0) look(); }
  if (ram[0x9C] < 3) ram[0x9C] = 9;
}
// the 2x cheese: the rat put a cell to its left, while it is uneaten
if (ram[0xBF] === 0) {
  ram[0x92] = Math.max(0, ram[0xAA] - 2); ram[0x93] = ram[0xB4];
  for (let f = 0; f < 30; f++) { M.runFrames(1); look(); }
}
// a catch by a cat: no stars for 400 frames, so none is drawn over the rat, then the rat put on cat 0's square
M.joy1 = 0x1F; M.runFrames(400);
ram[0x92] = ram[0xC2]; ram[0x93] = ram[0xD2];
M.runFrames(300);

// the tiles
for (let f = 0; f < 4; f++) {
  if (!has(rrTile(f), [C.rat, C.rat, C.rat, C.rat])) fail('the rat facing', f, 'is never', rrTile(f).map(h2).join(' '), 'in colour', C.rat);
  if (!has(rrTile(f), [C.red, C.red, C.red, C.red])) fail('no red rat facing', f, 'is', rrTile(f).map(h2).join(' '), 'in colour', C.red);
}
for (const [name, codes, colour] of [['cat', T.cat, C.cat], ['cheese', T.cheese.slice(0, 3), C.cheese], ['spare rat', T.spare, C.panel], ['star', T.star, C.star]]) {
  const cs = Array(4).fill(colour);
  const ok = codes.length === 4 ? has(codes, cs) : [...seen.keys()].some((k) => k.startsWith(codes.join() + ',') && k.split('/')[1].startsWith(cs.slice(0, 3).join()));
  if (!ok) fail('the', name, codes.map(h2).join(' '), 'in colour', colour, 'is never on the screen');
}
if (![...seen.keys()].some((k) => k.startsWith(T.cheese.slice(0, 3).join() + ',' + T.marker + '/') && k.endsWith(',' + C.marker))) fail('the 2x cheese is never on the screen');
for (const b of T.blips) if (!one(b, C.radar)) fail('the radar blip', h2(b), 'in colour', C.radar, 'is never on the screen');
if (M.vic[0x27] !== C.ratDot || ram[0x07F8] !== 0xF0) fail('the rat\'s radar dot is sprite pointer', h2(ram[0x07F8]), 'colour', M.vic[0x27]);
if ((M.vic[0x28] & 15) !== C.redDot || ram[0x07F9] !== 0xF1) fail('a red rat\'s radar dot is sprite pointer', h2(ram[0x07F9]), 'colour', M.vic[0x28] & 15);

// the red rats
for (const [i, t] of [[0, 15], [1, 7]]) {
  if (stunned[i].join() !== B.rrStun(t).join()) fail('stunned for', t, 'the game shows facings', stunned[i].join(' '), 'the tab', B.rrStun(t).join(' '));
}
let turns = 0;
for (let i = 1; i + 1 < moves.length; i++) {
  for (let x = 0; x < Math.min(moves[i - 1].length, moves[i].length, moves[i + 1].length); x++) {
    const a = moves[i - 1][x], b = moves[i][x], c = moves[i + 1][x];
    if (a.life !== c.life || a.stun || b.stun || c.stun || ((b.dir - a.dir) & 3) !== 2) continue;
    turns++;
    const want = B.rrTurnBack(a.dir, b.dir);
    if (b.facing !== want[0] || c.facing !== want[1]) fail('a red rat turning from', a.dir, 'to', b.dir, 'faced', b.facing, c.facing, 'the tab', want.join(' '));
  }
}
if (!turns) fail('no red rat turned back in the game played');

// caught
const byRat = eeek.filter((e) => e.by === 'red'), byCat = eeek.filter((e) => e.by === 'cat');
if (!byRat.length || !byCat.length) fail('caught', byRat.length, 'times by red rats and', byCat.length, 'by the cat');
for (const e of byRat) if (e.codes.join() !== T.eeek.join() || e.colours.some((c) => c !== C.red)) fail('caught by a red rat: EEEK', e.codes.map(h2).join(' '), 'colours', e.colours.join(' '));
for (const e of byCat) if (e.codes.join() !== T.eeek.join() || e.colours.some((c) => c !== C.rat)) fail('caught by a cat: EEEK', e.codes.map(h2).join(' '), 'colours', e.colours.join(' '));
for (const e of eeek) {
  const next = cleared.find((c) => c > e.at);
  if (next !== undefined && Math.abs(next - e.at - B.RR_EEEK) > B.RR_EEEK * 0.02) fail('EEEK stayed', next - e.at, 'cycles, the tab', B.RR_EEEK);
}

// the X2 and the TIME bar
const on = T.x2on.join(), off = T.x2off.join();
let flips = 0;
for (let i = 1; i < at.x2.length; i++) {
  if (at.x2[i][1] !== at.x2[i - 1][1]) continue;
  const a = [at.x2[i - 1][2], at.x2[i - 1][3]].join(), b = [at.x2[i][2], at.x2[i][3]].join();
  if (!((a === on && b === off) || (a === off && b === on))) { fail('the X2 went from', a, 'to', b, 'the tab', on, 'and', off); break; }
  flips++;
}
if (!flips) fail('the X2 never flashed in the game played');
// each cell's glyphs as its units run out, in one life, from full to empty
const want = B.rrTimeCell().slice(1).join();
let used = 0;
for (let k = 0; k < 10; k++) {
  const run = cells.filter(([, t]) => t >> 3 === k || t === 8 * (k + 1)).map(([l, t, c]) => [l, t, c]);
  for (let i = 0; i + 8 <= run.length; i++) {
    const w = run.slice(i, i + 8);
    if (w[0][1] !== 8 * k + 7 || w.some((v, j) => v[0] !== w[0][0] || v[1] !== 8 * k + 7 - j)) continue;
    used++;
    const got = w.map((v) => v[2]).join();
    if (got !== want) fail('TIME bar cell', k, 'shows', w.map((v) => h2(v[2])).join(' '), 'the tab', B.rrTimeCell().slice(1).map(h2).join(' '));
  }
}
if (!used) fail('no TIME bar cell was used up in the game played');

// how long things take
function mean(list) {
  const d = [];
  for (let i = 1; i < list.length; i++) if (list[i][1] === list[i - 1][1]) d.push(list[i][0] - list[i - 1][0]);
  const s = d.slice().sort((a, b) => a - b), med = s[s.length >> 1], k = d.filter((v) => v > med * 0.5 && v < med * 1.8);
  return k.reduce((a, b) => a + b, 0) / k.length;
}
for (const [what, list, want] of [['a red rat move', at.red, B.RR_MOVE], ['a rat move', at.player, B.RR_PMOVE], ['a unit of TIME', at.unit, B.RR_UNIT], ['an X2 flash', at.x2, B.RR_X2]]) {
  const m = mean(list);
  if (!(Math.abs(m - want) <= want * 0.05)) fail(what, 'takes', Math.round(m), 'cycles on average, the tab', want);
}

if (bad) { console.log(bad, 'failed'); process.exit(1); }
console.log('ok: every piece of the cast is as the game draws it, and moves as fast');
