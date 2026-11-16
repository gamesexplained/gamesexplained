#!/usr/bin/env node
// Hold the Play tab (play.html) against the game: its port of the whole game (reference/pq-core.js and its groups,
// pq-g*.js, loaded as play.html loads them) against the game's own code in the kit's lockstep (kit/c64/lockstep.js),
// its page runtime (reference/pq-play.js) against the game's pace, and its question blocks (reference/pq-blocks.js)
// against the tape.
//
// The game runs on the kit's C64 from the committed listings, as the cassette's hand-over leaves it at $40E2: the
// title part's bytes with the menu's over them, the processor port at $27, the interrupts off. The KERNAL routines
// it calls (IOINIT, SETMSG, SETLFS, SETNAM, LOAD) are hooks: LOAD writes the file the game names, from the files the
// page loads (PopQuizPlay.files: block 1's A, B and C from the quiz listing, FX and the other blocks from
// pq-blocks.js), and leaves as Novaload's exit does. The port runs its whole program from the same place: the
// start-up, the menu, the block's choice and its four loads, and the show. A pass is an arrival at run_show_step
// ($2CF7), where memory, colour RAM and the registers written to the video chip and the SID are compared, all but
// irq_save_a/x/y ($02-$04), where three handlers keep the registers of the program they interrupt, which the port's
// handlers are not given.
//
// The game's own race. fx_start ($4FCB-$5094), which the main program calls to start a sound effect, writes the
// effects' voice tables ($50B5-$50E1) and the SID's filter registers, which the frame interrupt's effects player also
// reads and writes; an interrupt that falls inside fx_start sees them half written, while the port runs fx_start
// whole. A pass whose differences all lie there, with such an interrupt since the pass before, is counted as the
// race, and the port is given the game's bytes; any other difference fails the test.
//
// The input, from fixed seeds, by the machine's frame: in the options the stick up and down, then onto One or Two
// Player Game and fire; in the rest of the menu and the block's choice each port held for 8 frames at a time at
// nothing, a direction or fire (port 2 only with two players); in the show, fire held 75 frames of every 100 and the
// stick moved now and then, port 2 the same with its own numbers when two play.
//
// The pace. The page's clock charges each stretch between two checkpoints what the game's code took there on the kit's
// machine (reference/pq-play.js, COST): checked on these sessions, which the costs were not fitted on, over the
// stretches that do not poll, against the game's cycles, the interrupts with them, within 3 %; then the page alone
// and the kit's machine alone (with the video chip's bad lines and sprite fetches, which the page's clock takes too)
// from the hand-over: to the menu within 1 %, and, with the same input by frame and the same random seed, through
// the menu and the block's choice to the show's first step within 1 %, every change of display state on the way
// alike; and the page alone, given the same input, never stopping and meeting no stretch without a cost.
//   node games/c64/mike-reads-computer-pop-quiz/test_play.js [passes] [--cost] [--soak frames]
// passes: how many arrivals at run_show_step each lockstep session runs to (default 2). With --cost, two sessions on
// other seeds measure the costs and write them into reference/pq-play.js (COST: see its header) before the checks.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/c64/lockstep.js'));
const args = process.argv.slice(2);
const flag = (f) => { const i = args.indexOf(f); if (i < 0) return false; args.splice(i, 1); return true; };
const opt = (f, d) => { const i = args.indexOf(f); if (i < 0) return d; const v = +args[i + 1]; args.splice(i, 2); return v; };
const COSTING = flag('--cost'), SOAK = opt('--soak', 12000);
const PASSES = +args[0] || 2;
let failed = 0;
const check = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) failed++; };
const hex = (n) => '$' + n.toString(16).toUpperCase().padStart(4, '0');

