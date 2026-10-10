'use strict';
// A self-test of kit/spectrum/lockstep.js: a program of its own on the kit's Spectrum, beside a port
// of it written here, and ports with one fault each of the kinds the lockstep has to name. The
// T-states the timing checks expect are worked by hand from the instructions' own timings (none of
// the program's addresses is contended), never taken from a run.
// Exits 1 on any failure. node kit/spectrum/test_lockstep.js
const { Machine, FRAME } = require('./machine.js');
const { Lockstep, standIn, describe } = require('./lockstep.js');

let fails = 0;
const check = (what, got, want) => { if (got !== want) { fails++; console.log('FAIL', what, 'got', got, 'want', want); } else console.log('ok  ', what); };

// The program, in IM 2 with its vector at $90FF, a pass of three frames: the main loop counts, scans
// two half-rows and a Kempston joystick, waits a while, halts for the frame's interrupt (handler A),
// sums a table for longer than a frame (handler B comes inside), sets the border and EAR and reads
// the keys back, and polls a byte handler A moves.
const ADDR = {
  ENTRY: 0x8000, MAIN: 0x8020, CALLS: [0x8024, 0x8027, 0x802A, 0x802D, 0x8030, 0x8033],
  SCAN: 0x8100, DELAY: 0x8120, WAIT: 0x8140, HALT_EXIT: 0x8141, WORK: 0x8160, BORDER: 0x81A0, POLL: 0x81C0,
  IRQ_A: 0xA000, IRQ_B: 0xA040, VECTOR: 0x90FF,
};
// $C000 the pass count, $C001 handler A's count, $C002 and $C003 the half-rows $FEFE and $7FFE, $C004
// the sum, $C005 handler B's count, $C006 the half-row $FBFE as handler A read it, $C007 the sum as
// handler B read it, $C008 the keys read after the border, $C009 and $C00A handler B's count as work
// read it before and after, $C00B and $C00C written by work and by handler B, $C00D the joystick;
// the table at $C100
function program() {
  const ram = new Uint8Array(65536);
  const at = (a, bytes) => bytes.forEach((b, i) => { ram[a + i] = b; });
  // DI; LD SP,$FF00; LD A,$90; LD I,A; IM 2; LD HL,$A000; LD ($90FF),HL; EI; JP $8020: 78 T-states
  at(0x8000, [0xF3, 0x31, 0x00, 0xFF, 0x3E, 0x90, 0xED, 0x47, 0xED, 0x5E, 0x21, 0x00, 0xA0, 0x22, 0xFF, 0x90, 0xFB, 0xC3, 0x20, 0x80]);
  // $8020 LD HL,$C000; INC (HL); CALL scan, delay, wait, work, border, poll; JP $8020
  at(0x8020, [0x21, 0x00, 0xC0, 0x34, 0xCD, 0x00, 0x81, 0xCD, 0x20, 0x81, 0xCD, 0x40, 0x81, 0xCD, 0x60, 0x81,
    0xCD, 0xA0, 0x81, 0xCD, 0xC0, 0x81, 0xC3, 0x20, 0x80]);
  // scan: LD A,$FE; IN A,($FE); LD ($C002),A; LD A,$7F; IN A,($FE); LD ($C003),A; IN A,($1F);
  // LD ($C00D),A; RET
  at(0x8100, [0x3E, 0xFE, 0xDB, 0xFE, 0x32, 0x02, 0xC0, 0x3E, 0x7F, 0xDB, 0xFE, 0x32, 0x03, 0xC0, 0xDB, 0x1F, 0x32, 0x0D, 0xC0, 0xC9]);
  // delay: LD B,100; DJNZ $8122; RET
  at(0x8120, [0x06, 0x64, 0x10, 0xFE, 0xC9]);
  // wait: HALT; LD HL,$A040; LD ($90FF),HL; RET (the vector to handler B, which puts A back)
  at(0x8140, [0x76, 0x21, 0x40, 0xA0, 0x22, 0xFF, 0x90, 0xC9]);
  // work: XOR A; LD ($C00C),A; LD A,($C005); LD ($C009),A; LD A,($C002); LD C,A; LD A,($C004); LD D,11;
  // LD HL,$C100; LD B,0; $8178 ADD A,(HL); XOR C; INC L; DJNZ $8178; DEC D; JR NZ,$8178
  // LD ($C004),A; LD A,($C005); LD ($C00A),A; XOR A; LD ($C00B),A; RET
  at(0x8160, [0xAF, 0x32, 0x0C, 0xC0, 0x3A, 0x05, 0xC0, 0x32, 0x09, 0xC0, 0x3A, 0x02, 0xC0, 0x4F, 0x3A, 0x04, 0xC0, 0x16, 0x0B,
    0x21, 0x00, 0xC1, 0x06, 0x00,
    0x86, 0xA9, 0x2C, 0x10, 0xFB, 0x15, 0x20, 0xF8,
    0x32, 0x04, 0xC0, 0x3A, 0x05, 0xC0, 0x32, 0x0A, 0xC0, 0xAF, 0x32, 0x0B, 0xC0, 0xC9]);
  // border: LD A,($C000); AND $17; OUT ($FE),A; IN A,($FE); LD ($C008),A; RET
  at(0x81A0, [0x3A, 0x00, 0xC0, 0xE6, 0x17, 0xD3, 0xFE, 0xDB, 0xFE, 0x32, 0x08, 0xC0, 0xC9]);
  // poll: LD HL,$C001; LD A,(HL); $81C4 CP (HL); JR Z,$81C4; RET
  at(0x81C0, [0x21, 0x01, 0xC0, 0x7E, 0xBE, 0x28, 0xFD, 0xC9]);
  // handler A: PUSH AF; PUSH HL; LD HL,$C001; INC (HL); LD A,$FB; IN A,($FE); LD ($C006),A; POP HL;
  // POP AF; EI; RETI
  at(0xA000, [0xF5, 0xE5, 0x21, 0x01, 0xC0, 0x34, 0x3E, 0xFB, 0xDB, 0xFE, 0x32, 0x06, 0xC0, 0xE1, 0xF1, 0xFB, 0xED, 0x4D]);
  // handler B: PUSH AF; PUSH HL; LD A,($C004); LD ($C007),A; LD HL,$C005; INC (HL); LD A,(HL);
  // LD ($C00C),A; LD A,$FF; LD ($C00B),A; LD HL,$A000; LD ($90FF),HL; POP HL; POP AF; EI; RETI
  at(0xA040, [0xF5, 0xE5, 0x3A, 0x04, 0xC0, 0x32, 0x07, 0xC0, 0x21, 0x05, 0xC0, 0x34, 0x7E, 0x32, 0x0C, 0xC0,
    0x3E, 0xFF, 0x32, 0x0B, 0xC0, 0x21, 0x00, 0xA0, 0x22, 0xFF, 0x90, 0xE1, 0xF1, 0xFB, 0xED, 0x4D]);
  for (let i = 0; i < 256; i++) ram[0xC100 + i] = (i * 7 + 3) & 255;
  return ram;
}

