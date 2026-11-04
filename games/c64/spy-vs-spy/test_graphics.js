#!/usr/bin/env node
'use strict';
// The Graphics tab. Its cards draw the spies with svFrame, which reads the game's frame and shape
// tables, and time every card by the game's own counts (the svs-graphics block). This checks them
// against the game:
// - svFrame draws every frame, 0-68, at seven places across, pixel for pixel as the game's own
//   spy_screen_box and draw_spy_shape ($776D, $77FC) draw it into the bitmap on the kit's 6502, and
//   frames 47-60 are frames 33-46 mirrored, as the club's caption says;
// - every byte the block or the cards read as a count, a colour or a limit is the operand of an
//   immediate instruction;
// - the sprites the tab draws are the ones the game unpacks: the trapulator's five at the start of a
//   game, and each held object's as build_spy_sprite ($92AC) builds it on the kit's 6502;
// - a game played at random on the kit's model of the C64 never draws frames 63 or 64, draws frame 0
//   only on its first turn, walks through the tab's lists in order, and steps a walking spy once a
//   turn of about SV_TURN_MS thousandths of a second;
// - each trap the tab plays, set off on the white spy, draws the tab's shapes at the tab's offsets on
//   the turns the tab draws them, goes on to the bucket's nine steps where the tab does, and rises as
//   svAngel says, frame for frame and line for line.
//   node games/c64/spy-vs-spy/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, loadListing } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const B = game(__dirname).run('graphics.html', 'svs-graphics', 'svFrame', 'svWalks', 'svMoves', 'svKnocks',
  'svObject', 'svAction', 'svSprite', 'svTiming', 'svSeq9', 'svAngel', 'SV_TURN_MS', 'SV_S8');
const R = loadListing(path.join(__dirname, 'listing.json'));
const T = B.svTiming(R);
let bad = 0;
const fail = (...w) => { if (bad++ < 40) console.log('FAIL', ...w); };
const h4 = (n) => '$' + n.toString(16).toUpperCase().padStart(4, '0');

// 1. The frames, against the game's drawing. draw_spy_shape is set up as the game sets it up: the
// shape tables built ($8CAC), the shapes' facings as they start ($BAF0 copied to $EA00) and the
// routine's own operands pointing at a clean bitmap.
{
  const m = R.slice(), cpu = new CPU(m, { port: 0x35 });
  cpu.call(0x8CAC, {}, { maxSteps: 2e6 });
  for (let s = 0; s < 66; s++) m[0xEA00 + s] = m[0xBAF0 + s];
  m[0x795A] = 0xFF; m[0x7962] = 0; m[0x7963] = 0xED; m[0x7967] = 0; m[0x7968] = 0xEE;
  const lineAddr = (mm, y) => mm[0xEC00 + y] | mm[0xED00 + y] << 8;
  let tried = 0;
  for (let f = 0; f < 69; f++) for (const across of [0, 1, 2, 3, 5, 0xFE, 0xFB]) {
    const mm = m.slice(), c2 = new CPU(mm, { port: 0x35 });
    mm.fill(0, 0x2E00, 0x6000);                             // a clean backdrop and bitmap
    mm[0x57] = 10; mm[0x97] = 60; mm[0x55] = 0; mm[0x53] = across; mm[0x5D] = 0; mm[0x5F] = 0; mm[0x61] = 0;
    mm[0xC1] = 0xFF; mm[0xC3] = 0; mm[0xC5] = 0xFF; mm[0xC7] = 0; mm[0xC9] = f;
    c2.call(0x776D, { x: 0 }, { maxSteps: 1e5 });
    const cx = mm[0xDD], base = mm[0xBE];
    c2.call(0x77FC, { x: 0 }, { maxSteps: 1e6 });
    const got = new Map();
    for (let y = 0; y < 200; y++) {
      const la = lineAddr(mm, y);
      for (let col = 0; col < 40; col++) {
        const b = mm[la + col * 8];
        for (let p = 0; p < 4; p++) { const v = b >> (6 - 2 * p) & 3; if (v) got.set(((col * 4 + p) << 8) | y, v); }
      }
    }
    const want = new Map(B.svFrame(R, f, cx).map(([x, y, v]) => [(x << 8) | (base + y), v]));
    let diff = 0;
    for (const [k, v] of want) if (got.get(k) !== v) diff++;
    for (const k of got.keys()) if (!want.has(k)) diff++;
    if (diff) fail('frame', f, 'across', across, 'differs from the game in', diff, 'pixels');
    tried++;
  }
  if (tried !== 69 * 7) fail('drew', tried, 'frames');
  const key = (px) => px.map((p) => p.join(',')).sort().join(' ');
  for (let f = 33; f <= 46; f++) {
    const a = key(B.svFrame(R, f, 12)), b = B.svFrame(R, f + 14, 12);
    let mirror = false;
    for (let c = 0; c < 48 && !mirror; c++) mirror = key(b.map(([x, y, v]) => [c - x, y, v])) === a;
    if (!mirror) fail('frame', f + 14, 'is not frame', f, 'mirrored');
  }
}