// ---- the page's scripts, as play.html loads them
const g = game(__dirname);
g.lib('cpu6502');                                          // C64Cpu, the 6502 the sound drivers run on
const page = fs.readFileSync(path.join(__dirname, 'play.html'), 'utf8');
const srcs = [...page.matchAll(/<script src="(reference\/pq-[^"]+\.js)"><\/script>/g)].map((x) => x[1]);
const onDisk = fs.readdirSync(path.join(__dirname, 'reference')).filter((f) => /^pq-g\d.*\.js$/.test(f)).sort().map((f) => 'reference/' + f);
const want = ['reference/pq-core.js', ...onDisk, 'reference/pq-blocks.js', 'reference/pq-play.js'];
check('play.html loads pq-core.js, every group in reference/ in order (' + onDisk.length + '), pq-blocks.js and pq-play.js', JSON.stringify(srcs) === JSON.stringify(want));
for (const f of want) require(path.join(__dirname, f));
const Core = globalThis.PopQuizCore, groups = globalThis.PQ_GROUPS, BLOCKS = globalThis.PQ_BLOCKS;
let PopQuizPlay = globalThis.PopQuizPlay;
const { LINE, FRAME } = PopQuizPlay;
check('the groups installed in order: ' + groups.length, groups.length === onDisk.length);
const T = g.listing('parts/title/listing.json'), MN = g.listing('parts/menu/listing.json'), Q = g.listing('parts/quiz/listing.json');
const FILES = PopQuizPlay.files(Q, BLOCKS);
const START = PopQuizPlay.startRam(T, MN);

// ---- the question blocks against the tape: block 1's files from the listing and the rest from pq-blocks.js, each
// hashing as the tape's file did; FX the same as the listing's but for $50DE, a byte the effects player writes
{
  const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
  const names = Object.keys(BLOCKS.sha256).sort();
  const bad = names.filter((k) => !FILES[k] || sha(FILES[k][1]) !== BLOCKS.sha256[k]);
  check('the files the page loads hash as the tape\'s ' + names.length + ' did (FX and A-O): ' + (bad.length ? 'not ' + bad.join(' ') : 'all'),
    !bad.length && names.join(' ') === 'A B C D E F FX G H I J K L M N O');
  const fxDiff = [];
  for (let i = 0; i < 0x500; i++) if (FILES.FX[1][i] !== Q.ram[0x4F00 + i]) fxDiff.push(hex(0x4F00 + i));
  check('block 1: A, B and C are the quiz listing\'s bytes, and FX the listing\'s but for ' + (fxDiff.join(' ') || 'nothing'),
    FILES.A[1].length === 0x1000 && FILES.B[1].length === 0x1800 && FILES.C[1].length === 0x1F00 && fxDiff.join() === '$50DE');
  const at = { FX: 0x4F00, A: 0xE000, D: 0xE000, G: 0xE000, J: 0xE000, M: 0xE000, B: 0xB800, E: 0xB800, H: 0xB800, K: 0xB800, N: 0xB800 };
  const wrong = Object.keys(FILES).filter((k) => FILES[k][0] !== (at[k] || 0xE000));
  check('each file loads where the tape says: ' + (wrong.join(' ') || 'all'), !wrong.length);
}

// ---- the game on the kit's C64, from the hand-over
function kernalHooks(state) {
  return {
    0xFF84: (c) => { c.rts(); },
    0xFF90: (c) => { c.rts(); },
    0xFFBA: (c) => { c.rts(); },
    0xFFBD: (c) => { state.name = ''; for (let i = 0; i < c.a; i++) state.name += String.fromCharCode(c.m[(c.y << 8 | c.x) + i]); c.rts(); },
    0xFFD5: (c) => {
      const f = FILES[state.name];
      if (!f) throw new Error('LOAD of an unknown file ' + JSON.stringify(state.name));
      const [at, bytes] = f;
      for (let i = 0; i < bytes.length; i++) c.m[at + i] = bytes[i];
      state.loads.push(state.name);
      // Novaload's exit ($03BD-$03D3): $01 = $37, the motor flag $C0 = $37, X/Y the end address, then CLI and RTS
      const end = at + bytes.length; c.wrz(1, 0x37); c.m[0xC0] = 0x37; c.x = end & 255; c.y = end >> 8; c.c = 0; c.i = 0;
      c.rts();
    },
  };
}
function machine(o = {}) {
  const m = new Machine(Object.assign({ ram: START.slice(), pc: 0x40E2, port: { dir: 0x2F, data: 0x27 }, cia: true }, o));
  m.kstate = { name: '', loads: [] };
  m.kHooks = kernalHooks(m.kstate);
  Object.assign(m.hooks, m.kHooks);
  return m;
}

