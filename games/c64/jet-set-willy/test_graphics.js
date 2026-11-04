#!/usr/bin/env node
'use strict';
// The Graphics tab. Its cards move the game's sprites with the ports in reference/jsw-rooms.js, which
// test_rooms.js holds against the game's code, and with the jw-graphics block, at the pace of a pass of
// the main loop. This checks the block and the pace against the game, run from its start-up on the
// kit's model of the C64:
// - Willy walking right, then walking left from the start of a game: at each player update the step
//   count at $32, the column at $4F and the frame at $50 go as jwWalk says, the updates come every
//   sixth pass, and every frame the interrupt shows sprite 0 at $50 + 6;
// - the guardians are stepped ($3614 up and down, $369E across) on every twelfth pass and the arrows
//   by $314D on every eighth;
// - every guardian record of the 60 rooms is a card's or left out on purpose, and each card's record
//   reaches every frame its group's records reach in their rooms;
// - every sprite from $00 to $AB is on a card, $10 and $11 only on the card of those never shown, and
//   nothing in the rooms, Willy's walk or Maria and the toilet ever shows those two;
// - game over: the boot drops as many lines as jwGameOver says, each about JW_LINE_MS thousandths of a
//   second, and the wait before the title is holdMs, within 3 %; every byte jwGameOver reads is the
//   operand of an immediate instruction.
//   node games/c64/jet-set-willy/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, KEY } = require(path.join(ROOT, 'kit/c64/machine.js'));
const g = game(__dirname);
for (const n of ['jswRoom', 'jswGuardians', 'jswArrows']) Object.assign(globalThis, g.run('reference/jsw-rooms.js', n));
const B = g.run('graphics.html', 'jw-graphics', 'jwWalk', 'jwGuardianCards', 'jwGameOver', 'JW_PASS_MS', 'JW_LINE_MS', 'JW_WAIT_MS');
const R = g.listing().ram;
let bad = 0;
const fail = (...w) => { if (bad++ < 40) console.log('FAIL', ...w); };
const h2 = (n) => '$' + n.toString(16).toUpperCase().padStart(2, '0');
const h4 = (n) => '$' + n.toString(16).toUpperCase().padStart(4, '0');
const CLOCK = 985248;

// the game's interrupts through the KERNAL and its sprite collisions, as test_play.js's machine
class JSWMachine extends Machine {
  constructor(o) {
    super(Object.assign({ collide: true }, o));
    this.hooks[0xFFD2] = (c) => { c.cycles += 40; c.rts(); };
  }
}
// A game from the start-up: Return on the title 120 frames on, then each frame in play the joystick
// as joy(frame in play) says (bits clear for pushed: 4 left, 8 right), or the keys of keys(frame).
function play(frames, { joy = () => 0, keys = () => [], hooks = {} } = {}) {
  const m = new JSWMachine({ ram: g.listing().ram, pc: 0x080D, passAt: 0x30FF, dma: true });
  const r = m.ram, inGame = () => r[0x0315] === 0x33;
  const s = { m, r, passes: 0, log: [] };
  m.onPass = () => { if (inGame()) { s.passes++; if (hooks.pass) hooks.pass(s); } };
  for (const [a, f] of Object.entries(hooks)) if (a !== 'pass') m.hooks[+a] = (c) => { f(s, c); return false; };
  let w = 0, f = 0;
  for (let k = 0; k < frames; k++) {
    m.keys.clear();
    if (!inGame()) { w++; if (w >= 120 && w < 124) m.keys.add(KEY.RETURN); m.joy = 0x1F; }
    else { m.joy = 0x1F & ~joy(f); for (const key of keys(f)) m.keys.add(key); f++; }
    m.runFrames(1);
  }
  return s;
}

// 1. Willy's walk, and the pace of the guardians and the arrows.
for (const [dir, left] of [[8, false], [4, true]]) {
  const on = { 0x3614: [], 0x314D: [] }, shown = [];
  const s = play(400, { joy: () => dir, hooks: {
    pass: (s) => s.log.push([s.passes, s.r[0x32], s.r[0x4F], s.r[0x50]]),
    0x3614: (s) => on[0x3614].push(s.passes), 0x369E: (s) => on[0x3614].push(s.passes), 0x314D: (s) => on[0x314D].push(s.passes),
    0x358E: (s, c) => { if (s.r[0x0315] === 0x33) shown.push([c.a, s.r[0x50]]); },
  } });
  const ups = [];
  for (const e of s.log) if (!ups.length || e.slice(1).join() !== ups[ups.length - 1].slice(1).join()) ups.push(e);
  // walking left the first update turns him round from facing right; the walk starts after it
  const steps = ups.slice(left ? 2 : 1), from = ups[left ? 1 : 0];
  const walk = B.jwWalk(left);
  let col0 = null;
  if (steps.length < 30) fail(left ? 'left' : 'right', 'walk: only', steps.length, 'updates');
  steps.forEach((e, i) => {
    const w = walk.next();
    if (col0 === null) col0 = e[2] - w.col;
    if (e[1] !== w.count || e[2] !== col0 + w.col || e[3] + 6 !== w.pointer) fail(left ? 'left' : 'right', 'walk update', i, 'the game', e.slice(1).map(h2).join(' '), 'the block', [w.count, col0 + w.col, w.pointer - 6].map(h2).join(' '));
    const gap = e[0] - (i ? steps[i - 1][0] : from[0]);
    if (gap !== 6) fail(left ? 'left' : 'right', 'walk update', i, 'came', gap, 'passes after the last');
  });
  for (const [a, f] of shown) if (a !== f + 6) { fail('the interrupt showed sprite 0 at', h2(a), 'with $50 at', h2(f)); break; }
  for (const [a, every] of [[0x3614, 12], [0x314D, 8]]) {
    const p = [...new Set(on[a])];                    // once for each guardian of a pass
    if (p.length < 20) fail(h4(a), 'ran', p.length, 'times');
    for (let i = 1; i < p.length; i++) if (p[i] - p[i - 1] !== every) { fail(h4(a), 'ran', p[i] - p[i - 1], 'passes apart, not', every); break; }
  }
}

