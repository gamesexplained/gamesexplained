#!/usr/bin/env node
// Hold the power-up pictures (the gr-powerups block of index.html) against the game's own routines,
// run on the kit's 6502 over the listing's memory.
// - The ship: ship_control ($4E4F), draw_options ($6F7E) and shield_shape ($7809), one call each a
//   frame in play_frame_common's order, with the joystick read from a script of moves; after every
//   frame the ship's place, its shape, the trail and its head, and sprite slot 7 (on, place, shape,
//   colour) must equal puShipFrame's and puSlot7's. Every speed, none to two Options, shield on
//   and off.
// - The firing point: place_shot through start_shot ($4FBE) and start_missile ($53A7), and
//   start_laser ($5112), for X and Y across the screen, against puPlace.
// - The weapons: move_shots ($4F18), move_missiles ($531A) and move_lasers ($5151) on screens of
//   every stage's scenery, with shots, missiles and lasers started at random; after every step the
//   screen, the colour RAM a laser writes and each slot must equal puShot's, puMissile's and
//   puLaser's.
// Exits 1 on any difference.
//   node games/c64/gradius/test_powerups.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const P = g.run('index.html', 'gr-powerups', 'puShip', 'puShipFrame', 'puSlot7', 'puPlace', 'puShot', 'puMissile', 'puLaser');
const M = g.run('index.html', 'gr-map', 'grStage', 'grScenery', 'grColumn');
const L = g.listing();
let bad = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
let seed = 1109;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return (seed >> 8) % n; };

// A machine over a fresh copy of the listing's memory. $DC00 reads give the joystick (bits low
// when pressed: 0 up, 1 down, 2 left, 3 right), $DC01 no keys; colour RAM writes are kept.
function machine() {
  const m = L.ram.slice(), colour = new Uint8Array(1000);
  const st = { joy: 0xFF };
  const io = {
    read(a) { if (a === 0xDC00) return st.joy; if (a === 0xDC01) return 0xFF; throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD800 && a < 0xD800 + 1000) colour[a - 0xD800] = v & 15; },
  };
  const cpu = new CPU(m, { port: 0x35, io });
  return { m, colour, st, call: (a, r) => cpu.call(a, r || {}, { maxSteps: 200000 }) };
}

// ---- the ship and slot 7
const MOVES = { R: { right: 1 }, L: { left: 1 }, U: { up: 1 }, D: { down: 1 }, '.': {},
  r: { right: 1, up: 1 }, d: { right: 1, down: 1 }, l: { left: 1, up: 1 }, u: { left: 1, down: 1 } };