// ---- the input, by the machine's frame (what ls.js played): a player for the menu and one for the show
function player(players, seed) {
  let s1 = seed, s2 = seed + 777, s3 = seed * 4321 + players;
  const lcg = (s) => (Math.imul(s, 1103515245) + 12345) >>> 0;
  const r1 = () => (s1 = lcg(s1)) >>> 16, r2 = () => (s2 = lcg(s2)) >>> 16, r3 = () => (s3 = lcg(s3)) >>> 16;
  const show = (f, r, off) => {
    const ph = (f + off) % 100;
    let joy = 0x1F;
    if (ph < 75) joy &= ~0x10;
    else if (ph > 85 && ((f + off) / 100 | 0) % 3 === 1) joy &= ~(1 << (r() & 3));
    return joy;
  };
  let held = [0x1F, 0x1F], opt = 0;
  const pick = () => { const v = r3() % 10; return v < 3 ? 0x1F : v < 8 ? 0x1F & ~(1 << (r3() & 3)) : 0x0F; };
  const st = { inMenu: true };
  // R the memory the game plays on; gives [port 1, port 2]
  st.next = (f, R) => {
    if (st.inMenu) {
      if (R[0x22] === 0) {
        const t = opt++, w = players - 1;
        if (t < 80) return [(t < 40) === (players === 2) ? 0x1D : 0x1E, 0x1F];
        if (R[0x0CB8] !== w) return [w ? 0x1D : 0x1E, 0x1F];
        return [f % 20 < 10 ? 0x0F : 0x1F, 0x1F];
      }
      if (f % 8 === 0) held = [pick(), pick()];
      return [held[0], players === 2 ? held[1] : 0x1F];
    }
    return [show(f, r1, 0), players === 2 ? show(f, r2, 37) : 0x1F];
  };
  return st;
}

// ---- the costs (--cost): gathered from the lockstep as it runs. A stretch's cycles, beyond the busy loops the port
// names and a line for each turn of a polling loop, are fitted as a base for the stretch (its two checkpoints) and a
// cost for each call of one of P's routines in it (aztec-challenge's way: least squares on the normal equations, the
// routines' costs at least 0); the interrupts are measured, handler by handler.
const fit = { idx: new Map(), G: [], h: [] }, ends = new Map();
const fv = (name) => {
  let i = fit.idx.get(name);
  if (i === undefined) { i = fit.idx.size; fit.idx.set(name, i); fit.G.push(new Map()); fit.h.push(0); }
  return i;
};
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
    const gg = fit.G[i];
    for (const [j, b] of row) gg.set(j, (gg.get(j) || 0) + a * b);
  }
}
// each interrupt handler's cycles, by its key (PopQuizPlay.irqKey), after its wait for the raster where it has one;
// where each wait ends in its line; and where each write to the video chip and each sprite pointer falls, from the
// start of the interrupt's line or from the end of the wait
// The costs come from the lockstep's machine, which gives the processor every cycle (the page takes the video chip's
// itself); the places from a machine of their own with the video chip's DMA, as on a C64, since the sprites' fetches
// hold the handlers up just where the panel's rows meet.
const irqStat = { cost: {}, wait: {}, at: {}, ptr: {} }, irqPos = { cost: {}, wait: {}, at: {}, ptr: {} };
const push = (o, k, v) => { (o[k] = o[k] || []).push(v); };
const median = (v) => { const s = v.slice().sort((a, b) => a - b); return s[s.length >> 1]; };

