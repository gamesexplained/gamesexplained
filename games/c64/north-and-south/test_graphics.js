#!/usr/bin/env node
'use strict';
// The Graphics tab. Its cards read their pictures and steps from the parts' tables and code (the
// nsg-battle, nsg-fighter and nsg-map blocks), and two of them run the game's own routines: the
// fighters' poses and the battle's panel. This checks them against the game:
// - every byte the tab reads as a step or a colour is the operand of an immediate instruction;
// - a battle, played by the computer on both sides on the kit's model of the C64, shows only pictures
//   the battle cards draw, never one the tab lists as never drawn, and no step of a unit's action
//   comes sooner than the card's;
// - the map, played by the computer for 20,000 frames from the first and the third year of the war, puts only the
//   pictures, colours and relative places the tab's figures give into the frame's list of sprites,
//   steps the supply train, the storm, the bomb and the ship no sooner than the tab does, and draws
//   only the panels' pictures, in the tab's windows, a step no sooner than the tab's;
// - the battle's panel run by the tab starts with the attacker's picture as draw_picture puts it and
//   ends with the other side's ten columns of scene;
// - the fighter's walk steps every four frames and the jump rises 20 lines and lands.
//   node games/c64/north-and-south/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, loadListing } = require(path.join(ROOT, 'kit/c64/machine.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { nsBattleCards } = g.run('graphics.html', 'nsg-battle', 'nsBattleCards');
const { nsFighter } = g.run('graphics.html', 'nsg-fighter', 'nsFighter');
const { nsMapFigures, nsSmoke, nsBattlePanel, NSG_PANELS } = g.run('graphics.html', 'nsg-map', 'nsMapFigures', 'nsSmoke', 'nsBattlePanel', 'NSG_PANELS');
const part = (p) => loadListing(path.join(__dirname, 'parts', p, 'listing.json'));
const RAM = {};
for (const p of ['battle', 'fort', 'train', 'map', 'title', 'menu', 'resident']) RAM[p] = part(p);
let bad = 0;
const fail = (...w) => { if (bad++ < 30) console.log('FAIL', ...w); };
const h2 = (n) => '$' + n.toString(16).toUpperCase().padStart(2, '0');

// 1. The operands: LDA, LDX, LDY, ADC, CMP or SBC immediate just before each.
const OPERANDS = {
  battle: [0x95A9, 0x9DED, 0x9E16],
  fort: [0x8360, 0x8365, 0x83B2, 0x83B7, 0x8E82, 0x90BC, 0x9722, 0x97A8, 0x97AD, 0x97D4, 0x983D],
  map: [0x0FDC, 0x0FE1, 0x15E2, 0x17BE, 0x1887, 0x1922, 0x1C20, 0x2305, 0x2313, 0x3823, ...NSG_PANELS.map((p) => p.at)],
  train: [0x83B4, 0x83B9, 0x89A5, 0x89D7, 0x8A03, 0x8ACD],
  title: [0x8146, 0x8157, 0x815C],
  menu: [0x140E, 0x1413, 0x1418, 0x1420],
};
const src = require('fs').readFileSync(path.join(__dirname, 'graphics.html'), 'utf8');
for (const p in OPERANDS) for (const a of OPERANDS[p]) {
  if (![0xA9, 0xA2, 0xA0, 0x69, 0xC9, 0xE9].includes(RAM[p][a - 1])) fail(p, '$' + a.toString(16), 'is not an immediate operand');
  if (!src.includes('0x' + a.toString(16).toUpperCase().padStart(4, '0'))) fail(p, '$' + a.toString(16), 'is not read by the page');
}

