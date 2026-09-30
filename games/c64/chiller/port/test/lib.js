'use strict';
// Checking a routine of the port against the game's own, on thousands of states made from real
// moments of play (kit/skills/core/70-minisite, "Test each routine alone first"). The game's
// routine runs in the kit's simulator (cpu.call) and the port's in P, each on its own copy of the
// same memory and chips; then all of memory (but the processor port and the stack page), the
// chips as they are left, the order of the writes to the video chip, the SID and CIA 1, and the
// registers the routine leaves are compared.
//
// const { check } = require('./lib.js');
// check({ name: 'try_move', groups: ['player'], cases: 3000,
//         setup: (M, chips, rnd, st) => ({ a: rnd(4) }),       // may change M and chips; gives the registers
//         outs: ['a', 'x', 'y'] });
// setup's rnd(n) is an integer below n (rnd() a fraction). chips.game.keys (a Set) and
// chips.game.joy are the keyboard and the stick both sides read. Registers named in outs are
// compared (default a, x, y); ignore lists addresses or [first, last] ranges left out.
// A routine that is a generator is run to its end; each { wait: line } it yields sets both
// chips' raster to that line (the game's side is given the line as it polls), and a bare yield
// runs the given poll(M) (for a wait on memory an interrupt would change).
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '../../../..');
const { CPU } = require(path.join(REPO, 'kit/c64/cpu6502.js'));
const { PortChips } = require(path.join(REPO, 'kit/c64/lockstep.js'));
require(path.join(ROOT, 'src/kernal.js'));
require(path.join(ROOT, 'src/core.js'));
const K = globalThis.ChillerKernal;

const LISTING = JSON.parse(fs.readFileSync(path.join(REPO, 'games/c64/chiller/listing.json'), 'utf8'));
const labels = LISTING.records.filter(r => r.t === 'code' && r.l).map(r => [r.l, r.a]);
const addrOf = Object.fromEntries(labels);

function loadGroups() {
  for (const f of fs.readdirSync(path.join(ROOT, 'src'))) if (/^g-.*\.js$/.test(f)) require(path.join(ROOT, 'src', f));
}

// Moments of play, saved by scripts/gen-states.js.
let STATES = null;
function states() {
  if (STATES) return STATES;
  const dir = path.join(ROOT, '../work/states');
  STATES = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => {
    const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    return { name: f, ram: new Uint8Array(Buffer.from(s.ram, 'base64')), vic: s.vic, colour: new Uint8Array(Buffer.from(s.colour, 'base64')),
      pra: s.pra, ddra: s.ddra, ddrb: s.ddrb, cmp: s.cmp, enable: s.enable, joy: s.joy, keys: s.keys || [], coll: s.coll || [0, 0] };
  });
  return STATES;
}

function kernalHooks(k) {
  return {
    0xFFD2: c => { K.chrout(k, c.a); c.c = 0; c.rts(); },
    0xFFF0: c => { if (!c.c) K.plot(k, c.x, c.y); c.rts(); },
  };
}
function kOf(M, io) {
  return { M, colourRead: i => io.colourRead(i), colourWrite: (i, v) => io.colourWrite(i, v), vicRead: r => io.vicRead(r),
    vicWrite: (r, v) => io.vicWrite(r, v), ciaRead: r => io.ciaRead(r), ciaWrite: (r, v) => io.ciaWrite(r, v) };
}
function ioOf(c) {
  const rd = a => c.ioRead(a & 0xFFFF), wr = (a, v) => c.ioWrite(a & 0xFFFF, v & 0xFF);
  return {
    read: rd, write: wr,
    vicRead: r => rd(0xD000 | (r & 0x3F)), vicWrite: (r, v) => wr(0xD000 | (r & 0x3F), v),
    sidRead: r => rd(0xD400 | (r & 0x1F)), sidWrite: (r, v) => wr(0xD400 | (r & 0x1F), v),
    colourRead: i => c.colour[i & 0x3FF], colourWrite: (i, v) => wr(0xD800 | (i & 0x3FF), v),
    ciaRead: r => rd(0xDC00 | (r & 0x0F)), ciaWrite: (r, v) => wr(0xDC00 | (r & 0x0F), v),
    cia2Read: r => rd(0xDD00 | (r & 0x0F)), cia2Write: (r, v) => wr(0xDD00 | (r & 0x0F), v),
  };
}

