#!/usr/bin/env node
'use strict';
// The Graphics tab. Its cm-figures block lists every figure the tab draws: the sprite shapes the
// game steps it through, how many passes of its logic it holds each, its colour, and for a leap the
// speeds. This plays the game from listing.json on the kit's machine model and checks the block
// against what the game shows:
// - the logic runs on every frame while the screen is still, and on seven frames in eight while it
//   scrolls a pixel a frame (one goes to drawing the next row of the map); now and then a pass takes
//   two frames;
// - every part of every animated figure appears in the game: its shapes in that order, held for
//   those passes (a loop's first and last shape may be cut by where we look), in its colour;
// - a leap moves a pixel a pass across, at the y-speeds cmLeapSpeed gives;
// - every still figure's shapes are shown by its behaviours, in its colour;
// - the colours the sprites share and the playfield's ground are the ones the tab draws with;
// - every shape the game shows in play is on the tab, but for $15, the block the grenadier from the
//   right is given when he appears and his walk replaces on his first pass ($2E7D).
// It plays with a few changes to the game's code so that one run sees every area: Super Joe cannot
// lose a life or fall, when he is stuck he is moved sideways, and one guard of each pair counts as
// shot already, so that shooting the other frees the prisoner. A second run lets the enemy hit him.
//   node games/c64/commando/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, loadListing } = require(path.join(ROOT, 'kit/c64/machine.js'));
const g = game(__dirname);
const { cmFigures, cmLeapSpeed } = g.run('graphics.html', 'cm-figures', 'cmFigures', 'cmLeapSpeed');
const LISTING = path.join(__dirname, 'listing.json');
let bad = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };
const h2 = (n) => typeof n === 'number' ? '$' + n.toString(16).toUpperCase().padStart(2, '0') : String(n);

