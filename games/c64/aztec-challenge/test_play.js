#!/usr/bin/env node
// Hold the Play tab's port of the whole game (reference/az-core.js and its groups, az-g*.js, loaded as
// play.html loads them) against the game's own code, in the kit's lockstep (kit/c64/lockstep.js), and
// its page runtime (reference/az-play.js) against the game's pace.
//
// The game runs on the kit's C64 from the bytes in the committed listing, started at $1000 with the
// KERNAL banked in ($01 = $37), CIA 1's timer A counting from $4025 as the KERNAL leaves it and CIA 2's
// timer A stopped at $FFFF, as the game's snapshot has them (work/entry.vsf). The four KERNAL routines
// the game calls are hooks that run AztecCore.kernal, as the port does, and the interrupt leaves
// through the KERNAL's exit at $EA31, which reads $DC0D. The port has no stand-ins: a stage, routine or
// handler it has not written throws. A pass is a turn of the scorecard's loop ($121D); memory, colour
// RAM and the registers written to the video chip and the SID are compared there and at one checkpoint
// in four besides.
//
// Three sessions, from fixed seeds:
// - the previews: no key pressed, so the menu shows each level played by the game itself, its stick
//   from voice 3's noise ($1A70, $7FC4...), and goes round them;
// - the levels: F1 (one player), each level followed by the next (poked into $03 in both as it
//   starts), the stick moved at random and, after a while, $02 set to 4 in both, so that the next
//   life lost ends the level, and RUN/STOP on the fourth scorecard, which starts the game again;
// - the wins: F3 (two players), the first player put on the Bridge in phase 4, and each level won by
//   setting what counts its progress (WIN, below) in both, where the two hold the same value: every
//   level's own end runs for the second player, and the first's win ends the game, which starts again
//   from $1000.
// The kit's machine does not run the SID's voices, so voice 3 reads bytes from a seed (machine()).
//
// The pace, where chance has no part (the page and the machine draw different numbers from the timers
// and the noise, so the same input plays out differently on each): the costs against the game's
// cycles on a session they were not fitted on, level by level, within 2 %; the start, from $1000 to
// the menu, in the same frame within 1 %; and the page alone, given the levels' and the wins' input,
// never stopping and meeting no stretch without a cost.
//   node games/c64/aztec-challenge/test_play.js [frames] [--cost]
// frames scales each session (default 2000). With --cost, two more sessions (the Stairs with the
// stick still, the Piranha) join the three, and the costs the page's clock runs on are fitted to the
// game's cycles and written into reference/az-play.js (COST): see its header.
const path = require('path'), fs = require('fs'), ROOT = path.resolve(__dirname, '../../..');
const { Machine, loadListing, KEY } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/c64/lockstep.js'));
const args = process.argv.slice(2);
const costAt = args.indexOf('--cost'), COSTING = costAt >= 0 && !!args.splice(costAt, 1);
const FRAMES = +args[0] || 2000;
let failed = 0;
const check = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) failed++; };

// ---- the page's scripts, as play.html loads them
globalThis.C64Sid = null; globalThis.C64 = null;
require(path.join(ROOT, 'site/lib/collide.js'));
const page = fs.readFileSync(path.join(__dirname, 'play.html'), 'utf8');
const srcs = [...page.matchAll(/<script src="(reference\/az-[^"]+\.js)"><\/script>/g)].map((x) => x[1]);
const onDisk = fs.readdirSync(path.join(__dirname, 'reference')).filter((f) => /^az-g.*\.js$/.test(f)).sort().map((f) => 'reference/' + f);
check('play.html loads az-core.js, every group in reference/ in order (' + onDisk.length + '), and az-play.js',
  JSON.stringify(srcs) === JSON.stringify(['reference/az-core.js', ...onDisk, 'reference/az-play.js']));
const load = (f) => require(path.join(__dirname, f));
const Core = load('reference/az-core.js');
const groups = onDisk.map(load);
const AztecPlay = load('reference/az-play.js');
const RAM = loadListing(path.join(__dirname, 'listing.json'));
const LINE = AztecPlay.LINE;

