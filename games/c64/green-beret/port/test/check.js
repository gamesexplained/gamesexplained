'use strict';
// A routine of the port checked alone against the game's own, on thousands of states made from the
// moments of play in work/states (kit/skills/core/70-minisite/play.md, "Test each routine alone
// first"). The game's routine runs in the kit's simulator (cpu.call) and the port's in P, each on its
// own copy of the same memory and chips; then all of memory (but the processor port and the part of
// the stack page the stack uses, $01D4-$01FF: the game keeps its virtual sprites below), colour RAM, the order of the writes to the video chip, the SID and CIA 1, and the
// registers named in outs are compared. Routines the port has not written are the game's code on
// both sides (standin.js).
//
//   const { check } = require('./check.js');
//   check({ name: 'tile_ptr', cases: 3000, setup: (M, chips, rnd, st) => ({ a: rnd(256) }), outs: ['a', 'x'] });
// setup's rnd(n) is an integer below n (rnd() a fraction); it may change M and the chips, and gives
// the registers (those it leaves out are random, the same on both sides). ignore lists addresses
// or [first, last] ranges left out; states filters the moments by name; onPort(P) may change the
// port once it is made; irq runs the port's routine as the interrupt's (P.inIrq); entry calls an
// address with no label; timing({ cycles, N, st, regs }) gets
// each identical case's cycles on the game and the port's counts of its work (scripts/time-routines.js).
const path = require('path');
const lib = require('./lib.js');
const { CPU } = require(path.join(lib.REPO, 'kit/cpu/cpu6502.js'));
const { PortChips } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));
const standin = require('./standin.js');
const { loadPort } = require('./port.js');

let STATES = null;
function moments(filter) {
  if (!STATES) {
    STATES = lib.states().map(f => {
      const s = lib.readState(f);
      return { name: f, ram: new Uint8Array(Buffer.from(s.ram, 'base64')), colour: new Uint8Array(Buffer.from(s.colour, 'base64')), s };
    });
  }
  return STATES.filter(st => !filter || (typeof filter === 'function' ? filter(st) : st.name.includes(filter)));
}
function chipsFrom(st, game) {
  const c = new PortChips(), s = st.s;
  c.vic.set(s.vic.slice(0, 0x40)); c.colour.set(st.colour); if (s.sidw) c.sidw.set(s.sidw);
  for (const k of ['pra', 'ddra', 'ddrb', 'cmp', 'enable', 'latch']) if (s[k] !== undefined) c[k] = s[k];
  if (s.cia) c.cia = JSON.parse(JSON.stringify(s.cia));
  c.game = game; c.raster = 0;
  return c;
}
function cloneChips(c, game) {
  const d = new PortChips();
  d.vic.set(c.vic); d.colour.set(c.colour); d.sidw.set(c.sidw);
  for (const k of ['pra', 'ddra', 'ddrb', 'cmp', 'enable', 'latch', 'raster']) d[k] = c[k];
  if (c.cia) d.cia = JSON.parse(JSON.stringify(c.cia));
  d.game = game;
  return d;
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
// the writes to the video chip, the SID and CIA 1, in order
function logWrites(c) {
  const log = [], w = c.ioWrite.bind(c);
  c.ioWrite = (a, v) => { if (a < 0xD800 || (a >= 0xDC00 && a < 0xDD00)) log.push([a, v]); w(a, v); };
  return log;
}
function makeRnd(seed) {
  let s = seed >>> 0 || 1;
  return n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; const x = s / 4294967296; return n === undefined ? x : Math.floor(x * n); };
}
const hex = lib.hex, hex2 = v => '$' + (v & 255).toString(16).toUpperCase().padStart(2, '0');
// The places the game JMPs to far from where it was called (standin.js, JUMPS): the game's side stops
// there, as the port's throws P.jump, and the two are compared as they stand.
class Jumped { constructor(go) { this.go = go; } }