// The interrupts on the machine: the handler of each, its cycles, and (when gathering) its writes' places. The page's
// cost for each, for the pace check: its own wait for the raster, worked out from where it was taken as the page
// works it out, and the handler's cost.
function watchIrqs(m, cost, gather) {
  const W = PopQuizPlay.WAITS, C = cost ? cost['@irq'] || {} : {}, WA = cost ? cost['@wait'] || {} : {};
  const stack = [];
  let modelled = 0;
  const prevI = m.onInterrupt, prevR = m.onReturn;
  m.onInterrupt = (mm, v) => {
    if (prevI) prevI(mm, v);
    const R = mm.ram, at = R[0xFFFE] | R[0xFFFF] << 8, key = PopQuizPlay.irqKey(R, at), c0 = mm.cpu.cycles;
    const q = { at, key, c0, base: c0 - c0 % LINE, exit: -1, writes: [], ptr: [] };
    if (W[at]) q.line = R[W[at]];
    stack.push(q);
    if (cost) {
      let wait = 0;
      if (W[at]) {
        const f0 = c0 - c0 % FRAME, ex = WA[at.toString(16)] || 5;
        let t = f0 + R[W[at]] * LINE + ex;
        if (t < c0 + 20) t += FRAME;
        wait = t - c0;
      }
      const k = C[key] !== undefined ? C[key] : C[at.toString(16)] !== undefined ? C[at.toString(16)] : C.all || 0;
      modelled += wait + k;
    }
  };
  m.onReturn = (mm, v, n) => {
    if (prevR) prevR(mm, v, n);
    const q = stack.pop();
    if (!q || !gather) return;
    const after = q.exit >= 0 ? n - (q.exit - q.c0) : n;
    push(gather.cost, q.key, after);
    if (q.exit >= 0) push(gather.wait, q.at.toString(16), q.exit - (q.c0 - q.c0 % FRAME) - q.line * LINE);
    const base = q.exit >= 0 ? q.exit : q.base;
    const rel = q.writes.map((c) => c - base);
    const k = q.key;
    (gather.at[k] = gather.at[k] || []).push(rel);
    for (const [i, c] of q.ptr) push(gather.ptr, k + ':' + i, c - base);
  };
  if (gather) {
    // the end of the two handlers' waits for the raster
    for (const [h, e] of [[0x0403, 0x040E], [0x047D, 0x0488]]) {
      const prev = m.hooks[e];
      m.hooks[e] = (c) => { const q = stack[stack.length - 1]; if (q && q.at === h && q.exit < 0) q.exit = c.cycles; return prev ? prev(c) : false; };
    }
    // the video chip's writes and CIA 2's port A, as the page keeps them, in the cycle each is made
    const w = m.ioWrite.bind(m);
    m.ioWrite = (a, v) => {
      const q = stack[stack.length - 1];
      if (q && ((a >= 0xD000 && a < 0xD400 && ![0x12, 0x19, 0x1A].includes(a & 0x3F) && (a & 0x3F) < 0x2F) || a === 0xDD00 || a === 0xDD02)) q.writes.push(m.cpu.cycles - 1);
      return w(a, v);
    };
    // the stores to the sprite pointers in the title part's code: sta/stx/sty absolute, and sta absolute,x/y
    const R = m.ram;
    for (let a = 0x0400; a < 0x4000; a++) {
      const op = R[a], base = R[a + 1] | R[a + 2] << 8;
      if (!T.has[a] || base < 0x5F00 || base > 0x5FFF) continue;
      const kind = { 0x8D: 0, 0x8E: 0, 0x8C: 0, 0x9D: 'x', 0x99: 'y' }[op];
      if (kind === undefined) continue;
      const prev = m.hooks[a];
      m.hooks[a] = (c) => {
        const q = stack[stack.length - 1];
        if (q && c.m[c.pc] === op) {
          const t = (base + (kind ? c[kind] : 0)) & 0xFFFF;
          if (t >= 0x5FF8 && t <= 0x5FFF) q.ptr.push([t - 0x5FF8, c.cycles + (kind ? 4 : 3)]);
        }
        return prev ? prev(c) : false;
      };
    }
  }
  return { take: () => { const x = modelled; modelled = 0; return x; } };
}

