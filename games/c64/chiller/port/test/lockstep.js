'use strict';
// The whole port beside the game, pass by pass (kit/c64/lockstep.js), from saved moments of play
// with random joystick input. Routines not yet ported are the game's own code (standIn).
// node lockstep.js [passes] [state name filter] [seed]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '../../../..');
const { Lockstep, describe } = require(path.join(REPO, 'kit/c64/lockstep.js'));
const { CPU } = require(path.join(REPO, 'kit/c64/cpu6502.js'));
const { ChillerMachine } = require(path.join(ROOT, 'machine.js'));
const lib = require('./lib.js');
const K = globalThis.ChillerKernal;

const CHECKPOINTS = [0xCA00, 0xCA03, 0xCA0F, 0xCA21, 0xCA24, 0xCA2F, 0xCA32, 0xCA3C, 0xCA3F, 0xCA51, 0xCA54];
// bytes the interrupt writes (the jiffy clock, the keyboard scan) that the main program reads
const IRQ_BYTES = new Set([0xA2, 0xC5, 0x028D]);
const WAITS = [0x5BBE, 0x72D5, 0xC472];            // the instruction after each raster wait's loop

// The interrupt as the game's code runs it, for when the music driver is not ported: the KERNAL's
// entry, the handler through $0314, and $EA31's work at its exit.
function irqStandIn(P) {
  let cpu = null;
  return function () {
    if (!cpu) cpu = new CPU(P.M, { port: { dir: 0x2F, data: 0x36 }, io: { read: a => P.io.read(a), write: (a, v) => P.io.write(a, v) } });
    cpu.sp = 0xF0; cpu.pc = 0xFFF0;
    const out = c => { K.irqTail(P.k); c.y = c.pull(); c.x = c.pull(); c.a = c.pull(); c.rti(); };
    cpu.irq(P.M[0x0314] | (P.M[0x0315] << 8), { kernal: true, hooks: { 0xEA31: out }, maxSteps: 1e5 });
  };
}