// The port: one function for each of the program's routines, on its memory at its addresses.
function port() {
  const M = new Uint8Array(65536), P = { M };
  P.scan = function () {                                   // $8100
    M[0xC002] = P.io.in(0xFEFE);
    M[0xC003] = P.io.in(0x7FFE);
    M[0xC00D] = P.io.in((M[0xC003] << 8) | 0x1F);
  };
  P.delay = function* () { yield { tstates: 1329 }; };    // $8120, with its CALL
  P.wait = function* () {                                  // $8140
    yield { halt: true };
    M[0x90FF] = 0x40; M[0x9100] = 0xA0;
  };
  P.work = function () {                                   // $8160
    M[0xC00C] = 0;
    M[0xC009] = M[0xC005];
    const c = M[0xC002];
    let a = M[0xC004];
    for (let i = 0; i < 11 * 256; i++) a = ((a + M[0xC100 + (i & 255)]) & 255) ^ c;
    M[0xC004] = a;
    M[0xC00A] = M[0xC005];
    M[0xC00B] = 0;
  };
  P.border = function () {                                 // $81A0
    const a = M[0xC000] & 0x17;
    P.io.out((a << 8) | 0xFE, a);
    M[0xC008] = P.io.in((a << 8) | 0xFE);
  };
  P.poll = function* () {                                  // $81C0
    const a = M[0xC001];
    while (M[0xC001] === a) yield;
  };
  P.irq_a = function () {                                  // $A000
    M[0xC001] = (M[0xC001] + 1) & 255;
    M[0xC006] = P.io.in(0xFBFE);
  };
  P.irq_b = function () {                                  // $A040
    M[0xC007] = M[0xC004];
    M[0xC005] = (M[0xC005] + 1) & 255;
    M[0xC00C] = M[0xC005];
    M[0xC00B] = 0xFF;
    M[0x90FF] = 0x00; M[0x9100] = 0xA0;
  };
  P.setup = function () { M[0x90FF] = 0x00; M[0x9100] = 0xA0; };   // $8000, for a start from the hand-over
  P.loop = function* (work) {                              // $8020
    for (;;) {
      yield { cp: 0x8020 }; M[0xC000] = (M[0xC000] + 1) & 255;
      yield { cp: 0x8024 }; P.scan();
      yield { cp: 0x8027 }; yield* P.delay();
      yield { cp: 0x802A }; yield* P.wait();
      yield { cp: 0x802D }; yield* work();
      yield { cp: 0x8030 }; P.border();
      yield { cp: 0x8033 }; yield* P.poll();
    }
  };
  P.main_loop = function* () { yield* P.loop(function* () { P.work(); }); };
  return P;
}