// ---- one lockstep session from the hand-over
// pace, when given ({ cost, page, game, missing }), adds up the cycles the page's clock gives each stretch (its cost,
// the busy loops the port names, a line for each turn of a polling loop, the interrupts at their cost) and the cycles
// the game took, interrupts and all
function session(name, players, seed, passes, pace) {
  const m = machine(), input = player(players, seed);
  const P = Core.makePort(new Uint8Array(0x10000), groups, { files: FILES, cpu: { CPU: globalThis.C64Cpu.CPU } });
  P.cpuPort = m.cpu.pdata;
  P.clocked = true;
  const irqs = {};
  for (const a of Object.keys(P.irqs)) irqs[a] = P.irqs[a];
  const iw = watchIrqs(m, pace ? pace.cost : null, COSTING && !pace ? irqStat : null);
  let compared = 0;
  const ls = new Lockstep({
    machine: m, port: P, program: (p) => p.program(), passAt: 0x2CF7, entry: 0x40E2, checkpoints: [...P.checkpoints], irqs,
    hooks: m.kHooks, ignore: [[0x02, 0x04]], chips: ['colour', 'vic', 'sid'], irqBytes: [0xFF, 0x075F, 0x23], maxFrames: 20000,
    timing: (t) => {
      const key = t.from.toString(16) + '>' + t.to.toString(16), irqModel = iw.take();
      // a stretch that polls: the game's own cycles after the port's last turn of the loop (the work before the
      // loop and the wait itself come round in the lines the page's clock runs to; the work after it, such as a
      // question built once the interrupt has banked the ROMs out, is the stretch's cost); else all its own cycles
      const own = t.polls ? (m.cpu.cycles - lastPoll.c) - (ls.irqCycles - lastPoll.i) : t.cycles - t.estimate;
      if (COSTING && !pace && !t.wait) sample(key, t.polls ? {} : t.calls, own);
      if (pace && !t.wait) {
        const c = pace.cost['@yield'][key], e = pace.cost['@to'][t.to.toString(16)];
        if (c === undefined && e === undefined) pace.missing.add(key);
        // the page's clock against the game's cycles, where the costs decide it: the stretches that do not poll,
        // with the interrupts that fell in them (a polling stretch ends where the interrupt lets it, on both)
        if (!t.polls) {
          let cc = c !== undefined ? c : e !== undefined ? e : LINE;
          for (const [f, n] of Object.entries(t.calls || {})) cc += n * (pace.cost['@fn'][f] || 0);
          pace.page += Math.max(0, cc) + t.estimate + irqModel;
          pace.game += t.cycles + t.irqCycles;
          pace.stretches++;
        }
      }
    },
  });
  // where the game stood at the port's last turn of a polling loop
  let lastPoll = { c: 0, i: 0 };
  const poll = ls.poll;
  ls.poll = function () { const r = poll.call(this); lastPoll = { c: m.cpu.cycles, i: this.irqCycles }; return r; };
  // the game's race in fx_start: an interrupt taken inside it, since the pass before
  let raced = false, races = 0, other = 0;
  const prevI = m.onInterrupt;
  m.onInterrupt = (mm, v) => { if (prevI) prevI(mm, v); if (mm.depth === 0 && mm.cpu.pc >= 0x4FCB && mm.cpu.pc <= 0x5094) raced = true; };
  const inRace = (b) => b.chip === 'sid' || (!b.chip && b.address >= 0x50B5 && b.address <= 0x50E1);
  const t0 = Date.now();
  const r = ls.run({
    passes, stopOnDiff: false,
    onFrame: (f, mm) => { const j = input.next(f, mm.ram); mm.joy1 = j[0]; mm.joy = j[1]; },
    onPass: (n, mm, l) => {
      input.inMenu = false; compared++;
      const d = l.res.diffs[l.res.diffs.length - 1];
      if (d && d.pass === n && !d.counted) {
        d.counted = true;
        if (raced && d.bytes.length === d.count && d.bytes.every(inRace)) races++;
        else { other++; l.stopped = true; }
      }
      raced = false;
    },
  });
  const ok = !other && !r.diverged && r.passes >= passes && /^FX(ABC|DEF|GHI|JKL|MNO)$/.test(m.kstate.loads.join('')) && P.kstate.loads.join('') === m.kstate.loads.join('');
  check(`${name}: from the hand-over through the menu, a block's loads (${m.kstate.loads.join(' ')}) and ${r.passes} passes of the show in ${m.frames} frames; ` +
    `memory and chips the same at every pass but ${races} where the game raced in fx_start (${((Date.now() - t0) / 1000).toFixed(0)} s)`, ok);
  if (!ok) console.log((Array.isArray(describe(r)) ? describe(r) : [describe(r)]).join('\n'));
  return { m, P };
}