// 2. The guardian cards.
const cards = B.jwGuardianCards(R);
const reach = (n, i) => { const G = jswGuardians(R, n), f = new Set(); for (let k = 0; k < 400; k++) { f.add(G.list[i].pointer); G.step(); } return f; };
const onCards = new Set();
for (let n = 0; n < 60; n++) {
  const G = jswGuardians(R, n);
  G.list.forEach((q, i) => {
    const rec = q.rec, card = cards.find((c) => c.base === rec[3]);
    if (rec[2] >= 16 || rec[3] <= 5) { if (card) fail('room', n, 'guardian', i, 'is left out and has a card'); return; }
    if (!card) return fail('room', n, 'guardian', i, 'frame', h2(rec[3]), 'has no card');
    if (!card.rooms.includes(n)) fail('room', n, 'guardian', i, 'is missing from its card\'s rooms');
    const mine = reach(card.room, card.index);
    for (const f of reach(n, i)) if (!mine.has(f)) fail('room', n, 'guardian', i, 'reaches', h2(f), 'which its card never shows');
  });
}
for (const c of cards) for (const f of reach(c.room, c.index)) onCards.add(f);
// what the other cards show: Willy, Maria and the toilet, the arrows, game over, and never shown
const willy = new Set();
for (const left of [false, true]) { const w = B.jwWalk(left); for (let k = 0; k < 16; k++) willy.add(w.next().pointer); }
const seven = new Set();
for (const room of [33, 35]) for (let pass = 0; pass < 256; pass++) for (const willyRow of [0, 11, 12, 13, 15]) {
  const s = jswRoom.sprite7(room, { pass, willyRow });
  if (s && s.pointer !== undefined) seven.add(s.pointer);
}
const O = B.jwGameOver(R);
const tab = new Set([...onCards, ...willy, ...seven, 0xAA, 0xAB, O.boot, O.willy, O.barrel]);
for (const f of [0x10, 0x11]) if (tab.has(f)) fail('frame', h2(f), 'is shown by a card besides the never-shown one');
for (let f = 0; f <= 0xAB; f++) if (!tab.has(f) && f !== 0x10 && f !== 0x11) fail('frame', h2(f), 'is on no card');
for (let n = 0; n < 60; n++) {
  const G = jswGuardians(R, n);
  for (let k = 0; k < 400; k++) { for (const q of G.list) if (q.pointer === 0x10 || q.pointer === 0x11) fail('room', n, 'shows', h2(q.pointer)); G.step(); }
}

// 3. Game over: lose every life by pressing Run/Stop in play, and time the boot.
{
  const drops = [];
  let landed = 0, title = 0;
  play(1300, { keys: (f) => (f >= 200 && f < 204 ? [KEY.STOP] : []), hooks: {
    0x38B8: (s) => drops.push(s.m.cpu.cycles), 0x38CB: (s) => { if (!landed) landed = s.m.cpu.cycles; },
    0x38D4: (s) => { if (!title) title = s.m.cpu.cycles; },
  } });
  if (drops.length !== O.willyY) fail('the boot dropped', drops.length, 'lines, not', O.willyY);
  const line = (drops[drops.length - 1] - drops[0]) / (drops.length - 1) / CLOCK * 1000;
  const hold = (title - landed) / CLOCK * 1000;
  if (!(Math.abs(line - O.lineMs) / line < 0.03)) fail('a line of the drop took', line.toFixed(3), 'ms, the block says', O.lineMs);
  if (!(Math.abs(hold - O.holdMs) / hold < 0.03)) fail('the wait before the title took', hold.toFixed(1), 'ms, the block says', O.holdMs.toFixed(1));
  console.log(`game over: ${drops.length} lines of ${line.toFixed(3)} ms, then ${hold.toFixed(1)} ms before the title`);
}
for (const a of [0x38AC, 0x38B1, 0x3895, 0x3886, 0x3890, 0x388B, 0x3879, 0x389D, 0x38D9, 0x38E4])
  if (![0xA9, 0xA2, 0xA0, 0xC9, 0xE0, 0xC0].includes(R[a - 1])) fail('no immediate before', h4(a));
if (Math.abs(B.JW_PASS_MS - 20 / 3) > 1e-9) fail('JW_PASS_MS is', B.JW_PASS_MS);

console.log(bad ? `${bad} failures` : `ok: Willy's walk both ways, ${cards.length} guardian cards over 60 rooms, every sprite $00-$AB placed, and game over's timing`);
process.exit(bad ? 1 : 0);