// ---- the game on the kit's C64
function machine() {
  const ram = RAM.slice();
  ram[0x0314] = 0x31; ram[0x0315] = 0xEA; ram[0x0286] = 0x03; ram[0x91] = 0xFF;
  const m = new Machine({ ram, pc: 0x1000, port: { dir: 0x2F, data: 0x37 }, cia: true, collide: true, passAt: 0x121D });
  m.cpu.i = 0; m.cpu.sp = 0xF6;
  for (const [a, v] of [[0xDC04, 0x25], [0xDC05, 0x40], [0xDC0E, 0x11], [0xDC0D, 0x81], [0xDD04, 0xFF], [0xDD05, 0xFF], [0xDD0E, 0x18]]) m.ioWrite(a, v);
  const K = Core.kernal;
  const env = (c) => ({ M: c.m, colourWrite: (i, v) => c.wr(0xD800 + i, v), keyDown: (k) => m.keys.has(k) });
  m.azHooks = {
    0xFFD2: (c) => { K.chrout(env(c), c.a); c.rts(); },
    0xFFEA: (c) => { K.udtim(env(c)); c.rts(); },
    0xFFE1: (c) => { const s = K.stop(env(c)); c.z = s ? 1 : 0; c.a = s ? 0x7F : 0xFF; c.rts(); },
    0xFFE4: (c) => { c.a = K.getin(env(c)); c.z = c.a ? 0 : 1; c.rts(); },
    // the KERNAL's exit reads $DC0D, which acknowledges the timer, and returns
    0xEA31: () => { m.ioRead(0xDC0D); m.leave(62); return false; },
  };
  for (const a of Object.keys(m.azHooks)) m.hooks[a] = m.azHooks[a];
  // The kit's machine does not run the SID's voices, and voice 3's oscillator ($D41B) would read 0:
  // Hopaztec's traps would all be tile 0, off the floor, and the previews' stick still. It reads a
  // byte from a fixed seed instead, which the port takes from the game as it takes every such read.
  let seed = 0x2545F491;
  const sidRead = m.sidBus.read.bind(m.sidBus);
  m.sidBus.read = (r, t, x) => {
    if (r !== 0x1B) return sidRead(r, t, x);
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed >>> 24;
  };
  return m;
}
const port = () => Core.makePort(new Uint8Array(65536), groups);
{
  const P = port();
  check('the port has its own handler for each interrupt the game installs ($EA31, then $1C00)', typeof P.irqs[0xEA31] === 'function' && typeof P.irqs[0x1C00] === 'function');
}

