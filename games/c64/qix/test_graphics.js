#!/usr/bin/env node
'use strict';
// The Graphics tab. Its cards run the game's own routines on the kit's 6502 (the qx-sprites block):
// sprite_anim ($A4A9) for the enemies, marker_burst ($A774) and round_intro ($A6E8) for the burst.
// This checks them against the game:
// - the attract demo, run on the kit's model of the C64, shows every sprite in a look (shape, colour,
//   multicolour or not, shared colours) that the tab's card for it gives in the round's colours, holds
//   each enemy shape QX_STEP frames, and shows the marker only as $21 or a burst shape;
// - every burst in the demo, a death and a life starting, places the four sprites move for move as
//   the tab's run does from the same place, and takes about a tenth more cycles a move than the run;
// - the burst steps each pair's frame every ninth move and stops at $37 and $3F;
// - every store to a sprite pointer puts a shape the tab shows, never $20, and $2C-$2F are empty;
// - the captions' figures for the burst from the marker's starting place.
//   node games/c64/qix/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, loadListing } = require(path.join(ROOT, 'kit/c64/machine.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const { qxAnim, qxBurst, QX_STEP } = game(__dirname).run('graphics.html', 'qx-sprites', 'qxAnim', 'qxBurst', 'QX_STEP');
const R = loadListing(path.join(__dirname, 'listing.json'));
const STEP = QX_STEP(R);
let bad = 0;
const fail = (...w) => { if (bad++ < 30) console.log('FAIL', ...w); };
const h2 = (n) => '$' + n.toString(16).toUpperCase().padStart(2, '0');
const code = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'listing.json'), 'utf8')).records.filter((r) => r.t === 'code');

// 1. The code the tab leans on: the frame count at $1568 is never stored to, nor are the pointer
// tables; every store to a sprite pointer is one of these, putting the shapes given.
for (const r of code) {
  if (!/^(st|inc|dec)/.test(r.m) || r.oa === undefined) continue;
  if (r.oa === 0x1568 || (r.oa >= 0x159F && r.oa <= 0x15AE) || (r.oa >= 0x15BF && r.oa <= 0x15C6)) fail('a store to', h2(r.oa), 'at', h2(r.a));
}
const imm = (a) => (R[a] === 0xA9 ? R[a + 1] : fail('no LDA immediate at', h2(a)));
const table = (lo, n) => [...R.subarray(lo, lo + n)];
const STORES = {
  0x8CFB: [imm(0x8CF9)],                                                       // the marker
  0x9148: [imm(0x9146)], 0x914D: [imm(0x914B)], 0x9152: [imm(0x9150)], 0x9157: [imm(0x9155)],
  0x915C: [imm(0x915A)], 0x9161: [imm(0x915F)], 0x9166: [imm(0x9164)],       // a round's start
  0xA29D: table(0x15A3, 4), 0xA2A3: table(0x15AB, 4),                         // walker_pair_b
  0xA4D1: [R[0x9147], R[0x9147] ^ 1],                                         // the Fuse, EOR #$01 at $A4CF
  0xA4EB: table(0x15BF, 4), 0xA4F1: table(0x15C3, 4), 0xA50F: table(0x159F, 4), 0xA515: table(0x15A7, 4),
  0xA525: table(0x15BF, 4), 0xA52B: table(0x15C3, 4), 0xA547: table(0x159F, 4), 0xA54D: table(0x15AB, 4), // sprite_anim
  0xA70E: 'burst', 0xA714: 'burst', 0xA71A: 'burst', 0xA720: 'burst',          // burst_replay, from the recording
  0xA78D: [imm(0xA78B)], 0xA790: [imm(0xA78B)], 0xA795: [imm(0xA793)], 0xA798: [imm(0xA793)],
  0xA85F: 'burst',                                                             // INC, up to $37 and $3F
  0xC011: [imm(0xC00A)],                                                       // start-up, sprites off
  0xC6E7: table(0xD7F8, 8), 0xC7B7: table(0xD3F8, 8),                          // screen copies from under the I/O
};
if (!(R[0xA4CF] === 0x49 && R[0xA4D0] === 1)) fail('no EOR #$01 at $A4CF');
if (!(R[0xA857] === 0xC9 && R[0xA858] === 0x37 && R[0xA85B] === 0xC9 && R[0xA85C] === 0x3F)) fail('the burst\'s INC is not capped at $37 and $3F');
const found = new Set();
for (const r of code) {
  if (!/^(sta|stx|sty|inc|dec)$/.test(r.m) || r.oa === undefined) continue;
  const indexed = /,[xy]$/.test(r.o || ''), top = r.oa + (indexed ? 255 : 0);
  if (top < 0x07F8 || r.oa > 0x07FF) continue;
  found.add(r.a);
  if (!(r.a in STORES)) fail('a store to the sprite pointers the test does not know', h2(r.a), r.m, r.o);
}
const SHOWN = new Set([0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B]);
for (let p = 0x30; p <= 0x3F; p++) SHOWN.add(p);
for (const [a, vals] of Object.entries(STORES)) {
  if (!found.has(+a)) fail('no store to the sprite pointers at', h2(+a));
  if (vals === 'burst') continue;
  for (const v of vals) if (v !== 0 && !SHOWN.has(v)) fail('the store at', h2(+a), 'puts', h2(v));
}
for (let p = 0x2C; p <= 0x2F; p++) if (R.subarray(64 * p, 64 * p + 63).some((x) => x)) fail('shape', h2(p), 'is not empty');
if (!R.subarray(0x800, 0x83F).some((x) => x)) fail('shape $20 is empty');
// the multicolour bits: the walker pairs set theirs, the roamers and the marker clear theirs
for (const [a, op, v] of [[0xA231, 0xA9, 0xC0], [0xA2A6, 0xA9, 0x30], [0xA38B, 0xA9, 0x0C], [0xA198, 0xA9, 0x3F], [0xA1AC, 0xA9, 0xF3], [0x8CF4, 0x29, 0xFE]])
  if (R[a] !== op || R[a + 1] !== v) fail('the multicolour bits at', h2(a));