// ---- the costs (--cost): two sessions on seeds of their own, then the fit, written into reference/pq-play.js
if (COSTING) {
  session('costs, one player', 1, 101, Math.max(14, PASSES + 3));
  session('costs, two players', 2, 202, Math.max(14, PASSES + 3));
  const names = [...fit.idx.keys()], d = names.length, w = new Float64Array(d);
  const Gm = fit.G.map((gg) => [...gg]);
  for (let it = 0; it < 4000; it++) {
    let moved = 0;
    for (let i = 0; i < d; i++) {
      let gr = -fit.h[i], gii = 0;
      for (const [j, a] of Gm[i]) { gr += a * w[j]; if (j === i) gii = a; }
      if (!gii) continue;
      let x = w[i] - gr / gii;
      if (names[i][0] === 'f' && x < 0) x = 0;
      moved = Math.max(moved, Math.abs(x - w[i])); w[i] = x;
    }
    if (moved < 1e-3) break;
  }
  const cost = { '@yield': {}, '@to': {}, '@fn': {}, '@irq': {}, '@wait': {}, '@at': {}, '@ptr': {} };
  names.forEach((n, i) => {
    if (n[0] === 'k') cost['@yield'][n.slice(2)] = Math.round(w[i]);
    else if (Math.round(w[i])) cost['@fn'][n.slice(2)] = Math.round(w[i]);
  });
  for (const [to, e] of ends) {
    let r = e.r;
    for (const [f, c] of Object.entries(e.calls)) r -= c * (cost['@fn'][f] || 0);
    cost['@to'][to] = Math.round(r / e.n);
  }
  let all = 0, n = 0;
  for (const [k, v] of Object.entries(irqStat.cost)) { cost['@irq'][k] = Math.round(v.reduce((a, b) => a + b, 0) / v.length); all += v.reduce((a, b) => a + b, 0); n += v.length; }
  cost['@irq'].all = Math.round(all / Math.max(1, n));
  // the places, on a machine of their own with the video chip's DMA, from the hand-over through the show
  for (const players of [1, 2]) {
    const mp = machine({ dma: true }), ip = player(players, 303 + players);
    watchIrqs(mp, null, irqPos);
    for (let f = 0; f < 12000; f++) {
      if (mp.ram[0x33FE]) ip.inMenu = false;
      const j = ip.next(f, mp.ram); mp.joy1 = j[0]; mp.joy = j[1];
      mp.runFrames(1);
    }
  }
  for (const [k, v] of Object.entries(irqPos.wait)) cost['@wait'][k] = median(v);
  for (const [k, runs] of Object.entries(irqPos.at)) {
    const len = runs.reduce((a, r) => Math.max(a, r.length), 0), out = [];
    for (let i = 0; i < len; i++) out.push(median(runs.filter((r) => r.length > i).map((r) => r[i])));
    if (out.length) cost['@at'][k] = out;
  }
  for (const [ki, v] of Object.entries(irqPos.ptr)) {
    const [k, i] = ki.split(':');
    (cost['@ptr'][k] = cost['@ptr'][k] || [])[+i] = median(v);
  }
  const sorted = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  for (const k of Object.keys(cost)) cost[k] = sorted(cost[k]);
  const file = path.join(__dirname, 'reference/pq-play.js');
  const src = fs.readFileSync(file, 'utf8');
  const out = src.replace(/^  const COST = .*;$/m, () => '  const COST = ' + JSON.stringify(cost) + ';');
  check('the costs written into reference/pq-play.js: ' + Object.keys(cost['@yield']).length + ' stretches, ' + Object.keys(cost['@fn']).length +
    ' routines, ' + Object.keys(cost['@irq']).length + ' interrupts', out !== src || src.includes(JSON.stringify(cost)));
  fs.writeFileSync(file, out);
  delete require.cache[require.resolve(file)];
  require(file);
  PopQuizPlay = globalThis.PopQuizPlay;
}