// ---- the input. A script is called once a frame with the memory it plays on, the frame and the
// passes so far, and returns { joy, keys: [KERNAL key numbers held], poke: [[address, value]...] }.
const WAYS = [0x1F, 0x1E, 0x1D, 0x1B, 0x17, 0x0F, 0x1F, 0x1F];
const level = (R) => R[R[0x08] === 2 && R[0x09] === 0x32 ? 0x04 : 0x03];
// what counts each level's progress, set one step short of its end, and the stick held after it: the
// Gauntlet's temple at stage 8, grown at the next pass ($46); the Stairs' last count of 128; the
// Temple's ninth stage at its last room, which the runner leaves running right; the Vermin's ninth
// stage at its last scrolled character; the Piranha's ninth stage at the second passage of a pair
// off the edge ($68 odd), swimming up to it; Hopaztec's tile 35, a hop right from tile 44; and the
// Bridge's ninth stage, 16 passes short. The stick is let go after it, but for those two.
const WIN = {
  0x31: () => [[0x45, 8], [0x46, 1]],
  0x32: () => [[0x6A, 7], [0x69, 0x7F]],
  0x33: (R) => [[0x45, 8], [0x69, (R[0x56] - 1) & 255]],
  0x34: () => [[0x45, 8], [0x69, 0x6F]],
  0x35: () => [[0x16, 0x23]],
  0x36: () => [[0x45, 8], [0x68, 1]],
  0x37: () => [[0x45, 8], [0x6A, 3], [0x69, 0xF0]],
};
// Hopaztec waits for the stick to be let go after each hop, so right comes in pulses
const AFTER = { 0x35: (f) => (f % 24 < 12 ? 0x17 : 0x1F), 0x36: () => 0x1E };
// The scorecard reads the stick once a turn, a turn about 17 frames apart, and any input starts the
// level. A turn more than 60 frames after the last is a new visit. In the levels session the next
// level is poked into $03 as soon as a level starts (only the scorecard and the end of a level read
// it), and $02 set to 4 after 400 frames. A poke comes with a tag and is asked for again until the
// caller says it went in (done(tag)): the lockstep pokes only where the game and the port agree.
// st.cur is the level being played, for the pace's counts.
function script(kind, seed) {
  const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
  let j = 0x1F, card = 0, lastTurn = -1000, turns = 0, playing = 0, visits = 0;
  const did = new Set();
  const st = { levels: new Set(), forced: 0, cur: 0, restarts: 0, order: 0 };
  let menu = true;
  st.next = function (R, f, passes) {
    const out = { joy: 0x1F, keys: [], poke: [] };
    if (kind === 'previews') return out;
    // the menu, at the start or after the last level of phase 4 ($07 set: the previews), F1 or F3
    // until a game starts
    if (passes === 0 || R[0x07]) {
      if (!menu && passes) { menu = true; st.restarts++; if (st.order) st.order--; }   // the level the restart skipped comes next
      if (f > 30) out.keys.push(kind === 'wins' ? 5 : 4);
      return out;
    }
    menu = false;
    if (passes !== card) {                                 // a turn of the scorecard
      if (f - lastTurn > 60) { visits++; turns = 0; playing = 0; st.cur = 0; did.delete('next'); did.delete('end'); did.delete('win'); }
      card = passes; lastTurn = f; turns++;
    }
    if (f - lastTurn <= 40) {
      out.joy = turns >= 3 ? 0x0F : 0x1F;
      // the levels session's fourth scorecard: RUN/STOP, back to Cosmi's logo and the menu
      if (kind === 'levels' && visits === 4) { out.keys.push(63); out.joy = 0x1F; }
      if (kind === 'wins' && !did.has('phase')) { out.poke.push([0x05, 0x34], [0x03, 0x37]); out.tag = 'phase'; }
      return out;
    }
    if (++playing === 1) { st.cur = level(R); st.levels.add(st.cur); }
    if (f % 7 === 0) j = WAYS[Math.floor(rnd() * WAYS.length)];
    out.joy = j;
    const only = /^level(\d)$/.exec(kind);
    // on the Stairs a still climber lets each block's first fall pass it and come back at the top,
    // where a moving one is hit before any does
    if (only && only[1] === '2') out.joy = 0x1F;
    // in the Piranha, fire with up keeps the swimmer safe from bites ($1EA0) while the fish cross the lake
    if (only && only[1] === '6') out.joy = 0x0E;
    if (kind === 'levels' || only) {
      const next = only ? 0x30 + +only[1] : 0x31 + (st.order % 7 + 1) % 7;   // 2, 3 ... 7, 1, 2, whatever came before
      if (!did.has('next')) { out.poke.push([0x03, next]); out.tag = 'next'; }
      else if (playing >= 400 && !did.has('end')) { out.poke.push([0x02, 4]); out.tag = 'end'; }
    }
    // a win set while the player was already dying is undone by the level's restart: set again after
    // 150 frames without the scorecard
    if (kind === 'wins' && did.has('win') && playing - winAt > 150) did.delete('win');
    if (kind === 'wins' && playing > 100) {
      const w = WIN[level(R)];
      if (did.has('win')) out.joy = AFTER[level(R)] ? AFTER[level(R)](f) : 0x1F;
      else if (w) { out.poke.push(...w(R)); out.tag = 'win'; out.joy = 0x1F; }
    }
    return out;
  };
  let winAt = 0;
  st.done = (tag) => { did.add(tag); if (tag === 'win') winAt = playing; if (tag === 'end') st.forced++; if (tag === 'next') st.order++; };
  st.wins = () => st.levels.size;
  return st;
}