// A moment of play: the program run for two passes, stopped at the start of the third.
const start = new Machine({ ram: program(), pc: ADDR.ENTRY, passAt: ADDR.MAIN });
start.runUntilPass(q => q.passes >= 3);
const STATE = start.save();
const OPTS = { checkpoints: [ADDR.MAIN, ...ADDR.CALLS], halts: [ADDR.HALT_EXIT], irqs: { [ADDR.IRQ_A]: 'irq_a', [ADDR.IRQ_B]: 'irq_b' } };
// a Kempston joystick on port $1F, added to the machine as a page would
const kempston = m => { const pad = { joy: 0 }; m.pad = pad; m.portIn = p => ((p & 0xFF) === 0x1F ? pad.joy : Machine.prototype.portIn.call(m, p)); return m; };
const lockstep = (P, more = {}) => new Lockstep(Object.assign({ machine: kempston(Machine.restore(STATE)), port: P, program: p => p.main_loop() }, OPTS, more));
// input that changes: keys on the half-rows the program and handler A read, and the joystick
const input = (n, m) => {
  m.releaseAll();
  m.pad.joy = n % 4 === 2 ? 0x10 : n % 6 === 1 ? 0x05 : 0;
  if (n % 7 === 3) m.press('CAPS');
  if (n % 5 === 1) m.press('SPACE');
  if (n % 3 === 0) m.press('Z');
  if (n % 11 === 4) m.press('Q');
};
// a machine with any of the lockstep's wrappers left on it
const wrapped = m => Object.prototype.hasOwnProperty.call(m, 'interrupt') || ['fetch', 'rd', 'wr'].some(k => Object.prototype.hasOwnProperty.call(m.cpu, k));
// a port whose work is a generator of its own
const withWork = work => { const P = port(); P.main_loop = function* () { yield* P.loop(work.bind(null, P)); }; return P; };

check('the state saved at the main loop', STATE.cpu.pc, ADDR.MAIN);
check('a pass is three frames', start.frames, 6);

// 1. Handler B comes inside work, and the port runs it after work has finished. It reads the sum
// work had not yet stored ($C004) and gets the game's value; it and work both write $C00B and $C00C,
// and the last writer's value stands. The race is work reading the count handler B moved on in the
// middle of it ($C00A), and it shows there and nowhere else.
{
  const r = lockstep(port()).run({ passes: 50, onPass: input, stopOnDiff: false });
  const addresses = new Set(r.diffs.flatMap(d => d.bytes.map(b => b.address)));
  check('the race shows at $C00A and nowhere else', [...addresses].join(), String(0xC00A));
  check('in every pass', r.diffs.length, 50);
  check('and the run goes on', r.passes, 50);
}