// 2. The attract demo on the kit's machine: each sprite's look, each frame.
const runs = {};
const anim = (col, roam) => (runs[col + '/' + roam] = runs[col + '/' + roam] || qxAnim(R, C64Cpu, col, roam));
const looks = (steps, sprites, mc) => new Set(steps.flatMap((st) => sprites.map((i) => [st.p[i], st.c[i], mc ? st.mc0 : '-', mc ? st.mc1 : '-'].join(' '))));
const M = new Machine({ ram: R.slice(), pc: 0x8000, port: { dir: 0x2F, data: 0x37 }, dma: true });
const r = M.ram, V = M.vic;
const burst = [];
let cur = null;
const snap = (kind) => () => {
  if (r[0x74] & 0x80) return false;                                  // round_intro recording, sprites off
  if (!cur || cur.kind !== kind || M.frames - cur.f > 30) { cur = { kind, x: r[0x31], y: r[0x32], moves: [], f: M.frames }; burst.push(cur); }
  cur.f = M.frames;
  cur.moves.push({ cyc: M.cpu.cycles, on: V[0x15] & 15, s: [0, 1, 2, 3].map((i) => [r[0x07F8 + i], V[2 * i] | ((V[0x10] >> i) & 1) << 8, V[2 * i + 1]]) });
  return false;
};
M.hooks[0xA87F] = snap('death'); M.hooks[0xA760] = snap('start');
const role = new Array(8).fill(''), since = new Array(8).fill(0), held = new Array(8).fill(null), holds = {};
const seen = {};
for (let f = 0; f < 7900; f++) {
  try { M.runFrames(1); } catch (e) { if (f < 7000) fail('the demo stopped at frame', f, e.message); break; }
  const col = r[0x0205], walk = anim(col, false), roam = anim(col, true);
  // each sprite against the same sprite on its card; the Spritz card shows sprites 2 and 3, which
  // roamers on 6 and 7 match, set from the same tables at the same step ($A522)
  const card = (k, s) => (k === 'spritz' ? looks(roam, [s & 3], false) : looks(walk, [s], true));
  for (let s = 0; s < 8; s++) {
    const on = V[0x15] >> s & 1, p = r[0x07F8 + s], mcb = V[0x1C] >> s & 1, c = V[0x27 + s] & 15;
    let k;
    if (!on) k = '';
    else if (p >= 0x30) k = 'burst';
    else if (s === 0) k = 'marker';
    else if (s === 1) k = 'fuse';
    else if (s === 4 || s === 5) k = 'B';
    else k = (r[0xBE] & (s < 4 ? 0x80 : 0x40)) ? 'spritz' : (s < 4 ? 'C' : 'A');
    const key = k + (k ? ' m' + mcb : '');
    if (key !== role[s]) { role[s] = key; since[s] = M.frames; held[s] = null; }
    if (!k || k === 'burst') continue;
    seen[k] = (seen[k] || 0) + 1;
    if (M.frames - since[s] < STEP + 1) continue;                  // a sprite changing role takes a step to settle
    const want = { marker: 0, fuse: 1, A: 1, B: 1, C: 1, spritz: 0 }[k];
    if (mcb !== want) fail('frame', M.frames, 'sprite', s, k, 'multicolour', mcb);
    if (k === 'marker') { if (p !== 0x21 || (c !== 1 && c !== 2)) fail('frame', M.frames, 'the marker as', h2(p), 'colour', c); continue; }
    if (k === 'B') { if (!R.subarray(0x15A3, 0x15A7).includes(p) || ![0, 5, 7].includes(c)) fail('frame', M.frames, 'pair B', h2(p), c); continue; }
    const look = [p, c, mcb ? V[0x25] & 15 : '-', mcb ? V[0x26] & 15 : '-'].join(' ');
    if (!card(k, s).has(look)) fail('frame', M.frames, 'sprite', s, k, 'looks', look, 'which the card never shows in colours', h2(col));
    // holds: from one change of shape to the next, the first after a change of role left out
    if (!held[s]) held[s] = { p, f: M.frames, first: true };
    else if (held[s].p !== p) { if (!held[s].first) (holds[k] = holds[k] || []).push(M.frames - held[s].f); held[s] = { p, f: M.frames }; }
  }
}
console.log('frames checked by role', JSON.stringify(seen));
for (const k of ['marker', 'fuse', 'A', 'spritz']) if (!seen[k]) fail('the demo never showed', k);
for (const [k, hs] of Object.entries(holds)) {
  const off = hs.filter((n) => Math.abs(n - STEP) > 1).length, even = hs.filter((n) => n === STEP).length;
  if (off || even < hs.length * 0.9) fail(k, 'holds', JSON.stringify(hs.reduce((o, n) => ((o[n] = (o[n] || 0) + 1), o), {})), 'against', STEP);
}