// ---- the port in lockstep with the game, one player and two, with the pace's sums on the way
const C = PopQuizPlay.COST;
const pace = { cost: Object.assign({ '@yield': {}, '@to': {}, '@fn': {}, '@irq': {}, '@wait': {} }, C), page: 0, game: 0, stretches: 0, missing: new Set() };
session('one player', 1, 12345, PASSES, pace);
session('two players', 2, 777, PASSES, pace);
const off = pace.page / pace.game - 1;
check(`the page's costs against the game's cycles over the ${pace.stretches} stretches of both sessions, which the costs were not fitted on: ` +
  `${(off * 100).toFixed(2)} %` + (pace.missing.size ? `; no cost for ${pace.missing.size} pairs of checkpoints, ${[...pace.missing].slice(0, 6).join(', ')}` : ''),
Math.abs(off) < 0.03);

// ---- the start: from the hand-over to the menu's options on the screen (menu_flow's screen_on_sync at $E5B0, before
// it waits for the stick), on the page and on the kit's machine with the video chip's bad lines
{
  const m = machine({ dma: true });
  let gameAt = -1, pageAt = -1, f = 0;
  const h = m.hooks[0xE5B0];
  m.hooks[0xE5B0] = (c) => { if (gameAt < 0) gameAt = m.frames; return h ? h(c) : false; };
  const S = PopQuizPlay.create({ M: START.slice(), files: FILES, groups, onYield: (y) => { if (y && y.cp === 0xE5B0 && pageAt < 0) pageAt = S.frames; } });
  for (f = 0; f < 2000 && (gameAt < 0 || pageAt < 0); f++) { if (gameAt < 0) m.runFrames(1); if (pageAt < 0) S.run((f + 1) * FRAME); }
  check(`from the hand-over to the menu: frame ${pageAt} on the page, ${gameAt} on the machine`, gameAt > 0 && pageAt > 0 && Math.abs(pageAt / gameAt - 1) < 0.01);
}