// 1b. A port whose work runs ahead of the game: it writes $C00B and then yields bare while the game
// catches up. With 40 lines, handler B comes in the game's work after them, and runs in the port at
// the next checkpoint; with 320, it comes during them, and runs in the port at a bare yield. Either
// way the byte keeps the game's order at the next checkpoint, and nothing else moves.
for (const lines of [40, 320]) {
  const P = withWork(function* (p) { p.work(); for (let i = 0; i < lines; i++) yield; });
  const r = lockstep(P, { ignore: [0xC00A] }).run({ passes: 50, onPass: input });
  check('a port ' + lines + ' lines ahead of the game: the last writer still the game\'s', r.ok && r.passes === 50, true);
}

// 1c. The race given to the port: work reads the count through irqByte, before handler B and after,
// and gets the values the game's work read: from a copy run on ahead when the port reads first, or
// from the game's own run for the part of the stretch it has run; and the machine is given back as
// it was.
{
  const reads = P => { P.M[0xC009] = P.io.irqByte(0xC005); P.M[0xC00A] = P.io.irqByte(0xC005); };
  const withByte = () => { const P = port(), work = P.work; P.work = function () { work(); reads(P); }; return P; };
  const ls = lockstep(withByte(), { irqBytes: [0xC005] }), r = ls.run({ passes: 60, onPass: input });
  check('irqBytes: the race gone, 60 passes identical', r.ok && r.passes === 60, true);
  check('the machine\'s interrupt, fetch, rd and wr its own again', wrapped(ls.m), false);
  // the reads made later: the game part way through the stretch, past its first read and before
  // handler B (40 lines), past handler B (340), or waiting at its end (400)
  for (const lines of [40, 340, 400]) {
    const P = withWork(function* (p) { p.work(); for (let i = 0; i < lines; i++) yield; reads(p); });
    const r2 = lockstep(P, { irqBytes: [0xC005] }).run({ passes: 30, onPass: input });
    check('irqBytes read ' + lines + ' lines on: 30 passes identical', r2.ok && r2.passes === 30, true);
  }
  let msg = '';
  try { lockstep(withByte()).run({ passes: 2 }); } catch (e) { msg = e.message; }
  check('irqByte of a byte not listed', /\$C005 through irqByte, and it is not in irqBytes/.test(msg), true);
}

// 1d. A port whose poll counts the T-states of each turn instead of yielding bare: handler A runs in
// the port at the turn the game took it in, and the port leaves the loop when the game does.
{
  const P = port(), M = P.M;
  P.poll = function* () { const a = M[0xC001]; while (M[0xC001] === a) yield { tstates: 19 }; };
  const r = lockstep(P, { ignore: [0xC00A], maxFrames: 10 }).run({ passes: 30, onPass: input });
  check('a poll by T-states: 30 passes identical', r.ok && r.passes === 30, true);
}

