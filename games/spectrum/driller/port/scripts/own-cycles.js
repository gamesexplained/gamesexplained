'use strict';
// Each routine's own T-states on the game, measured rather than fitted: the kit's model of the 48K
// runs from moments of play with the commands the page's pace is checked with (test/lib.js,
// pacePlan) for 60 passes, as scripts/time-stretches.js "plan:" times them, and a hook at each
// routine the port names opens a frame there, closed when the stack pointer rises past its return
// address. A routine's own T-states are its frame's, less those of the routines it calls and of
// the interrupts taken inside it. scripts/price-routines.js sets the prices of the routines whose
// cost a call varies most from these, beside the port's counts of their work.
//   node own-cycles.js out.json [state filter] [every nth moment]
const fs = require('fs');
const lib = require('../test/lib.js');
const { loadPort } = require('../test/port.js');

const out = process.argv[2], filter = process.argv[3] || '', every = +(process.argv[4] || 5);
if (!out) { console.log('usage: node own-cycles.js out.json [state filter] [every nth moment]'); process.exit(2); }
const P = loadPort().makePort(new Uint8Array(65536), {});
const PASSES = 60;
const moments = lib.states(filter).filter(f => lib.readState(f).cpu.pc === lib.PASS_AT).filter((f, i) => i % every === 0);
const res = [];
for (const st of moments) {
  const m = lib.restore(lib.readState(st)), cpu = m.cpu;
  const stack = [], own = {}, calls = {};
  for (const a of Object.keys(P.CODE)) {
    const name = P.CODE[a], prev = m.hooks[+a];
    m.hooks[+a] = mm => { stack.push({ name, t: cpu.tstates, sp: cpu.sp, child: 0 }); return prev ? prev(mm) : undefined; };
  }
  // the interrupt: a frame of its own, so that its time is no routine's
  const take = m.interrupt.bind(m);
  m.interrupt = () => { const sp = cpu.sp; take(); stack.push({ name: '(interrupt)', t: cpu.tstates - 7, sp: (sp - 2) & 0xFFFF, child: 0 }); };
  const step = m.step.bind(m);
  m.step = () => {
    const r = step();
    // a frame ends when the stack pointer rises past its return address (by less than a jump of
    // the stack's own, which no routine makes)
    while (stack.length && cpu.sp > stack[stack.length - 1].sp && cpu.sp - stack[stack.length - 1].sp < 0x400) {
      const f = stack.pop(), dt = cpu.tstates - f.t;
      own[f.name] = (own[f.name] || 0) + dt - f.child;
      calls[f.name] = (calls[f.name] || 0) + 1;
      if (stack.length) stack[stack.length - 1].child += dt;
    }
    return r;
  };
  let n = 0;
  m.skipOnce = false;
  m.onPass = mm => { if (n === PASSES) return true; mm.releaseAll(); for (const k of lib.pacePlan(n++)) mm.press(k); return false; };
  m.runFrames(PASSES * 200);
  res.push({ state: st, passes: n, own, calls });
  console.log(st + ': ' + n + ' passes, ' + Object.keys(own).length + ' routines');
}
fs.writeFileSync(out, JSON.stringify(res) + '\n');
console.log('wrote ' + out + ': ' + res.length + ' moments');