// 2. A battle: the computer plays both sides, two of each unit and two cannon, until it ends.
{
  const B = RAM.battle, ram = part('battle');
  for (let a = 0x0200; a < 0x0C00; a++) ram[a] = RAM.resident[a];
  for (let a = 0x0C00; a < 0x3000; a++) ram[a] = RAM.map[a];       // the map's sound player stays in memory
  for (let a = 0xE000; a < 0x10000; a++) ram[a] = RAM.map[a];
  ram.set([2, 2, 1, 1], 0x0380); ram.set([6, 6, 3, 3, 2, 2], 0x038A);
  const M = new Machine({ ram, pc: 0x8000, port: { dir: 0x2F, data: 0x35 }, dma: true, passAt: 0x805C });
  const r = M.ram, prev = new Array(20).fill(-1), since = new Array(20).fill(0), seen = new Set();
  const cards = [0, 1].map((s) => nsBattleCards(B, s));
  const drawn = new Set(), never = new Set(), steps = new Map();
  for (const { cards: cs, unused } of cards) {
    for (const p of unused) never.add(p);
    for (const c of cs) c.seq.forEach(([p, n], i) => {
      if (p >= 0) drawn.add(p);
      const q = c.seq[(i + 1) % c.seq.length][0];
      if (p >= 0 && q >= 0 && p !== q && [B[0x9E16], B[0x95A9], B[0x9DED]].includes(n)) steps.set(p * 256 + q, Math.max(n, steps.get(p * 256 + q) || 0));
    });
  }
  let checked = 0, over = false;
  M.hooks[0x91B1] = () => {
    for (let s = 0; s < 20; s++) {
      const p = r[0x8333 + s];
      if (p === prev[s]) continue;
      if (p !== 0xFF) seen.add(p);
      const n = steps.get(prev[s] * 256 + p);
      if (n !== undefined) { checked++; if (M.frames - since[s] < n - 1) fail('battle slot', s, h2(prev[s]), 'to', h2(p), 'after', M.frames - since[s], 'frames; the card holds', n); }
      prev[s] = p; since[s] = M.frames;
    }
  };
  M.hooks[0x80F9] = () => { over = true; throw new Error('over'); };
  try { M.runFrames(8000); } catch (e) { if (!over) throw e; }
  if (!over) fail('the battle did not end in 8000 frames');
  for (const p of seen) {
    if (never.has(p)) fail('battle picture', h2(p), 'is drawn, and the tab says never');
    else if (!drawn.has(p)) fail('battle picture', h2(p), 'is on no card');
  }
  if (checked < 50) fail('only', checked, 'battle steps checked');
  console.log('battle:', M.frames, 'frames,', seen.size, 'pictures,', checked, 'steps checked');
}

