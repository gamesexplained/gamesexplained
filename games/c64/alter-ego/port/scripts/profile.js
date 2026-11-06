'use strict';
// What each of the game's routines costs it, measured on the game: the sessions of test/lockstep.js
// played on the kit's C64 as the lockstep plays them, and each stretch of the processor's time (a
// raster line at most, the machine's own step) given to the routine it was in at its end: the
// 6502 routine whose code holds the program counter, or, while the counter is in the p-code's
// interpreter ($7033-$7926), the procedure whose bytecode holds the byte before its instruction
// pointer ($08): the last byte the interpreter read, as the pointer has already moved past it (past
// a procedure's last byte, its return, the pointer is in the next procedure's stub), but
// for the gateway in and out of a 6502 routine with a frame of its own ($7059-$70F7), whose
// cycles are the gateway's (enterNative: by the call and by the workspace bytes it saves, which
// the page charges at each P.enterNative), since $08 holds a 6502 routine's scratch there. The
// routine is the nearest label at or below the address in the listing of the part there (the start
// or the life object at $8466, told apart by the jump their entry stub makes). Left out:
// - the interrupt's code (its bridges at $4142-$4173, the arrow's motion at $4229-$42D2): the page
//   runs its own interrupts and adds their cost, the mean of these a call of the arrow's motion
//   (irq); the KERNAL's own part of the interrupt costs the kit's C64 nothing;
// - the waits, which the page waits for itself: the loops that read the raster at $44F6, $4620 and
//   $5F36, and the p-code's turns between one call of sprite0_has_reached_target ($41A0) and the
//   next routine it calls, its wait for the arrow to arrive;
// - the delay loop ($545B), which the page times by its turns (turn). The turn is measured once,
//   not here: on the kit's C64 the p-code's instruction pointer stayed inside the loop
//   ($5460-$5478) for 214,700 to 215,900 cycles in each of six delays of 312 turns in the
//   new-random session, 13 interrupts of about 97 cycles among them: 687 a turn.
// A label the port never calls (a point a 6502 routine resumes at after a procedure it called, a
// tail several routines jump into, a routine the port has folded into its caller) is not a routine
// the page can charge: its cycles go to the routine the port does call that the processor entered
// last before it, which on the page is called as often (the procedure the resume follows, the
// routine that jumped into the tail).
// Each routine's calls are counted as the port calls it (or, for one the port does not define, as
// the processor reaches its first instruction), and on the port
// beside it, each time the game calls GETIN ($6DFA, the checkpoint where the two meet) while the
// routine is running: a routine that loops round the wait for a key (a menu, the name's editor, a
// stage) spends its own cycles by the turn of the loop as much as by the call. Each session's
// totals are a row: for each routine, its own cycles as a + b, a for each call and b for each wait
// for a key inside it, none below zero, fitted over the sessions (least squares). The result is
// cost.json's call (a) and pass (b), the page's costs, with the stretches between the checkpoints
// the sessions met (seg, at 0: the page counts a stretch it meets that is not there as unmeasured).
//   node profile.js cost.json session...   (each session's row kept in parts/main/work/profile.json,
//                                           and a session run again replaces its row)
const fs = require('fs'), path = require('path');
const { run } = require('../test/lockstep.js');
const lib = require('../test/lib.js');
const [out, ...sessions] = process.argv.slice(2);
if (!out) { console.log('usage: node profile.js cost.json session...'); process.exit(2); }
const ROWS = process.env.PROFILE_ROWS || path.join(lib.GAME, 'parts/main/work/profile.json');
const TURN = 687;

// the routines' names by address, in each part
function labels(part) {
  const L = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'parts', part, 'listing.json'), 'utf8'));
  // a routine's label is on its first instruction (a procedure's on the stub that enters the
  // interpreter, before its bytecode)
  const named = L.records.filter(r => r.t === 'code' && r.l && !/^LAB_/.test(r.l)).map(r => [r.a, r.l]).sort((a, b) => a[0] - b[0]);
  return { at: Int32Array.from(named.map(x => x[0])), name: named.map(x => x[1]), entry: new Map(named) };
}
const PARTS = { main: labels('main'), start: labels('start'), life: labels('life') };
function nameAt(part, a) {
  const L = PARTS[part];
  let lo = 0, hi = L.at.length - 1, k = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (L.at[mid] <= a) { k = mid; lo = mid + 1; } else hi = mid - 1; }
  return k < 0 ? null : L.name[k];
}
const WAITS = [[0x44F6, 0x44FB], [0x4620, 0x4625], [0x5F36, 0x5F3B]];
const IRQ = [[0x4142, 0x4174], [0x4229, 0x42D3]];
const inside = (a, list) => list.some(([lo, hi]) => a >= lo && a < hi);

