#!/usr/bin/env node
// Hold the Play tab's port of the whole game (reference/hp-port.js, loaded as play.html loads it)
// against the game's own code, in the kit's lockstep (kit/c64/lockstep.js), and its page runtime
// (reference/hp-play.js) against the game's pace.
//
// The game runs on the kit's C64 from the bytes in the committed listing, started at $1450 with the
// KERNAL banked in ($01 = $36), the CIAs' timers stopped at $FFFF as the machine starts them. The
// interrupts come in through the KERNAL's entry and go to $0314: the music's ($AE03), which leaves
// through the KERNAL's $EA7E, here a hook that reads $DC0D as the ROM does and goes on to its exit;
// the game's bands ($13AB); and, while the cracker's highscore saver runs, the KERNAL's own ($EA31),
// a hook that reads $DC0D and leaves. The saver's calls into the KERNAL (IOINIT, SETLFS, SETNAM,
// SAVE) are hooks too: IOINIT sets the CIAs as the port's ioinit does, and the rest return. The port
// has no stand-ins for the game's own code: a routine it has not written throws.
//
// The reads the port cannot work out from memory are given it from the game: the timer and raster
// bytes the game takes for random numbers, and the stick in the name entry, by a checkpoint just
// after each load (the game's A then holds what it read); voice 3's noise and the collision
// latches by the lockstep itself ($D41B, and irqBytes).
//
// Two sessions, from fixed seeds:
// - the levels: the stick moved at random, and, where the game and the port hold the same value,
//   the hits still needed ($42) set to 1 so that the next hit ends a kind of defence, the strafing
//   runs' hits ($45) set to 16 so that each run passes the level, and the lives kept at 4: every
//   kind, the strafing runs and all four levels;
// - the end: the stick moved at random and nothing set, so the lives run out: the highscore table,
//   the name entry, the saver and the game from the start again.
//
// The pace, where chance has no part (the page and the machine draw different numbers from the
// timer, the noise and the collisions, so the same input plays out differently on each): the costs
// against the game's cycles on a session they were not fitted on, within 2 %; and the page alone,
// given the same input, never stopping and meeting no stretch without a cost.
//   node games/c64/hunter-patrol/test_play.js [frames] [--cost]
// frames scales each session (default 4000). With --cost, the costs the page's clock runs on are
// fitted to the game's cycles and written into reference/hp-play.js (COST): see its header.
const path = require('path'), fs = require('fs'), ROOT = path.resolve(__dirname, '../../..');
const { Machine, loadListing } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/c64/lockstep.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const args = process.argv.slice(2);
const costAt = args.indexOf('--cost'), COSTING = costAt >= 0 && !!args.splice(costAt, 1);
const FRAMES = +args[0] || 4000;
let failed = 0;
const check = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) failed++; };

// ---- the page's scripts, as play.html loads them
globalThis.C64Sid = null; globalThis.C64 = null;
require(path.join(ROOT, 'site/lib/collide.js'));
const page = fs.readFileSync(path.join(__dirname, 'play.html'), 'utf8');
const srcs = [...page.matchAll(/<script src="(reference\/hp-[^"]+\.js)"><\/script>/g)].map((x) => x[1]);
check('play.html loads reference/hp-port.js, then reference/hp-play.js', JSON.stringify(srcs) === JSON.stringify(['reference/hp-port.js', 'reference/hp-play.js']));
const HunterPort = require(path.join(__dirname, 'reference/hp-port.js'));
const HunterPlay = require(path.join(__dirname, 'reference/hp-play.js'));
// the routines the port counts: P's, and the record pointers
// the routines the port counts (P's that do not yield, and the record pointers), and those that
// yield, whose own code the stretches they yield in pay for
const GEN = Object.getPrototypeOf(function* () {});
const [OWNED, YIELDING] = (() => {
  const P = HunterPort.create(new Uint8Array(65536), {}, { CPU }), fns = Object.keys(P).filter((k) => typeof P[k] === 'function' && !P.irqs[k]);
  return [[...fns.filter((k) => Object.getPrototypeOf(P[k]) !== GEN), 'point_ground', 'point_ground_template', 'point_aircraft', 'point_aircraft_template',
    'point_shot', 'point_shot_template', 'point_stripe', 'point_flak', 'point_flak_template', 'point_stripe_template'], fns.filter((k) => Object.getPrototypeOf(P[k]) === GEN)];
})();
const RAM = loadListing(path.join(__dirname, 'listing.json'));
const LINE = HunterPlay.LINE;