// 3. The map: a year of the war, the computer on both sides and every option on.
const FIGS = nsMapFigures(RAM.map, C64Cpu), SMOKE = nsSmoke(RAM.map, C64Cpu);
function figKeys(f) {
  const keys = new Set();
  const sides = f.side ? [0, 1] : [0];
  for (const side of sides) for (const [sp] of f.frames) {
    const e = sp.map(([p, c, x, y]) => side ? [f.name === 'A bag of gold falls' ? p + 5 : p + 4, f.name === 'A bag of gold falls' ? 12 : 11, x, y] : [p, c, x, y]);
    if (e.length) keys.add(e.map(([p, c, x, y]) => h2(p) + '/' + c + '@' + (x - e[0][2]) + ',' + (y - e[0][3])).join(' '));
  }
  return keys;
}
const byName = Object.fromEntries(FIGS.map((f) => [f.name, f]));
const SHOW = {
  0x1BDF: ['The supply train'], 0x1723: ['An army marching', 'An army falls'], 0x1578: ['The storm'],
  0x2706: ['The Indians\' signal', 'Smoke far off', 'The tomahawk'], 0x1C79: ['The Mexican\'s bomb'],
  0x18CD: ['The bomb bursts'], 0x18F2: ['The bomb bursts'], 0x2359: ['The ship'], 0x3775: ['A bag of gold falls'],
  0x385D: ['The bank'], 0x1967: ['An interception of a Union train', 'An interception of a Confederate train'], 0x21FE: ['The cannon\'s smoke'], 0x1A57: [],
};
const allowed = {};
for (const a in SHOW) {
  allowed[a] = new Set();
  for (const n of SHOW[a]) for (const k of figKeys(byName[n])) allowed[a].add(k);
}
// the smoke's built image is $96, and the supply panel's two sprites are $EF-$F2 and $F3-$F7
allowed[0x21FE] = new Set(['$96/1@0,0', '$95/1@0,0', '$94/1@0,0']);
for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) allowed[0x1A57].add(h2(0xEF + i) + '/7@0,0 ' + h2(0xF3 + j) + '/1@23,24');
const panelWin = new Map();
for (const p of NSG_PANELS) for (const [n, w] of p.steps.flat()) (panelWin.get(n) || panelWin.set(n, new Set()).get(n)).add(w);
function mapYear(year) {
  const ram = part('map');
  for (let a = 0x0200; a < 0x0C00; a++) ram[a] = RAM.resident[a];
  ram.set([1, 1, 1, 1, 1, 1, 1, 0], 0x0380); ram[0x0389] = year;
  const M = new Machine({ ram, pc: 0x0C00, port: { dir: 0x2F, data: 0x35 }, dma: true });
  const r = M.ram, starts = [], unknown = new Map(), runs = {}, pics = [];
  for (const a in SHOW) M.hooks[+a] = () => { starts.push([+a, r[0x0D8C]]); };
  M.hooks[0x1447] = (c) => { pics.push([M.frames, c.x, c.a]); };
  M.hooks[0x1762] = () => {
    if (r[0x0EC0]) { starts.length = 0; return; }
    const n = r[0x0D8C];
    starts.forEach(([a, i0], k) => {
      const i1 = k + 1 < starts.length ? starts[k + 1][1] : n;
      const e = [];
      for (let i = i0; i < i1; i++) e.push([r[0x13BC + i], r[0x13DC + i] & 15, r[0x137C + i] | r[0x139C + i] << 8, r[0x135C + i]]);
      const key = e.map(([p, c, x, y]) => h2(p) + '/' + c + '@' + (x - e[0][2]) + ',' + (y - e[0][3])).join(' ');
      if (key && !allowed[a].has(key)) unknown.set(h2(a >> 8) + h2(a & 255).slice(1) + ' ' + key, (unknown.get(key) || 0) + 1);
      // the train's picture is $90 while it stands (train_show, $1BE7): only its moving steps count
      const step = a === 0x1BDF && !r[0x0DA0] ? '' : key;
      const R = runs[a] = runs[a] || { last: null, prev: false, at: 0, seen: -9, holds: [] };
      // a hold counts when the figure was already showing before it and still shows after it, with
      // the list built every frame between (it is not while the screen is busy elsewhere)
      if (M.frames - R.seen > 2) { R.prev = false; R.last = step; R.at = M.frames; }
      R.seen = M.frames;
      if (step !== R.last) { if (R.last && step && R.prev && !(a == 0x1BDF && M.frames - turned <= 3)) R.holds.push([R.last, M.frames - R.at, M.frames]); R.prev = R.last && step; R.last = step; R.at = M.frames; }
    });
    starts.length = 0;
  };
  // a train turning onto a new line steps at once (train_wait set to 1, $1D5E): the hold that step
  // cuts short reaches the list within three frames
  let turned = -9;
  M.hooks[0x1D59] = () => { turned = M.frames; };
  let over = false;
  M.hooks[0x0CE3] = () => { over = true; throw new Error('over'); };
  try { M.runFrames(20000); } catch (e) { if (!over) throw e; }
  for (const [k, n] of unknown) fail('map year', year, 'shows', k, n, 'times: on no figure of the tab');
  // the steps: no picture of these figures held shorter than the tab holds it
  const M0 = RAM.map, MIN = { 0x1BDF: M0[0x1C20], 0x1578: M0[0x15E2], 0x1C79: M0[0x17BE] };
  let checked = 0;
  for (const a in MIN) for (const [k, n, f] of (runs[a] || { holds: [] }).holds) { checked++; if (n < MIN[a] - 1) fail('map year', year, 'frame', f, k, 'held', n, 'frames; the tab', MIN[a]); }
  // the panels: each picture in a window the tab draws it in (16 is the window's own picture put
  // back, 11 and 12 the battle's), a step of an animation no sooner than the tab's
  let last = null, run = 0;
  for (const [f, n, w] of pics) {
    const ok = n === 16 || ((n === 11 || n === 12) && w === 5) || (panelWin.get(n) || new Set()).has(w);
    if (!ok) fail('map year', year, 'draws panel picture', n, 'in window', w);
    const P = NSG_PANELS.find((p) => p.steps.flat().some(([m, v]) => m === n && v === w));
    const same = last && P && P.steps.flat().some(([m, v]) => m === last[1] && v === last[2]);
    run = same ? run + 1 : 0;
    // an animation's first step can come at once (its wait may be over already): from the second on
    if (same && run >= 2) {
      checked++;
      if (f - last[0] < M0[P.at]) fail('map year', year, 'panel', P.name, 'picture', n, 'after', f - last[0], 'frames; the tab', M0[P.at]);
    }
    last = [f, n, w];
  }
  console.log('map year', year, ':', M.frames, 'frames,', over ? 'ended' : 'ran', checked, 'steps checked,', pics.length, 'panel pictures');
  return pics;
}
const pics = [...mapYear(0), ...mapYear(2)];
for (const n of [13, 14, 15, 0, 5, 6, 9, 10, 11, 12]) if (!pics.some(([, m]) => m === n)) fail('the runs never draw panel picture', n);