// 2. With the race's byte left out, every pass matches, the border and EAR included, and the keys
// read back after the border with the port's own EAR; the game is never left inside a handler at a
// yield; and the machine is given back as it was.
{
  const P = port(), poll = P.poll;
  let ls, inside = 0;
  P.poll = function* () {
    const it = poll();
    for (let r = it.next(); !r.done; r = it.next()) { yield r.value; if (ls.m.cpu.pc >= ADDR.IRQ_A && ls.m.cpu.pc < 0xA060) inside++; }
  };
  ls = lockstep(P, { ignore: [0xC00A], chips: ['border', 'ear'] });
  const ears = new Set();
  const r = ls.run({ passes: 300, onPass: (n, m) => { ears.add(m.ear); input(n, m); } });
  check('300 passes identical', r.ok && r.passes === 300 && !r.diffs.length && !r.diverged, true);
  check('three frames a pass', r.frames, 900);
  check('with the EAR output set and clear', ears.size, 2);
  check('the game outside its handlers at every turn of the poll', inside, 0);
  check('the border the port set', ls.ula.border, ls.m.border);
  check('describe: identical', /300 passes in 900 frames: identical/.test(describe(r)), true);
  // a run goes on from where the last stopped
  check('a second run', ls.run({ passes: 5, onPass: input }).passes, 5);
  const m = ls.m;
  check('the machine given back: its own hook only', Object.keys(m.hooks).join(), String(ADDR.MAIN));
  check('its interrupt, fetch, rd and wr its own', wrapped(m), false);
  const n = m.passes;
  m.runPasses(4);
  check('and it runs alone', m.passes, n + 4);
}
{
  // handler A's half-row with Q held and not, as the game and the port read it
  const seen = [];
  const r = lockstep(port(), { ignore: [0xC00A] }).run({ passes: 12, onPass: (n, m) => {
    seen.push([m.ram[0xC006], n]); m.releaseAll(); if (n % 2) m.press('Q');
  } });
  check('handler A: 12 passes identical with Q pressed and released', r.ok && r.passes === 12, true);
  check('and it read Q both ways', new Set(seen.slice(2).map(s => s[0])).size, 2);
}

// 3. The timing: each stretch's T-states on the machine, its interrupts taken out, and the port's calls.
{
  const rows = [];
  lockstep(port(), { ignore: [0xC00A], timing: s => rows.push(s) }).run({ passes: 20, onPass: input });
  const of = (from, to) => rows.filter(s => s.from === from && s.to === to);
  const same = (list, k) => list.length > 0 && list.every(s => s[k] === list[0][k]);
  const [c1, c2, c3, c4, c5, c6] = ADDR.CALLS;
  const inc = of(ADDR.MAIN, c1), scan = of(c1, c2), delay = of(c2, c3), wait = of(c3, ADDR.HALT_EXIT), vec = of(ADDR.HALT_EXIT, c4);
  const work = of(c4, c5), border = of(c5, c6), poll = of(c6, ADDR.MAIN);
  check('20 of each stretch', [inc, scan, delay, wait, vec, work, border, poll].every(l => l.length === 20), true);
  // LD HL,nn 10, INC (HL) 11
  check('INC ($C000): 21 T-states, no call', inc.every(s => s.tstates === 21 && !Object.keys(s.calls).length), true);
  // CALL 17, LD A,n 7, IN A,(n) 11, LD (nn),A 13, twice, IN A,(n) 11, LD (nn),A 13, RET 10
  check('scan: 113 T-states with its CALL and RET', same(scan, 'tstates') && scan[0].tstates, 113);
  // CALL 17, LD B,n 7, DJNZ 99 x 13 + 8, RET 10
  check('delay: 1,329 T-states, as the port counts them', delay.every(s => s.tstates === 1329 && s.estimate === 1329), true);
  check('the halt marked, handler A counted', wait.every(s => s.halt && s.irqs === 1 && s.calls.wait === 1), true);
  // LD HL,nn 10, LD (nn),HL 16, RET 10
  check('from the HALT\'s exit: 36 T-states', same(vec, 'tstates') && vec[0].tstates, 36);
  // CALL 17, XOR A 4, LD (nn),A 13, LD A,(nn) 13, LD (nn),A 13, LD A,(nn) 13, LD C,A 4, LD A,(nn) 13,
  // LD D,n 7, LD HL,nn 10, LD B,n 7; the loop: 11 x (256 x 15 + 255 x 13 + 8 + DEC D 4) + 10 x 12 + 7;
  // then 13, 13, 13, 4, 13, RET 10
  const WORK = 17 + 4 + 13 + 13 + 13 + 13 + 4 + 13 + 7 + 10 + 7 + 11 * (256 * 15 + 255 * 13 + 8 + 4) + 10 * 12 + 7 + 13 + 13 + 13 + 4 + 13 + 10;
  check('work: ' + WORK + ' T-states, handler B inside it taken out', same(work, 'tstates') && work[0].tstates, WORK);
  check('and that interrupt counted', work.every(s => s.irqs === 1 && s.irqTstates > 0), true);
  check('work: one call of the port\'s', work.every(s => s.calls.work === 1 && Object.keys(s.calls).length === 1), true);
  // CALL 17, LD A,(nn) 13, AND n 7, OUT (n),A 11, IN A,(n) 11, LD (nn),A 13, RET 10
  check('border: 82 T-states', same(border, 'tstates') && border[0].tstates, 82);
  check('poll: a bare yield a line, handler A taken out',
    poll.every(s => Math.abs(s.polls - (s.tstates + s.irqTstates) / 224) < 2 && s.irqs === 1 && s.calls.poll === 1), true);
  // handler B: 19 to take it, then 11, 11, 13, 13, 10, 11, 7, 13, 7, 13, 10, 16, 10, 10, 4, 14
  check('handler B: 192 T-states', work.every(s => s.irqTstates === 19 + 11 + 11 + 13 + 13 + 10 + 11 + 7 + 13 + 7 + 13 + 10 + 16 + 10 + 10 + 4 + 14), true);
  check('no interrupt handler counted', rows.some(s => s.calls.irq_a || s.calls.irq_b), false);
}