// ---- the game on the kit's C64
const IOINIT = [[0xDC0D, 0x7F], [0xDD0D, 0x7F], [0xDC0E, 0x08], [0xDD0E, 0x08], [0xDC0F, 0x08], [0xDD0F, 0x08],
  [0xD418, 0], [0xDC04, 0x25], [0xDC05, 0x40], [0xDC0D, 0x81], [0xDC0E, 0x11]];
function machine() {
  const m = new Machine({ ram: RAM.slice(), pc: 0x1450, port: { dir: 0x2F, data: 0x36 }, cia: true, collide: true, passAt: 0x193C });
  m.hpHooks = {
    0xEA7E: (c) => { m.ioRead(0xDC0D); c.pc = 0xEA81; return false; },
    0xEA31: () => { m.ioRead(0xDC0D); m.leave(); return false; },
    0x0C73: (c) => { for (const [a, v] of IOINIT) m.ioWrite(a, v); c.pc = 0x0C76; return false; },
    0xFFBA: (c) => { c.rts(); return false; },
    0xFFBD: (c) => { c.rts(); return false; },
    0xFFD8: (c) => { c.c = 0; c.rts(); return false; },
  };
  Object.assign(m.hooks, m.hpHooks);
  return m;
}
// the loads the port reads after the game has made them, at the checkpoint after each
const AFTER = { 0x1928: 0xDC04, 0x192D: 0xDC05, 0x1932: 0xD012, 0x26DA: 0xD012, 0x26E4: 0xDC05, 0x2BA5: 0xDC04, 0x1310: 0xDC01 };
{
  const P = HunterPort.create(new Uint8Array(65536), {}, { CPU });
  check('the port has a handler for each interrupt the game installs ($AE03, $13AB, $EA31)', [0xAE03, 0x13AB, 0xEA31].every((a) => typeof P.irqs[a] === 'function'));
  check('each load the port takes from the game after it is made is a checkpoint', Object.keys(AFTER).every((a) => P.checkpoints.includes(+a)));
}

// ---- the input: a script is called once a frame with the game's memory and the frame, and returns
// { joy, poke: [[address, value]...] }
const WAYS = [0x1F, 0x1E, 0x1D, 0x1B, 0x17, 0x0F, 0x0B, 0x07];
function script(kind, seed) {
  const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
  let j = 0x1F;
  const st = { levels: new Set(), kinds: new Set(), runs: 0, ends: 0, names: 0, last41: 0 };
  st.next = function (R, f) {
    if (f % 9 === 0) j = WAYS[Math.floor(rnd() * WAYS.length)];
    const out = { joy: j, poke: [] };
    // on the title screen, fire held for a while and then let go, so that both its loops turn
    if (R[0x0314] === 0x03 && R[0x0315] === 0xAE) out.joy = f % 120 < 60 ? 0x0F : 0x1F;
    if (R[0x41] !== st.last41) { if (R[0x41] === 0x80) st.runs++; st.last41 = R[0x41]; }
    if (R[0x41] < 4) st.kinds.add(R[0x41]);
    st.levels.add(R[0x44]);
    if (kind === 'levels' && f % 50 === 0) {
      if (R[0x41] & 0x80) { if (R[0x45] < 0x10) out.poke.push([0x45, 0x10]); }
      else if (R[0x42] > 1 && R[0x42] < 0x80) out.poke.push([0x42, 1]);
      if (R[0x40] < 3) out.poke.push([0x40, 4]);
    }
    // the end: on the last life, a score that goes into the highscore table
    if (kind === 'end' && R[0x40] === 0 && R[0x13] < 9) out.poke.push([0x13, 9]);
    return out;
  };
  return st;
}