// 4. The battle's panel as the tab runs it.
for (const side of [0, 1]) {
  const M0 = RAM.map, t = nsBattlePanel(M0, C64Cpu, side), s = t.shots;
  const ns = s.map((x) => x.n).join(',');
  if (ns !== '50,' + Array(39).fill(1).join(',') + ',50') fail('battle panel', side, 'waits', ns);
  const n = 11 + side, w = M0[0xC38A + n], hgt = M0[0xC3A0 + n];
  const bm = M0[0xC30F + 2 * n] | M0[0xC310 + 2 * n] << 8;
  if (t.w !== w || t.h !== hgt) fail('battle panel', side, 'is', t.w, 'by', t.h);
  for (let i = 0; i < w * hgt * 8; i++) if (s[0].bm[i] !== M0[bm + i]) { fail('battle panel', side, 'first picture differs at byte', i); break; }
  const sc = M0[0xBF10 + 2 * side] | M0[0xBF11 + 2 * side] << 8;
  for (let c = 0; c < 10; c++) for (let row = 0; row < 9; row++) for (let y = 0; y < 8; y++)
    if (s[40].bm[(row * w + c) * 8 + y] !== M0[sc + c * 8 + row * 0x50 + y]) { fail('battle panel', side, 'last picture differs at column', c, 'row', row); c = 99; row = 99; break; }
}

// 5. The fighter: the walk steps every four frames, the jump rises 20 lines and lands standing.
{
  const pose = nsFighter(RAM.fort, C64Cpu);
  const st = { state: 1, frame: 0, timer: 0, y: 120, arc: 0, moving: 1, facing: 1, climb: 0 };
  const seq = [];
  for (let f = 0; f < 48; f++) seq.push(pose(st, 0)[0][0]);
  const changes = [];
  for (let f = 1; f < 48; f++) if (seq[f] !== seq[f - 1]) changes.push(f);
  for (let i = 1; i < changes.length; i++) if (changes[i] - changes[i - 1] !== 4) fail('the walk steps after', changes[i] - changes[i - 1], 'frames');
  if (changes.length < 10) fail('the walk changes only', changes.length, 'times in 48 frames');
  const j = { state: 2, frame: 0, timer: 0, y: 120, arc: 0, moving: 0, facing: 1, climb: 0 };
  let top = 120, f = 0;
  for (; f < 200 && !(f > 2 && j.state === 0); f++) { pose(j, 0); top = Math.min(top, j.y); }
  if (top !== 100) fail('the jump rises to', top, 'not 100');
  if (j.state !== 0 || j.y !== 120) fail('the jump ends in state', j.state, 'at', j.y);
}

if (bad) { console.log(bad, 'failure(s)'); process.exit(1); }
console.log('ok');
