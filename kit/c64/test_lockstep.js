'use strict';
// A self-test of kit/c64/lockstep.js: kit/c64/test_machine.js's program on the machine, beside a
// port of it written here, and ports with one fault each of the kinds the lockstep has to name.
// Exits 1 on any failure. node kit/c64/test_lockstep.js
const { Machine } = require('./machine.js');
const { Lockstep, standIn, standInGen, checkGen, describe } = require('./lockstep.js');
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
  // the machine's own hooks given to the lockstep: on the machine for the run, on each copy run
  // on ahead too, and the machine's own again after
  let calls = 0;
  const lh = lockstep(withByte(), { irqBytes: [0x2005], hooks: { [ADDR.WORK]: () => { calls++; return false; } } });
  const rh = lh.run({ passes: 20, onPass: input });
  check('hooks: 20 passes identical', rh.ok && rh.passes === 20, true);
  check('hooks: run on the copies run on ahead too', calls, 40);
  check('hooks: off the machine after the run', lh.m.hooks[ADDR.WORK], undefined);
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

// 12. Two raster waits with no checkpoint between: the game calls its wait twice running (the JSR
// at $1033 made a second JSR to it), and the port yields the wait twice; each is a stop at the exit.
{
  const st = JSON.parse(JSON.stringify(STATE)), ram = Buffer.from(st.ram, 'base64');
  ram[0x1034] = ADDR.WAIT & 255; ram[0x1035] = ADDR.WAIT >> 8;
  st.ram = ram.toString('base64');
  const P = port(), M = P.M;
  P.main_loop = function* () {
    for (;;) {
      yield { cp: 0x1027 }; M[0x2000] = (M[0x2000] + 1) & 255;
      yield { cp: 0x102A }; P.scan();
      yield { cp: 0x102D }; P.work();
      yield { cp: 0x1030 }; yield* P.wait(); yield* P.wait();
      yield { cp: 0x1036 }; yield* P.poll();
    }
  };
  const r = new Lockstep(Object.assign({ machine: Machine.restore(st), port: P, program: p => p.main_loop() }, OPTS,
    { checkpoints: [ADDR.MAIN, 0x102A, 0x102D, 0x1030, 0x1036], ignore: [0x200A] })).run({ passes: 20, onPass: input });
  check('two waits running: 20 passes identical', r.ok && r.passes === 20, true);
}

// 13. A handler whose operand the main program patches: the interrupt falls in a delay loop before
// the INC that moves the operand of its LDA on, so it loads with the operand as it was; the port's
// stretch has moved it on before the replay, which must run on the operand the game's fetched.
{
  const ram = new Uint8Array(65536);
  const put = (a, ...b) => ram.set(b, a);
  put(0x1000, 0x78, 0xA9, 0x00, 0x8D, 0xFE, 0xFF, 0xA9, 0x11, 0x8D, 0xFF, 0xFF, 0xA9, 0x68, 0x8D, 0x12, 0xD0,
    0xA9, 0x1B, 0x8D, 0x11, 0xD0, 0xA9, 0x01, 0x8D, 0x1A, 0xD0, 0x58, 0x4C, 0x20, 0x10);   // set up, CLI, JMP $1020
  put(0x1020, 0x20, 0x40, 0x10, 0x20, 0x50, 0x10, 0x4C, 0x20, 0x10);                     // JSR delay, JSR wait, JMP
  put(0x1040, 0xA2, 0x00, 0xE8, 0xD0, 0xFD, 0xEE, 0x02, 0x11, 0x60);                     // 256 INX, INC $1102, RTS
  put(0x1050, 0xAD, 0x12, 0xD0, 0xC9, 0x60, 0xD0, 0xF9, 0x60);                           // wait for line $60
  put(0x1100, 0x48, 0xAD, 0x00, 0x20, 0x8D, 0x10, 0x21, 0xA9, 0xFF, 0x8D, 0x19, 0xD0, 0x68, 0x40);   // LDA $2000 (patched), STA $2110
  for (let i = 0; i < 256; i++) ram[0x2000 + i] = (i * 7 + 3) & 255;
  const M = new Uint8Array(65536), P = { M };
  P.irq = function () { M[0x2110] = M[M[0x1102] | M[0x1103] << 8]; P.io.vicWrite(0x19, 0xFF); };
  const program = function* () {
    M[0xFFFE] = 0x00; M[0xFFFF] = 0x11;
    P.io.vicWrite(0x12, 0x68); P.io.vicWrite(0x11, 0x1B); P.io.vicWrite(0x1A, 0x01);
    yield { cycles: 34, at: 0x1020 };
    for (;;) {
      yield { cp: 0x1020 }; M[0x1102] = (M[0x1102] + 1) & 255;
      yield { cp: 0x1023 }; yield { wait: 0x60 };
    }
  };
  const m = new Machine({ ram, pc: 0x1000, passAt: 0x1020, port: { dir: 0x2F, data: 0x35 } });
  const r = new Lockstep({ machine: m, port: P, program, checkpoints: [0x1020, 0x1023], waits: [0x1057], irqs: { 0x1100: 'irq' } }).run({ passes: 20 });
  check('a patched operand in a handler: 20 passes identical', r.ok && r.passes === 20, true);
}