// ---- the costs, gathered while the lockstep runs when --cost is given. A stretch's cycles, beyond
// its delays and polls, are fitted as a base for the stretch ('k:' and its two checkpoints) and a cost
// for each call of one of P's routines in it ('f:' and its name), at least 0: the work between two
// checkpoints can hold a varying number of calls (the Gauntlet's 44 steps between two of its spear's
// moves, more or fewer as the spears are thrown). The normal equations are added up as the stretches
// come, sparse.
const fit = { idx: new Map(), G: [], h: [] };
let irqCycles = 0, irqs = 0;
const fv = (name) => {
  let i = fit.idx.get(name);
  if (i === undefined) { i = fit.idx.size; fit.idx.set(name, i); fit.G.push(new Map()); fit.h.push(0); }
  return i;
};
// and, for a pair of checkpoints no session met, the stretches that end at the same one (@to): their
// cycles and calls added up here, their base worked out once the routines' costs are known
const ends = new Map();
function sample(key, calls, r) {
  const to = key.split('>')[1];
  const e = ends.get(to) || { n: 0, r: 0, calls: {} };
  e.n++; e.r += r;
  for (const [f, c] of Object.entries(calls || {})) e.calls[f] = (e.calls[f] || 0) + c;
  ends.set(to, e);
  const row = [[fv('k:' + key), 1]];
  for (const [f, c] of Object.entries(calls || {})) if (c) row.push([fv('f:' + f), c]);
  for (const [i, a] of row) {
    fit.h[i] += a * r;
    const g = fit.G[i];
    for (const [j, b] of row) g.set(j, (g.get(j) || 0) + a * b);
  }
}
// the cycles the page gives a stretch, beyond its delays, polls and interrupts
const modelled = (cost, key, calls) => {
  const c = cost['@yield'][key], e = cost['@to'][key.split('>')[1]];
  let t = c !== undefined ? c : e !== undefined ? e : LINE;
  for (const [f, n] of Object.entries(calls || {})) t += n * (cost['@fn'][f] || 0);
  return t;
};

// ---- one lockstep session
// pace, when given ({ cost, per, missing }), adds up for each level the cycles the page's clock would
// give each stretch (its cost, the delays the port named, a line for each turn of a polling loop and
// the interrupts at their cost) and the cycles the game took, interrupts and all
function session(name, kind, seed, frames, pace) {
  const m = machine(), P = port(), input = script(kind, seed);
  // each read the port takes from the game: the register it loaded, or, after the Stairs' INC $D011, the
  // register as the game left it
  P.io.live = (chip, reg) => (chip === 'd011inc' ? m.vic[0x11] : m.cpu[reg]);
  P.io.keyDown = (k) => m.keys.has(k);
  let n = 0, compared = 0, held = new Set();
  const ls = new Lockstep({
    machine: m, port: P, program: (p) => p.program(), passAt: 0x121D, entry: 0x1000,
    checkpoints: [...P.checkpoints], waits: P.waits, irqs: P.irqs, hooks: m.azHooks, chips: ['colour', 'vic', 'sid'], maxFrames: 1500,
    timing: (t) => {
      const w = P.waited; P.waited = 0;
      if (COSTING && !t.wait && t.to !== 0x6648) {
        sample(AztecPlay.stretch(t.from, t.to), t.calls, t.cycles - w - t.polls * LINE);
        irqCycles += t.irqCycles; irqs += t.irqs;
      }
      if (pace && !t.wait && t.to !== 0x6648 && input.cur) {
        const k = AztecPlay.stretch(t.from, t.to);
        if (pace.cost['@yield'][k] === undefined && pace.cost['@to'][k.split('>')[1]] === undefined) pace.missing.add(k);
        const p = pace.per[input.cur] = pace.per[input.cur] || { page: 0, game: 0 };
        p.page += modelled(pace.cost, k, t.calls) + w + t.polls * LINE + t.irqs * pace.cost['@irq'].all;
        p.game += t.cycles + t.irqCycles;
      }
      // not at $6DC9, where the port writes $D011 as the game left it only after the checkpoint
      if (t.to === 0x6DC9 || n++ % 4) return;
      compared++;
      const d = ls.compare();
      if (d) { ls.res.diffs.push(Object.assign({ pass: ls.passes, frame: m.frames, cycle: m.cpu.cycles, at: t.to }, d)); ls.res.ok = false; ls.stopped = true; }
    },
  });
  const t0 = Date.now();
  const r = ls.run({
    passes: 1e9,
    onFrame: (f, g) => {
      if (f >= frames) { ls.stopped = true; return; }
      const o = input.next(g.ram, f, g.passes);
      g.joy = o.joy;
      for (const k of held) if (!o.keys.includes(k)) { g.release(k); held.delete(k); }
      for (const k of o.keys) if (!held.has(k)) { g.press(k); held.add(k); }
      // a poke goes in only where the game and the port hold the same value, so that neither has
      // moved it on yet; a win's pokes go in together or not at all, and Hopaztec's only while both
      // wait in the stick's loop
      const same = o.poke.every(([a]) => g.ram[a] === P.M[a]);
      const hop = level(g.ram) !== 0x35 || o.tag !== 'win' || (g.cpu.pc >= 0x7300 && g.cpu.pc < 0x7356 && ls.last === 0x732D);
      if (o.poke.length && same && hop) {
        for (const [a, v] of o.poke) g.ram[a] = P.M[a] = v;
        input.done(o.tag);
      }
    },
  });
  check(`${name}: ${m.frames} frames, ${r.passes} turns of the scorecard, memory and chips the same at ${compared} checkpoints; ` +
    `levels ${[...input.levels].map((c) => String.fromCharCode(c)).sort().join('') || 'none'}, ${input.forced} forced, ${input.restarts} back to the start (${((Date.now() - t0) / 1000).toFixed(0)} s)`,
    r.ok && m.frames >= frames);
  if (!r.ok) console.log((Array.isArray(describe(r)) ? describe(r) : [describe(r)]).join('\n'));
  return input;
}
const sessions = [
  session('the previews', 'previews', 3, FRAMES * 3),
  session('the levels', 'levels', 11, FRAMES * 4),
  session('the wins', 'wins', 5, FRAMES * 4),
];
// the Stairs and the Piranha again and again, for the costs of their rarer stretches (a block back at
// the top beside the climber, two fish back at the edge in one move): only when costing
if (COSTING) {
  session('the Stairs, for the costs', 'level2', 13, FRAMES * 3);
  session('the Piranha, for the costs', 'level6', 17, FRAMES * 3);
}
check(`every level played in the levels session, and reached by winning the one before in the wins session: ${[1, 2].map((i) => [...sessions[i].levels].map((c) => String.fromCharCode(c)).sort().join("")).join(" and ")}` + `; the game finished and started again ${sessions[2].restarts} times`, [1, 2].every((i) => sessions[i].levels.size === 7) && sessions[2].restarts >= 1);