// ---- the costs, measured while the lockstep runs when --cost is given (kit/cpu/profile.js): every
// instruction the game runs gives its cycles to the routine of the listing whose code it is, and
// each routine's cost is its cycles over the port's count of its calls (P.ticks). The loops that
// wait for the fire button or the raster, and the delay loops whose cycles the port names, are left
// out of the routines they sit in: the page's clock pays them a turn at a time. What a stretch
// between two checkpoints took beyond its routines, its delays, its polls and its interrupts is its
// own cost (@yield), the mean over the stretches with the same two ends; the stretches that end at
// the same checkpoint give a fallback for a pair no session met (@to).
const { Profiler, routines, perCall } = require(path.join(ROOT, 'kit/cpu/profile.js'));
const TABLE = routines(path.join(__dirname, 'listing.json'));
const LOOPS = [[0x11B1, 0x11C9], [0x1349, 0x1350], [0x135F, 0x136B], [0x2B83, 0x2B91], [0x2B9B, 0x2BA2], [0x2E80, 0x2E8E],
  [0x2E98, 0x2E9F], [0x139C, 0x13A3], [0x1520, 0x1527], [0x153A, 0x1541], [0x1304, 0x130D], [0x24CF, 0x24D9]];
// each address's routine among those the port names, by the listing's labels: a yielding one's
// code is left out of the routines, as the loops are
const OWNER = (() => {
  const own = new Set([...OWNED, ...YIELDING]), list = JSON.parse(fs.readFileSync(path.join(__dirname, 'listing.json'), 'utf8')).records;
  const o = new Array(65536).fill(null);
  let cur = null;
  for (let a = 0, i = 0; a < 65536; a++) {
    while (i < list.length && list[i].a < a) i++;
    if (i < list.length && list[i].a === a && list[i].l && own.has(list[i].l)) cur = list[i].l;
    o[a] = cur;
  }
  return o;
})();
const YIELDS = new Set(YIELDING);
const inLoop = (pc) => LOOPS.some(([a, b]) => pc >= a && pc < b) || YIELDS.has(OWNER[pc]);
const rows = [], irqSum = {};
const modelled = (cost, key, calls) => {
  const c = cost['@yield'][key], e = cost['@to'][key.split('>')[1]];
  let t = c !== undefined ? c : e !== undefined ? e : LINE;
  for (const [f, n] of Object.entries(calls || {})) t += n * (cost['@fn'][f] || 0);
  return t;
};

