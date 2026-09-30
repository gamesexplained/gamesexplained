'use strict';
// A self-test of kit/c64/lockstep.js: kit/c64/test_machine.js's program on the machine, beside a
// port of it written here, and ports with one fault each of the kinds the lockstep has to name.
// Exits 1 on any failure. node kit/c64/test_lockstep.js
const { Machine } = require('./machine.js');
const { Lockstep, standIn, describe } = require('./lockstep.js');
const { program, ADDR } = require('./test_machine.js');

let fails = 0;
const check = (what, got, want) => { if (got !== want) { fails++; console.log('FAIL', what, 'got', got, 'want', want); } else console.log('ok  ', what); };

// The port: one function for each of the program's routines, on its memory at its addresses.
function port() {
  const M = new Uint8Array(65536), P = { M };
  P.scan = function () {                                   // $1040
    P.io.ciaWrite(0x00, 0xFE); M[0x2002] = P.io.ciaRead(0x01);
    P.io.ciaWrite(0x00, 0xFF); M[0x2003] = P.io.ciaRead(0x00);
  };
  P.work = function () {                                   // $1057
    M[0x200C] = 0;
    let a = M[0x2004], c = 0;
    for (let x = 0; x < 256; x++) { const s = a + M[0x2100 + x]; c = s >> 8; a = (s & 255) ^ M[0x2002]; }
    M[0x2004] = (a + M[0x2003] + c) & 255;
    M[0x200A] = M[0x2005];
    M[0x200B] = 0;
  };
  P.wait = function* () { yield { wait: 0x80 }; };         // $107D
  P.delay = function* () { yield { cycles: 1293 }; };     // $1085, with its JSR
  P.poll = function* () {                                  // $108B
    const a = M[0x2001];
    while (M[0x2001] === a) yield;
  };
  P.irq_top = function () {                                // $1100
    M[0x2006] = P.io.vicRead(0x12);
    M[0x2001] = (M[0x2001] + 1) & 255;
    M[0x2008] = P.io.vicRead(0x12);
    M[0xFFFE] = 0x30; M[0xFFFF] = 0x11;
    P.io.vicWrite(0x12, 0x10); P.io.vicWrite(0x19, 0xFF);
  };
  P.irq_split = function () {                              // $1130
    M[0x2009] = P.io.vicRead(0x19);
    M[0x2007] = M[0x2004];
    M[0x2005] = (M[0x2005] + 1) & 255;
    M[0x200C] = M[0x2005];
    M[0x200B] = 0xFF;
    M[0xFFFE] = 0x00; M[0xFFFF] = 0x11;
    P.io.vicWrite(0x12, 0x00); P.io.vicWrite(0x19, 0xFF);
  };
  P.setup = function () {                                  // $1000, for a start from the hand-over
    M[0xFFFE] = 0x00; M[0xFFFF] = 0x11;
    P.io.vicWrite(0x12, 0x00); P.io.vicWrite(0x11, P.io.vicRead(0x11) & 0x7F);
    P.io.vicWrite(0x1A, 0x01); P.io.ciaWrite(0x02, 0xFF);
  };
  P.main_loop = function* () {                             // $1027
    for (;;) {
      yield { cp: 0x1027 }; M[0x2000] = (M[0x2000] + 1) & 255;
      yield { cp: 0x102A }; P.scan();
      yield { cp: 0x102D }; P.work();
      yield { cp: 0x1030 }; yield* P.wait();
      yield { cp: 0x1033 }; yield* P.delay();
      yield { cp: 0x1036 }; yield* P.poll();
    }
  };
  return P;
}

// A moment of play: the program run for three passes, stopped at the start of the fourth.
const start = new Machine({ ram: program(), pc: ADDR.ENTRY, passAt: ADDR.MAIN });
start.runUntilPass(q => q.passes >= 3);
const STATE = start.save();
const OPTS = { checkpoints: [ADDR.MAIN, ...ADDR.CALLS], waits: [ADDR.WAIT_EXIT], irqs: { [ADDR.IRQ_TOP]: 'irq_top', [ADDR.IRQ_SPLIT]: 'irq_split' } };
const lockstep = (P, more = {}) => new Lockstep(Object.assign({ machine: Machine.restore(STATE), port: P, program: p => p.main_loop() }, OPTS, more));
// input that changes: keys on row 0, fire and left on the stick
const input = (n, m) => {
  m.releaseAll();
  if (n % 7 === 3) m.press('DEL');
  if (n % 5 === 1) m.press('RETURN');
  m.joy = 0x1F & ~(n % 3 === 0 ? 0x10 : 0) & ~(n % 11 === 4 ? 0x04 : 0);
};