// the routines that read a key for another, the loop round the wait for a key being their caller's
const READERS = ['kernal_getin_wrapper', 'get_debounced_key', 'read_normalized_input', 'poll_input_high_nibble', 'poll_input_low_nibble'];
// the routines whose own cycles go with a count they are given (the bytes they fill, copy, read
// or save): the argument that holds it, by its place
const SIZED = { fill_memory_range: 1, memmove_bytes: 2, read_map_payload_bytes: 1, enterNative: 1 };
const NAMES = new Set(Object.values(PARTS).flatMap(p => p.name));
const rows = (fs.existsSync(ROWS) ? JSON.parse(fs.readFileSync(ROWS, 'utf8')) : []).filter(r => !sessions.includes(r.session));
const tracked = new Set();
for (const session of sessions) {
  const t0 = Date.now();
  const self = Object.create(null), calls = Object.create(null), passes = Object.create(null), waits = Object.create(null);
  const units = Object.create(null), spent = Object.create(null);
  // the port's own calls of each routine, and the machine's cycles by label and by the routine the
  // port defines that the processor entered last (owner), sorted out at the session's end
  const portCalls = Object.create(null), byOwner = Object.create(null);
  let defined = null;
  const segs = new Set();
  let cycles0 = 0, total = 0, irq = 0;
  const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
  const readers = new Set(READERS);
  const r = run({ session, port: P => {
    // the port's routines that wait (its generators), as they run inside one another: each yield
    // is seen by the innermost, which counts the first turn of a wait (P.FIRST) as its own, and a
    // call of GETIN as a pass of itself and of the readers it is inside, up to the first that is
    // not a reader, the loop round the wait for a key
    const stack = [];
    // what the port spends itself (P.spend: the time it counts inside a routine of its own), the
    // innermost routine's, which its fit leaves out; and the counts the sized routines are given
    defined = new Set();
    for (const name of Object.keys(P)) {
      const f = P[name];
      if (typeof f !== 'function' || !NAMES.has(name)) continue;
      defined.add(name);
      P[name] = f instanceof GENERATOR
        ? function* (...a) { portCalls[name] = (portCalls[name] || 0) + 1; return yield* f.apply(this, a); }
        : function (...a) { portCalls[name] = (portCalls[name] || 0) + 1; return f.apply(this, a); };
    }
    const spend = P.spend;
    P.spend = n => { if (stack.length) spent[stack[stack.length - 1]] = (spent[stack[stack.length - 1]] || 0) + n; spend(n); };
    for (const [name, at] of Object.entries(SIZED)) {
      const f = P[name];
      P[name] = function (...a) { units[name] = (units[name] || 0) + (a[at] & 0xFFFF); return f.apply(this, a); };
    }
    for (const name of Object.keys(P)) {
      const f = P[name];
      if (!(f instanceof GENERATOR) || !NAMES.has(name)) continue;
      tracked.add(name);
      P[name] = function* (...a) {
        const it = f.apply(this, a), depth = stack.push(name);
        let done = false;
        try {
          let x = it.next();
          for (;;) {
            if (x.done) { done = true; return x.value; }
            const y = x.value;
            if (stack.length === depth) {
              if (y === P.FIRST) waits[name] = (waits[name] || 0) + 1;
              else if (y && y.cp === 0x6DFA) for (let i = depth - 1; i >= 0; i--) {
                // the loop round the wait, the first that is not a reader, by the routine it
                // calls there: one routine can wait for a key in more than one loop of its own
                const k = readers.has(stack[i]) || i === depth - 1 ? stack[i] : stack[i] + '>' + stack[i + 1];
                passes[k] = (passes[k] || 0) + 1;
                if (!readers.has(stack[i])) break;
              }
            }
            let v, e, threw = false;
            try { v = yield y; } catch (err) { threw = true; e = err; }
            x = threw ? it.throw(e) : it.next(v);
          }
        } finally {
          stack.pop();
          if (!done) try { it.return(); } catch (err) { /* already ended by its own throw */ }
        }
      };
    }
  }, timing: s => {
    segs.add(s.from.toString(16) + '>' + s.to.toString(16));
  }, machine: m => {
    const cpu = m.cpu, ram = m.ram;
    // the object at $8466: its entry stub's jump, $9348 the start object's, $B392 the life object's
    const object = () => (ram[0x8466] === 0x4C ? (ram[0x8468] === 0x93 ? 'start' : ram[0x8468] === 0xB3 ? 'life' : null) : null);
    const partAt = a => (a < 0x8466 ? 'main' : object());
    let waiting = false, owner = '';
    function place() {
      const pc = cpu.pc;
      if (inside(pc, IRQ)) return '#irq';
      if (inside(pc, WAITS)) return null;
      let a = pc;
      if (pc >= 0x7059 && pc < 0x70F8) return 'enterNative';
      if (pc >= 0x7033 && pc < 0x7927) { if (waiting) return null; a = ((ram[8] | ram[9] << 8) - 1) & 0xFFFF; }
      const part = partAt(a);
      return part ? nameAt(part, a) : null;
    }
    let last = cpu.cycles; cycles0 = last;
    const tick = m.tick;
    m.tick = function () {
      const dt = cpu.cycles - last; last = cpu.cycles;
      const k = place();
      if (k === '#irq') irq += dt;
      else if (k && k !== 'delay_scaled_iterations') { const t = byOwner[k] || (byOwner[k] = Object.create(null)); t[owner] = (t[owner] || 0) + dt; }
      return tick.apply(this, arguments);
    };
    // the calls: a hook at each routine's first instruction, beside the machine's own
    const hooks = m.hooks;
    const at = new Map();
    for (const part of Object.keys(PARTS)) for (const [a, n] of PARTS[part].entry) { if (!at.has(a)) at.set(a, {}); at.get(a)[part] = n; }
    for (const [a, byPart] of at) {
      const h0 = hooks[a];
      hooks[a] = c => {
        const part = partAt(a), n = part && byPart[part];
        if (n) { calls[n] = (calls[n] || 0) + 1; waiting = n === 'sprite0_has_reached_target'; if (!inside(a, IRQ) && (!defined || defined.has(n))) owner = n; }
        return h0 ? h0(c) : undefined;
      };
    }
    const h1 = hooks[0x7059];
    hooks[0x7059] = c => { calls.enterNative = (calls.enterNative || 0) + 1; return h1 ? h1(c) : undefined; };
  } });
  total = r.m.cpu.cycles - cycles0;
  for (const [k, t] of Object.entries(byOwner)) for (const [o, dt] of Object.entries(t)) {
    const to = k === 'enterNative' || portCalls[k] || !portCalls[o] ? k : o;
    self[to] = (self[to] || 0) + dt;
  }
  // a routine the port defines is charged at the port's calls of it, the rest at the machine's
  const charged = Object.assign(Object.create(null), calls);
  for (const n of defined) charged[n] = portCalls[n] || 0;
  rows.push({ session, total, self, calls: charged, machineCalls: calls, passes, waits, units, spent, irq, segs: [...segs], stack: [...tracked] });
  console.log(session + ': ' + (r.res.ok && !r.drives ? 'identical' : 'DIFFERS') + ', ' + r.m.frames + ' frames, ' + Math.round((Date.now() - t0) / 1000) + ' s');
}
// a, b, c and d for each routine, over the rows: its own cycles, less what the port spends in it
// itself, as a a call, b a pass, c a wait and d a unit of the count a sized routine is given, the
// least squares over the subsets of the four that leave none of them below zero, the one with the
// smallest error (where two leave the same, the one that spreads the cycles the most: units, waits,
// then passes, before calls)
const call = {}, pass = {}, wait = {}, unit = {};
const names = [...new Set(rows.flatMap(r => Object.keys(r.self)))].sort();
function solve(A, y) {                                // the normal equations, by Gauss-Jordan
  const n = A[0].length, M = [];
  for (let i = 0; i < n; i++) { M.push([]); for (let j = 0; j <= n; j++) M[i].push(0); }
  for (let k = 0; k < A.length; k++) for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) M[i][j] += A[k][i] * A[k][j]; M[i][n] += A[k][i] * y[k]; }
  for (let i = 0; i < n; i++) {
    let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    if (Math.abs(M[i][i]) < 1e-9 * (1 + Math.abs(M[i][n]))) return null;
    for (let k = 0; k < n; k++) if (k !== i) { const q = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= q * M[i][j]; }
  }
  return M.map((row, i) => row[n] / row[i]);
}
for (const k of names) {
  // its passes, by the loop: those keyed k itself and those keyed k>child, each a column of its own
  const loops = [...new Set(rows.flatMap(r => Object.keys(r.passes).filter(p => p === k || p.startsWith(k + '>'))))].sort();
  const X = rows.map(r => [r.calls[k] || 0, ...loops.map(p => r.passes[p] || 0), (r.waits || {})[k] || 0, (r.units || {})[k] || 0]);
  const y = rows.map(r => Math.max(0, (r.self[k] || 0) - ((r.spent || {})[k] || 0)));
  const P0 = 1, W = 1 + loops.length, U = W + 1;
  let best = null;
  // the subsets of calls (0), passes (1), waits (2) and units (3), the spread-out ones first, so
  // that a tie keeps them; passes stand for all the loops' columns, less any that would go below zero
  const groups = SIZED[k] !== undefined ? [[3], [0, 3]] : [[2], [1], [1, 2], [0, 2], [0, 1], [0, 1, 2], [0]];
  const cols = g => g.flatMap(j => (j === 0 ? [0] : j === 1 ? loops.map((_, i) => P0 + i) : j === 2 ? [W] : [U]));
  for (const g of groups) {
    let sub = cols(g).filter(j => X.some(x => x[j]));
    if (!sub.length || g.some(j => !cols([j]).some(c => sub.includes(c)))) continue;
    let c = null;
    for (;;) {
      c = solve(X.map(x => sub.map(j => x[j])), y);
      if (!c) break;
      const neg = c.map((v, i) => [v, sub[i]]).filter(([v, j]) => v < 0 && j >= P0 && j < W).sort((a, b) => a[0] - b[0]);
      if (!neg.length || sub.filter(j => j >= P0 && j < W).length < 2) break;
      sub = sub.filter(j => j !== neg[0][1]);
    }
    if (!c || c.some(v => v < 0)) continue;
    const coef = new Array(U + 1).fill(0); sub.forEach((j, i) => { coef[j] = c[i]; });
    const err = X.reduce((s, x, i) => s + (y[i] - x.reduce((t, v, j) => t + coef[j] * v, 0)) ** 2, 0);
    if (!best || err < best.err * (1 - 1e-6) - 1e-6) best = { err, coef };
  }
  if (!best) continue;
  const a = best.coef[0], c = best.coef[W], d = best.coef[U];
  if (a > 0) call[k] = Math.round(a * 10) / 10;
  loops.forEach((p, i) => { const b = best.coef[P0 + i]; if (b > 0) pass[p] = Math.round(b * 10) / 10; });
  if (c > 0) wait[k] = Math.round(c * 10) / 10;
  if (d > 0) unit[k] = [SIZED[k], Math.round(d * 100) / 100];
}
const counted = rows.reduce((s, r) => s + Object.values(r.self).reduce((x, y) => x + y, 0), 0), all = rows.reduce((s, r) => s + r.total, 0);
const irqs = rows.reduce((s, r) => s + ((r.machineCalls || r.calls).sprite0_motion_irq_hook || 0), 0), irqCycles = rows.reduce((s, r) => s + r.irq, 0);
const seg = {};
for (const k of [...new Set(rows.flatMap(r => r.segs))].sort()) seg[k] = 0;
fs.writeFileSync(ROWS, JSON.stringify(rows) + '\n');
fs.writeFileSync(out, JSON.stringify({ seg, call, pass, wait, unit, readers: READERS, stack: [...new Set([...tracked, ...rows.flatMap(r => r.stack || [])])].sort(), turn: TURN,
  irq: Math.round(irqCycles / Math.max(1, irqs)) }) + '\n');
console.log('wrote ' + out + ': ' + rows.length + ' sessions, ' + Object.keys(call).length + ' routines by the call, ' + Object.keys(pass).length +
  ' by the wait for a key, ' + Object.keys(wait).length + ' by their other waits, ' + Object.keys(unit).length + ' by the count they are given; ' + (counted / all * 100).toFixed(1) + '% of the time given to routines');