// ---- the menu and the block's load, on the page and on the kit's machine with the video chip's bad lines and
// sprites, each alone, with the same input by frame and the random seed set to the same value on both where
// menu_start has read it from voice 3 ($E330; the page's oscillator and the machine's are read on different cycles):
// the frame each display state begins in, through the options, the subjects, the teams, the credits and the block's
// choice, to the show's first step, within 1 % (the loads take no time on either here)
for (const players of [1, 2]) {
  const m = machine({ dma: true });
  const seed = (R) => { R[0x46] = 0x5A; R[0x47] = 0xA5; };
  let gameAt = -1, pageAt = -1;
  const h = m.hooks[0xE330];
  m.hooks[0xE330] = (c) => { seed(m.ram); return h ? h(c) : false; };
  const S = PopQuizPlay.create({ M: START.slice(), files: FILES, groups, loadCycles: 0, onYield: (y) => {
    if (y && y.cp === 0xE330) seed(S.M);
    if (y && y.cp === 0x2CF7 && pageAt < 0) pageAt = Math.floor(S.clock / FRAME);
  } });
  const h2 = m.hooks[0x2CF7];
  m.hooks[0x2CF7] = (c) => { if (gameAt < 0) gameAt = m.frames; return h2 ? h2(c) : false; };
  const ia = player(players, 4242), ib = player(players, 4242);
  const states = [[], []], last = [-1, -1];
  const note = (k, R, f) => { if (R[0x22] !== last[k]) { last[k] = R[0x22]; states[k].push(f); } };
  for (let f = 0; f < 8000 && (gameAt < 0 || pageAt < 0); f++) {
    let j = ia.next(f, m.ram); m.joy1 = j[0]; m.joy = j[1];
    m.runFrames(1); note(0, m.ram, f);
    j = ib.next(f, S.M); S.joy[0] = j[0]; S.joy[1] = j[1];
    S.run((f + 1) * FRAME); note(1, S.M, f);
  }
  const n = Math.min(states[0].length, states[1].length);
  let worst = 0;
  for (let i = 1; i < n; i++) worst = Math.max(worst, Math.abs(states[1][i] - states[0][i]));
  check(`${players === 1 ? 'one player' : 'two players'}, the menu to the show alone: the show's first step at frame ${pageAt} on the page and ${gameAt} on the machine; ` +
    `${n} changes of display state, each within ${worst} frames of the machine's`, gameAt > 0 && pageAt > 0 && Math.abs(pageAt / gameAt - 1) < 0.01 && states[0].length === states[1].length);
}

// ---- the page alone, given the same input by its own frame, never stops, and every stretch it meets has a cost
{
  const missing = new Set();
  const watch = (o) => new Proxy(o, { get: (t, k) => { if (typeof k === 'string' && !(k in t)) missing.add(k); return t[k]; } });
  for (const players of [1, 2]) {
    const input = player(players, players === 1 ? 12345 : 777);
    const S = PopQuizPlay.create({ M: START.slice(), files: FILES, groups, cost: Object.assign({}, C, { '@yield': watch(C['@yield'] || {}) }) });
    let stopped = '', passes = 0, blocks = 0;
    for (let f = 0; f < SOAK && !stopped; f++) {
      if (S.M[0x33FE] && input.inMenu) input.inMenu = false;
      const j = input.next(f, S.M);
      S.joy[0] = j[0]; S.joy[1] = j[1];
      try { S.run((f + 1) * FRAME); } catch (e) { stopped = `at frame ${f}: ${e.message}`; }
      if (S.loading) blocks = S.loading;
      passes = S.M[0x0751];
    }
    check(`the page alone over ${SOAK} frames with ${players === 1 ? 'one player' : 'two players'}' input: block ${blocks} loaded, show step ${passes}, ` +
      (stopped ? 'stopped ' + stopped : 'never stopped'), !stopped && blocks >= 1);
  }
  const bare = [...missing].filter((k) => (C['@to'] || {})[k.split('>')[1]] === undefined);
  check(`every stretch the page met alone has a cost (${missing.size} pairs of checkpoints by the cost of the stretches ending at the second)` +
    (bare.length ? ': none for ' + bare.slice(0, 12).join(', ') : ''), bare.length === 0);
}
process.exit(failed ? 1 : 0);
