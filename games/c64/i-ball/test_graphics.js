#!/usr/bin/env node
'use strict';
// The Graphics tab. It reads its sprites from the game's tables and code (the ib-figures block), runs
// the game's death, materialising and panel routines (ib-life, ib-panels), and models an alien's
// life itself (ibAlienAt). This plays the game from listing.json on the kit's model of the C64, with
// the stick pushed at random and fire held now and then, and checks the tab against it:
// - every byte the tab reads from the game's code is the operand of an immediate instruction;
// - Iball's pointer at the end of each pass is the roll table's entry for his facing, and the roll
//   steps on every pass of play but those that draw a new row of the map;
// - every alien steps through the 49 forming colours in one colour, one a pass (held on a row pass),
//   then goes multicolour in one of the 16 alien colours; it turns through its kind's list one entry
//   a pass; shot, it shows the 15 explosion pictures in turn and is gone;
// - IB_DEATH is the sprites as the run's first death begins, and the page's run of the game's
//   routines from it gives, frame by frame, the sprites the run gives, until the pieces have gone
//   and again from when they reappear round the start (the wait between depends on the walls);
//   in the run, each frame of a death or a materialising has exactly one step;
// - every pointer a play sprite shows is on the tab, and every play shape on the tab is shown;
// - the panels' icons take only black and the colours the tab lights them in, the lives sprite
//   follows show_lives, and the page's timer and meter keep the game's pace;
// - on the title screen, sprites 2-5 show the friends in the tab's colours, Glow Ball's one more
//   each frame.
// The game's speech is skipped (say, $C1F3, returns at once): the kit's model has no CIA 2 timer.
//   node games/c64/i-ball/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, loadListing } = require(path.join(ROOT, 'kit/c64/machine.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { ibFigures, ibAlienAt, IB_LIFE } = g.run('graphics.html', 'ib-figures', 'ibFigures', 'ibAlienAt', 'IB_LIFE');
const { ibLife, IB_DEATH, ibSayFrames } = g.run('graphics.html', 'ib-life', 'ibLife', 'IB_DEATH', 'ibSayFrames');
const { ibPanels } = g.run('graphics.html', 'ib-panels', 'ibPanels');
const LISTING = path.join(__dirname, 'listing.json');
const ram0 = loadListing(LISTING), F = ibFigures(ram0);
let bad = 0;
const fail = (...w) => { if (bad++ < 30) console.log('FAIL', ...w); };
const h2 = (n) => n === undefined ? 'nothing' : '$' + n.toString(16).toUpperCase().padStart(2, '0');

// 1. The operands the tab reads: LDA # ($A9), LDX # ($A2) or ADC # ($69) just before each.
const OPERANDS = [0x4F66, 0x43F6, 0x43FA, 0x4EF1, 0x46D0, 0x46DD, 0x471C, 0x4721, 0x63C7, 0x63DA, 0x63E5,
  0x6400, 0x640B, 0x644A, 0x6465, 0x6489, 0x64C4, 0x64CA, 0x4490, 0x5F17, 0x5F1D, 0x6F04, 0x6F09, 0x6F45,
  0x6F4A, 0x6EDD, 0x6F4F, 0x6EE5, 0x6F54, 0x6EEA, 0x6F59, 0x6EEF, 0x6F5E, 0x5A04, 0x5A06, 0x5A2B, 0x5A2D,
  0x5A52, 0x5A54, 0x5A79, 0x5A7B, 0x5057];
const src = require('fs').readFileSync(path.join(__dirname, 'graphics.html'), 'utf8');
for (const a of OPERANDS) {
  if (![0xA9, 0xA2, 0x69].includes(ram0[a - 1])) fail('$' + a.toString(16), 'is not an immediate operand');
  if (!src.includes('0x' + a.toString(16).toUpperCase())) fail('$' + a.toString(16), 'is not read by the page');
}