if (COSTING) {
  // least squares by coordinate descent on the normal equations, the routines' costs kept at 0 or more
  const names = [...fit.idx.keys()], d = names.length, w = new Float64Array(d);
  const G = fit.G.map((g) => [...g]);
  for (let it = 0; it < 4000; it++) {
    let moved = 0;
    for (let i = 0; i < d; i++) {
      let g = -fit.h[i], gii = 0;
      for (const [j, a] of G[i]) { g += a * w[j]; if (j === i) gii = a; }
      if (!gii) continue;
      let x = w[i] - g / gii;
      if (names[i][0] === 'f' && x < 0) x = 0;
      moved = Math.max(moved, Math.abs(x - w[i])); w[i] = x;
    }
    if (moved < 1e-3) break;
  }
  const cost = { '@yield': {}, '@to': {}, '@fn': {}, '@irq': { all: Math.round(irqCycles / Math.max(1, irqs)) } };
  names.forEach((n, i) => {
    if (n[0] === 'k') cost['@yield'][n.slice(2)] = Math.round(w[i]);
    else if (Math.round(w[i])) cost['@fn'][n.slice(2)] = Math.round(w[i]);
  });
  // each checkpoint's fallback: the mean of the stretches ending there, less their routines' costs
  for (const [to, e] of ends) {
    let r = e.r;
    for (const [f, c] of Object.entries(e.calls)) r -= c * (cost['@fn'][f] || 0);
    cost['@to'][to] = Math.round(r / e.n);
  }
  const sorted = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  for (const k of ['@yield', '@to', '@fn']) cost[k] = sorted(cost[k]);
  const file = path.join(__dirname, 'reference/az-play.js');
  const src = fs.readFileSync(file, 'utf8');
  const out = src.replace(/  const COST = .*;\n/, '  const COST = ' + JSON.stringify(cost) + ';\n');
  check('the costs written into reference/az-play.js: ' + Object.keys(cost['@yield']).length + ' stretches, ' + Object.keys(cost['@fn']).length + ' routines, an interrupt ' + cost['@irq'].all + ' cycles', out !== src || src.includes(JSON.stringify(cost)));
  fs.writeFileSync(file, out);
  delete require.cache[require.resolve(file)];
}