// 14. The game's own code standing in for the routines that wait: the raster wait and the poll
// for the count the line-0 interrupt moves on ($2001, read through irqByte until polled). The
// interrupt there is a stand-in too, run on the same simulator while the poll waits. The wait's
// exit is no wait of the lockstep's: the stand-in polls the raster. A plain standIn of the poll
// never sees the count move.
{
  const P = port();
  P.work = standIn(P, ADDR.WORK);
  P.wait = standInGen(P, ADDR.WAIT);
  P.poll = standInGen(P, ADDR.POLL, { polls: [0x2001] });
  const ls = lockstep(P, { waits: [], ignore: [0x200A], irqBytes: [0x2001], chips: ['colour', 'vic', 'cia'],
    irqs: { [ADDR.IRQ_TOP]: standIn(P, ADDR.IRQ_TOP, { irq: true }), [ADDR.IRQ_SPLIT]: 'irq_split' } });
  let reads = 0;
  const irqByte = P.io.irqByte;
  P.io.irqByte = a => { reads++; return irqByte(a); };
  const r = ls.run({ passes: 100, onPass: input });
  check('stand-ins that wait: 100 passes identical', r.ok && r.passes === 100, true);
  // and the line-0 interrupt's stand-in once a pass, as its INC reads it: a handler being run reads
  // the irqBytes as its game's handler read them (lockstep.js, irqBytes)
  check('the poll read $2001 through irqByte twice a pass, the interrupt once, then from memory', reads, 300);
  const Q = port();
  Q.poll = standIn(Q, ADDR.POLL, { maxSteps: 20000 });
  let msg = '';
  try { lockstep(Q, { ignore: [0x200A] }).run({ passes: 3 }); } catch (e) { msg = e.message; }
  check('a plain standIn of the poll: the step limit', /step limit \(20000\)/.test(msg), true);
}

// 15. A routine that works and then polls: a delay of 20 lines, in which the interrupt at line
// $20 moves the clock at $A2 on, then the clock read (as $A2,X) and kept, a poll until it moves
// again, and a read of it after (as $00A0,Y). The stand-in brings the game up to where it
// is before it reads, so the read finds what the game's did, through irqByte or from memory. The
// raster wait before it reads $D011 and $D012 every turn, and still moves a line a turn.
const TICK = (() => {
  const ram = new Uint8Array(65536);
  const put = (a, ...b) => ram.set(b, a);
  put(0x1000, 0x78, 0xA9, 0x00, 0x8D, 0xFE, 0xFF, 0xA9, 0x11, 0x8D, 0xFF, 0xFF, 0xA9, 0x20, 0x8D, 0x12, 0xD0,
    0xA9, 0x1B, 0x8D, 0x11, 0xD0, 0xA9, 0x01, 0x8D, 0x1A, 0xD0, 0x58, 0x4C, 0x20, 0x10);   // set up, CLI, JMP $1020
  put(0x1020, 0x20, 0x60, 0x10, 0x20, 0x40, 0x10, 0xEE, 0x11, 0x20, 0x4C, 0x20, 0x10);   // JSR wait, JSR tick, INC $2011, JMP
  put(0x1040, 0xA2, 0x00, 0xCA, 0xD0, 0xFD, 0xB5, 0xA2, 0x8D, 0x10, 0x20,               // delay; LDA $A2,X; STA $2010
    0xC5, 0xA2, 0xF0, 0xFC, 0xA0, 0x02, 0xB9, 0xA0, 0x00, 0x8D, 0x12, 0x20, 0x60);        // CMP $A2; BEQ; LDY #2; LDA $00A0,Y; STA $2012; RTS
  put(0x1060, 0xAD, 0x11, 0xD0, 0x30, 0xFB, 0xAD, 0x12, 0xD0, 0xC9, 0x18, 0xD0, 0xF4, 0x60);   // wait for line $18
  put(0x1100, 0x48, 0xE6, 0xA2, 0xA9, 0xFF, 0x8D, 0x19, 0xD0, 0x68, 0x40);               // INC $A2, the clock
  const m = new Machine({ ram, pc: 0x1000, passAt: 0x1020, port: { dir: 0x2F, data: 0x35 } });
  m.runUntilPass(q => q.passes >= 2);
  return m.save();
})();
{
  const tickPort = () => {
    const M = new Uint8Array(65536), P = { M };
    P.irq = function () { M[0xA2] = (M[0xA2] + 1) & 255; P.io.vicWrite(0x19, 0xFF); };
    P.wait = standInGen(P, 0x1060);
    P.tick = standInGen(P, 0x1040, { polls: [0xA2] });
    P.main_loop = function* () {
      for (;;) {
        yield { cp: 0x1020 }; yield* P.wait();
        yield { cp: 0x1023 }; yield* P.tick();
        yield { cp: 0x1026 }; M[0x2011] = (M[0x2011] + 1) & 255;
      }
    };
    return P;
  };
  const tick = P => new Lockstep({ machine: Machine.restore(TICK), port: P, program: p => p.main_loop(), checkpoints: [0x1020, 0x1023, 0x1026],
    irqs: { 0x1100: 'irq' }, irqBytes: [0xA2] });
  const P = tickPort(), ls = tick(P);
  let reads = 0;
  const irqByte = P.io.irqByte;
  P.io.irqByte = a => { reads++; return irqByte(a); };
  const r = ls.run({ passes: 30 });
  check('work, then a poll: 30 passes identical', r.ok && r.passes === 30, true);
  check('the clock read through irqByte twice a pass ($A2,X and the first CMP)', reads, 60);
  const Q = tickPort(), lq = tick(Q);
  delete Q.io.irqByte;
  check('and with no irqByte, from memory once the game has caught up', lq.run({ passes: 30 }).ok, true);
}

