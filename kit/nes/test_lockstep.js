'use strict';
// A self-test of kit/nes/lockstep.js: kit/nes/test_machine.js's program on the machine, beside a
// port of it written here, and ports with one fault each of the kinds the lockstep has to name.
// Exits 1 on any failure. node kit/nes/test_lockstep.js
const { Machine } = require('./machine.js');
const { Lockstep, standIn, standInGen, checkGen, describe } = require('./lockstep.js');
const { program, ADDR } = require('./test_machine.js');

let fails = 0;
const check = (what, got, want) => { if (got !== want) { fails++; console.log('FAIL', what, 'got', got, 'want', want); } else console.log('ok  ', what); };

// The port: one function for each of the program's routines, on its memory at its addresses.
function port() {
  const M = new Uint8Array(65536), P = { M };
  P.read_pads = function () {                                  // $C240
    P.io.write(0x4016, 1); P.io.write(0x4016, 0);
    for (let i = 0; i < 8; i++) {
      M[0x21] = ((M[0x21] << 1) | (P.io.read(0x4016) & 1)) & 0xFF;
      M[0x24] = ((M[0x24] << 1) | (P.io.read(0x4017) & 1)) & 0xFF;
    }
    M[0x22] = (M[0x22] + M[0x21]) & 0xFF;
  };
  P.work = function* () {                                      // $C280
    M[0x23] = (M[0x23] + M[0x03]) & 0xFF;
    if (M[0x21] & 0x80) yield { cycles: 35 * (256 * 5 + 4) + 2 };
  };
  P.queue = function () {                                      // $C2A0
    M[0x30] = (M[0x20] + M[0x21]) & 0xFF; M[0x31] = 1;
    M[0x0203] = (M[0x0203] + 1) & 0xFF;
  };
  P.wait_flag = function* () {                                 // $C2C0
    while (M[0x02] === 0) yield;
    M[0x02] = 0; M[0x05] = (M[0x05] + 1) & 0xFF;
  };
  P.nmi = function () {                                        // $C100
    M[0x03] = (M[0x03] + 1) & 0xFF;
    P.io.write(0x2003, 0); P.io.write(0x4014, 2);
    if (M[0x31]) { P.io.write(0x2006, 0x20); P.io.write(0x2006, M[0x03]); P.io.write(0x2007, M[0x30]); M[0x31] = 0; }
    P.io.write(0x2005, 0); P.io.write(0x2005, 0);
    M[0x04] = P.io.read(0x2002);
    M[0x02] = 1;
  };
  P.reset = function* () {                                     // $C000, to the main loop
    P.io.write(0x2000, 0); P.io.write(0x2001, 0);
    M.fill(0, 0, 0x800);
    while (!(P.io.read(0x2002) & 0x80)) yield;
    while (!(P.io.read(0x2002) & 0x80)) yield;
    P.io.write(0x2006, 0x3F); P.io.write(0x2006, 0x00);
    for (let x = 0; x < 8; x++) P.io.write(0x2007, M[0xC0F0 + x]);
    P.io.write(0x2006, 0x20); P.io.write(0x2006, 0x00);
    for (let x = 0; x < 256; x++) P.io.write(0x2007, x);
    P.io.write(0x2006, 0x20); P.io.write(0x2006, 0x10);
    P.io.read(0x2007); M[0x10] = P.io.read(0x2007);
    P.io.write(0x2005, 5); P.io.write(0x2005, 7);
    for (let x = 0; x < 256; x++) M[0x0200 + x] = x ^ 0x55;
    P.io.read(0x2002); P.io.write(0x2001, 0x1E); P.io.write(0x2000, 0x90);
  };
  P.wait = function* () { M[0x02] = 0; while (M[0x02] === 0) yield; };   // $C200, the loop's head
  P.main = function* () {                                      // from $C208, the pass: a lockstep starts there
    for (;;) {
      yield { cp: ADDR.PASS }; M[0x20] = (M[0x20] + 1) & 0xFF;
      yield { cp: ADDR.CALLS[0] }; P.read_pads();
      yield { cp: ADDR.CALLS[1] }; yield* P.work();
      yield { cp: ADDR.CALLS[2] }; P.queue();
      yield* P.wait();
    }
  };
  P.program = function* () { yield* P.reset(); yield* P.wait(); yield* P.main(); };
  return P;
}
// A machine at the first pass, the reset done.
function atPass() {
  const m = new Machine({ ram: program(), chr: new Uint8Array(0x2000), pc: ADDR.RESET, passAt: ADDR.PASS });
  m.runPasses(1);
  return m;
}
const options = (m, P, more) => Object.assign({ machine: m, port: P, program: p => p.main(), checkpoints: ADDR.CALLS, nmis: { [ADDR.NMI]: 'nmi' } }, more);
// the input: a walk over the buttons, by the pass
const input = (n, m) => {
  m.releaseAll();
  if (n % 7 === 3) m.press('start');
  if (n % 11 === 5) m.press('a');                   // a pass of two frames
  if (n % 5 === 1) m.press('b', 1);
  if (n % 13 === 9) m.press('right');
};