// ---- one lockstep session
function session(name, kind, seed, frames, pace) {
  const m = machine(), P = HunterPort.create(new Uint8Array(65536), {}, { CPU }), input = script(kind, seed);
  let compared = 0, vec = 0;
  m.onInterrupt = () => { vec = m.ram[0x0314] | m.ram[0x0315] << 8; };
  const ls = new Lockstep({
    machine: m, port: P, program: (p) => p.program(), passAt: 0x193C, entry: 0x1450,
    checkpoints: [...P.checkpoints], irqs: P.irqs, irqBytes: P.irqBytes, hooks: m.hpHooks, chips: ['colour', 'vic', 'sid'], maxFrames: 1500,
    timing: (t) => {
      const calls = Object.assign({}, P.ticks); for (const c in P.ticks) delete P.ticks[c];
      const w = t.estimate || 0, k = HunterPlay.stretch(t.from, t.to), key = (m.ram[0x0314] | m.ram[0x0315] << 8).toString(16);
      if (prof) {
        const p = prof.take();
        if (!t.wait) {
          rows.push({ key: k, to: t.to.toString(16), calls, self: p.self, rest: t.cycles - w - t.polls * LINE });
          const s = irqSum[key] = irqSum[key] || { c: 0, n: 0 };
          s.c += t.irqCycles; s.n += t.irqs;
        }
      }
      if (pace && !t.wait) {
        if (pace.cost['@yield'][k] === undefined && pace.cost['@to'][t.to.toString(16)] === undefined) pace.missing.add(k);
        const pg = modelled(pace.cost, k, calls) + w + t.polls * LINE + t.irqs * (pace.cost['@irq'][key] || 0), gm = t.cycles + t.irqCycles;
        pace.page += pg; pace.game += gm;
        if (process.env.PACE) { const b = pace.by[k] = pace.by[k] || { p: 0, g: 0, n: 0, i: 0, ip: 0 }; b.p += pg; b.g += gm; b.n++; b.i += t.irqCycles; b.ip += t.irqs * (pace.cost['@irq'][key] || 0); }
      }
      compared++;
      const d = ls.compare();
      if (d) { ls.res.diffs.push(Object.assign({ pass: ls.passes, frame: m.frames, cycle: m.cpu.cycles, at: t.to }, d)); ls.res.ok = false; ls.stopped = true; }
    },
  });
  // a load the game has made, at the checkpoint after it: the game's A
  const prof = COSTING && !pace ? new Profiler({ machine: m, routines: TABLE, owned: OWNED, place: (c) => (inLoop(c.pc) ? null : undefined) }) : null;
  const read = P.io.read;
  P.io.read = (a) => (ls.replaying === null && AFTER[m.cpu.pc] === a ? m.cpu.a : read(a));
  const t0 = Date.now();
  // the name entry: its cursor ($1C) set; the game from the start again: the zero page cleared
  // ($1170) after the saver, the lives from $FF to 0, which play never does
  let lives = m.ram[0x40], restarts = 0;
  const r = ls.run({
    passes: 1e9,
    onFrame: (f, g) => {
      if (f >= frames) { ls.stopped = true; return; }
      const o = input.next(g.ram, f);
      g.joy1 = o.joy; g.joy = 0x1F;
      // a poke goes in only where the game and the port hold the same value
      for (const [a, v] of o.poke) if (g.ram[a] === P.M[a]) g.ram[a] = P.M[a] = v;
      if (g.ram[0x40] === 0xFF && lives !== 0xFF) input.ends++;
      if (g.ram[0x1C]) input.names = 1;
      if (lives === 0xFF && g.ram[0x40] === 0) restarts++;
      lives = g.ram[0x40];
    },
  });
  check(`${name}: ${m.frames} frames, ${r.passes} passes, memory and chips the same at ${compared} checkpoints; ` +
    `levels ${[...input.levels].filter((l) => l < 4).sort().map((l) => l + 1).join('') || 'none'}, kinds ${[...input.kinds].sort().map((k) => k + 1).join('')}, ` +
    `${input.runs} strafing runs, ${input.ends} games over, ${restarts} back to the start (${((Date.now() - t0) / 1000).toFixed(0)} s)`,
    r.ok && m.frames >= frames);
  if (!r.ok) console.log([].concat(describe(r)).join('\n'));
  input.restarts = restarts;
  if (prof) prof.detach();
  return input;
}
const levels = process.env.PACEONLY || process.env.ENDONLY ? { levels: new Set([0, 1, 2, 3]), kinds: new Set([0, 1, 2, 3]), runs: 9 } : session('the levels', 'levels', 7, FRAMES * 5);
const end = process.env.PACEONLY ? { ends: 1, names: 1, restarts: 1 } : session('the end', 'end', 23, FRAMES * 8);
check('every level and kind of defence played, and the strafing runs, in the levels session', levels.levels.size >= 4 && levels.kinds.size === 4 && levels.runs >= 4);
check('the game over, the name entry and the game from the start again, in the end session', end.ends >= 1 && end.names && end.restarts >= 1);