// 3. Every burst in the demo against the tab's run from the same place.
const ratios = [];
for (const b of burst) {
  const page = qxBurst(R, C64Cpu, b.x, b.y, b.kind === 'start');
  if (page.length !== b.moves.length) { fail(b.kind, 'at', b.x, b.y, b.moves.length, 'moves in the demo,', page.length, 'on the tab'); continue; }
  page.forEach((mv, i) => { if (mv.on !== b.moves[i].on || JSON.stringify(mv.s) !== JSON.stringify(b.moves[i].s)) fail(b.kind, 'move', i, JSON.stringify(b.moves[i]), JSON.stringify(mv)); });
  const per = (mv) => (mv[mv.length - 1].cyc - mv[0].cyc) / (mv.length - 1);
  ratios.push(per(b.moves) / per(page));
  console.log(b.kind, 'from', b.x, b.y + ':', b.moves.length, 'moves,', Math.round(per(b.moves)), 'cycles a move on the machine,', Math.round(per(page)), 'on the tab');
}
if (!burst.some((b) => b.kind === 'death') || !burst.some((b) => b.kind === 'start')) fail('the demo did not show both bursts', burst.map((b) => b.kind));
// "about a tenth longer": the share the video chip and the interrupt take, measured on PAL and
// scaled to the shorter NTSC frame (17,045 cycles to PAL's 19,656)
for (const q of ratios) { const ntsc = 1 + (q - 1) * 19656 / 17045; if (q < 1.05 || ntsc > 1.15) fail('the burst takes', q.toFixed(3), 'times the tab\'s cycles on PAL,', ntsc.toFixed(3), 'on NTSC'); }

// 4. The captions' figures, from the marker's starting place ($8949): out 9,600 and back 10,800
// cycles a move, about 1 and 1.1 seconds at 1,022,727 a second; a frame step every ninth move.
const X0 = (R[0x1576] - R[0x1575]) >> 1, Y0 = R[0x1578];
if (!burst.some((b) => b.kind === 'start' && b.x === X0 && b.y === Y0)) fail('no life in the demo starts at', X0, Y0);
const HZ = 1022727;
for (const [start, cyc, secs] of [[false, 9600, 1], [true, 10800, 1.1]]) {
  const mv = qxBurst(R, C64Cpu, X0, Y0, start), per = (mv[mv.length - 1].cyc - mv[0].cyc) / (mv.length - 1), t = (mv[mv.length - 1].cyc - mv[0].cyc) / HZ;
  if (Math.abs(per - cyc) > 50 || Math.abs(t - secs) > 0.03) fail(start ? 'back' : 'out', Math.round(per), 'cycles a move,', t.toFixed(2), 's');
  for (let i = 0; i < 4; i++) {
    const ps = mv.map((m) => m.s[i][0]), at = [];
    for (let j = 1; j < ps.length; j++) if (ps[j] !== ps[j - 1]) at.push(j);
    const gaps = at.slice(1).map((a, j) => a - at[j]);
    if (gaps.some((g) => g !== 9)) fail('sprite', i, start ? 'back' : 'out', 'steps its frame at moves', at.join(' '));
    const all = [...new Set(ps)].sort((a, b) => a - b), base = i === 0 || i === 3 ? 0x30 : 0x38;
    if (all[0] !== base || all[all.length - 1] !== base + 7 || all.length !== 8) fail('sprite', i, 'frames', all.map(h2).join(' '));
  }
}
if (bad) { console.log(bad, 'failures'); process.exit(1); }
console.log('ok');