// Super Joe's sprite slot is 0, his shots 1 to 3 and his grenade 4, with their type at $048E; slots
// 5 to 15 are the enemies, with their behaviour at $0492. A slot's shape is at $045D, its colour at
// $044D. A type or behaviour of 0 is a free slot.
const BLOCK = 0x045D, COLOUR = 0x044D, SHOT = 0x048E, BEH = 0x0492, YSPEED = 0x0482, XSPEED = 0x0472;
const COUNTER = 0x040A, STEP = 0x0404, ROW = 0x0403, GROUND = 0x04E2, GUARDS = 0x04EC;
function play(passes, { collisions }) {
  const ram = loadListing(LISTING);
  ram[0x0996] = 0xAD; ram[0x1363] = 0xAD;                          // lives are not taken
  if (!collisions) for (let a = 0x1056; a <= 0x106D; a++) ram[a] = 0xEA;
  ram[0x2A8F] = 0; ram[0x3909] = 0; ram[0x3C0D] = 0;
  const M = new Machine({ ram, pc: 0x0850, dma: true, passAt: 0x08CB }), r = M.ram;
  const segs = [], cur = [], leaps = [], leaping = [], rate = { still: [0, 0], scrolling: [0, 0], double: 0 }, vic = new Set();
  let pass = 0, logic = 0, count = -1, row = -1, since = 0, seed = 7, top = 0, frame = -1, scrolling = false;
  M.onPass = () => {
    pass++;
    const ran = r[COUNTER] !== count;
    if (ran) { count = r[COUNTER]; logic++; }
    if (frame >= 0) {                                              // the frame just gone
      const k = scrolling ? rate.scrolling : rate.still; k[0]++; if (ran) k[1]++;
      if (M.frames - frame === 2) rate.double++;
    }
    frame = M.frames; scrolling = r[STEP] !== 0;
    if (r[ROW] !== row) { row = r[ROW]; since = pass; }
    if (pass - since > 60) {                                       // stuck: move him sideways
      seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF;
      const x = 24 + (seed >> 8) % 296; r[0x041D] = x & 255; r[0x040D] = x > 255 ? 0xFF : 0; since = pass;
    }
    const p = pass % 400;                                          // up, now and then to the side or down
    let j = p < 40 ? 0x1A : p >= 200 && p < 240 ? 0x16 : p >= 300 && p < 320 ? 0x1D : p >= 320 && p < 340 ? 0x19 : p >= 340 && p < 360 ? 0x15 : 0x1E;
    if ((pass >> 3) & 1) j &= 0x0F;
    M.joy = j;
    if (pass % 200 < 3) M.press('SPACE'); else M.release('SPACE');
    if (r[GUARDS] === 0) r[GUARDS] = 1;                            // one guard down
    if (r[ROW] === 0) { if (++top > 400) r[0x04EF] = 0; } else top = 0; // at the top: on to the next area
    vic.add([M.vic[0x25] & 15, M.vic[0x26] & 15, r[GROUND] & 15, M.vic[0x1C]].join());
    if (!ran) return pass >= passes;
    for (let s = 0; s < 16; s++) {
      const kind = s >= 5 ? r[BEH + s - 5] : s === 0 ? 'P' : r[SHOT + s - 1] && (s === 4 ? 'G' : 'S');
      const key = kind + ':' + r[BLOCK + s], c = cur[s];
      if (!c || c.key !== key) {
        if (c) segs.push({ slot: s, beh: c.beh, block: c.block, n: logic - c.at, colour: c.colour });
        cur[s] = { key, beh: kind, block: r[BLOCK + s], at: logic, colour: r[COLOUR + s] };
      }
      if (s >= 5) {                                                // a jumper's leap, pass by pass
        const e = s - 5, b = r[BLOCK + s], L = leaping[e];
        if (r[BEH + e] === 10 && (b === 0xC6 || b === 0xD3) && !L) leaping[e] = { dir: b === 0xC6 ? -1 : 1, x: [], y: [] };
        if (leaping[e] && (r[BEH + e] !== 10 || leaping[e].x.length === 34)) { leaps.push(leaping[e]); leaping[e] = null; }
        if (leaping[e]) { leaping[e].x.push(r[XSPEED + e] << 24 >> 24); leaping[e].y.push(r[YSPEED + e] << 24 >> 24); }
      }
    }
    return pass >= passes;
  };
  for (let f = 0; f < 700; f++) { M.joy = f > 600 && f < 640 ? 0x0F : 0x1F; M.runFrames(1); }
  M.runFrames(passes * 1.2 | 0);
  return { segs, leaps, rate, vic, passes: pass };
}

const runs = [play(40000, { collisions: false }), play(12000, { collisions: true })];
const ram = loadListing(LISTING), F = cmFigures(ram);
{
  const sum = (f) => runs.reduce((n, r) => n + f(r.rate), 0), passes = sum((r) => r.still[0] + r.scrolling[0]);
  const still = [sum((r) => r.still[0]), sum((r) => r.still[1])], scrolling = [sum((r) => r.scrolling[0]), sum((r) => r.scrolling[1])];
  if (still[1] !== still[0]) fail('with the screen still, the logic ran on', still[1], 'of', still[0], 'frames');
  if (Math.abs(scrolling[1] / scrolling[0] - 7 / 8) > 0.002) fail('scrolling, the logic ran on', scrolling[1], 'of', scrolling[0], 'frames');
  if (sum((r) => r.double) > passes / 100) fail(sum((r) => r.double), 'of', passes, 'passes took two frames');
  console.log(`the logic ran on ${still[1]} of ${still[0]} frames with the map still, ${scrolling[1]} of ${scrolling[0]} with it scrolling`);
}
for (const { vic } of runs) for (const v of vic) {
  const [mc1, mc2, bg, mc] = v.split(',').map(Number);
  if (mc1 !== F.shared[0] || mc2 !== F.shared[1] || bg !== F.ground || mc !== 0xFF) fail('the sprites\' shared colours, the ground and the multicolour bits were', v);
}