// 2. Play.
const ram = loadListing(LISTING);
const M = new Machine({ ram, pc: 0x6D1D, port: { dir: 0x2F, data: 0x36 }, dma: true, passAt: 0x4592 }), r = M.ram;
M.hooks[0xC1F3] = (c) => { c.rts(); };                            // say: no speech
const sprites = () => ({ pos: Array.from(r.subarray(0x12, 0x23)), ptr: Array.from(r.subarray(2, 10)), colour: Array.from(r.subarray(10, 18)), enable: r[0x25], multi: r[0x3A], bg: r[0x3E] });
const passes = [], deaths = [], steps = [], seen = new Set(), panelSeen = new Map(), livesBad = [];
let anim = 0, face = 0, roll = 0, bomb = 0;
M.hooks[0x55BF] = () => { bomb = r[0x41D0]; };                 // spawn_step: the Molecule Bomb stops forming_step
M.hooks[0x4ABD] = () => { anim = 1; face = r[0x8A]; roll = r[0x8B]; };     // animate_iball, as it starts
M.hooks[0x4662] = () => {                                         // the end of a logic pass
  passes.push({ f: M.frames, anim, row: r[0x81], dying: r[0x3C], mat: r[0xED], other: r[0x95] | r[0xF7] | r[0x41C5] | r[0x41D5],
    face, roll, ...sprites(), forming: r[0x41B0], exploding: r[0x41B9], disc: r[0x41BC], kind: Array.from(r.subarray(0x40A2, 0x40AA)),
    counts: Array.from(r.subarray(0x5452, 0x5459)), ff: Array.from(r.subarray(0x41B1, 0x41B9)), bomb });
  anim = 0; bomb = 0;
  if (!r[0x3C] && !r[0xED]) for (let s = 0; s < 8; s++) if (r[0x25] >> s & 1) seen.add(r[2 + s]);
  for (let i = 0; i < 5; i++) {
    const k = 'top' + i, v = r[0x4871 + i]; (panelSeen.get(k) || panelSeen.set(k, new Set()).get(k)).add(v);
    if (i !== 1) { const kb = 'bottom' + i, vb = r[0x4891 + i]; (panelSeen.get(kb) || panelSeen.set(kb, new Set()).get(kb)).add(vb); }
  }
};
let livesIn = 0;                                                 // show_lives: the lives as it starts, the pointer as it ends
M.hooks[0x5F0D] = () => { livesIn = r[0x3B]; };
M.hooks[0x5F1B] = () => { if (r[0x48A0] !== F.panels.lives + livesIn) livesBad.push([livesIn, r[0x48A0]]); };
M.hooks[0x5F21] = () => { if (livesIn >= 0x80 && r[0x48A0] !== F.panels.none) livesBad.push([livesIn, r[0x48A0]]); };
M.hooks[0x507B] = () => { deaths.push({ f: M.frames, ...sprites(), mc: [r[0x23], r[0x24]], delay: r[0x3F] }); };
M.hooks[0x44AD] = () => { steps.push({ f: M.frames, k: 'm', dying: r[0x3C], mat: r[0xED], ...sprites() }); };   // after materialise_step
M.hooks[0x44C1] = () => { steps.push({ f: M.frames, k: 'd', dying: r[0x3C], mat: r[0xED], ...sprites() }); };   // after death_step
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF) / 0x7FFFFFFF;
let joy = 0x1F;
for (let f = 0; f < 20000; f++) {
  if (f > 300 && f < 340) joy = 0x0F;
  else if (f % 20 === 0) joy = 0x1F & ~(1 << Math.floor(rnd() * 4)) & (rnd() < 0.5 ? 0x0F : 0x1F);
  M.joy = joy; M.runFrames(1);
}

// Iball's roll
let rolls = 0, rowSkips = 0;
for (const p of passes) {
  if (p.dying || p.mat || p.other) continue;
  if (p.anim) {
    rolls++;
    const want = (p.face ? F.roll.left : F.roll.right)[p.roll & 7];
    if (p.ptr[0] !== want) fail('pass at frame', p.f, 'Iball shows', h2(p.ptr[0]), 'the roll table gives', h2(want));
    if (p.row) fail('pass at frame', p.f, 'drew a row and rolled');
  } else if (p.row) rowSkips++;
  else fail('pass at frame', p.f, 'neither rolled nor drew a row');
}