// ---- the pace. The page and the kit's machine draw different numbers from the timers and the
// noise, so the two play the same input differently and are compared where chance has no part:
// - the costs, on a session they were not fitted on: level by level, the cycles the page's clock
//   would give the stretches the game ran, beside the cycles the game took over them, within 2 %;
// - the start: Cosmi's logo and the sun stone, from $1000 to the menu's first look at the keys, in
//   the same frame on the page and on the machine, give or take 1 %;
// - the page alone, given the levels' and the wins' input for a while, never stops, and every
//   stretch it meets has a cost (a stretch with none moves the clock a line, and the page runs fast).
{
  const AP = COSTING ? load('reference/az-play.js') : AztecPlay;
  const pace = { cost: AP.COST, per: {}, missing: new Set() };
  session('the pace session, its costs held against the game', 'levels', 29, FRAMES * 4, pace);
  const rows = [];
  let worst = 0;
  for (let l = 0x31; l <= 0x37; l++) {
    const p = pace.per[l];
    if (!p) { rows.push(String.fromCharCode(l) + ' not reached'); worst = Infinity; continue; }
    const e = p.page / p.game - 1;
    worst = Math.max(worst, Math.abs(e));
    rows.push(`${String.fromCharCode(l)} ${(e * 100).toFixed(2)} %`);
  }
  check('the costs against the game\'s cycles, level by level, page/game - 1: ' + rows.join(', ') +
    (pace.missing.size ? '; no cost for ' + [...pace.missing].slice(0, 8).join(', ') : ''), worst < 0.02 && !pace.missing.size);

  // the start, on the machine and on the page
  const m = machine();
  let gameAt = -1, pageAt = -1, f = 0;
  const h = m.hooks[0x1B1D];
  m.hooks[0x1B1D] = (c) => { if (gameAt < 0) gameAt = f; return h ? h(c) : false; };
  const S = AP.create({ M: RAM.slice(), groups, onYield: (y) => { if (y && y.cp === 0x1B1D && pageAt < 0) pageAt = f; } });
  for (f = 0; f < 1000 && (gameAt < 0 || pageAt < 0); f++) { if (gameAt < 0) m.runFrames(1); if (pageAt < 0) S.run((f + 1) * AP.FRAME); }
  check(`from $1000 to the menu: frame ${pageAt} on the page, ${gameAt} on the machine`, gameAt > 0 && pageAt > 0 && Math.abs(pageAt / gameAt - 1) < 0.01);

  // the page alone
  const SOAK = Math.max(12000, FRAMES * 4), missing = new Set(), C = AP.COST;
  const watch = (o) => new Proxy(o, { get: (t, k) => { if (typeof k === 'string' && !(k in t)) missing.add(k); return t[k]; } });
  for (const kind of ['levels', 'wins']) {
    let passes = 0, stopped = '';
    const P2 = AP.create({ M: RAM.slice(), groups, cost: { '@yield': watch(C['@yield']), '@irq': C['@irq'], '@to': C['@to'], '@fn': C['@fn'] },
      onYield: (y) => { if (y && y.cp === 0x121D) passes++; } });
    const input = script(kind, 31);
    for (let g = 0; g < SOAK && !stopped; g++) {
      const o = input.next(P2.M, g, passes);
      P2.joy = o.joy; P2.keys.clear(); for (const k of o.keys) P2.keys.add(k);
      for (const [ad, v] of o.poke) P2.M[ad] = v;
      if (o.tag) input.done(o.tag);
      try { P2.run((g + 1) * AP.FRAME); } catch (e) { stopped = `at frame ${g}: ${e.message}`; }
    }
    check(`the page alone over ${SOAK} frames with the ${kind}' input: levels ${[...input.levels].map((c) => String.fromCharCode(c)).sort().join('')}, ` +
      (stopped ? 'stopped ' + stopped : 'never stopped'), !stopped);
  }
  const bare = [...missing].filter((k) => C['@to'][k.split('>')[1]] === undefined);
  check(`every stretch the page met alone has a cost (${missing.size} pairs of checkpoints by the cost of the stretches ending at the second)` + (bare.length ? ': none for ' + bare.slice(0, 12).join(', ') : ''), bare.length === 0);
}
process.exit(failed ? 1 : 0);