// Each slot's segments, split into lives at a free slot.
const lives = [];
for (const run of runs) {
  const per = {};
  for (const sg of run.segs) (per[sg.slot] = per[sg.slot] || []).push(sg);
  for (const list of Object.values(per)) {
    let life = [];
    for (const sg of list) {
      if (sg.beh === 0) { if (life.length) lives.push(life); life = []; } else life.push(sg);
    }
    if (life.length) lives.push(life);
  }
}
const WALKS = [0, 2, 4, 6, 8, 10, 12, 14].map((h) => F.walk(h).map((s) => s[0]));
const ALLWALK = new Set(WALKS.flat());
// steps side by side with the same shape and colour merge, as the game shows them
const same = (a, b) => a[0] !== 'walk' && a[0] === b[0] && (a[2] ?? null) === (b[2] ?? null);
const mergeSteps = (steps) => steps.reduce((a, s) => (a.length && same(a[a.length - 1], s) ? a[a.length - 1] = [s[0], a[a.length - 1][1] + s[1], s[2], s[3]] : a.push([...s]), a), []);
const okLen = (n, e, loose) => e[3] === 'any' || (e[3] === 'min' ? n >= e[1] || loose : loose ? n <= e[1] : n === e[1]);
// Do the segments from i show the steps X? `loose` lets the first and last be cut.
function fits(X, segs, i, colourOf, off, loose) {
  let j = i;
  for (let m = 0; m < X.length; m++) {
    const e = X[m], edge = loose && (m === 0 || m === X.length - 1);
    if (e[0] === 'walk') {
      const shapes = e[2] === undefined ? ALLWALK : new Set(F.walk(e[2]).map((s) => s[0]));
      let n = 0; const j0 = j;
      while (j < segs.length && shapes.has(segs[j].block - off) && segs[j].colour === colourOf(e)) n += segs[j++].n;
      if (j === j0 || !okLen(n, e, edge)) return false;
      continue;
    }
    const sg = segs[j++];
    if (!sg || sg.block !== e[0] + off || sg.colour !== colourOf(e) || !okLen(sg.n, e, edge)) return false;
  }
  return true;
}
function shown(fig, part, life) {
  const colourOf = (e) => e[0] === 'walk' ? fig.colour : e[2] ?? fig.colour;
  let segs = life.filter((sg) => fig.beh.includes(sg.beh) ? true : null);
  if (segs.length !== life.length) {                               // only the stretches under its behaviours
    segs = life.map((sg) => fig.beh.includes(sg.beh) ? sg : { block: -1, n: 0, colour: -1 });
  }
  if (fig.faces) {                                                 // turning to face Super Joe
    const f = new Set(fig.faces.slice(1));
    segs = segs.map((sg) => f.has(sg.block) ? { ...sg, block: fig.faces[0] } : sg)
      .reduce((a, sg) => (a.length && a[a.length - 1].block === sg.block && a[a.length - 1].colour === sg.colour ? a[a.length - 1] = { ...a[a.length - 1], n: a[a.length - 1].n + sg.n } : a.push(sg), a), []);
  }
  let E = mergeSteps(part.steps);
  if (part.loop && E.length > 1 && same(E[0], E[E.length - 1])) E = [[E[0][0], E[0][1] + E[E.length - 1][1], E[0][2], E[0][3]], ...E.slice(1, -1)];
  const windows = part.loop ? E.map((_, k) => [...E.slice(k), ...E.slice(0, k), E[k]]) : [E];
  for (const off of fig.pair ? [0, 1] : [0]) for (const X of windows) for (let i = 0; i < segs.length; i++) if (fits(X, segs, i, colourOf, off, part.loop)) return true;
  return false;
}
const onTab = new Map();                                           // shape -> the figure that shows it
const note = (b, where) => { if (!onTab.has(b)) onTab.set(b, where); };
const describe = (steps) => steps.map((s) => (s[0] === 'walk' ? 'walk' : s[0].toString(16)) + 'x' + s[1] + (s[3] ? '(' + s[3] + ')' : '')).join(' ');
const sample = (fig) => lives.filter((l) => l.some((sg) => fig.beh.includes(sg.beh))).slice(0, 3)
  .map((l) => l.map((sg) => sg.block.toString(16) + 'x' + sg.n + '/' + sg.colour + '/' + sg.beh).slice(0, 18).join(' '));