// 1. The interrupt at line 16 falls inside work, and the port runs it after work has finished.
// It reads the sum work had not yet stored ($2007) and gets the game's value; it and work both
// write $200B and $200C, and the last writer's value stands. The race is work reading the count
// the interrupt moved on in the middle of it ($200A), and it shows there and nowhere else.
{
  const r = lockstep(port()).run({ passes: 50, onPass: input, stopOnDiff: false });
  const addresses = new Set(r.diffs.flatMap(d => d.bytes.map(b => b.address)));
  check('the race shows at $200A and nowhere else', [...addresses].join(), String(0x200A));
  check('in every pass', r.diffs.length, 50);
  check('and the run goes on', r.passes, 50);
}

// 1b. A port whose work runs ahead of the game: it writes $200B and then yields bare while the
// game catches up, and the interrupt comes in the game's work before the game's own write of it.
// The byte keeps the game's order at the next checkpoint, and nothing else moves.
{
  const P = port(), work = P.work;
  P.work = function* () { work(); for (let i = 0; i < 40; i++) yield; };
  P.main_loop = function* () {
    for (;;) {
      yield { cp: 0x1027 }; P.M[0x2000] = (P.M[0x2000] + 1) & 255;
      yield { cp: 0x102A }; P.scan();
      yield { cp: 0x102D }; yield* P.work();
      yield { cp: 0x1030 }; yield* P.wait();
      yield { cp: 0x1033 }; yield* P.delay();
      yield { cp: 0x1036 }; yield* P.poll();
    }
  };
  const r = lockstep(P, { ignore: [0x200A] }).run({ passes: 50, onPass: input });
  check('a port ahead of the game: the last writer still the game\'s', r.ok && r.passes === 50, true);
}

// 1c. The race given to the port: work reads the count through irqByte and gets the value the
// game's work read: from a copy run on ahead when the port reads first, or from the game's own run
// for the part of the stretch it has run; and the machine is given back as it was.
{
  const withByte = () => { const P = port(), M = P.M, work = P.work; P.work = function () { work(); M[0x200A] = P.io.irqByte(0x2005); }; return P; };
  const ls = lockstep(withByte(), { irqBytes: [0x2005] }), r = ls.run({ passes: 100, onPass: input });
  check('irqBytes: the race gone, 100 passes identical', r.ok && r.passes === 100, true);
  check('the machine\'s run its own again', Object.prototype.hasOwnProperty.call(ls.m.cpu, 'run'), false);
  // the read made later, the game part way through the stretch (40 lines) or waiting at its end (80)
  for (const lines of [40, 80]) {
    const P = port(), work = P.work;
    P.work = function* () { work(); for (let i = 0; i < lines; i++) yield; P.M[0x200A] = P.io.irqByte(0x2005); };
    P.main_loop = function* () {
      for (;;) {
        yield { cp: 0x1027 }; P.M[0x2000] = (P.M[0x2000] + 1) & 255;
        yield { cp: 0x102A }; P.scan();
        yield { cp: 0x102D }; yield* P.work();
        yield { cp: 0x1030 }; yield* P.wait();
        yield { cp: 0x1033 }; yield* P.delay();
        yield { cp: 0x1036 }; yield* P.poll();
      }
    };
    const r2 = lockstep(P, { irqBytes: [0x2005] }).run({ passes: 50, onPass: input });
    check('irqBytes read ' + lines + ' lines on: 50 passes identical', r2.ok && r2.passes === 50, true);
  }
  let msg = '';
  try { lockstep(withByte()).run({ passes: 2 }); } catch (e) { msg = e.message; }
  check('irqByte of a byte not listed', /\$2005 through irqByte, and it is not in irqBytes/.test(msg), true);
}