// 2. The operands the block and the cards read: LDA, LDY, CMP, ADC, SBC or AND immediate before each.
const IMM = [0x69D7, 0x6AD1, 0x692E, 0x695E, 0x6967, 0x6AC5, 0x6B43, 0x9177, 0x87DC, 0x87EC, 0x88BD, 0x88CD, 0x88D2, 0x88C8, 0x88AB];
for (const a of IMM) if (![0xA9, 0xA0, 0xC9, 0x69, 0xE9, 0x29].includes(R[a - 1])) fail('no immediate before', h4(a));

// 3. The sprites. The trapulator's five are unpacked into $6400 on, 64 bytes apart, when the screen is
// first drawn (draw_screen, $859D); the held objects' are built by build_spy_sprite.
function boot() {
  const M = new Machine({ ram: R.slice(), pc: 0x6604, port: { dir: 0x2F, data: 0x37 }, dma: true });
  M.hooks[0x8E60] = (c) => { c.pc = 0x8E66; return false; };   // the NTSC check, which waits for a line PAL lacks
  return M;
}
{
  const M = boot();
  for (let f = 0; f < 640; f++) { M.joy = f > 600 && f < 610 ? 0x0F : 0x1F; M.joy1 = 0x1F; M.runFrames(1); }
  for (let n = 0; n < 5; n++) {
    const want = B.svSprite(R, n), got = M.ram.subarray(0x6400 + 64 * n, 0x6400 + 64 * n + 63);
    if (want.some((v, i) => v !== got[i])) fail('trapulator sprite', n, 'differs from the game\'s');
  }
  for (let c = 0; c < 14; c++) {
    const obj = [...R.subarray(0x14A0, 0x14B1)].indexOf(c);
    if (obj < 0) { fail('no object of class', c); continue; }
    const m = M.ram.slice(), cpu = new CPU(m, { port: 0x35 });
    m[0x7B] = obj; m[0x3B] = 0xFF; m[0x35] = 0;
    cpu.call(0x92AC, { x: 0 }, { hooks: { 0x931A: () => true }, maxSteps: 1e5 });
    const want = B.svSprite(R, c + 5), got = m.subarray(0x6540, 0x6540 + 63);
    if (want.some((v, i) => v !== got[i])) fail('held class', c, 'differs from build_spy_sprite');
  }
}

// 4. Play at random: the frames each spy is drawn in, the walk lists' order and the walking pace.
const WALKS = B.svWalks(R), WALKING = new Set(WALKS.flatMap((w) => w.frames));
{
  const M = boot(), r = M.ram, draws = [[], []];
  let started = -1, seed = 7;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return seed % n; };
  M.hooks[0x674E] = () => { if (started < 0) started = M.frames; return false; };
  M.hooks[0x77FC] = (c) => { draws[c.x & 1].push({ f: r[0xC9 + (c.x & 1)], cyc: M.cpu.cycles, turn: M.frames === started }); return false; };
  let stick = 0x1F;
  for (let f = 0; f < 16000; f++) {
    if (started < 0) M.joy = f > 600 && f < 610 ? 0x0F : 0x1F;
    else {
      if (f % 40 === 0) stick = [0x1F, 0x1E, 0x1D, 0x1B, 0x17, 0x0F, 0x0E, 0x0D, 0x0B, 0x07][rnd(10)];
      M.joy = rnd(8) ? stick : 0x1F;
    }
    M.joy1 = 0x1F;
    M.runFrames(1);
  }
  const seen = new Set();
  for (const d of draws) for (const { f, turn } of d) {
    seen.add(f);
    if (f === 63 || f === 64 || f > 68 || (f === 0 && !turn)) fail('the game drew frame', f);
  }
  if ([...WALKING].filter((f) => seen.has(f)).length < WALKING.size - 2) fail('the walks drew', [...WALKING].filter((f) => seen.has(f)).length, 'of', WALKING.size, 'walking frames');
  // Each list, played round: the pairs of different frames that follow each other in it.
  const next = new Set();
  for (const w of WALKS) for (let i = 0; i < w.frames.length; i++) {
    const a = w.frames[i], b = w.frames[(i + 1) % w.frames.length];
    if (a !== b) next.add(a + '>' + b);
  }
  const listOf = new Map();
  WALKS.forEach((w, i) => w.frames.forEach((f) => listOf.set(f, i)));
  let steps = 0;
  const gaps = [];
  for (const d of draws) for (let i = 1; i < d.length; i++) {
    const a = d[i - 1].f, b = d[i].f;
    if (a === b || !listOf.has(a) || listOf.get(a) !== listOf.get(b)) continue;
    steps++;
    if (!next.has(a + '>' + b)) fail('a walk went from frame', a, 'to', b);
    gaps.push(d[i].cyc - d[i - 1].cyc);
  }
  if (steps < 500) fail('only', steps, 'walking steps');
  gaps.sort((a, b) => a - b);
  const ms = gaps[gaps.length >> 1] / 985248 * 1000;
  if (Math.abs(ms - B.SV_TURN_MS) > B.SV_TURN_MS * 0.08) fail('a walking step takes', ms.toFixed(1), 'ms, the tab', B.SV_TURN_MS);
}