for (const h of [0, 2, 4, 6, 8, 10, 12, 14]) {
  const fig = { beh: ['P', 5, 21, 23, 24, 25, 27], colour: null }, steps = F.walk(h);
  for (const s of steps) note(s[0], 'the walk');
  if (!lives.some((l) => shown({ ...fig, colour: F.walkers[0][0] }, { steps, loop: true }, l))) fail(F.walkers[0][1], 'walking heading', h, 'is not shown by the game:', describe(steps));
}
for (const [c, who] of F.walkers.slice(1)) {                       // the soldiers, in some heading
  const fig = { beh: [5, 21, 23, 24, 25, 27], colour: c };
  if (![0, 2, 4, 6, 8, 10, 12, 14].some((h) => lives.some((l) => shown(fig, { steps: F.walk(h), loop: true }, l)))) fail(who, 'is not seen walking in colour', c);
}
for (const [group, list] of [['joe', F.joe], ['shots', F.shots], ['soldiers', F.soldiers], ['others', F.others]]) for (const fig of list) {
  for (const s of fig.steps) if (s[0] !== 0xFF) { note(s[0], fig.title); if (fig.pair) note(s[0] + 1, fig.title); }
  if (fig.faces) for (const b of fig.faces) note(b, fig.title);
  if (fig.logo) { for (let i = 0; i < 7; i++) note(ram[0x0FFA + i], fig.title); continue; }
  if (!fig.beh) continue;
  const colourOf = (e) => e[2] ?? fig.colour;
  if (fig.still || fig.flicker) {
    for (const s of fig.steps) for (const b of fig.pair ? [s[0], s[0] + 1] : [s[0]])
      if (!lives.some((l) => l.some((sg) => fig.beh.includes(sg.beh) && sg.block === b && sg.colour === colourOf(s)))) fail(group, fig.title, 'shape', h2(b), 'in colour', colourOf(s), 'is not shown in play');
    continue;
  }
  for (const part of fig.parts) if (!lives.some((l) => shown(fig, part, l))) {
    fail(group, fig.title, 'is not shown by the game:', describe(part.steps), part.loop ? '(a loop)' : '');
    for (const e of sample(fig)) console.log('   the game:', e);
  }
}
// the leaps
const leapsSeen = runs.flatMap((r) => r.leaps).filter((l) => l.x.length === 34);
if (!leapsSeen.some((l) => l.dir < 0) || !leapsSeen.some((l) => l.dir > 0)) fail('a leap each way was not seen');
for (const l of leapsSeen) {
  const want = Array.from({ length: 34 }, (_, k) => cmLeapSpeed(k));
  if (l.y.join() !== want.join() || l.x.some((x) => x !== l.dir)) { fail('a leap\'s speeds were x', l.x.join(' '), 'y', l.y.join(' '), '; the tab has y', want.join(' ')); break; }
}
// every shape shown in play is on the tab, and every shape the tab draws is one of the 112 at $E400
const seen = new Map();
for (const l of lives) for (const sg of l) if (sg.block !== 0xFF && !seen.has(sg.block)) seen.set(sg.block, sg.beh);
for (const [b, beh] of seen) if (!onTab.has(b) && b !== 0x15) fail('shape', h2(b), 'shown in play by', beh, 'is not on the tab');
for (const [b, where] of onTab) if (b < 0x90 || b > 0xFE) fail(where, 'draws shape', h2(b), 'from outside $E400-$FFBF');
console.log(`${lives.length} lives and ${leapsSeen.length} leaps in ${runs.map((r) => r.passes).join(' + ')} passes; ${onTab.size} shapes on the tab, ${seen.size} seen in play`);
if (bad) { console.log(bad, 'failed'); process.exit(1); }
console.log('ok');