const SCRIPT = 'RRRRRRRRRRRRdddddd....LLLLLLLLLUUUUUUUUUUU......DDDDDDDDDDDDDDRRRRRRRRRRRRRRRRRRRRRRRRRRrrrrrlllllluuuu..........';
let frames = 0;
for (let speed = 1; speed <= 4; speed++) for (let emitters = 1; emitters <= 3; emitters++) for (const shield of [0, 4]) {
  const x = 0x80 + rnd(64), y = 0x60 + rnd(64);
  const s = P.puShip(x, y, speed); s.emitters = emitters; s.shield = shield;
  const G = machine(), m = G.m;
  m[0x4154] = x & 255; m[0x4155] = x >> 8; m[0x4156] = y; m[0x4CE8] = m[0x4CE9] = speed;
  m[0x5024] = 2; m[0x502A] = 6; m[0x40A4] = 0x80; m[0x53E7] = 0;
  for (let i = 0; i < 16; i++) { m[0x53B7 + i] = x & 255; m[0x53C7 + i] = x >> 8; m[0x53D7 + i] = y; }
  m[0x52E6] = shield; m[0x5404] = emitters; m[0x6F7D] = 0; m[0x703B] = 0; m[0x703A] = 0; m[0x7035] = 6;
  m[0x4DAA] = m[0x4DAB] = 0;
  for (let k = 0; k < 4 * SCRIPT.length; k++) {
    const mv = MOVES[SCRIPT[k % SCRIPT.length]];
    G.st.joy = 0xFF & ~((mv.up ? 1 : 0) | (mv.down ? 2 : 0) | (mv.left ? 4 : 0) | (mv.right ? 8 : 0));
    G.call(0x4E4F); G.call(0x6F7E); G.call(0x7809);
    P.puShipFrame(s, mv); const t7 = P.puSlot7(s);
    frames++;
    const at = `speed ${speed}, ${emitters - 1} Options, shield ${shield}, frame ${k}`;
    const gx = m[0x4154] | m[0x4155] << 8;
    if (gx !== s.x || m[0x4156] !== s.y || m[0x40A4] !== s.shape) fail(at, 'ship', gx, m[0x4156], m[0x40A4].toString(16), 'page', s.x, s.y, s.shape.toString(16));
    if (m[0x53E7] !== s.head) fail(at, 'trail head', m[0x53E7], s.head);
    for (let i = 0; i < 16; i++) if ((m[0x53B7 + i] | m[0x53C7 + i] << 8) !== s.trail[i][0] || m[0x53D7 + i] !== s.trail[i][1]) { fail(at, 'trail', i); break; }
    const on = m[0x40C3] !== 0;
    if (on !== !!t7) { fail(at, 'slot 7 on', on, !!t7); continue; }
    if (t7) {
      const sx = (m[0x407B] | m[0x408B] << 8) & 511;
      if (sx !== (t7.x & 511) || m[0x4083] !== t7.y || m[0x40AB] !== t7.shape || m[0x4093] !== t7.colour)
        fail(at, 'slot 7', sx, m[0x4083], m[0x40AB].toString(16), m[0x4093], 'page', t7.x, t7.y, t7.shape.toString(16), t7.colour);
    }
  }
}

// ---- the firing point
let points = 0;
{
  const G = machine(), m = G.m;
  for (let x = 0x18; x < 0x158; x += 3) for (let y = 0x40; y < 0xE0; y += 5) {
    const p = P.puPlace(x, y);
    m[0x41AD] = x & 255; m[0x41AE] = x >> 8; m[0x41AF] = y;
    m.fill(0, 0x4277, 0x4277 + 12); m[0x4FE9] = 1;
    G.call(0x4FBE, { a: 1 });
    if (m[0x426B] !== p.col || m[0x4277] !== p.row) fail('shot from', x, y, m[0x426B], m[0x4277], 'page', p.col, p.row);
    G.call(0x53A7);
    if (m[0x4274] !== p.col || m[0x4280] !== p.row) fail('missile from', x, y, m[0x4274], m[0x4280], 'page', p.col, p.row);
    m.fill(0, 0x514E, 0x5151);
    G.call(0x5112);
    if (m[0x514B] !== p.col || m[0x514E] !== p.y) fail('laser from', x, y, m[0x514B], m[0x514E], 'page', p.col, p.y);
    points++;
  }
}