function run(o) {
  lib.loadGroups();
  const s = JSON.parse(fs.readFileSync(o.state, 'utf8'));
  const m = ChillerMachine.restore(s);
  const P = globalThis.ChillerPort.makePort(new Uint8Array(65536), {}, { standIn: lib.standIn, labels: lib.labels, only: o.groups });
  // the ported handler once the screens group is in (the KERNAL's entry leaves A = 0 for it)
  const irq = !o.groups || o.groups.includes('screens') ? () => { P.music_irq({ a: 0, x: 0, y: 0, c: 0 }); } : irqStandIn(P);
  const kernalIrq = () => { K.irqTail(P.k); };
  const ls = new Lockstep({ machine: m, port: P, program: P => P.program('main_loop'),
    checkpoints: CHECKPOINTS, waits: WAITS, irqs: { 0x60F5: irq, 0xEA31: kernalIrq }, chips: ['colour', 'vic', 'sid'],
    ignore: o.ignore || [], maxFrames: 2000, timing: o.timing });
  // The collision registers. The port reads them before the game gets there (it runs ahead to its
  // next yield), so the game is first run alone with the same input, and the port is given what
  // the game's main program read, in turn; the lockstep's run of the game must read the same.
  let seed = o.seed || 1;
  const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return Math.floor(seed / 4294967296 * n); };
  const DIRS = [0, 1, 2, 4, 8, 16, 5, 9, 6, 10, 17, 20, 24, 4, 8];
  const input = [];
  const joyAt = n => { while (input.length <= n) input.push(input.length % 97 === 0 ? 0x1F & ~DIRS[rnd(DIRS.length)] : input[input.length - 1]); return input[n]; };
  let passes = o.passes || 2000, stuck = 0;
  const rec = [], first = new Map();
  {
    const r = ChillerMachine.restore(s), r0 = r.ioRead;
    let depth = 0, arrivals = 0;
    const irq0 = r.cpu.irq;
    r.cpu.irq = function (h, oo) { depth++; try { return irq0.call(this, h, oo); } finally { depth--; } };
    // the bytes the interrupt keeps that the main program reads: for each stretch between two
    // checkpoints, the values its reads there found, in turn
    for (const a of [...CHECKPOINTS, ...WAITS]) {
      const prev = r.hooks[a];
      r.hooks[a] = c => { if (!depth) arrivals++; return prev ? prev(c) : false; };
    }
    const reads = new Proxy({}, { set(t, k) {
      const a = +k;
      if (!depth && IRQ_BYTES.has(a)) { const key = arrivals + ':' + a; if (!first.has(key)) first.set(key, []); first.get(key).push(r.ram[a]); }
      return true;
    } });
    const run0 = r.cpu.run;
    r.cpu.run = function (oo) { return run0.call(this, Object.assign({}, oo, { reads })); };
    r.ioRead = function (a) { const v = r0.call(this, a); if (!depth && (a === 0xD01E || a === 0xD01F)) rec.push([a & 0x3F, v]); return v; };
    let k = 0;
    r.joy = joyAt(0);
    // the input changes only at a pass, so a game over with fire let go waits for ever: the
    // session ends there, at the last pass before the game stopped passing
    let waitFrom = null;
    const w0 = r.hooks[0x2DB6];
    r.hooks[0x2DB6] = c => { if (waitFrom === null) waitFrom = r.frames; return w0 ? w0(c) : false; };
    r.onPass = mm => { mm.joy = joyAt(++k); waitFrom = null; return k > passes + 1; };
    const end = r.frames + 200000;
    while (k <= passes + 1 && !(waitFrom !== null && r.frames - waitFrom > 100) && r.frames < end) r.runCycles(63 * 312);
    if (k <= passes + 1) { stuck = true; passes = Math.max(0, k - 1); }
  }
  let qi = 0, bad = null;
  const mr = m.ioRead;
  let gi = 0;
  m.ioRead = function (a) {
    const v = mr.call(this, a);
    if (ls.irq === null && (a === 0xD01E || a === 0xD01F)) {
      const w = rec[gi++];
      if (!bad && (!w || w[0] !== (a & 0x3F) || w[1] !== v)) bad = 'the game read ' + lib.hex(a) + ' = ' + v + ' where the recording had ' + JSON.stringify(w);
    }
    return v;
  };
  const vr = P.io.vicRead, rd = P.io.read;
  const coll = r => { const w = rec[qi++]; if (!w || w[0] !== r) { if (!bad) bad = 'the port read $D0' + r.toString(16).toUpperCase() + ' where the game read ' + JSON.stringify(w); return 0; } return w[1]; };
  P.io.vicRead = r => ((r & 0x3F) === 0x1E || (r & 0x3F) === 0x1F ? coll(r & 0x3F) : vr(r));
  P.io.read = a => (a === 0xD01E || a === 0xD01F ? coll(a & 0x3F) : rd(a));
  const used = new Map();
  P.irq_byte = a => {
    const key = ls.syncs + ':' + a, vs = first.get(key), i = used.get(key) || 0;
    used.set(key, i + 1);
    return vs && i < vs.length ? vs[i] : P.M[a];
  };
  m.joy = joyAt(0);
  const res = ls.run({ passes, stopOnDiff: o.stopOnDiff !== false,
    onPass: (n, mm) => { mm.joy = joyAt(n); } });
  if (bad && res.ok) { res.ok = false; res.diverged = { pass: res.passes, after: -1, frame: m.frames, why: bad }; }
  return { res, ls, m, P, bad, stuck };
}

if (require.main === module) {
  const passes = +(process.argv[2] || 2000), filter = process.argv[3] || '', seed = +(process.argv[4] || 1);
  const groups = process.argv[5] ? process.argv[5].split(',') : undefined;
  const dir = path.join(ROOT, '../work/states');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f.includes(filter)).sort();
  let ok = 0, waiting = 0;
  for (const f of files) {
    // a moment saved while the game over waits for fire is not at the main loop, where the port starts
    if (JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).cpu.pc !== 0xCA00) { waiting++; continue; }
    let out;
    try { out = run({ state: path.join(dir, f), passes, seed, groups }); }
    catch (e) { console.log(f + ': threw ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')); continue; }
    const d = describe(out.res).split('\n');
    if (out.res.ok) ok++;
    console.log(f + ': ' + (out.res.ok ? d[d.length - 1] : d.slice(0, 3).join(' / ')) + (out.stuck ? ' (then game over, fire let go)' : ''));
  }
  console.log(ok + '/' + (files.length - waiting) + ' states in step for ' + passes + ' passes' + (waiting ? ' (' + waiting + ' saved at the game over left out)' : ''));
}
module.exports = { run, CHECKPOINTS, WAITS };