// 16. checkGen: a routine that waits four frames for the clock at $A2 and copies a byte of a
// table to the screen and colour RAM after each, then returns the clock; a port of it, right and
// wrong three ways; the raster wait of test_machine.js's program; and test 15's tick, whose delay
// gives a { cycles } the checker passes over.
{
  const fadePort = (body) => {
    const M = new Uint8Array(65536), P = { M };
    M.set([0xA2, 0x04, 0xA5, 0xA2, 0xC5, 0xA2, 0xF0, 0xFC, 0xBD, 0x00, 0x31, 0x9D, 0x00, 0x04, 0x9D, 0x00, 0xD8,
      0xCA, 0xD0, 0xEE, 0xA5, 0xA2, 0x60], 0x3000);   // LDX #4; LDA $A2; CMP $A2; BEQ; LDA $3100,X; STA $0400,X; STA $D800,X; DEX; BNE; LDA $A2; RTS
    for (let i = 0; i < 8; i++) M[0x3100 + i] = 0x31 + i * 3;
    M[0xA2] = 0xFE;
    P.fade = function* () { return yield* body(P, M); };
    return P;
  };
  const right = function* (P, M) {
    let x = 4;
    do {
      const a = M[0xA2];
      while (M[0xA2] === a) yield;
      M[0x0400 + x] = M[0x3100 + x]; P.io.colourWrite(x, M[0x3100 + x]);
    } while (--x);
    return { a: M[0xA2], x, z: M[0xA2] === 0 };
  };
  let r = checkGen(fadePort(right), 'fade', 0x3000, { frame: 0xA2 });
  check('checkGen: the right port, four frames', r.ok && r.frames === 4, true);
  r = checkGen(fadePort(function* (P, M) {
    let x = 4;
    do {
      const a = M[0xA2];
      while (M[0xA2] === a) yield;
      M[0x0400 + x - 1] = M[0x3100 + x]; P.io.colourWrite(x, M[0x3100 + x]);
    } while (--x);
    return { a: M[0xA2], x };
  }), 'fade', 0x3000, { frame: 0xA2 });
  check('a byte in the wrong place: frame 1, $0403 and $0404', !r.ok && r.diff.frame === 1 && r.diff.bytes.map(b => b.address).join(), '1027,1028');
  check('why names them', /^frame 1, line 0: 2 bytes differ: \$0403 game \$00 port \$3D, \$0404 game \$3D port \$00$/.test(r.diff.why), true);
  r = checkGen(fadePort(function* (P, M) { const out = yield* right(P, M); const a = M[0xA2]; while (M[0xA2] === a) yield; return out; }), 'fade', 0x3000, { frame: 0xA2 });
  check('a frame too many: the game returned first', !r.ok && r.diff.frame === 4 && /game's routine returned and the port's polls on/.test(r.diff.why), true);
  r = checkGen(fadePort(function* (P, M) { const out = yield* right(P, M); return Object.assign(out, { x: 1 }); }), 'fade', 0x3000, { frame: 0xA2 });
  check('a wrong register on return', !r.ok && r.diff.regs.length === 1 && /on return, x game \$00 port \$01/.test(r.diff.why), true);
  // the raster: one line a yield
  const W = { M: program() };
  W.wait = function* () { while (W.io.vicRead(0x12) !== 0x80) yield; };
  W.late = function* () { while (W.io.vicRead(0x12) !== 0x81) yield; };
  W.waits = function* () { yield { wait: 0x80 }; };
  check('a raster wait, from line $70', checkGen(W, 'wait', ADDR.WAIT, { line: 0x70 }).ok, true);
  r = checkGen(W, 'late', ADDR.WAIT, { line: 0x70 });
  check('a wait for the line after', !r.ok && r.diff.line === 0x80 && /game's routine returned/.test(r.diff.why), true);
  let msg = '';
  try { checkGen(W, 'waits', ADDR.WAIT); } catch (e) { msg = e.message; }
  check('a { wait } refused', /waits for line 128/.test(msg), true);
  // test 15's tick, from the state its lockstep starts in
  const T = { M: new Uint8Array(Buffer.from(TICK.ram, 'base64')) };
  T.tick = function* () {
    yield { cycles: 1293 };
    const a = T.M[0xA2]; T.M[0x2010] = a;
    while (T.M[0xA2] === a) yield;
    T.M[0x2012] = T.M[0xA2];
    return { a: T.M[0xA2], x: 0, y: 2 };
  };
  r = checkGen(T, 'tick', 0x1040, { frame: 0xA2 });
  check('a routine that works and then polls', r.ok && r.frames === 1, true);
}

// 17. One handler for the raster and CIA 1's timer A, which reads $D019 to tell them apart: the
// replay gives the port's handler the flags the game's read, so it takes the game's branch.
{
  const ram = new Uint8Array(65536);
  const put = (a, ...b) => ram.set(b, a);
  put(0x1000, 0x78, 0xA9, 0x00, 0x8D, 0xFE, 0xFF, 0xA9, 0x11, 0x8D, 0xFF, 0xFF, 0xA9, 0x30, 0x8D, 0x12, 0xD0,
    0xA9, 0x1B, 0x8D, 0x11, 0xD0, 0xA9, 0x01, 0x8D, 0x1A, 0xD0,                            // the raster at line $30
    0xA9, 0x25, 0x8D, 0x04, 0xDC, 0xA9, 0x40, 0x8D, 0x05, 0xDC, 0xA9, 0x81, 0x8D, 0x0D, 0xDC,
    0xA9, 0x11, 0x8D, 0x0E, 0xDC, 0x58, 0x4C, 0x40, 0x10);                                  // timer A every $4026 cycles
  put(0x1040, 0x20, 0x50, 0x10, 0x4C, 0x40, 0x10);                                        // JSR work, JMP
  put(0x1050, 0xA2, 0x00, 0xE8, 0xD0, 0xFD, 0xEE, 0x03, 0x20, 0x60);                      // 256 INX, INC $2003, RTS
  put(0x1100, 0x48, 0xAD, 0x19, 0xD0, 0x29, 0x01, 0xF0, 0x08, 0x8D, 0x19, 0xD0, 0xEE, 0x00, 0x20, 0x68, 0x40,
    0xEE, 0x01, 0x20, 0xAD, 0x0D, 0xDC, 0x68, 0x40);                                        // raster: INC $2000; timer: INC $2001
  const m = new Machine({ ram, pc: 0x1000, passAt: 0x1040, cia: true, port: { dir: 0x2F, data: 0x35 } });
  m.runUntilPass(q => q.passes >= 3);
  const M = new Uint8Array(65536), P = { M };
  P.irq = function () {
    if (P.io.vicRead(0x19) & 1) { P.io.vicWrite(0x19, 1); M[0x2000] = (M[0x2000] + 1) & 255; }
    else { M[0x2001] = (M[0x2001] + 1) & 255; P.io.ciaRead(0x0D); }
  };
  const program = function* () { for (;;) { yield { cp: 0x1040 }; yield { cycles: 1281 }; M[0x2003] = (M[0x2003] + 1) & 255; } };
  const n0 = [m.ram[0x2000], m.ram[0x2001]];
  const r = new Lockstep({ machine: m, port: P, program, checkpoints: [0x1040], irqs: { 0x1100: 'irq' } }).run({ passes: 400 });
  check('the raster and a timer through one handler: 400 passes identical', r.ok && r.passes === 400, true);
  check('and both came', m.ram[0x2000] !== n0[0] && m.ram[0x2001] !== n0[1], true);
}

// 18. A handler that adds up the sprite collisions it reads from $D01F: the game's machine finds
// them as its beam draws the sprite over a character (collide), the port's chips draw nothing, and
// the replay gives the port's handler what the game's read.
{
  const ram = new Uint8Array(65536);
  const put = (a, ...b) => ram.set(b, a);
  put(0x1000, 0x78, 0xA9, 0x00, 0x8D, 0xFE, 0xFF, 0xA9, 0x11, 0x8D, 0xFF, 0xFF, 0xA9, 0xF0, 0x8D, 0x12, 0xD0,
    0xA9, 0x1B, 0x8D, 0x11, 0xD0, 0xA9, 0x01, 0x8D, 0x1A, 0xD0,                            // the raster at line $F0
    0xA9, 0x1C, 0x8D, 0x18, 0xD0, 0xA9, 0x01, 0x8D, 0x15, 0xD0, 0xA9, 0x80, 0x8D, 0x00, 0xD0,
    0x8D, 0x01, 0xD0, 0x58, 0x4C, 0x40, 0x10);                                              // characters at $3000, sprite 0 at $80,$80
  put(0x1040, 0x20, 0x50, 0x10, 0x4C, 0x40, 0x10);                                        // JSR work, JMP
  put(0x1050, 0xA2, 0x00, 0xE8, 0xD0, 0xFD, 0xEE, 0x03, 0x20, 0x60);                      // 256 INX, INC $2003, RTS
  put(0x1100, 0x48, 0xAD, 0x19, 0xD0, 0x8D, 0x19, 0xD0, 0xAD, 0x1F, 0xD0, 0x18, 0x6D, 0x00, 0x20, 0x8D, 0x00, 0x20,
    0x68, 0x40);                                                                            // $2000 += $D01F
  ram.fill(0xFF, 0x3000, 0x3008);                                                         // character 0, every pixel set
  ram[0x07F8] = 0x0D; ram.fill(0xFF, 0x0340, 0x0380);                                     // the sprite's shape at $0340
  const m = new Machine({ ram, pc: 0x1000, passAt: 0x1040, collide: true, port: { dir: 0x2F, data: 0x35 } });
  m.runUntilPass(q => q.passes >= 3);
  const M = new Uint8Array(65536), P = { M };
  P.irq = function () {
    P.io.vicWrite(0x19, P.io.vicRead(0x19));
    M[0x2000] = (M[0x2000] + P.io.vicRead(0x1F)) & 255;
  };
  const program = function* () { for (;;) { yield { cp: 0x1040 }; yield { cycles: 1281 }; M[0x2003] = (M[0x2003] + 1) & 255; } };
  const n0 = m.ram[0x2000];
  const r = new Lockstep({ machine: m, port: P, program, checkpoints: [0x1040], irqs: { 0x1100: 'irq' } }).run({ passes: 400 });
  check('the collisions a handler reads: 400 passes identical', r.ok && r.passes === 400, true);
  check('and the sprite collided', m.ram[0x2000] !== n0, true);
}

// 19. A handler that saves a byte the main program keeps and puts it back: it pushes $2000, uses it
// as its own scratch and pulls it. The interrupt falls in the delay before the main program's INC
// of $2000, and the port's INC comes before its { cycles }, where the replay runs: the handler's
// write of the value it read is no change of the interrupt's, so the port's value stays, and the
// copy to $2001 after the delay is the game's.
{
  const ram = new Uint8Array(65536);
  const put = (a, ...b) => ram.set(b, a);
  put(0x1000, 0x78, 0xA9, 0x00, 0x8D, 0xFE, 0xFF, 0xA9, 0x11, 0x8D, 0xFF, 0xFF, 0xA9, 0x68, 0x8D, 0x12, 0xD0,
    0xA9, 0x1B, 0x8D, 0x11, 0xD0, 0xA9, 0x01, 0x8D, 0x1A, 0xD0, 0x58, 0x4C, 0x20, 0x10);   // set up, CLI, JMP $1020
  put(0x1020, 0x20, 0x40, 0x10, 0x4C, 0x20, 0x10);                                        // JSR work, JMP
  put(0x1040, 0xA2, 0x00, 0xE8, 0xD0, 0xFD, 0xEE, 0x00, 0x20, 0xAD, 0x00, 0x20, 0x8D, 0x01, 0x20, 0x60);   // 256 INX, INC $2000, $2001 = $2000
  put(0x1100, 0x48, 0xAD, 0x00, 0x20, 0x48, 0xA9, 0x55, 0x8D, 0x00, 0x20, 0xEE, 0x02, 0x20,
    0x68, 0x8D, 0x00, 0x20, 0xA9, 0xFF, 0x8D, 0x19, 0xD0, 0x68, 0x40);                     // save $2000, $55 there, INC $2002, put it back
  const m = new Machine({ ram, pc: 0x1000, passAt: 0x1020, port: { dir: 0x2F, data: 0x35 } });
  m.runUntilPass(q => q.passes >= 3);
  const M = new Uint8Array(65536), P = { M };
  P.irq = function () { const s = M[0x2000]; M[0x2000] = 0x55; M[0x2002] = (M[0x2002] + 1) & 255; M[0x2000] = s; P.io.vicWrite(0x19, 0xFF); };
  const program = function* () {
    for (;;) { yield { cp: 0x1020 }; M[0x2000] = (M[0x2000] + 1) & 255; yield { cycles: 1300 }; M[0x2001] = M[0x2000]; }
  };
  const n0 = m.ram[0x2002];
  const r = new Lockstep({ machine: m, port: P, program, checkpoints: [0x1020], irqs: { 0x1100: 'irq' } }).run({ passes: 200 });
  check('a byte a handler saves and puts back: 200 passes identical', r.ok && r.passes === 200, true);
  check('and the interrupt came', m.ram[0x2002] !== n0, true);
}

// 20. A raster wait whose exit heads the copy after it: X is set before the wait, so the loop that
// copies 200 bytes starts at the instruction after the poll, and the game comes to the wait's exit
// 200 times a wait. Only the first, after the poll, is the wait's. The interrupt at line $62 moves
// the clock at $A2 on during the copy, and the game reads it after: the port reads it through
// irqByte before its next yield, where the game is still at the wait's exit, and the copy of the
// machine run on to the next stop for it must pass the copy's turns too.
{
  const ram = new Uint8Array(65536);
  const put = (a, ...b) => ram.set(b, a);
  put(0x1000, 0x78, 0xA9, 0x00, 0x8D, 0xFE, 0xFF, 0xA9, 0x11, 0x8D, 0xFF, 0xFF, 0xA9, 0x62, 0x8D, 0x12, 0xD0,
    0xA9, 0x1B, 0x8D, 0x11, 0xD0, 0xA9, 0x01, 0x8D, 0x1A, 0xD0, 0x58, 0x4C, 0x20, 0x10);   // set up, CLI, JMP $1020
  put(0x1020, 0x20, 0x40, 0x10, 0xEE, 0x00, 0x20, 0x4C, 0x20, 0x10);                     // JSR wait_copy, INC $2000, JMP
  put(0x1040, 0xA2, 0x00, 0xAD, 0x12, 0xD0, 0xC9, 0x60, 0xD0, 0xF9,                      // LDX #0; wait for line $60
    0xBD, 0x00, 0x20, 0x9D, 0x00, 0x21, 0xE8, 0xE0, 0xC8, 0xD0, 0xF5,                     // copy: $2100,X = $2000,X, 200 times
    0xA5, 0xA2, 0x8D, 0x10, 0x20, 0x60);                                                  // $2010 = the clock
  put(0x1100, 0x48, 0xE6, 0xA2, 0xA9, 0xFF, 0x8D, 0x19, 0xD0, 0x68, 0x40);               // INC $A2, the clock
  const m = new Machine({ ram, pc: 0x1000, passAt: 0x1020, port: { dir: 0x2F, data: 0x35 } });
  m.runUntilPass(q => q.passes >= 2);
  const M = new Uint8Array(65536), P = { M };
  P.irq = function () { M[0xA2] = (M[0xA2] + 1) & 255; P.io.vicWrite(0x19, 0xFF); };
  const program = function* () {
    for (;;) {
      yield { cp: 0x1020 }; yield { wait: 0x60 };
      for (let x = 0; x < 200; x++) M[0x2100 + x] = M[0x2000 + x];
      M[0x2010] = P.io.irqByte(0xA2);
      M[0x2000] = (M[0x2000] + 1) & 255;
    }
  };
  const a0 = m.ram[0xA2];
  const r = new Lockstep({ machine: m, port: P, program, checkpoints: [0x1020], waits: [0x1049], irqs: { 0x1100: 'irq' }, irqBytes: [0xA2] }).run({ passes: 50 });
  check('a wait\'s exit that heads a loop: 50 passes identical', r.ok && r.passes === 50, true);
  check('and the clock moved in the copy', m.ram[0x2010] === m.ram[0xA2] && m.ram[0xA2] !== a0, true);
}

// 21. A long routine that hands a page's clock back as it goes ({ cycles: 0 }): a delay of eight
// frames, then the joystick the interrupt last read. The port reads the game's value first, from a
// copy of the machine run on ahead with the input as it stands, then yields 25,000 times. Those
// yields are none of the game's work: if the game ran on at each and took the new frames' input,
// its interrupts would read a joystick the copy never saw.
{
  const ram = new Uint8Array(65536);
  const put = (a, ...b) => ram.set(b, a);
  put(0x1000, 0x78, 0xA9, 0x00, 0x8D, 0xFE, 0xFF, 0xA9, 0x11, 0x8D, 0xFF, 0xFF, 0xA9, 0x62, 0x8D, 0x12, 0xD0,
    0xA9, 0x1B, 0x8D, 0x11, 0xD0, 0xA9, 0x01, 0x8D, 0x1A, 0xD0, 0x58, 0x4C, 0x20, 0x10);   // set up, CLI, JMP $1020
  put(0x1020, 0x20, 0x40, 0x10, 0x4C, 0x20, 0x10);                                        // JSR delay_read, JMP
  put(0x1040, 0xA0, 0x80, 0xA2, 0x00, 0xCA, 0xD0, 0xFD, 0x88, 0xD0, 0xF8,                 // 128 x 256 turns of DEX
    0xA5, 0xA2, 0x8D, 0x10, 0x20, 0x60);                                                  // $2010 = the joystick
  put(0x1100, 0x48, 0xAD, 0x00, 0xDC, 0x85, 0xA2, 0xA9, 0xFF, 0x8D, 0x19, 0xD0, 0x68, 0x40);   // $A2 = $DC00
  const m = new Machine({ ram, pc: 0x1000, passAt: 0x1020, port: { dir: 0x2F, data: 0x35 } });
  m.runUntilPass(q => q.passes >= 2);
  const M = new Uint8Array(65536), P = { M };
  P.irq = function () { M[0xA2] = P.io.ciaRead(0x00); P.io.vicWrite(0x19, 0xFF); };
  const program = function* () {
    for (;;) {
      yield { cp: 0x1020 };
      M[0x2010] = P.io.irqByte(0xA2);
      for (let n = 0; n < 25000; n++) yield { cycles: 0 };
    }
  };
  const seen = new Set();
  const r = new Lockstep({ machine: m, port: P, program, checkpoints: [0x1020], irqs: { 0x1100: 'irq' }, irqBytes: [0xA2] })
    .run({ passes: 6, onFrame: (f, g) => { g.joy = f & 1 ? 0x1F : 0x0E; seen.add(g.ram[0x2010]); } });
  check('yields of no work in a long routine: 6 passes identical', r.ok && r.passes === 6, true);
  check('and the joystick changed', seen.size > 1, true);
}

// A stand-in on the port's banking (P.cpuPort), and an interrupt handler the KERNAL's entry reaches.
{
  const M = new Uint8Array(65536), P = { M, cpuPort: 0x34 };
  P.io = { read: (a) => (a === 0xD020 ? 0xAB : 0), write: () => {} };
  M[0xD020] = 0x11;
  // $C000: LDA $D020; STA $C100; LDA #$35; STA $01; RTS
  M.set([0xAD, 0x20, 0xD0, 0x8D, 0x00, 0xC1, 0xA9, 0x35, 0x85, 0x01, 0x60], 0xC000);
  const f = standIn(P, 0xC000);
  f();
  check('a stand-in on $01 = $34 reads the RAM under the chips', M[0xC100], 0x11);
  check('the banking it leaves comes back in P.cpuPort', P.cpuPort, 0x35);
  f();
  check('the next stand-in runs on the banking the port keeps', M[0xC100], 0xAB);
  // $C200: INC $C101; PLA; TAY; PLA; TAX; PLA; RTI, a handler for the KERNAL's entry, and $C210: INC $C102; JMP $EA31
  M.set([0xEE, 0x01, 0xC1, 0x68, 0xA8, 0x68, 0xAA, 0x68, 0x40], 0xC200);
  M.set([0xEE, 0x02, 0xC1, 0x4C, 0x31, 0xEA], 0xC210);
  P.cpuPort = 0x36;
  const r = standIn(P, 0xC200, { irq: true, kernal: true })({ a: 0x12, x: 0x34, y: 0x56 });
  check('a handler that pulls what $FF48 pushed returns the registers', [r.a, r.x, r.y].join(), [0x12, 0x34, 0x56].join());
  let acked = 0;
  standIn(P, 0xC210, { irq: true, kernal: true, hooks: { 0xEA30: () => {} } })({});
  standIn(P, 0xC210, { irq: true, kernal: true, hooks: { 0xEA31: (c) => { acked++; c.y = c.pull(); c.x = c.pull(); c.a = c.pull(); c.rti(); } } })({});
  check('a handler that leaves by $EA31 runs, and a hook can stand in for it', [M[0xC101], M[0xC102], acked].join(), [1, 2, 1].join());
}

// A stand-in that goes on by JMP, stopped where the port takes over (standInGen's until).
{
  const M = new Uint8Array(65536), P = { M };
  P.io = { read: () => 0, write: () => {} };
  // $C300: INC $C110; JMP $C310 ... $C310: INC $C111; RTS
  M.set([0xEE, 0x10, 0xC1, 0x4C, 0x10, 0xC3], 0xC300);
  M.set([0xEE, 0x11, 0xC1, 0x60], 0xC310);
  const it = standInGen(P, 0xC300, { until: [0xC310] })({});
  let r; do r = it.next(); while (!r.done);
  check('standInGen until: stopped at the JMP\'s target', [r.value.at, M[0xC110], M[0xC111]].join(), [0xC310, 1, 0].join());
}

// A handler that reads a write-only SID register gets the data bus as the game's read it, faded
// with the time since the write, not as the port's chips hold it when the replay comes.
{
  const { Machine } = require('./machine.js');
  const ram = new Uint8Array(65536);
  // $1000: SEI; the vector $FFFE to $1100; a raster interrupt on line $80; CLI; then the loop at $1020: INC $2000; JMP $1020
  ram.set([0x78, 0xA9, 0x00, 0x8D, 0xFE, 0xFF, 0xA9, 0x11, 0x8D, 0xFF, 0xFF, 0xA9, 0x80, 0x8D, 0x12, 0xD0,
    0xA9, 0x1B, 0x8D, 0x11, 0xD0, 0xA9, 0x01, 0x8D, 0x1A, 0xD0, 0x58, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA,
    0xEE, 0x00, 0x20, 0x4C, 0x20, 0x10], 0x1000);
  // $1100: LDA #$FF STA $D400 (the bus holds $FF); about 20,000 cycles of counting; LDA $D405 (the
  // bus, faded); STA $2010; LDA #$01 STA $D019; RTI
  ram.set([0xA9, 0xFF, 0x8D, 0x00, 0xD4, 0xA2, 0x10, 0xA0, 0x00, 0x88, 0xD0, 0xFD, 0xCA, 0xD0, 0xF8,
    0xAD, 0x05, 0xD4, 0x8D, 0x10, 0x20, 0xA9, 0x01, 0x8D, 0x19, 0xD0, 0x40], 0x1100);
  // a 6581, whose bus holds a value $1D00 cycles (site/lib/sid.js), well inside the handler's count
  const m = new Machine({ ram, pc: 0x1000, port: { dir: 0x2F, data: 0x35 }, sid: '6581' });
  const P = { M: new Uint8Array(65536) };
  P.irq = function () { P.io.write(0xD400, 0xFF); P.M[0x2010] = P.io.read(0xD405); P.io.write(0xD019, 1); };
  P.program = function* () {
    P.io.write(0xD012, 0x80); P.io.write(0xD011, 0x1B); P.io.write(0xD01A, 1);
    for (;;) { yield { cp: 0x1020 }; P.M[0x2000] = (P.M[0x2000] + 1) & 255; }
  };
  const r = new Lockstep({ machine: m, port: P, program: (p) => p.program(), passAt: 0x1020, irqs: { 0x1100: 'irq' }, compare: [[0x2010, 0x2010]] })
    .run({ passes: 3000 });
  check('a handler\'s read of the SID\'s faded bus: the game read $' + m.ram[0x2010].toString(16) + ', and so did the port, 3000 passes identical', r.ok && r.passes === 3000 && m.ram[0x2010] !== 0xFF, true);
}

process.exit(fails ? 1 : 0);