// ---- the weapons, on each stage's scenery
const LIMITS = [0xAB, 0xAB, 0xAB, 0xAB, 0xAB, 0xF0, 0xAB, 0xAB];
// 40 columns of stage s's scenery from a column picked at random, in rows 3 to 21 (an empty screen
// for stage 6, whose scenery never comes on)
function screenOf(s) {
  const st = M.grStage(L.ram, s), sc = M.grScenery(L.ram, s), scr = new Uint8Array(1000).fill(0x20);
  if (!sc || sc.columns < 40) return scr;
  const from = rnd(sc.columns - 40);
  let p = st.map;
  for (let c = 0; c < from; c++) p += M.grColumn(L.ram, p, st.up).read;
  for (let c = 0; c < 40; c++) {
    const col = M.grColumn(L.ram, p, st.up); p += col.read;
    col.rows.forEach((code, r) => { scr[(r + 3) * 40 + c] = code; });
  }
  return scr;
}
let steps = 0;
for (let trial = 0; trial < 240; trial++) {
  const stage = trial % 8, limit = LIMITS[stage], scr = screenOf(stage);
  const G = machine(), m = G.m;
  m.set(scr, 0x0400); m[0x5399] = limit;
  const kind = trial % 3;
  // shots: slots 0-5 ordinary, 6-8 DOUBLE
  const shots = [], missiles = [], lasers = [];
  m.fill(0, 0x4277, 0x4277 + 12); m.fill(0, 0x514E, 0x5151);
  if (kind === 0) for (let i = 0; i < 9; i++) if (rnd(3) === 0) {
    const t = { col: 2 + rnd(30), row: 4 + rnd(17), kind: i < 6 ? 1 : 2 };
    shots[i] = t; m[0x426B + i] = t.col; m[0x4277 + i] = t.row;
  }
  const lim = 1 + rnd(3);
  if (kind === 1) for (let i = 0; i < 3; i++) if (i < lim && rnd(2) === 0) {
    const t = { col: 2 + rnd(30), row: 3 + rnd(17) };
    missiles[i] = t; m[0x4274 + i] = t.col; m[0x4280 + i] = t.row;
  }
  const length = 5;
  if (kind === 2) for (let i = 0; i < 3; i++) if (rnd(2) === 0) {
    const t = { col: rnd(34), y: 8 * 3 + rnd(8 * 18) };
    lasers[i] = t; m[0x514B + i] = t.col; m[0x514E + i] = t.y;
  }
  m[0x4FE9] = lim; m[0x52E7] = length;
  const page = scr.slice(), pageColour = new Uint8Array(1000);
  for (let step = 0; step < 40; step++) {
    G.colour.fill(0); pageColour.fill(0);
    if (kind === 0) {
      G.call(0x4F18);
      for (let i = 0; i < 9; i++) if (shots[i]) shots[i] = P.puShot(page, shots[i], limit);
      for (let i = 0; i < 9; i++) {
        const t = shots[i];
        if ((m[0x4277 + i] !== 0) !== !!t || (t && (m[0x426B + i] !== t.col || m[0x4277 + i] !== t.row))) { fail('stage', stage + 1, 'trial', trial, 'step', step, 'shot', i, m[0x426B + i], m[0x4277 + i], t); break; }
      }
    } else if (kind === 1) {
      m[0x5319] = 1; m[0x5318] = 2;
      G.call(0x531A);
      for (let i = 0; i < lim; i++) if (missiles[i]) missiles[i] = P.puMissile(page, missiles[i], limit);
      for (let i = 0; i < lim; i++) {
        const t = missiles[i];
        if ((m[0x4280 + i] !== 0) !== !!t || (t && (m[0x4274 + i] !== t.col || m[0x4280 + i] !== t.row))) { fail('stage', stage + 1, 'trial', trial, 'step', step, 'missile', i, m[0x4274 + i], m[0x4280 + i], t); break; }
      }
    } else {
      G.call(0x5151);
      for (let i = 0; i < 3; i++) if (lasers[i]) lasers[i] = P.puLaser(page, pageColour, lasers[i], length, limit);
      for (let i = 0; i < 3; i++) {
        const t = lasers[i];
        if ((m[0x514E + i] !== 0) !== !!t || (t && (m[0x514B + i] !== t.col || m[0x514E + i] !== t.y))) { fail('stage', stage + 1, 'trial', trial, 'step', step, 'laser', i, m[0x514B + i], m[0x514E + i], t); break; }
      }
      for (let a = 0; a < 1000; a++) if (G.colour[a] !== pageColour[a]) { fail('stage', stage + 1, 'trial', trial, 'step', step, 'colour at', a, G.colour[a], pageColour[a]); break; }
    }
    for (let a = 0; a < 1000; a++) if (m[0x0400 + a] !== page[a]) { fail('stage', stage + 1, 'trial', trial, 'step', step, 'screen at', a, m[0x0400 + a].toString(16), page[a].toString(16)); break; }
    steps++;
  }
}
console.log(`${frames} ship frames, ${points} firing points, ${steps} weapon steps: ` + (bad ? bad + ' differences' : 'every one matches the game'));
process.exit(bad ? 1 : 0);