// 4. A port that sums wrongly when CAPS SHIFT is held: found at the next pass's start, and the run stops.
{
  const P = port(), M = P.M, work = P.work;
  P.work = function () { work(); if (!(M[0xC002] & 1)) M[0xC004] ^= 1; };
  const r = lockstep(P, { ignore: [0xC00A] }).run({ passes: 20, onPass: (n, m) => { m.releaseAll(); if (n === 4) m.press('CAPS'); } });
  check('a wrong sum: found', r.ok, false);
  check('after the pass that held CAPS SHIFT', r.diffs.length === 1 && r.diffs[0].pass, 5);
  check('at $C004, one byte', r.diffs[0].count === 1 && r.diffs[0].bytes[0].address, 0xC004);
  check('describe names it', /pass 5 .*1 byte differs: \$C004 game \$[0-9A-F]{2} port \$[0-9A-F]{2}/.test(describe(r)), true);
  // with stopOnDiff: false the port is given the game's memory, and the sum is right again after
  const P2 = port(), M2 = P2.M, work2 = P2.work;
  P2.work = function () { work2(); if (!(M2[0xC002] & 1)) M2[0xC004] ^= 1; };
  const r2 = lockstep(P2, { ignore: [0xC00A] }).run({ passes: 20, stopOnDiff: false, onPass: (n, m) => { m.releaseAll(); if (n === 4) m.press('CAPS'); } });
  check('stopOnDiff: false: the one pass, and the run goes on', r2.diffs.length === 1 && r2.diffs[0].pass === 5 && r2.passes === 20, true);
}

// 4b. A port that sets the wrong border on one pass: the ULA compared.
{
  const P = port(), M = P.M;
  P.border = function () {
    const a = M[0xC000] & 0x17;
    P.io.out((a << 8) | 0xFE, M[0xC000] === ((start.ram[0xC000] + 3) & 255) ? a ^ 1 : a);
    M[0xC008] = P.io.in((a << 8) | 0xFE);
  };
  const r = lockstep(P, { ignore: [0xC00A] }).run({ passes: 10 });
  check('a wrong border: found on the pass after', r.diffs.length === 1 && r.diffs[0].pass === 3 && r.diffs[0].count === 1 && r.diffs[0].bytes[0].chip, 'border');
  check('describe names the chip', /border \$00FE game \$0\d port \$0\d/.test(describe(r)), true);
}

// 5. A port whose loop skips the scan on one pass: a divergence of path, both places named.
{
  const P = port(), M = P.M, skip = (start.ram[0xC000] + 4) & 255;
  P.main_loop = function* () {
    for (;;) {
      yield { cp: 0x8020 }; M[0xC000] = (M[0xC000] + 1) & 255;
      if (M[0xC000] !== skip) { yield { cp: 0x8024 }; P.scan(); }
      yield { cp: 0x8027 }; yield* P.delay();
      yield { cp: 0x802A }; yield* P.wait();
      yield { cp: 0x802D }; P.work();
      yield { cp: 0x8030 }; P.border();
      yield { cp: 0x8033 }; yield* P.poll();
    }
  };
  const ls = lockstep(P, { ignore: [0xC00A] }), r = ls.run({ passes: 20, onPass: input });
  check('a skipped call: out of step', !!r.diverged && r.diverged.game === 0x8024 && r.diverged.port === 0x8027, true);
  check('on the pass it happened', r.diverged.pass, 3);
  let threw = false;
  try { ls.run({ passes: 1 }); } catch (e) { threw = /no longer in step/.test(e.message); }
  check('and a lockstep out of step will not run on', threw, true);
}