// --- the port beside the game ---
{
  const m = atPass(), P = port(), rows = [];
  const ls = new Lockstep(options(m, P, { timing: s => rows.push(s), chips: ['ppu', 'apu'] }));
  const r = ls.run({ passes: 300, onPass: input });
  check('300 passes identical', r.ok && r.passes === 300 && !r.diffs.length && !r.diverged, true);
  check('a frame a pass, two when A was held', r.frames, 300 + Math.floor(300 / 11) + (300 % 11 > 5 ? 1 : 0) - (0));
  check('describe: identical', /300 passes in \d+ frames: identical/.test(describe(r)), true);
  check('the port\'s controller reads were the game\'s', P.M[0x22] === m.ram[0x22] && P.M[0x24] === m.ram[0x24] && m.ram[0x22] > 0, true);
  check('the sprite page in the port\'s chips', ls.chips.ppu.oam[3] === m.ppu.oam[3] && m.ppu.oam[3] > 0, true);
  const pads = rows.filter(s => s.from === ADDR.PASS && s.to === ADDR.CALLS[0]);
  const work = rows.filter(s => s.from === ADDR.CALLS[1] && s.to === ADDR.CALLS[2]);
  const same = (list, k) => list.every(s => s[k] === list[0][k]);
  check('timing: INC $20, 5 cycles, each pass (the checkpoint stops before the JSR)', same(pads, 'cycles') && pads[0].cycles, 5);
  const long = work.filter(s => s.nmis === 1), short = work.filter(s => s.nmis === 0);
  check('timing: the long passes hold an NMI, taken out of their cycles', long.length > 20 && long.every(s => s.cycles > 40000 && s.cycles < 50000 && s.nmiCycles > 500), true);
  check('timing: the short ones none', short.length > 200 && short.every(s => s.cycles < 100), true);
  check('timing: the port\'s estimate for the long ones', long.every(s => s.estimate === 35 * (256 * 5 + 4) + 2 && s.calls.work === 1), true);
  check('a second run', ls.run({ passes: 5, onPass: input }).passes, 5);
  check('the machine given back: its own hook only', Object.keys(m.hooks).join(), String(ADDR.PASS));
  check('its nmi and ioRead its own', Object.prototype.hasOwnProperty.call(m.cpu, 'nmi') || Object.prototype.hasOwnProperty.call(m, 'ioRead'), false);
}
// --- a wrong routine: found at the next pass, named ---
{
  const m = atPass(), P = port();
  const queue = P.queue;
  P.queue = function () { queue(); if (M(P)[0x20] === 5) M(P)[0x30]++; };
  function M(p) { return p.M; }
  const r = new Lockstep(options(m, P)).run({ passes: 20, onPass: input });
  check('a wrong byte: found', r.ok, false);
  check('at the pass after (the program\'s fifth pass is the lockstep\'s fourth)', r.diffs.length === 1 && r.diffs[0].pass, 5);
  check('at $30, one byte', r.diffs[0].count === 1 && r.diffs[0].bytes[0].address, 0x30);
  check('describe names it', /pass 5 .*1 byte differs: \$0030 game \$[0-9A-F]{2} port \$[0-9A-F]{2}/.test(describe(r)), true);
}
// --- a skipped call: out of step ---
{
  const m = atPass(), P = port();
  P.main = function* () {
    for (let n = 0; ; n++) {
      yield { cp: ADDR.PASS }; P.M[0x20] = (P.M[0x20] + 1) & 0xFF;
      if (n !== 3) { yield { cp: ADDR.CALLS[0] }; P.read_pads(); }
      yield { cp: ADDR.CALLS[1] }; yield* P.work();
      yield { cp: ADDR.CALLS[2] }; P.queue();
      yield* P.wait();
    }
  };
  const ls = new Lockstep(options(m, P));
  const r = ls.run({ passes: 20, onPass: input });
  check('a skipped call: out of step', !!r.diverged && r.diverged.game === ADDR.CALLS[0] && r.diverged.port === ADDR.CALLS[1], true);
  check('on the pass it happened', r.diverged.pass, 3);
  let threw = false;
  try { ls.run({ passes: 1 }); } catch (e) { threw = /no longer in step/.test(e.message); }
  check('and a lockstep out of step will not run on', threw, true);
}
// --- a port that polls past the game ---
{
  const m = atPass(), P = port();
  const nmi = P.nmi;
  P.nmi = function () { nmi(); P.M[0x02] = 0; };     // the flag never set: the port waits for ever
  const r = new Lockstep(options(m, P)).run({ passes: 20, onPass: input });
  check('polling past the game', !!r.diverged && r.diverged.port === 'poll' && r.diverged.game === ADDR.PASS, true);
}
// --- stand-ins: the game's own code for the port's routines ---
{
  const m = atPass(), P = port();
  P.read_pads = standIn(P, ADDR.READ_PADS);
  P.work = standInGen(P, ADDR.WORK);
  P.queue = standIn(P, ADDR.QUEUE);
  P.nmi = standIn(P, ADDR.NMI, { nmi: true });
  const r = new Lockstep(options(m, P)).run({ passes: 100, onPass: input });
  check('stand-ins: 100 passes identical', r.ok && r.passes === 100, true);
}
// --- from the reset vector: the port's reset polls PPUSTATUS as the game's does ---
{
  const m = new Machine({ ram: program(), chr: new Uint8Array(0x2000), pc: ADDR.RESET, passAt: ADDR.PASS }), P = port();
  const r = new Lockstep(options(m, P, { program: p => p.program() })).run({ passes: 30, onPass: input });
  check('from the reset: 30 passes identical', r.ok && r.passes === 30, true);
  check('the port\'s reset read the byte back through PPUDATA', P.M[0x10], 0x10);
}
// --- input by frame ---
{
  const m = atPass(), P = port(), frames = [];
  const r = new Lockstep(options(m, P)).run({ passes: 40, onPass: input, onFrame: (f, mm) => { frames.push(f); if (f % 3 === 0) mm.press('b'); else mm.release('b'); } });
  check('input by frame: 40 passes identical', r.ok && r.passes === 40, true);
  check('onFrame once for each frame begun', frames.length === r.frames && frames.every((f, i) => !i || f === frames[i - 1] + 1), true);
}
// --- mistakes in the port's protocol ---
{
  const m = atPass(), P = port();
  P.main = function* () { yield { cp: 0x1234 }; };
  let msg = '';
  try { new Lockstep(options(m, P)).run({ passes: 1 }); } catch (e) { msg = e.message; }
  check('a checkpoint not listed', /checkpoint \$1234, which is not in checkpoints/.test(msg), true);
  const m2 = atPass(), P2 = port();
  msg = '';
  try { new Lockstep(options(m2, P2, { nmis: {} })).run({ passes: 2 }); } catch (e) { msg = e.message; }
  check('an NMI with no handler', /no port handler for the NMI at \$C100/.test(msg), true);
  const m3 = atPass(), P3 = port();
  P3.main = function* () { yield { wait: 'frame' }; };
  msg = '';
  try { new Lockstep(options(m3, P3)).run({ passes: 1 }); } catch (e) { msg = e.message; }
  check('a raster wait refused', /no raster waits/.test(msg), true);
}
// --- checkGen: a routine that waits, checked alone ---
{
  const m = atPass(), P = port();
  P.M.set(m.ram);
  P.M[0x02] = 0;
  const r = checkGen(P, 'wait_flag', ADDR.WAIT_FLAG, { frame: 0x02 });
  check('checkGen: the wait on the flag, both sides a frame', r.ok && r.frames === 1, true);
  P.M[0x02] = 0;
  P.wait_flag = function* () { while (P.M[0x02] === 0) yield; P.M[0x02] = 0; };   // $05 not counted
  const r2 = checkGen(P, 'wait_flag', ADDR.WAIT_FLAG, { frame: 0x02 });
  check('checkGen: a wrong routine named', !r2.ok && /\$0005 game/.test(r2.diff.why), true);
}

console.log(fails ? fails + ' FAILED' : 'all lockstep checks pass');
process.exit(fails ? 1 : 0);
