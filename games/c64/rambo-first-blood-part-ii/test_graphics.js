#!/usr/bin/env node
'use strict';
// The Graphics tab. Its cards read their pictures, colours and steps from the game's tables and
// immediates (the rb-sprites block), and run two of the game's routines, enemy_rise and shot_arc, on
// the kit's 6502. This checks them against the game:
// - every byte the block reads as a step, a colour or a picture is the operand of an immediate
//   instruction, and every store to a sprite's picture is one the test knows, putting a picture the
//   tab draws; the shapes the tab lists as never shown are exactly the rest;
// - the jungle, played at random for 20,000 frames on the kit's model of the C64 with every weapon
//   owned, draws Rambo, the soldiers, the shots and the explosions only in the pictures and colours
//   the tab gives them, and holds each picture the tab's number of frames;
// - a flight with the gunship pursuing, started as taking item 3 starts it, places the helicopter,
//   the gunship and the rotors in the tab's pictures, colours and places each time their routines
//   return, the rotors once a frame and step for step as the tab's rbRotor does, and draws nothing
//   else for them;
// - the panel's words and bar at the start of a game are the bytes the tab draws.
//   node games/c64/rambo-first-blood-part-ii/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, KEY, loadListing } = require(path.join(ROOT, 'kit/c64/machine.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const B = game(__dirname).run('graphics.html', 'rb-sprites', 'RB_STEP', 'RB_COLOURS', 'rbRambo', 'rbSoldiers', 'rbShots', 'RB_WAYS', 'rbRise', 'rbArc', 'rbHeli', 'rbGunship', 'rbRotor');
const R = loadListing(path.join(__dirname, 'listing.json'));
const STEP = B.RB_STEP(R), COL = B.RB_COLOURS(R), RAMBO = B.rbRambo(R), SOL = B.rbSoldiers(R), SHOTS = B.rbShots(R);
const HELI = B.rbHeli(R), GUN = B.rbGunship(R);
let bad = 0;
const fail = (...w) => { if (bad++ < 40) console.log('FAIL', ...w); };
const h2 = (n) => '$' + n.toString(16).toUpperCase().padStart(2, '0');
const code = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'listing.json'), 'utf8')).records.filter((r) => r.t === 'code');

// 1. The operands: LDA, CMP, ADC or SBC immediate just before each.
const IMM = [0x12A2, 0x1080, 0x108C, 0x0F83, 0x192A, 0x089D, 0x1B06, 0x175E, 0x1766, 0x1779, 0x15B8, 0x0DCE, 0x0E7F,
  0x082D, 0x25C4, 0x18FE, 0x0B6F, 0x3617, 0x12B2, 0x1A4E, 0x1834, 0x1A78, 0x0DC4, 0x1A6B, 0x1A73, 0x378F, 0x0FAB,
  0x0DF3, 0x0DFD, 0x15A1, 0x0F8A, 0x25C0, 0x0829, 0x088C, 0x0862, 0x18ED, 0x1931, 0x0B78, 0x0B83, 0x2194, 0x2199,
  0xC5DA, 0xC52C];
for (const a of IMM) if (![0xA9, 0xC9, 0x69, 0xE9].includes(R[a - 1])) fail('no immediate before', h2(a), h2(R[a - 1]));