// 6. A HALT the port leaves out, and one the game does not make.
{
  const P = port();
  P.wait = function* () { P.M[0x90FF] = 0x40; P.M[0x9100] = 0xA0; };
  const r = lockstep(P, { ignore: [0xC00A] }).run({ passes: 5 });
  check('a HALT left out', !!r.diverged && r.diverged.game === ADDR.HALT_EXIT && /went to \$8141 \(a HALT's exit\), the port to \$802D/.test(r.diverged.why), true);
  const Q = port();
  Q.delay = function* () { yield { halt: true }; };
  const r2 = lockstep(Q, { ignore: [0xC00A] }).run({ passes: 5 });
  check('a HALT the game does not make', !!r2.diverged && r2.diverged.port === 'halt' && /went to \$802A, the port halted/.test(r2.diverged.why), true);
}

// 7. A port that polls on after the game has left its loop.
{
  const P = port(), M = P.M;
  P.poll = function* () { const a = M[0xC001]; while (M[0xC001] !== ((a + 2) & 255)) yield; };
  const r = lockstep(P, { ignore: [0xC00A] }).run({ passes: 5 });
  check('polling past the game', !!r.diverged && r.diverged.port === 'poll' && r.diverged.game === ADDR.MAIN, true);
}

// 8. The game's own code standing in for a routine and a handler, on the port's memory and keys.
{
  const P = port();
  P.work = standIn(P, ADDR.WORK);
  const r = lockstep(P, { ignore: [0xC00A], irqs: { [ADDR.IRQ_A]: standIn(P, ADDR.IRQ_A), [ADDR.IRQ_B]: 'irq_b' } })
    .run({ passes: 100, onPass: input });
  check('stand-ins: 100 passes identical', r.ok && r.passes === 100, true);
  const Q = port();
  let msg = '';
  try { standIn(Q, ADDR.WORK)(); } catch (e) { msg = e.message; }
  check('a stand-in with no stack', /no stack pointer for \$8160/.test(msg), true);
  Q.io = { sp: 0xFF00 };
  Q.M[0x8000] = 0xCD; Q.M[0x8001] = 0x05; Q.M[0x8002] = 0x10; Q.M[0x8003] = 0xC9;   // CALL $1005; RET
  msg = '';
  try { standIn(Q, 0x8000)(); } catch (e) { msg = e.message; }
  check('a stand-in that calls the ROM', /reached the ROM at \$1005/.test(msg), true);
  Q.M[0x8000] = 0x76;                                                                // HALT
  msg = '';
  try { standIn(Q, 0x8000)(); } catch (e) { msg = e.message; }
  check('a stand-in that halts', /\$8000 halted/.test(msg), true);
  Q.M.set([0x3E, 0x12, 0x06, 0x34, 0xC9], 0x8000);                                    // LD A,$12; LD B,$34; RET
  const out = standIn(Q, 0x8000)({ c: 0x56 });
  check('a stand-in gives back the registers', [out.a, out.b, out.c].join(), [0x12, 0x34, 0x56].join());
}

// 9. From the hand-over: the port's program sets the machine up too, names the time that took up to
// the main loop ({ tstates, at }), and the main loop names the same place again. The stack pointer is
// not the game's yet, so the lockstep is told where its stack is.
{
  const P = port();
  const m = kempston(new Machine({ ram: program(), pc: ADDR.ENTRY, passAt: ADDR.MAIN }));
  const ls = new Lockstep(Object.assign({ machine: m, port: P, program: p => (function* () { p.setup(); yield { tstates: 78, at: 0x8020 }; yield* p.main_loop(); })(),
    ignore: [0xC00A], stack: [0xFE00, 0xFEFF], chips: ['border', 'ear'] }, OPTS));
  const r = ls.run({ passes: 30, onPass: input });
  check('from the hand-over: 30 passes identical', r.ok && r.passes === 30, true);
  check('P.io.sp is the top of the stack given', P.io.sp, 0xFF00);
}

// 10. Input by frame: onFrame for every frame the game begins, the input changed only at a yield.
{
  const frames = [];
  const r = lockstep(port(), { ignore: [0xC00A] }).run({ passes: 40, onFrame: (f, m) => {
    frames.push(f); m.releaseAll(); if (f % 3 === 0) m.press('CAPS'); if (f % 4 === 1) m.press('Q'); if (f % 5 === 2) m.press('SPACE');
  } });
  check('input by frame: 40 passes identical', r.ok && r.passes === 40, true);
  check('onFrame once for each frame begun', frames.length === r.frames && frames.every((f, i) => !i || f === frames[i - 1] + 1), true);
}

// 11. What the lockstep refuses.
{
  const P = port();
  P.main_loop = function* () { yield { cp: 0x8020 }; yield { cp: 0x1234 }; };
  let msg = '';
  try { lockstep(P).run({ passes: 2 }); } catch (e) { msg = e.message; }
  check('a checkpoint not listed', /checkpoint \$1234, which is not in checkpoints/.test(msg), true);
  msg = '';
  try { lockstep(port(), { irqs: { [ADDR.IRQ_A]: 'irq_a' } }).run({ passes: 3 }); } catch (e) { msg = e.message; }
  check('an interrupt with no handler', /no port handler for the interrupt at \$A040/.test(msg), true);
  const Q = port();
  Q.delay = function* () { yield { cycles: 1329 }; };
  msg = '';
  try { lockstep(Q).run({ passes: 2 }); } catch (e) { msg = e.message; }
  check('a C64 port\'s yield', /\{ cycles \} and \{ wait \} are the C64's/.test(msg), true);
  msg = '';
  try { new Lockstep(Object.assign({ machine: Machine.restore(STATE), port: port(), program: p => p.main_loop() }, OPTS, { halts: [ADDR.CALLS[0]] })); } catch (e) { msg = e.message; }
  check('a checkpoint that is a HALT\'s exit', /\$8024 is both a checkpoint and a HALT's exit/.test(msg), true);
}

// 12. IM 1 with no ROM: a hook stands in for the ROM's handler at $0038, counting the frames in $C001
// as handler A does and returning at once, and the port's handler for $0038 does the same. The copy
// irqBytes runs on ahead takes the game's hook with it.
{
  const ram = program();
  ram[0x8009] = 0x56;                                       // IM 2 becomes IM 1
  const rom = q => { q.ram[0xC001] = (q.ram[0xC001] + 1) & 255; q.cpu.iff1 = q.cpu.iff2 = 1; q.ret(); };
  const m = kempston(new Machine({ ram, pc: ADDR.ENTRY, passAt: ADDR.MAIN, hooks: { 0x38: rom } }));
  m.runUntilPass(q => q.passes >= 3);
  const P = port(), M = P.M, work = P.work;
  let frames = 0;
  P.rom_irq = function () { M[0xC001] = (M[0xC001] + 1) & 255; frames++; };
  P.work = function () { work(); M[0xC00A] = P.io.irqByte(0xC005); };
  const ls = new Lockstep(Object.assign({ machine: m, port: P, program: p => p.main_loop() }, OPTS, { irqs: { 0x38: 'rom_irq' }, irqBytes: [0xC005] }));
  const r = ls.run({ passes: 20, onPass: input });
  check('IM 1 through a hook at $0038: 20 passes identical', r.ok && r.passes === 20, true);
  check('the port\'s handler for $0038 ran once a frame', frames, r.frames);
  check('and the machine\'s own hook is back', m.hooks[0x38], rom);
}

process.exit(fails ? 1 : 0);