// 2. With the race's byte left out, every pass matches, chips included; and the raster the port's
// handler reads is the game's, a different line before and after its delay.
{
  const P = port(), ls = lockstep(P, { ignore: [0x200A], chips: ['colour', 'vic', 'sid', 'cia'] });
  const r = ls.run({ passes: 300, onPass: input });
  check('300 passes identical', r.ok && r.passes === 300 && !r.diffs.length && !r.diverged, true);
  check('one pass a frame', r.frames, 300);
  check('the interrupt read two raster lines', ls.m.ram[0x2008] > ls.m.ram[0x2006], true);
  check('and the port read the same', P.M[0x2006] === ls.m.ram[0x2006] && P.M[0x2008] === ls.m.ram[0x2008], true);
  check('describe: identical', /300 passes in 300 frames: identical/.test(describe(r)), true);
  // a run goes on from where the last stopped
  check('a second run', ls.run({ passes: 5, onPass: input }).passes, 5);
  const m = ls.m;
  check('the machine given back: its own hook only', Object.keys(m.hooks).join(), String(ADDR.MAIN));
  check('its irq and ioRead its own', Object.prototype.hasOwnProperty.call(m.cpu, 'irq') || Object.prototype.hasOwnProperty.call(m, 'ioRead'), false);
  const n = m.passes;
  m.runPasses(4);
  check('and it runs alone', m.passes, n + 4);
}

// 3. The timing: each stretch's cycles on the machine, its interrupts taken out, and the port's calls.
{
  const rows = [];
  lockstep(port(), { ignore: [0x200A], timing: s => rows.push(s) }).run({ passes: 20, onPass: input });
  const of = (from, to) => rows.filter(s => s.from === from && s.to === to);
  const same = (list, k) => list.length > 0 && list.every(s => s[k] === list[0][k]);
  const scan = of(0x102A, 0x102D), work = of(0x102D, 0x1030), wait = of(0x1030, ADDR.WAIT_EXIT), rts = of(ADDR.WAIT_EXIT, 0x1033);
  const delay = of(0x1033, 0x1036), poll = of(0x1036, ADDR.MAIN), inc = of(ADDR.MAIN, 0x102A);
  check('20 of each stretch', [scan, work, wait, rts, delay, poll, inc].every(l => l.length === 20), true);
  check('scan: 40 cycles with its JSR and RTS', same(scan, 'cycles') && scan[0].cycles, 40);
  check('work: 3,885 cycles, the interrupt inside it taken out', same(work, 'cycles') && work[0].cycles, 3885);
  check('and that interrupt counted', work.every(s => s.irqs === 1 && s.irqCycles > 0), true);
  check('work: one call of the port\'s', work.every(s => s.calls.work === 1 && Object.keys(s.calls).length === 1), true);
  check('the wait marked', wait.every(s => s.wait && s.calls.wait === 1), true);
  check('from the wait\'s exit: the RTS', same(rts, 'cycles') && rts[0].cycles, 6);
  check('delay: 1,293 cycles, as the port counts them', delay.every(s => s.cycles === 1293 && s.estimate === 1293), true);
  check('poll: the bare yields counted, the interrupt taken out', poll.every(s => s.polls > 100 && s.irqs === 1), true);
  check('INC $2000: 6 cycles, no call', inc.every(s => s.cycles === 6 && !Object.keys(s.calls).length), true);
  check('no interrupt handler counted', rows.some(s => s.calls.irq_top || s.calls.irq_split), false);
}

// 4. A port that sums wrongly when fire is held: found at the next pass's start, and the run stops.
{
  const P = port(), M = P.M, work = P.work;
  P.work = function () { work(); if (!(M[0x2003] & 0x10)) M[0x2004] ^= 1; };
  const r = lockstep(P, { ignore: [0x200A] }).run({ passes: 20, onPass: (n, m) => { m.joy = n === 4 ? 0x0F : 0x1F; } });
  check('a wrong sum: found', r.ok, false);
  check('after the pass that held fire', r.diffs.length === 1 && r.diffs[0].pass, 5);
  check('at $2004, one byte', r.diffs[0].count === 1 && r.diffs[0].bytes[0].address, 0x2004);
  check('describe names it', /pass 5 .*1 byte differs: \$2004 game \$[0-9A-F]{2} port \$[0-9A-F]{2}/.test(describe(r)), true);
}