// 2. Every store to an object's picture ($8B-$98), Rambo's ($D1, $D2), a sprite pointer or the panel's
// pointers, and what each puts. The pictures the tab draws:
const drawn = new Set();
const add = (...ps) => ps.forEach((p) => drawn.add(p));
for (const w of RAMBO) w.frames.forEach((p) => add(p, p + w.body));
for (const s of SOL) add(...s.frames);
for (const f of [R[0x0DF3], R[0x0DFD]]) for (const r of B.rbRise(R, C64Cpu, f)) add(r.p);
add(R[0x0FAB], R[0x25C0]);
for (let p = R[0x15A1]; p <= R[0x0F8A]; p++) add(p);
for (let p = R[0x0829]; p <= R[0x0862]; p++) add(p);
for (let k = 0; k < 4; k++) add(R[0x0BCB + k]);
add(R[0x0BCB + 3] + R[0x0B78]);
for (const w of SHOTS) { if (w.dirs) add(...w.dirs); if (w.spin) for (let p = w.spin[0]; p <= w.spin[1]; p++) add(p); }
for (const d of [1, 2, 4, 5, 6, 8, 9, 10]) for (const a of B.rbArc(R, C64Cpu, d)) add(a.p);
for (let p = R[0x18ED]; p <= R[0x1931]; p++) add(p);
for (const f of HELI.frames) add(f.body, f.part);
for (const r of HELI.rotor) add(r.p);
for (const g of GUN) for (const q of g) add(q.p);
add(0x10, 0x11, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, R[0xC5DA]);
for (let p = 0x2E; p <= 0x31; p++) if (![...R.subarray(0x3266, 0x3272)].includes(p)) fail('heli_shot_frame lacks', h2(p));
add(...R.subarray(0x3266, 0x3272));
const BLANK = 0x22;                                                           // the icon of a weapon not owned
if (R.subarray(0x4000 + 64 * BLANK, 0x4000 + 64 * BLANK + 63).some((x) => x)) fail('$22 is not empty');
const tab = (a, n) => [...R.subarray(a, a + n)];
const STORES = {
  0x082A: [R[0x0829]], 0x086A: 'pow', 0x0894: 'pow', 0x0B61: tab(0x0BCB, 4), 0x0B79: [R[0x0BCB + 3] + 1],
  0x0D50: 'rise', 0x0DFE: [R[0x0DF3], R[0x0DFD]], 0x0F8D: 'dying', 0x0FAC: [R[0x0FAB]],
  0x10A5: 'walk', 0x10AE: 'walk', 0x12AE: 'rambo', 0x12B3: 'rambo', 0x15A2: [R[0x15A1]],
  0x1837: 'knife', 0x1852: 'arc', 0x18EE: [R[0x18ED]], 0x1916: [R[0x1915]], 0x1934: 'boom', 0x1A7F: 'shot',
  0x193F: [R[0x193E]], 0x1944: [R[0x1943]], 0x1950: [BLANK], 0x195C: [BLANK], 0x196B: tab(0x1975, 8), 0x1971: tab(0x1975, 8),
  0x1D63: 'copy', 0x219F: [R[0x219E]], 0x21A4: [R[0x21A3]], 0x21C2: tab(0x225E, 6), 0x22BB: 'copy', 0x22EC: 'copy',
  0x25C1: [R[0x25C0]], 0x316C: [R[0x316B]], 0x3198: 'boom', 0x32A7: tab(0x3266, 12),
  0x360B: 'gunship', 0x360E: 'gunship', 0x3611: 'gunship', 0x3614: 'gunship', 0x378B: tab(0x37AB, 12), 0x3790: 'heli',
  0x387B: tab(0x3892, 4), 0x387D: tab(0x3892, 4), 0xC554: 'off', 0xC5DB: [R[0xC5DA]],
};
const found = new Set();
for (const r of code) {
  if (!/^(sta|stx|sty|inc|dec)$/.test(r.m) || r.oa === undefined) continue;
  const a = r.oa;
  if (!((a >= 0x8B && a <= 0x98) || a === 0xD1 || a === 0xD2 || (a >= 0x43F8 && a <= 0x43FF) || (a >= 0x225E && a <= 0x2263))) continue;
  found.add(r.a);
  if (!(r.a in STORES)) fail('a store to a picture the test does not know:', h2(r.a), r.m, r.o);
}
for (const [a, v] of Object.entries(STORES)) {
  if (!found.has(+a)) fail('no store to a picture at', h2(+a));
  if (Array.isArray(v)) for (const p of v) if (p !== BLANK && !drawn.has(p)) fail('the store at', h2(+a), 'puts', h2(p), 'which the tab does not draw');
}
if (R[0xC553] !== 0x01) fail('name_page_draw no longer points the switched-off sprite 1 at 1');
const NEVER = [0x21, 0x25, 0xD8, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDE];
for (let p = 0x10; p <= 0xDF; p++) {
  const never = !drawn.has(p) && p !== BLANK && p !== 0x12 + 0;
  if (p === 0x12) { if (!drawn.has(p)) fail('$12 not drawn'); continue; }
  if (never !== NEVER.includes(p)) fail('shape', h2(p), never ? 'is drawn by nothing on the tab' : 'is listed as never shown but drawn');
}