// The aliens, one life a sprite at a time
const kindsSeen = new Set(), formedExplosions = new Set();
let lives = 0, formedLives = 0, explosions = 0, fullExplosions = 0;
for (let s = 1; s < 8; s++) {
  const bit = 1 << s; let life = null;
  const close = (whole) => {
    if (!life || !whole || !life[0].forming) { life = null; return; }
    lives++;
    const k = life[0].kind; kindsSeen.add(k);
    const turns = F.kinds[k];
    let fi = 0, ti = -1, xi = 0, formed = false, colour = -1;
    for (const p of life) {
      if (p.exploding) {
        if (!p.row || xi === 0) { if (p.ptr !== F.explode[xi]) fail('sprite', s, 'at frame', p.f, 'explodes with', h2(p.ptr), 'the tab with', F.explode[xi] === undefined ? 'none' : h2(F.explode[xi])); xi++; }
        else if (p.ptr !== F.explode[xi - 1]) fail('sprite', s, 'at frame', p.f, 'moved on in its explosion on a row pass');
        if (p.multi) fail('sprite', s, 'at frame', p.f, 'explodes in multicolour');
        continue;
      }
      // its kind's picture: the entry at the kind's count, which moves on one a pass but on a row pass
      if (p.ptr !== turns[p.count]) fail('sprite', s, 'kind', k, 'at frame', p.f, 'shows', h2(p.ptr), 'the list gives', h2(turns[p.count]));
      if (ti >= 0 && p.count !== (p.row ? ti : (ti + 1) % turns.length)) fail('kind', k, 'count went from', ti, 'to', p.count, 'at frame', p.f);
      ti = p.count;
      if (p.forming) {
        if (p.multi) fail('sprite', s, 'at frame', p.f, 'is multicolour while forming');
        const hold = (p.row || p.bomb) && fi > 0, want = hold ? F.forming[fi - 1] : F.forming[fi];
        if (p.colour !== want) fail('sprite', s, 'at frame', p.f, 'forms in', h2(p.colour), 'the tab gives', h2(want));
        if (!hold) fi++;
      } else {
        if (!formed) {
          formed = true; colour = p.colour; formedLives++;
          if (fi !== F.forming.length) fail('sprite', s, 'at frame', p.f, 'formed after', fi, 'colours, the tab', F.forming.length);
          if (!F.colours.includes(p.colour)) fail('sprite', s, 'formed in', h2(p.colour), 'not one of the 16');
        }
        if (!p.multi) fail('sprite', s, 'at frame', p.f, 'is in one colour after forming');
        if (p.colour !== colour) fail('sprite', s, 'at frame', p.f, 'changed colour');
      }
    }
    if (xi) {
      explosions++;
      if (xi > F.explode.length) fail('sprite', s, 'exploded through', xi, 'pictures, the tab', F.explode.length);
      if (xi === F.explode.length) fullExplosions++;           // fewer when it moves off the screen first
      if (formed) formedExplosions.add(k);
    }
    life = null;
  };
  let clear = false;                            // the bit was seen clear since the last break
  for (const p of passes) {
    if (p.dying || p.mat || p.other) { close(false); clear = false; continue; }
    if (p.enable & bit) {
      const q = life && life[life.length - 1];
      const now = { forming: p.forming >> s & 1, exploding: p.exploding >> s & 1 };
      if (q && ((q.exploding && !now.exploding) || (!q.forming && now.forming) || (q.forming && now.forming && p.ff[s] < q.ff) || q.kind !== p.kind[s])) close(true);   // gone and back in one pass
      if (!life && clear) life = [];
      if (life) life.push({ f: p.f, ptr: p.ptr[s], colour: p.colour[s], multi: p.multi >> s & 1, forming: p.forming >> s & 1,
        exploding: p.exploding >> s & 1, row: p.row, bomb: p.bomb, kind: p.kind[s], count: p.counts[p.kind[s]], ff: p.ff[s] });
    } else { close(true); clear = true; }
  }
}
for (const p of passes) if (!p.dying && !p.mat) for (let s = 1; s < 8; s++) if (p.enable >> s & 1 && !(p.exploding >> s & 1)) kindsSeen.add(p.kind[s]);
for (let k = 0; k < 7; k++) if (!kindsSeen.has(k)) fail('no alien of kind', k, 'in the run');
if (!formedExplosions.size) fail('no formed alien exploded in the run');
// the tab's own model of a life gives the same sequences
for (let k = 0; k < 7; k++) {
  for (let t = 0; t < IB_LIFE.forming; t++) { const a = ibAlienAt(F, k, t, 5); if (a.colour !== F.forming[t] || a.multi) fail('ibAlienAt forming', k, t); }
  const ex = Array.from({ length: IB_LIFE.explode }, (_, i) => ibAlienAt(F, k, IB_LIFE.forming + IB_LIFE.formed + i, 5).ptr);
  if (ex.join() !== F.explode.join()) fail('ibAlienAt explodes', k, ex.map(h2).join(' '));
}