// 5. A port whose loop skips the scan on one pass: a divergence of path, both places named.
{
  const P = port(), M = P.M, skip = (start.ram[0x2000] + 4) & 255;
  P.main_loop = function* () {
    for (;;) {
      yield { cp: 0x1027 }; M[0x2000] = (M[0x2000] + 1) & 255;
      if (M[0x2000] !== skip) { yield { cp: 0x102A }; P.scan(); }
      yield { cp: 0x102D }; P.work();
      yield { cp: 0x1030 }; yield* P.wait();
      yield { cp: 0x1033 }; yield* P.delay();
      yield { cp: 0x1036 }; yield* P.poll();
    }
  };
  const ls = lockstep(P, { ignore: [0x200A] }), r = ls.run({ passes: 20, onPass: input });
  check('a skipped call: out of step', !!r.diverged && r.diverged.game === 0x102A && r.diverged.port === 0x102D, true);
  check('on the pass it happened', r.diverged.pass, 3);
  let threw = false;
  try { ls.run({ passes: 1 }); } catch (e) { threw = /no longer in step/.test(e.message); }
  check('and a lockstep out of step will not run on', threw, true);
}

// 6. A raster wait for another line.
{
  const P = port();
  P.wait = function* () { yield { wait: 0x90 }; };
  const r = lockstep(P, { ignore: [0x200A] }).run({ passes: 5 });
  check('a wait on the wrong line', !!r.diverged && r.diverged.line === 0x80 && /on line 128, the port waited for line 144/.test(r.diverged.why), true);
}

// 7. A port that polls on after the game has left its loop.
{
  const P = port(), M = P.M;
  P.poll = function* () { const a = M[0x2001]; while (M[0x2001] !== ((a + 2) & 255)) yield; };
  const r = lockstep(P, { ignore: [0x200A] }).run({ passes: 5 });
  check('polling past the game', !!r.diverged && r.diverged.port === 'poll' && r.diverged.game === ADDR.MAIN, true);
}

// 8. The game's own code standing in for a routine and a handler, which reads the raster replayed.
{
  const P = port();
  P.work = standIn(P, ADDR.WORK);
  const r = lockstep(P, { ignore: [0x200A], irqs: { [ADDR.IRQ_TOP]: standIn(P, ADDR.IRQ_TOP, { irq: true }), [ADDR.IRQ_SPLIT]: 'irq_split' } })
    .run({ passes: 100, onPass: input });
  check('stand-ins: 100 passes identical', r.ok && r.passes === 100, true);
}

// 9. From the hand-over: the port's program sets the machine up too, names the time that took up
// to the main loop ({ cycles, at }), and the main loop names the same place again.
{
  const P = port();
  const m = new Machine({ ram: program(), pc: ADDR.ENTRY, passAt: ADDR.MAIN });
  const ls = new Lockstep(Object.assign({ machine: m, port: P, program: p => (function* () { p.setup(); yield { cycles: 58, at: 0x1027 }; yield* p.main_loop(); })(),
    ignore: [0x200A], chips: ['colour', 'vic', 'cia'] }, OPTS));
  const r = ls.run({ passes: 30, onPass: input });
  check('from the hand-over: 30 passes identical', r.ok && r.passes === 30, true);
}

// 10. Input by frame: onFrame for every frame the game begins, the input changed only at a yield.
{
  const frames = [];
  const r = lockstep(port(), { ignore: [0x200A] }).run({ passes: 40, onFrame: (f, m) => {
    frames.push(f); m.releaseAll(); if (f % 3 === 0) m.press('DEL'); m.joy = f % 4 ? 0x1F : 0x0F;
  } });
  check('input by frame: 40 passes identical', r.ok && r.passes === 40, true);
  check('onFrame once for each frame begun', frames.length === r.frames && frames.every((f, i) => !i || f === frames[i - 1] + 1), true);
}

// 11. What the lockstep refuses.
{
  const P = port();
  P.main_loop = function* () { yield { cp: 0x1027 }; yield { cp: 0x1234 }; };
  let msg = '';
  try { lockstep(P).run({ passes: 2 }); } catch (e) { msg = e.message; }
  check('a checkpoint not listed', /checkpoint \$1234, which is not in checkpoints/.test(msg), true);
  msg = '';
  try { lockstep(port(), { irqs: { [ADDR.IRQ_TOP]: 'irq_top' } }).run({ passes: 3 }); } catch (e) { msg = e.message; }
  check('an interrupt with no handler', /no port handler for the interrupt at \$1130/.test(msg), true);
}

process.exit(fails ? 1 : 0);