// 3. The jungle, played at random with every weapon owned.
let rnd = 12345;
const rand = (n) => { rnd = (rnd * 1103515245 + 12345) & 0x7FFFFFFF; return Math.floor(rnd / 65536) % n; };
function play(frames, heli) {
  const M = new Machine({ ram: R.slice(), pc: 0xC006, port: { dir: 0x2F, data: 0x37 }, dma: true });
  const r = M.ram, V = M.vic;
  const out = { frames: [], panel: null, heliAt: -1, started: -1, rotor: [], heli: [], gunship: [] };
  let cur = null, started = -1, inLoop = false;
  M.hooks[0x0382] = () => { started = M.frames; inLoop = false; return false; };
  M.hooks[0x0393] = (c) => {
    if (!inLoop) { inLoop = true; if (!out.panel) out.panel = r.slice(0x4400, 0x4480); r[0x19ED] = 0x3F; }
    if (heli && out.heliAt < 0 && started >= 0 && M.frames > started + 300) {
      out.heliAt = M.frames; r[0x08EB] = 1; r[0xA5] = r[0x9D] = R[0x0B6F];      // as item 3, placed and taken, leaves them
      c.push(0x03); c.push(0x92); c.pc = 0x0AB2;
    }
    return false;
  };
  if (heli) {
    M.hooks[0x0ABB] = (c) => { c.pc = 0x0ABE; return false; };       // past the mission message
    // what the flight's three placing routines leave, as each returns
    M.hooks[0x3887] = (c) => { out.rotor.push({ f: M.frames, craft: r[0x3826] ^ 1, step: c.x, p: r[0xD1], top: r[0xD2], x: r[0x8A] | (r[0x6E] & 1) << 8, y: r[0x52],
      bx: r[0x3826] ^ 1 ? r[0x89] : 2 * r[0x362E], by: r[0x3826] ^ 1 ? r[0x51] : r[0x362F], pursues: r[0x3825] }); return false; };
    M.hooks[0x3792] = () => { out.heli.push({ f: M.frames, fr: r[0x3773], x: r[0x89], y: r[0x51], x2: r[0x81], y2: r[0x49], p: r[0x97], p2: r[0x8F] }); return false; };
    M.hooks[0x3620] = () => { out.gunship.push({ f: M.frames, fr: r[0x3774], sx: r[0x362E], sy: r[0x362F], xs: [...r.subarray(0x82, 0x86)], ys: [...r.subarray(0x4A, 0x4E)],
      ps: [...r.subarray(0x90, 0x94)], cs: [...r.subarray(0x9E, 0xA2)] }); return false; };
  }
  M.hooks[0x22EC] = (c) => { if (cur) cur.s.push({ o: c.x, p: c.a, c: r[0x99 + c.x], x: r[0x6F + c.x] | (r[0x53 + c.x] & 1) << 8, y: r[0x37 + c.x], mc: V[0x1C] >> (r[0x09]) & 1 }); return false; };
  M.hooks[0x22BB] = (c) => { if (cur) cur.top = { p: c.a, c: V[0x27], mc: V[0x1C] & 1, x: V[0] | (V[0x10] & 1) << 8, y: V[1] }; return false; };
  let dir = 0x1F, until = 0;
  try {
    for (let f = 0; f < frames; f++) {
      if (started < 0 || r[0x0CC3] === 0) M.joy = (f % 150) < 10 ? 0x0F : (f % 150) > 70 && (f % 150) < 80 ? 0x1E : 0x1F;
      else {
        if (f >= until) { dir = [0x1E, 0x1D, 0x1B, 0x17, 0x1A, 0x16, 0x19, 0x15, 0x1F][rand(9)]; until = f + 20 + rand(80); }
        M.joy = dir & (rand(12) === 0 ? 0x0F : 0x1F);
        if (!heli && rand(300) === 0) r[0x0E] = rand(6);
      }
      if (heli && r[0x22C2]) { r[0x0CC3] = 0x30; r[0x0B] = 0; r[0x0E] = 5; }
      cur = { f: M.frames + 1, s: [], top: null, heli: r[0x22C2],
        state: [...r.subarray(0x11E5, 0x11EA)], type: [...r.subarray(0x11EA, 0x11EF)], shot: [...r.subarray(0x191D, 0x1920)], dirs: r[0x1D0B] };
      M.runFrames(1);
      cur.shotAfter = [...r.subarray(0x191D, 0x1920)];
      out.frames.push(cur);
    }
  } catch (e) { if (out.frames.length < frames * 0.8) fail('the game stopped at frame', M.frames, e.message); }
  return out;
}
const J = play(20000, false);
const holds = {}, seen = {};
const hold = (k, p, f, st) => { const h = st[k]; if (!h || h.p !== p) { if (h && !h.first) (holds[k + ' ' + h2(h.p)] = holds[k + ' ' + h2(h.p)] || []).push(f - h.f); st[k] = { p, f, first: !h }; } };
const st = {};
const WALK = new Set(SOL.flatMap((s) => s.frames)), RAMBO_TOP = new Set(RAMBO.flatMap((w) => w.frames));
const listOf = (type) => SOL.find((s) => s.name === ({ 0: 'still', 1: 'north', 2: 'south', 4: 'west', 8: 'east', 5: 'north', 9: 'north', 6: 'south', 10: 'south' })[type]);
let walkOff = 0, walkAll = 0, lag = 0, lagAll = 0, inStep = 0, race = 0, odd = 0, shotAll = 0;
const recent = [];
for (const fr of J.frames) {
  if (!fr.top) recent.length = 0;
  if (fr.heli || !fr.top) continue;
  const now = {};
  // Rambo: the outline, black and high resolution, and the body four on, colour 10, multicolour
  const body = fr.s.find((q) => q.o === 13);
  if (RAMBO_TOP.has(fr.top.p)) {
    seen.rambo = (seen.rambo || 0) + 1;
    if (fr.top.c !== 0 || fr.top.mc !== 0) fail('frame', fr.f, 'Rambo\'s outline in colour', fr.top.c, 'multicolour', fr.top.mc);
    // the outline follows the body: objects_snapshot copies $D1 to $D2 before rambo_animate steps
    // both, so after each step the outline shows the step before until the next pass of the loop
    if (body && body.c !== COL.rambo) fail('frame', fr.f, 'Rambo\'s body in colour', body.c);
    // (a pass of the loop can take more than a frame, so it is one of the bodies of the last few)
    if (body && fr.top.p === body.p - RAMBO[0].body) inStep++;
    else if (body && recent.includes(fr.top.p + RAMBO[0].body)) lag++;
    else if (body && recent.length) odd++;   // (the first frame of a life keeps the last life's)
    lagAll++;
    now.rambo = fr.top.p;
  } else if (fr.top.p !== 0) fail('frame', fr.f, 'sprite 0 shows', h2(fr.top.p));
  if (body) { recent.push(body.p); if (recent.length > 8) recent.shift(); }
  for (const q of fr.s) {
    if (q.mc !== 1) fail('frame', fr.f, 'object', q.o, 'high resolution');
    if (q.o <= 3) {
      // by the picture, since a hit can change the state within the frame: falling, rising or walking
      const RISE = [R[0x0DF3], R[0x0DF3] + 1, R[0x0DFD], R[0x0DFD] + 1];
      if (q.p >= R[0x15A1] && q.p <= R[0x0F8A]) {
        if (q.c !== COL.dying) fail('frame', fr.f, 'a falling soldier in colour', q.c);
        now['d' + q.o] = q.p; seen.dying = (seen.dying || 0) + 1;
      } else if (RISE.includes(q.p)) {
        seen.rising = (seen.rising || 0) + 1;
        if (q.c !== COL.rising) fail('frame', fr.f, 'a rising soldier in colour', q.c);
      } else if (WALK.has(q.p)) {
        walkAll++;
        if (!COL.soldiers.includes(q.c)) fail('frame', fr.f, 'a soldier in colour', q.c);
        if (!listOf(fr.type[q.o]) || !listOf(fr.type[q.o]).frames.includes(q.p)) walkOff++;
        now['s' + q.o] = q.p; seen.walk = (seen.walk || 0) + 1;
      } else fail('frame', fr.f, 'soldier slot', q.o, 'as', h2(q.p));
    } else if (q.o >= 5 && q.o <= 8) {
      if (q.p !== R[0x25C0] || q.c !== COL.bullet) fail('frame', fr.f, 'a bullet', h2(q.p), q.c);
      seen.bullet = (seen.bullet || 0) + 1;
    } else if (q.o >= 9 && q.o <= 11) {
      const type = fr.shot[q.o - 9];
      if (q.p >= R[0x18ED] && q.p <= R[0x1931]) {
        // explosion_start stores the picture before the colour, and fire_check a new shot's colour
        // before its picture, so an interrupt between the two shows the explosion's first or last
        // picture in a shot's colour for that one frame
        if (q.c !== COL.explosion) {
          if ((q.p === R[0x18ED] || q.p === R[0x1931]) && COL.weapons.includes(q.c)) race++;
          else fail('frame', fr.f, 'an explosion in colour', q.c);
        }
        now['x' + q.o] = q.p; seen.boom = (seen.boom || 0) + 1;
        continue;
      }
      // the slot's type as the frame starts, or as it ends when a shot is fired or explodes in it
      const fits = (w) => w >= 0 && q.c === SHOTS[w].colour && (SHOTS[w].dirs ? SHOTS[w].dirs.includes(q.p) : SHOTS[w].spin ? q.p >= SHOTS[w].spin[0] && q.p <= SHOTS[w].spin[1] : q.p >= SHOTS[w].thrown && q.p <= SHOTS[w].thrown + 2);
      const ws = [type, fr.shotAfter[q.o - 9]].map((t) => SHOTS.findIndex((s) => s.type === t));
      const w = ws.find(fits);
      shotAll++;
      if (w === undefined) { if (++race < 4) console.log('  a race: frame', fr.f, 'shot slot', q.o, 'of type', type, 'as', h2(q.p), 'colour', q.c); continue; }
      if (ws[0] >= 0 && w !== ws[0]) race++;
      seen['weapon' + w] = (seen['weapon' + w] || 0) + 1;
      if (SHOTS[w].spin) now['k' + q.o] = q.p;
    }
  }
  for (const k of Object.keys(st)) if (!(k in now)) delete st[k];
  for (const [k, p] of Object.entries(now)) hold(k, p, fr.f, st);
}
console.log('jungle:', JSON.stringify(seen));
for (const k of ['rambo', 'walk', 'dying', 'bullet', 'boom', 'weapon0', 'weapon1', 'weapon2', 'weapon3', 'weapon4', 'weapon5']) if (!seen[k]) fail('the jungle never showed', k);
console.log('Rambo\'s outline a step behind his body in', lag, 'of', lagAll, 'frames, neither in', odd, '; a shot slot between two states in', race, 'of', shotAll);
// The main loop and the interrupt race: a picture and its colour are two stores, and the outline
// is copied once a pass. A frame caught between is rare; a wrong table or step would be common.
if (odd > lagAll / 1000) fail('Rambo\'s outline neither his body\'s step nor the one before in', odd, 'frames');
if (race > shotAll / 500) fail(race, 'shot frames in neither the slot\'s type before nor after');
if (walkOff > walkAll * 0.05) fail(walkOff, 'of', walkAll, 'walking soldiers off their type\'s list');
// holds: the share at the tab's step, and none shorter by more than a frame once walking
const want = { rambo: STEP.rambo, s: STEP.soldier, d: STEP.dying, x: STEP.explosion, k: 1 };
const H = {};
for (const [k, hs] of Object.entries(holds)) { const g = k.replace(/[0-9]+ .*/, '').replace(/ .*/, ''); (H[g] = H[g] || []).push(...hs); }
for (const [g, hs] of Object.entries(H)) {
  const n = want[g], at = hs.filter((x) => x === n).length, near = hs.filter((x) => Math.abs(x - n) <= 1).length;
  const c = {}; for (const x of hs) c[x] = (c[x] || 0) + 1;
  console.log('holds', g, JSON.stringify(c));
  if (at < hs.length * 0.6 || near < hs.length * (g === 'rambo' ? 0.75 : 0.9)) fail(g, 'holds', JSON.stringify(c), 'against the tab\'s', n);
}
// the panel's words and bar at the start of a game
if (!J.panel || J.panel.some((v, i) => v !== R[0x4400 + i])) fail('the panel sprites at the start of a game differ from the listing');