// The game's routine at address, on P's memory and chips, for a routine not yet ported: the
// kit's standIn with the KERNAL banked in and its stand-ins hooked.
const cpus = new WeakMap();
function standIn(P, address) {
  return function (r) {
    let cpu = cpus.get(P);
    if (!cpu) {
      cpu = new CPU(P.M, { port: { dir: 0x2F, data: 0x36 }, io: { read: a => P.io.read(a), write: (a, v) => P.io.write(a, v) } });
      cpu.hooksK = kernalHooks(P.k);
      cpus.set(P, cpu);
    }
    r = r || {};
    const regs = { d: 0 };
    for (const k of ['a', 'x', 'y', 'n', 'v', 'd', 'i', 'z', 'c']) if (r[k] !== undefined) regs[k] = r[k];
    cpu.setRegs(regs);
    cpu.sp = 0xFF;
    cpu.active = true;
    try { cpu.call(address, {}, { hooks: cpu.hooksK, maxSteps: 2e6 }); } finally { cpu.active = false; }
    return { a: cpu.a, x: cpu.x, y: cpu.y, n: cpu.n, v: cpu.v, z: cpu.z, c: cpu.c };
  };
}

function chipsFrom(st, game) {
  const c = new PortChips();
  c.vic.set(st.vic.slice(0, 0x40)); c.colour.set(st.colour);
  for (const k of ['pra', 'ddra', 'ddrb', 'cmp', 'enable']) if (st[k] !== undefined) c[k] = st[k];
  c.game = game;
  c.raster = 0;
  return c;
}
function cloneChips(c, game) {
  const d = new PortChips();
  d.vic.set(c.vic); d.colour.set(c.colour); d.sidw.set(c.sidw);
  for (const k of ['pra', 'ddra', 'ddrb', 'cmp', 'enable', 'latch', 'raster']) d[k] = c[k];
  d.game = game;
  return d;
}
// The writes a routine makes to the video chip, the SID and CIA 1, in order; a
// read-modify-write's two writes to one register count as one.
function logWrites(c, cpuOf) {
  const log = [], w = c.ioWrite.bind(c);
  c.ioWrite = (a, v) => {
    if (a < 0xD800 || (a >= 0xDC00 && a < 0xDD00)) {
      const cpu = cpuOf && cpuOf(), key = cpu ? cpu.opc + ':' + cpu.cycles : null;
      const l = log[log.length - 1];
      if (key !== null && l && l[0] === a && l[2] === key) l[1] = v; else log.push([a, v, key]);
    }
    w(a, v);
  };
  return log;
}

const hex = (v, n = 4) => '$' + (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
function makeRnd(seed) {
  let s = seed >>> 0 || 1;
  const f = n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; const x = s / 4294967296; return n === undefined ? x : Math.floor(x * n); };
  return f;
}