// 5. Each trap the tab plays, set off on the white spy early in a game, when it stands alone and
// unfrozen: what draw_shape ($7C7E) draws and on which of the spy's turns, the frame and height on
// each turn after.
for (const type of [0, 5, 2, 4]) {
  const M = boot(), r = M.ram, turns = [], shapes = [], angel = [];
  let started = -1, forced = -1, turn = 0;
  M.hooks[0x674E] = () => {
    if (started < 0) started = M.frames;
    if (r[0x41] === 1) {                                      // the white spy's turn comes next
      turn++;
      if (forced < 0 && M.frames > started + 30 && r[0x83] === 0 && r[0x021F] === 0) { r[0x83] = 0xC0 | type; forced = turn; }
      if (forced >= 0) turns.push({ t: turn - forced, state: r[0x83], f: r[0xC9], h: B.SV_S8(r[0x55]) });
    }
    return false;
  };
  M.hooks[0x69BF] = (c) => { if (forced >= 0 && c.x === 0) angel.push({ f: c.a, up: -B.SV_S8(r[0x55]), depth: r[0x57] }); return false; };
  M.hooks[0x7C7E] = (c) => { if (forced >= 0 && c.x === 0) shapes.push({ t: turn - forced, s: c.a, ax: r[0x11] >> 3, ay: B.SV_S8(r[0x12]) }); return false; };
  for (let f = 0; f < 4000 && turns.length < 160; f++) { M.joy = started < 0 && f > 600 && f < 610 ? 0x0F : 0x1F; M.joy1 = 0x1F; M.runFrames(1); }
  const want = B.svAction(R, type);
  if (shapes.length !== want.length) fail('trap', type, 'drew', shapes.length, 'shapes');
  want.forEach((w, i) => {
    const g = shapes[i] || {};
    if (g.s !== w.s || g.ax !== (w.ax || 0) || g.ay !== (w.ay || 0)) fail('trap', type, 'step', i, 'drew', JSON.stringify(g), 'the tab', JSON.stringify(w));
    if (g.t !== T.wait + i * T.step) fail('trap', type, 'step', i, 'came on turn', g.t, 'the tab', T.wait + i * T.step);
  });
  let at = turns.findIndex((q) => q.t > T.wait + 8 * T.step - 1 && q.state !== (0x80 | type));
  if (type === 2) {                                           // the nine steps
    const runs = [];
    for (; at < turns.length && turns[at].state === 2; at++) {
      const q = turns[at];
      if (runs.length && runs[runs.length - 1].f === q.f) runs[runs.length - 1].n++; else runs.push({ f: q.f, n: 1 });
    }
    const seq = B.svSeq9(R, 0);
    if (runs.length !== seq.length + 1 || runs.slice(1).some((u, i) => u.f !== seq[i].f)) fail('the bucket\'s steps', JSON.stringify(runs));
    if (runs.slice(2).some((u) => u.n !== T.seq9)) fail('the bucket\'s steps last', runs.map((u) => u.n).join(','), 'turns, the tab', T.seq9);
  }
  // The angel, each turn spy_sinking draws it, against svAngel from the count the action left.
  const sim = angel.length ? B.svAngel(R, 0, type === 2 ? R[0x692E] : R[0x6AC5], angel[0].depth) : [];
  if (angel.length < 40 || angel.length !== sim.length) fail('trap', type, 'showed the angel for', angel.length, 'turns, svAngel', sim.length);
  angel.forEach((q, p) => {
    const w = sim[p] || {};
    if (q.f !== w.f || q.up !== w.up) fail('trap', type, 'angel turn', p, 'frame', q.f, 'up', q.up, 'svAngel', w.f, w.up);
  });
}

if (bad) { console.log(bad, 'failures'); process.exit(1); }
console.log('ok');
