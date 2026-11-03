'use strict';
// The rows the Play page's pacing is fitted on (scripts/fit-cost.js): the whole port beside the
// game (test/lockstep.js), from the hand-over into play with the sessions' player (test/sessions.js),
// through the designer, or from the moments of play in work/states; one row for each stretch between
// two checkpoints, or a checkpoint and the HALT's exit.
//   cycles   the game's T-states for the stretch, less its interrupts', less those it spent halted
//            (the page's clock waits for the interrupt itself), less the port's waits ({ tstates }
//            yields not already counted, which the page's clock runs for itself) and less what the
//            port counted itself on P.T in the main program (the delays and the sounds)
//   calls    the port's calls of each of the game's routines in the main program, and its counts of
//            the work in them (P.N) as '#count'
//   own      each routine's own T-states on the game in the stretch, out of the interrupt: the
//            instructions run while its frame (from its first instruction until the stack rises past
//            its return address) is the innermost, and those of the routines in INLINED it calls;
//            game, how often the game entered each
//   irq      the game's interrupts in the stretch: n, t (their T-states less what the port counted
//            on P.T in its own), calls (the port's calls in its interrupts), own and game (as above,
//            for the routines inside the interrupt), and '#count's
//   polls    the port's turns of a polling loop: such a stretch holds a wait for a key
//   node time-stretches.js out.jsonl [passes] [state filter, or "boot"] [seed] [designer|load] [every nth moment, n or n+k] [--inlined list.json]
const fs = require('fs');
const lib = require('../test/lib.js');
const { run } = require('../test/lockstep.js');
const { player } = require('../test/sessions.js');