function check(o) {
  loadGroups();
  const entry = o.entry !== undefined ? o.entry : addrOf[o.name];
  if (entry === undefined) throw new Error('check: no label ' + o.name);
  const outs = o.outs || ['a', 'x', 'y'];
  const skip = new Uint8Array(65536);
  skip.fill(1, 0, 2); skip.fill(1, 0x100, 0x200);
  for (const x of o.ignore || []) if (Array.isArray(x)) skip.fill(1, x[0], x[1] + 1); else skip[x] = 1;
  const rnd = makeRnd(o.seed || 1);
  const all = states().filter(o.states || (() => true));
  const cases = o.cases || 2000;
  let fails = 0, shown = 0;
  const reached = new Uint8Array(65536);
  for (let n = 0; n < cases; n++) {
    const st = all[rnd(all.length)];
    const M0 = st.ram.slice();
    const game = { keys: new Set(st.keys), joy: st.joy === undefined ? 0x1F : st.joy };
    const c0 = chipsFrom(st, game);
    c0.raster = rnd(312);
    const given = (o.setup ? o.setup(M0, c0, rnd, st) : null) || {};
    // registers the setup leaves open are random, the same on both sides: a routine gives back
    // the registers it does not change as they came
    const regs = Object.assign({ a: rnd(256), x: rnd(256), y: rnd(256), c: rnd(2) }, given);
    // the game
    let cpu = null;
    const MA = M0.slice(), cA = cloneChips(c0, game), logA = logWrites(cA, () => cpu), ioA = ioOf(cA);
    // the game's side: the raster moves on a line at each read of it, so a wait for a line ends
    const rd0 = cA.ioRead.bind(cA);
    cA.ioRead = a => { if (a === 0xD012 || a === 0xD011) { const v = rd0(a); if (a === 0xD012) cA.raster = (cA.raster + 1) % 312; return v; } return rd0(a); };
    cpu = new CPU(MA, { port: { dir: 0x2F, data: 0x36 }, io: { read: a => ioA.read(a), write: (a, v) => ioA.write(a, v) } });
    const hooks = kernalHooks(kOf(MA, ioA));
    if (o.hooks) Object.assign(hooks, o.hooks(MA, cA));
    const set = { d: 0 };
    for (const k of ['a', 'x', 'y', 'c', 'z', 'n', 'v']) if (regs[k] !== undefined) set[k] = regs[k];
    cpu.setRegs(set); cpu.sp = 0xFF;
    let gerr = null;
    try { cpu.call(entry, {}, { hooks, maxSteps: o.maxSteps || 2e6, executed: reached }); } catch (e) { gerr = e; }
    const rA = { a: cpu.a, x: cpu.x, y: cpu.y, c: cpu.c, z: cpu.z, n: cpu.n, v: cpu.v };
    // the port
    let P = null;
    const MB = M0.slice(), cB = cloneChips(c0, game), logB = logWrites(cB, () => { const c = P && cpus.get(P); return c && c.active ? c : null; }), ioB = ioOf(cB);
    P = globalThis.ChillerPort.makePort(MB, ioB, { standIn, labels, only: o.groups });
    let rB, perr = null;
    try {
      rB = P[o.name](Object.assign({}, regs));
      if (rB && typeof rB.next === 'function') {
        const it = rB; let y;
        let guard = 0;
        while (!(y = it.next()).done) {
          if (++guard > 1e6) throw new Error('the generator never ended');
          const v = y.value;
          if (v && v.wait !== undefined) cB.raster = v.wait;
          else if (!v || (v.cycles === undefined && v.cp === undefined)) { if (o.poll) o.poll(MB, cB); }
        }
        rB = y.value;
      }
      rB = rB || {};
    } catch (e) { perr = e; }
    // compare
    const diffs = [];
    if (gerr || perr) diffs.push('game ' + (gerr ? 'threw: ' + gerr.message : 'ran') + '; port ' + (perr ? 'threw: ' + (perr.stack || perr.message).split('\n').slice(0, 3).join(' | ') : 'ran'));
    if (!gerr && !perr) {
      let nd = 0;
      for (let a = 0; a < 65536; a++) if (!skip[a] && MA[a] !== MB[a]) { if (nd++ < 12) diffs.push(hex(a) + ' game ' + hex(MA[a], 2) + ' port ' + hex(MB[a], 2)); }
      if (nd > 12) diffs.push('... ' + nd + ' bytes in all');
      for (let i = 0; i < 0x400; i++) if ((cA.colour[i] & 15) !== (cB.colour[i] & 15)) { diffs.push('colour ' + hex(0xD800 + i) + ' game ' + cA.colour[i] + ' port ' + cB.colour[i]); break; }
      const la = logA.map(w => hex(w[0]) + '=' + hex(w[1], 2)).join(' '), lb = logB.map(w => hex(w[0]) + '=' + hex(w[1], 2)).join(' ');
      if (la !== lb) diffs.push('chip writes: game [' + la.slice(0, 300) + '] port [' + lb.slice(0, 300) + ']');
      for (const k of outs) if (rB[k] === undefined || (rB[k] & 0xFF) !== (rA[k] & 0xFF)) diffs.push('register ' + k + ': game ' + rA[k] + ' port ' + rB[k]);
    }
    if (diffs.length) {
      fails++;
      if (shown++ < (o.show || 3)) {
        console.log('  x case ' + n + ' (' + st.name + ', regs ' + JSON.stringify(regs) + '):');
        for (const d of diffs) console.log('      ' + d);
      }
    }
  }
  let lines = 0, hit = 0;
  if (o.range) for (let a = o.range[0]; a <= o.range[1]; a++) { const r = byAddr.get(a); if (r) { lines++; if (reached[a]) hit++; } }
  console.log((fails ? 'FAIL ' : 'ok   ') + o.name + ': ' + (cases - fails) + '/' + cases + ' cases identical' +
    (o.range ? ', ' + hit + '/' + lines + ' instructions of ' + hex(o.range[0]) + '-' + hex(o.range[1]) + ' reached' : ''));
  return { fails, cases, reached };
}
const byAddr = new Map(LISTING.records.filter(r => r.t === 'code').map(r => [r.a, r]));

module.exports = { check, states, standIn, labels, addrOf, makeRnd, hex, LISTING, ioOf, kOf, kernalHooks, loadGroups };