function check(o) {
  const SF = loadPort();
  const names = standin.labels();
  const entry = o.entry !== undefined ? o.entry : names.get(o.name);
  if (entry === undefined) throw new Error('check: no label ' + o.name);
  const outs = o.outs || ['a', 'x', 'y'];
  const skip = new Uint8Array(65536);
  skip.fill(1, 0, 2); skip.fill(1, 0x1D4, 0x200);
  for (const x of o.ignore || []) if (Array.isArray(x)) skip.fill(1, x[0], x[1] + 1); else skip[x] = 1;
  const rnd = makeRnd(o.seed || 1);
  const all = moments(o.states);
  const cases = o.cases || 1000;
  let fails = 0, shown = 0;
  for (let n = 0; n < cases; n++) {
    const st = all[rnd(all.length)];
    const M0 = st.ram.slice();
    const game = { keys: new Set(st.s.keys || []), joy: st.s.joy === undefined ? 0x1F : st.s.joy, joy1: 0x1F, cpu: { cycles: 0 } };
    const c0 = chipsFrom(st, game);
    const port = o.port !== undefined ? o.port : st.s.cpu.pdata;
    const given = (o.setup ? o.setup(M0, c0, rnd, st) : null) || {};
    const regs = Object.assign({ a: rnd(256), x: rnd(256), y: rnd(256), c: rnd(2) }, given);
    // the game
    const MA = M0.slice(), cA = cloneChips(c0, game), logA = logWrites(cA), ioA = ioOf(cA);
    const cpu = new CPU(MA, { port: { dir: 0x2F, data: port }, io: { read: a => ioA.read(a), write: (a, v) => ioA.write(a, v) } });
    const set = { d: 0 };
    for (const k of ['a', 'x', 'y', 'c', 'z', 'n', 'v']) if (regs[k] !== undefined) set[k] = regs[k];
    cpu.setRegs(set); cpu.sp = 0xFF;
    let gerr = null;
    const hooks = {};
    for (const a of Object.keys(standin.JUMPS)) if (+a !== entry) hooks[a] = () => { throw new Jumped(standin.JUMPS[a]); };
    Object.assign(hooks, o.hooks || {});
    try { cpu.call(entry, {}, { maxSteps: o.maxSteps || 5e6, hooks }); } catch (e) { gerr = e; }
    const rA = { a: cpu.a, x: cpu.x, y: cpu.y, c: cpu.c, z: cpu.z, n: cpu.n, v: cpu.v };
    // the port
    const MB = M0.slice(), cB = cloneChips(c0, game), logB = logWrites(cB), ioB = ioOf(cB);
    MB[0] = 0x2F; MB[1] = port;
    const P = SF.makePort(MB, ioB);
    P.inIrq = o.irq ? 1 : 0;
    standin.install(P);
    if (o.onPort) o.onPort(P);
    for (const k in P.N) P.N[k] = 0;
    let rB, perr = null;
    try {
      rB = P[o.name](Object.assign({}, regs));
      if (rB && typeof rB.next === 'function') { let y, g = 0; const it = rB; while (!(y = it.next()).done) if (++g > 1e6) throw new Error('never ended'); rB = y.value; }
      rB = rB || {};
    } catch (e) { perr = e; }
    let jumped = null;
    if (gerr instanceof Jumped && perr && P.isJump(perr) && gerr.go === perr.go) { jumped = gerr.go; gerr = perr = null; rB = {}; }
    const diffs = [];
    const said = e => (e.stack || e.message || String(e)).split('\n').slice(0, 3).join(' | ');
    const what = e => (e instanceof Jumped || P.isJump(e) ? 'jumped to ' + e.go : 'threw: ' + said(e));
    if (gerr || perr) diffs.push('game ' + (gerr ? what(gerr) : 'ran') + '; port ' + (perr ? what(perr) : 'ran'));
    if (!gerr && !perr) {
      let nd = 0;
      for (let a = 0; a < 65536; a++) if (!skip[a] && MA[a] !== MB[a]) { if (nd++ < 12) diffs.push(hex(a) + ' game ' + hex2(MA[a]) + ' port ' + hex2(MB[a])); }
      if (nd > 12) diffs.push('... ' + nd + ' bytes in all');
      if (cpu.pdata !== MB[1]) diffs.push('$01 game ' + hex2(cpu.pdata) + ' port ' + hex2(MB[1]));
      for (let i = 0; i < 0x400; i++) if ((cA.colour[i] & 15) !== (cB.colour[i] & 15)) { diffs.push('colour ' + hex(0xD800 + i) + ' game ' + cA.colour[i] + ' port ' + cB.colour[i]); break; }
      const la = logA.map(w => hex(w[0]) + '=' + hex2(w[1])).join(' '), lb = logB.map(w => hex(w[0]) + '=' + hex2(w[1])).join(' ');
      if (la !== lb) diffs.push('chip writes: game [' + la.slice(0, 300) + '] port [' + lb.slice(0, 300) + ']');
      // a register the port's routine leaves out of its result is the one it was given (standin.js)
      if (!jumped) for (const k of outs) {
        const got = rB[k] !== undefined ? rB[k] : regs[k];
        if (got === undefined || ((+got) & 0xFF) !== (rA[k] & 0xFF)) diffs.push('register ' + k + ': game ' + rA[k] + ' port ' + got);
      }
    }
    if (!diffs.length && o.timing) o.timing({ cycles: cpu.cycles, N: Object.assign({}, P.N), st: st.name, regs });
    if (diffs.length) {
      fails++;
      if (shown++ < (o.show || 3)) {
        console.log('  x case ' + n + ' (' + st.name + ', regs ' + JSON.stringify(regs) + '):');
        for (const d of diffs) console.log('      ' + d);
      }
    }
  }
  console.log((fails ? 'FAIL ' : 'ok   ') + o.name + ': ' + (cases - fails) + '/' + cases + ' cases identical');
  return { fails, cases };
}

module.exports = { check, moments, makeRnd };