// the routines whose work the port does inside their callers, as fit-cost.js --inlined lists them
const ii = process.argv.indexOf('--inlined');
const INLINED = new Set(ii > 0 ? JSON.parse(fs.readFileSync(process.argv.splice(ii, 2)[1], 'utf8')) : []);
const out = process.argv[2], passes = +(process.argv[3] || 2000), filter = process.argv[4] || 'boot', seed = +(process.argv[5] || 1);
// every nth moment, from the first or, as "6+3", from the fourth
const designer = process.argv[6] === 'load' ? 'load' : process.argv[6] === 'designer';
const [every, skip] = (process.argv[7] || '1').split('+').map(n => +n || 0);
if (!out) { console.log('usage: node time-stretches.js out.jsonl [passes] [state filter, or "boot"] [seed] [designer|load] [every nth moment]'); process.exit(2); }
const HALT_AT = 0x829B;
const rows = [];
// the moments of play the lockstep starts from: those saved in a human turn's loop
const list = filter === 'boot' ? [null] : lib.states(filter).filter(f => lib.readState(f).cpu.pc === 0x61E6).filter((f, i) => i % every === skip % every);
for (const state of list) {
  let P = null, m = null;
  // the port: its routines' names, its own interrupts' calls, counts and T-states, and the time its
  // waits yield that P.T already holds
  const irq = { calls: {}, N: {}, T: 0 }, cl = { T: 0 };
  const names = new Set();
  const onPort = (p, mm) => {
    P = p; m = mm;
    for (const n of Object.values(P.CODE)) names.add(n);
    for (const u of Object.values(P.UP)) for (const n of Object.values(u)) names.add(n);
    for (const name of names) {
      const f = P[name];
      if (typeof f !== 'function') continue;
      P[name] = P.GEN.has(name)
        ? function* (...a) { if (P.inIrq) irq.calls[name] = (irq.calls[name] || 0) + 1; return yield* f.apply(this, a); }
        : function (...a) { if (P.inIrq) irq.calls[name] = (irq.calls[name] || 0) + 1; return f.apply(this, a); };
    }
    const int = P.interrupt;
    P.interrupt = function (r) {
      const n0 = Object.assign({}, P.N), t0 = P.T;
      try { return int.call(this, r); } finally {
        irq.T += P.T - t0;
        for (const k of Object.keys(P.N)) { const d = (P.N[k] || 0) - (n0[k] || 0); if (d) { irq.N[k] = (irq.N[k] || 0) + d; P.N[k] = n0[k] || 0; } }
      }
    };
    const play = P.H.playSound;
    P.H.playSound = function* (notes) {
      const g = play(notes);
      let v;
      for (;;) {
        const y = g.next(v);
        if (y.done) return y.value;
        if (y.value && y.value.clocked) cl.T += y.value.tstates;
        v = yield y.value;
      }
    };
    hookGame(mm);
  };
  // the game: a frame opened at each routine the port names, closed when the stack pointer rises
  // past its return address; the interrupt a frame of its own. Each instruction's T-states go to
  // the routine whose frame is on top, or, when the port does that routine's work inside its caller
  // (INLINED), to the nearest frame below it whose routine the port calls; inside an interrupt to
  // the interrupt's (iown), and to '(interrupt)' when no routine's frame is open in it.
  const own = {}, game = {}, iown = {}, igame = {};
  let halted = 0;
  function hookGame(mm) {
    const cpu = mm.cpu, stack = [];
    const nameAt = a => (a >= 0xD003 ? P.UP[P.part][a] : P.CODE[a]);
    const addrs = new Set(Object.keys(P.CODE).map(Number));
    for (const u of Object.values(P.UP)) for (const a of Object.keys(u)) addrs.add(+a);
    const top = () => stack[stack.length - 1];
    for (const a of addrs) {
      const prev = mm.hooks[a];
      mm.hooks[a] = q => {
        if (q === mm) {
          const name = nameAt(a), t = top();
          // entered again at its first instruction with nothing called between (a loop back to
          // its start): the same call
          if (name && !(t && t.name === name && t.sp === cpu.sp && t.a === a)) {
            const irq = !!(t && t.irq);
            const credit = INLINED.has(name) ? (t ? t.credit : '(main)') : name;
            stack.push({ name, a, sp: cpu.sp, irq, credit });
            const G = irq ? igame : game;
            G[name] = (G[name] || 0) + 1;
          }
        }
        return prev ? prev(q) : undefined;
      };
    }
    let taken = false;
    const take = mm.interrupt.bind(mm);
    mm.interrupt = function () {
      const sp = cpu.sp;
      take();
      stack.push({ name: '(interrupt)', sp: (sp - 2) & 0xFFFF, irq: true, credit: '(interrupt)' });
      taken = true;
    };
    const step = mm.step.bind(mm);
    mm.step = function () {
      const h = cpu.halted, t0 = cpu.tstates;
      taken = false;
      const r = step();
      let dt = cpu.tstates - t0;
      // the interrupt taken after the instruction: its 7 T-states of acknowledge are its own
      if (taken) { iown['(interrupt)'] = (iown['(interrupt)'] || 0) + Math.min(7, dt); dt -= Math.min(7, dt); }
      const f = stack[stack.length - 1 - (taken ? 1 : 0)];
      if (h && !(f && f.irq)) halted += dt;
      else if (f) { const O = f.irq ? iown : own; O[f.credit] = (O[f.credit] || 0) + dt; }
      else own['(main)'] = (own['(main)'] || 0) + dt;
      while (stack.length && cpu.sp > top().sp) stack.pop();
      return r;
    };
  }
  let lastT = 0, lastCl = 0;
  const timing = s => {
    const calls = {};
    for (const [k, v] of Object.entries(s.calls)) if (names.has(k)) calls[k] = v;
    for (const [k, v] of Object.entries(P.N)) { if (v && k !== 'beep') calls['#' + k] = v; P.N[k] = 0; }
    const dT = P.T - lastT - irq.T, clocked = cl.T - lastCl;
    lastT = P.T; lastCl = cl.T;
    const ir = { n: s.irqs, t: s.irqTstates - irq.T, calls: irq.calls, own: Object.assign({}, iown), game: Object.assign({}, igame) };
    for (const [k, v] of Object.entries(irq.N)) if (v && k !== 'beep') ir['#' + k] = v;
    rows.push({ pass: s.pass, from: s.from, to: s.to, halt: !!s.halt, cycles: s.tstates - halted - (s.estimate - clocked) - dT,
      waited: s.estimate - clocked, counted: dT, halted, calls, own: Object.assign({}, own), game: Object.assign({}, game), polls: s.polls, irq: ir });
    clear();
  };
  let input = null;
  // (at the first checkpoint the stretches begin: what came before is no stretch's)
  const clear = () => { irq.calls = {}; irq.N = {}; irq.T = 0; for (const o of [own, game, iown, igame]) for (const k of Object.keys(o)) delete o[k]; halted = 0; };
  const r = run({ state, onPort, timing, onCheckpoint: (a, mm) => { clear(); for (const k of Object.keys(P.N)) P.N[k] = 0; lastT = P.T; lastCl = cl.T; input.check(mm); } });
  input = player(lib.makeRnd(seed), r.m, { designer, onRewind: () => r.P.io.tape.rewind() });
  const t = Date.now();
  const res = r.ls.run({ passes, stopOnDiff: true, onPass: (k, mm) => input.pass(k, mm), onFrame: (fr, mm) => input.frame(fr, mm) });
  console.log((state || 'boot') + ': ' + res.passes + ' passes, ' + r.m.frames + ' frames, ' + (Date.now() - t) + ' ms' + (res.ok ? '' : ', not in step: ' + JSON.stringify(res.diverged || res.diffs[0]).slice(0, 200)));
}
fs.writeFileSync(out, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log('wrote ' + out + ': ' + rows.length + ' stretches');