// The death and materialising
const d0 = deaths[0];
for (const key of ['pos', 'ptr', 'colour']) if (d0[key].join() !== IB_DEATH[key].join()) fail('IB_DEATH.' + key, IB_DEATH[key].map(h2).join(' '), 'the run', d0[key].map(h2).join(' '));
if (d0.delay !== IB_DEATH.delay) fail('IB_DEATH.delay', IB_DEATH.delay, 'the run', d0.delay);
if (d0.enable !== IB_DEATH.enable || d0.multi !== IB_DEATH.multi) fail('IB_DEATH enable/multi', h2(IB_DEATH.enable), h2(IB_DEATH.multi), 'the run', h2(d0.enable), h2(d0.multi));
if (d0.mc.join() !== F.mc.join() || d0.bg !== 0) fail('the sprites\' shared colours at the death', d0.mc.map(h2).join(' '), 'background', d0.bg);
const fromFirst = steps.filter((s) => s.f >= d0.f);
const endAt = fromFirst.findIndex((s) => s.k === 'm' && !s.mat);
const ran = fromFirst.slice(0, endAt + 1);
for (let i = 1; i < ran.length; i++) if (ran[i].f !== ran[i - 1].f + 1) fail('the steps of the first death are not one a frame: frames', ran[i - 1].f, ran[i].f);
let frameSteps = 0; const perFrame = new Map(); for (const s of steps) perFrame.set(s.f, (perFrame.get(s.f) || 0) + 1);
for (const [f, n] of perFrame) if (n !== 1) fail('frame', f, 'ran', n, 'steps'); else frameSteps++;
const L = ibLife(ram0, kit);
if (L.say !== ibSayFrames(ram0) || L.say !== 40) fail('the speech lasts', L.say, 'frames on the page, the caption says 40');
const page = [];
while (L.S.phase === 'said') L.frame();
while (L.S.phase === 'steps') { L.frame(); const m = L.m; page.push({ dying: m[0x3C], mat: m[0xED], pos: Array.from(m.subarray(0x12, 0x23)), ptr: Array.from(m.subarray(2, 10)), colour: Array.from(m.subarray(10, 18)), enable: m[0x25], multi: m[0x3A], bg: m[0x3E] }); }
const same = (a, b) => ['pos', 'ptr', 'colour'].every((k) => a[k].join() === b[k].join()) && a.enable === b.enable && a.multi === b.multi && a.bg === b.bg && a.dying === b.dying && a.mat === b.mat;
const split = (list) => { const w = list.findIndex((s) => s.mat === 1); const g2 = list.findIndex((s) => s.mat === 3); return [list.slice(0, w), list.slice(g2)]; };
const [pd, pg] = split(page), [rd, rg] = split(ran);
if (pd.length !== rd.length) fail('the death takes', pd.length, 'frames on the page,', rd.length, 'in the run');
for (let i = 0; i < Math.min(pd.length, rd.length); i++) if (!same(pd[i], rd[i])) { fail('the death differs from the run at its frame', i); break; }
if (pg.length !== rg.length) fail('the gathering takes', pg.length, 'frames on the page,', rg.length, 'in the run');
for (let i = 0; i < Math.min(pg.length, rg.length); i++) if (!same(pg[i], rg[i])) { fail('the gathering differs from the run at its frame', i); break; }
const flash = pd.filter((s) => s.dying === 2).length;