// 4. A flight with the gunship pursuing.
const F = play(9000, true);
if (F.heliAt < 0) fail('the flight never started');
// What the three placing routines leave each time they return, against the tab's tables:
const ROT = B.rbRotor(R), s8 = (v) => (v & 0x80 ? v - 256 : v);
let rotorBad = 0, rotorPerFrame = {};
for (const q of F.rotor) {
  const want = ROT.next(), r = HELI.rotor[q.step];
  rotorPerFrame[q.f] = (rotorPerFrame[q.f] || 0) + 1;
  if (q.craft !== want.craft || q.step !== want.step) rotorBad++;
  if (q.p !== r.p || q.top !== r.p) fail('frame', q.f, 'the rotor at step', q.step, 'as', h2(q.p));
  if (((q.x - (q.bx & ~1)) & 0x1FF) !== (r.dx & 0x1FF)) fail('frame', q.f, 'the rotor of craft', q.craft, 'at x', q.x - q.bx);
  const hidden = q.y === 0 && (!q.craft && !q.pursues || ((q.by + r.dy) & 0xFF) >= 0xC0);
  if (!hidden && q.y !== ((q.by + r.dy) & 0xFF)) fail('frame', q.f, 'the rotor of craft', q.craft, 'at y', q.y - q.by);
}
const flown = F.heli.length;
const hseen = new Set(), gseen = new Set();
for (const q of F.heli) {
  const H1 = HELI.frames[q.fr];
  hseen.add(q.fr);
  if (q.p !== H1.body || q.p2 !== H1.part) fail('frame', q.f, 'helicopter frame', q.fr, h2(q.p), h2(q.p2));
  if (s8((q.x2 - q.x) & 0xFF) !== H1.dx || s8((q.y2 - q.y) & 0xFF) !== H1.dy) fail('frame', q.f, 'helicopter frame', q.fr, 'second sprite at', q.x2 - q.x, q.y2 - q.y);
}
for (const q of F.gunship) {
  const G = GUN[q.fr];
  gseen.add(q.fr);
  for (let k = 0; k < 4; k++) {
    if (q.ps[k] !== G[k].p || q.cs[k] !== COL.gunship) fail('frame', q.f, 'gunship frame', q.fr, 'part', k, h2(q.ps[k]), q.cs[k]);
    if (2 * s8((q.xs[k] - q.sx) & 0xFF) !== G[k].x || s8((q.ys[k] - q.sy) & 0xFF) !== G[k].y) fail('frame', q.f, 'gunship frame', q.fr, 'part', k, 'at', q.xs[k] - q.sx, q.ys[k] - q.sy);
  }
}
// and what the interrupt draws in the flight: the tab's pictures, in the tab's colours
const HP = new Set(HELI.frames.flatMap((h) => [h.body, h.part])), GP = new Set(GUN.flat().map((g) => g.p)), RP = new Set(HELI.rotor.map((r) => r.p));
let drawnFlight = 0;
for (const fr of F.frames) {
  if (!fr.heli || !fr.top) continue;
  if (fr.top.y && (!RP.has(fr.top.p) || fr.top.c !== 1 || fr.top.mc)) fail('frame', fr.f, 'sprite 0 in the flight as', h2(fr.top.p), 'colour', fr.top.c);
  for (const q of fr.s) {
    if (q.o === 4 || q.o === 12) { drawnFlight++; if (!HP.has(q.p) || q.c !== COL.heli || !q.mc) fail('frame', fr.f, 'the helicopter drawn as', h2(q.p), q.c); }
    if (q.o >= 5 && q.o <= 8 && (!GP.has(q.p) || q.c !== COL.gunship || !q.mc)) fail('frame', fr.f, 'the gunship drawn as', h2(q.p), q.c);
  }
}
const calls = Object.values(rotorPerFrame);
if (calls.some((n) => n !== 1)) fail('the rotors are placed other than once a frame');
console.log('flight:', flown, 'frames with the helicopter, headings', [...hseen].sort((a, b) => a - b).join(' '), '; gunship', F.gunship.length, 'frames, headings', [...gseen].sort((a, b) => a - b).join(' '), '; rotor', F.rotor.length, 'frames,', rotorBad, 'off the tab\'s step; drawn', drawnFlight);
if (flown < 1000 || hseen.size < 8 || gseen.size < 6) fail('the flight showed too little');
if (rotorBad) fail(rotorBad, 'frames with the rotor out of the tab\'s step');
if (bad) { console.log(bad, 'failures'); process.exit(1); }
console.log('ok');