if (COSTING) {
  const { call } = perCall(rows, { calls: (r) => r.calls });
  const cost = { '@yield': {}, '@to': {}, '@fn': {}, '@irq': {} };
  for (const [k, v] of Object.entries(call)) if (Math.round(v)) cost['@fn'][k] = Math.round(v);
  for (const [k, s] of Object.entries(irqSum)) if (s.n) cost['@irq'][k] = Math.round(s.c / s.n);
  const by = {}, to = {};
  for (const r of rows) {
    let v = r.rest;
    for (const [f, n] of Object.entries(r.calls)) v -= n * (call[f] || 0);
    (by[r.key] = by[r.key] || []).push(v);
    (to[r.to] = to[r.to] || []).push(v);
  }
  const mean = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  for (const [k, a] of Object.entries(by)) cost['@yield'][k] = mean(a);
  for (const [k, a] of Object.entries(to)) cost['@to'][k] = mean(a);
  const sorted = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  for (const k of ['@yield', '@to', '@fn', '@irq']) cost[k] = sorted(cost[k]);
  const file = path.join(__dirname, 'reference/hp-play.js');
  const src = fs.readFileSync(file, 'utf8');
  const out = src.replace(/  const COST = .*;\n/, '  const COST = ' + JSON.stringify(cost) + ';\n');
  check('the costs written into reference/hp-play.js: ' + Object.keys(cost['@yield']).length + ' stretches, ' + Object.keys(cost['@fn']).length + ' routines, ' + Object.keys(cost['@irq']).length + ' interrupt handlers', out !== src || src.includes(JSON.stringify(cost)));
  fs.writeFileSync(file, out);
  delete require.cache[require.resolve(file)];
}

// ---- the pace, on a session the costs were not fitted on, and the page alone
{
  const HP = COSTING ? require(path.join(__dirname, 'reference/hp-play.js')) : HunterPlay;
  const pace = { cost: HP.COST, page: 0, game: 0, missing: new Set(), by: {} };
  session('the pace session, its costs held against the game', 'levels', 29, FRAMES * 4, pace);
  const e = pace.page / pace.game - 1;
  if (process.env.PACE) console.log(Object.entries(pace.by).sort((a, b) => Math.abs(b[1].p - b[1].g) - Math.abs(a[1].p - a[1].g)).slice(0, 15).map(([k, b]) => `${k} n${b.n} page ${Math.round(b.p)} game ${b.g} irq ${b.i}/${Math.round(b.ip)}`).join('\n'));
  check(`the costs against the game's cycles, page/game - 1: ${(e * 100).toFixed(2)} %` +
    (pace.missing.size ? '; no cost for ' + [...pace.missing].slice(0, 8).join(', ') : ''), Math.abs(e) < 0.02 && !pace.missing.size);

  const SOAK = Math.max(8000, FRAMES * 3), missing = new Set(), C = HP.COST;
  const watch = (o) => new Proxy(o, { get: (t, k) => { if (typeof k === 'string' && !(k in t)) missing.add(k); return t[k]; } });
  for (const kind of ['levels', 'end']) {
    let stopped = '';
    const S = HP.create({ M: RAM.slice(), CPU, cost: { '@yield': watch(C['@yield']), '@irq': C['@irq'], '@to': C['@to'], '@fn': C['@fn'] } });
    const input = script(kind, 31);
    for (let g = 0; g < SOAK && !stopped; g++) {
      const o = input.next(S.M, g);
      S.joy = o.joy;
      for (const [a, v] of o.poke) S.M[a] = v;
      try { S.run((g + 1) * HP.FRAME); } catch (err) { stopped = `at frame ${g}: ${err.message}`; }
    }
    check(`the page alone over ${SOAK} frames with the ${kind} input: levels ${[...input.levels].filter((l) => l < 4).sort().map((l) => l + 1).join('')}, ` +
      (stopped ? 'stopped ' + stopped : 'never stopped'), !stopped);
  }
  const bare = [...missing].filter((k) => C['@to'][k.split('>')[1]] === undefined);
  check(`every stretch the page met alone has a cost (${missing.size} pairs of checkpoints by the cost of the stretches ending at the second)` + (bare.length ? ': none for ' + bare.slice(0, 12).join(', ') : ''), bare.length === 0);
}
process.exit(failed ? 1 : 0);