// Every play shape: on the tab, and shown
const tab = new Set([...F.roll.right, ...F.roll.left, ...F.kinds.flat(), ...F.explode, F.piece]);
for (const s of steps) for (let i = 0; i < 8; i++) if (s.enable >> i & 1) seen.add(s.ptr[i]);
for (const p of seen) if (!tab.has(p)) fail('the game shows', h2(p), 'in play; the tab does not');
for (const p of tab) if (!seen.has(p)) fail('the tab shows', h2(p), 'which the run never showed');

// The panels
for (const [k, vals] of panelSeen) {
  const i = +k.slice(-1), lit = k.startsWith('top') ? F.panels.top.lit[i] : F.panels.bottom.lit[i];
  for (const v of vals) if (v !== 0 && v !== lit) fail('the', k, 'icon showed colour', h2(v), 'the tab lights it', h2(lit));
}
const litSeen = [...panelSeen.values()].filter((v) => v.size > 1).length;
if (livesBad.length) fail('the lives sprite left show_lives\'s rule:', JSON.stringify(livesBad.slice(0, 3)));
const P = ibPanels(ram0, kit);
let secs = [], meterOn = 0, meterRuns = [];
for (let i = 0; i < 2000; i++) {
  const t = P.m[0x48] * 10 + P.m[0x47], on = P.meter();
  P.pass();
  if (P.m[0x48] * 10 + P.m[0x47] !== t) secs.push(i);
  if (P.m[0x487F] !== F.panels.digits + P.m[0x48] || P.m[0x4880] !== F.panels.digits + P.m[0x47]) fail('timer pointers at pass', i);
  if (on && !P.meter()) { meterRuns.push(i - meterOn); } if (!on && P.meter()) meterOn = i;
}
for (let i = 1; i < secs.length; i++) if (secs[i] - secs[i - 1] !== 50) fail('the page\'s timer took', secs[i] - secs[i - 1], 'passes for a second');
for (const n of meterRuns.slice(1)) if (Math.abs(n - 441) > 7) fail('the meter emptied in', n, 'passes');

// The title screen
const T = new Machine({ ram: loadListing(LISTING), pc: 0x6D1D, port: { dir: 0x2F, data: 0x36 }, dma: true, passAt: 0x4592 });
T.hooks[0xC1F3] = (c) => { c.rts(); };
T.runFrames(100);
let last = -1, glows = 0;
for (let f = 0; f < 50; f++) {
  T.runFrames(1);
  const v = T.vic, tr = T.ram;
  const want = [[F.title.iball[0], F.title.iballColour], [F.title.iball[1], F.title.iballColour], ...F.title.friends];
  for (let s = 0; s < 6; s++) {
    if (tr[0x07F8 + s] !== want[s][0]) fail('title sprite', s, 'shows', h2(tr[0x07F8 + s]), 'the tab', h2(want[s][0]));
    if (s !== 4 && (v[0x27 + s] & 15) !== want[s][1]) fail('title sprite', s, 'colour', h2(v[0x27 + s] & 15), 'the tab', h2(want[s][1]));
  }
  if ((v[0x1C] & 0x3F) !== 0x3F || (v[0x25] & 15) !== F.title.mc[0] || (v[0x26] & 15) !== F.title.mc[1]) fail('title sprites not multicolour in the tab\'s greys');
  const c = v[0x2B] & 15; if (last >= 0) { if (c === ((last + 1) & 15)) glows++; else fail('Glow Ball went from', last, 'to', c); } last = c;
}

console.log(`${passes.length.toLocaleString('en')} passes in ${M.frames.toLocaleString('en')} frames: Iball rolled on ${rolls} and skipped ${rowSkips} that drew a row; ` +
  `${lives} alien lives (${formedLives} formed, ${explosions} exploded, ${fullExplosions} of them through all 15 pictures); ${deaths.length} deaths, the first matched frame by frame ` +
  `(${pd.length} frames, ${flash} of flash, and ${pg.length} gathering); ${frameSteps} frames with one step each; ${seen.size} play shapes, all on the tab; ` +
  `icons lit in play: ${litSeen}; Glow Ball stepped ${glows} times in 49 frames`);
console.log(bad ? bad + ' failures' : 'ok');

process.exit(bad ? 1 : 0);
