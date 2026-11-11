'use strict';
// A self-test of kit/cpu/profile.js on kit/c64/test_machine.js's program, whose routines' costs
// are known to the cycle: scan 34, work 3,879 and delay 1,287 a call, the main loop's own 39 a
// pass, and two raster interrupts a frame that must not be charged to any of them.
// Exits 1 on any failure. node kit/cpu/test_profile.js
const { Machine } = require('../c64/machine.js');
const { program, ADDR } = require('../c64/test_machine.js');
const { Profiler, routines, perCall } = require('./profile.js');

let fails = 0;
const check = (what, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { fails++; console.log('FAIL', what, 'got', g, 'want', w); } else console.log('ok  ', what);
};
const TABLE = [[ADDR.ENTRY, 'start'], [ADDR.MAIN, 'main'], [ADDR.SCAN, 'scan'], [ADDR.WORK, 'work'], [ADDR.WAIT, 'wait'],
  [ADDR.DELAY, 'delay'], [ADDR.POLL, 'poll'], [ADDR.IRQ_TOP, 'irq_top'], [ADDR.IRQ_SPLIT, 'irq_split']];
const PASSES = 20;

// the program run to the start of a pass, profiled for PASSES passes
function measure(machineOpts, profOpts) {
  const m = new Machine(Object.assign({ ram: program(), pc: ADDR.ENTRY, passAt: ADDR.MAIN }, machineOpts));
  let irqs = 0;
  m.onReturn = (mm, v, cycles) => { irqs += cycles; };
  const prof = new Profiler(Object.assign({ machine: m, routines: routines(TABLE) }, profOpts));
  m.runPasses(1);
  prof.take(); irqs = 0;
  const c0 = m.cpu.cycles;
  m.runPasses(PASSES);
  const t = prof.take();
  prof.detach();
  return { t, cycles: m.cpu.cycles - c0, irqs, m };
}

{
  const { t, cycles, irqs, m } = measure({}, {});
  check('each routine entered once a pass', [t.entries.main, t.entries.scan, t.entries.work, t.entries.delay], [PASSES, PASSES, PASSES, PASSES]);
  check('scan costs 34 cycles a call', t.self.scan / PASSES, 34);
  check('work costs 3,879', t.self.work / PASSES, 3879);
  check('delay costs 1,287', t.self.delay / PASSES, 1287);
  check('the main loop\'s own instructions cost 39 a pass', t.self.main / PASSES, 39);
  check('the interrupts\' handlers are charged to no routine', [t.self.irq_top, t.self.irq_split], [undefined, undefined]);
  check('the interrupts\' cycles are the machine\'s own count of them, entries included', t.irq, irqs);
  check('every cycle of the machine is counted once', t.total, cycles);
  check('nothing is left out', t.left, 0);
  check('detach puts the processor\'s step back', Object.prototype.hasOwnProperty.call(m.cpu, 'step') || Object.prototype.hasOwnProperty.call(m, 'take'), false);
  const cost = perCall([{ self: t.self, calls: { main: PASSES, scan: PASSES, work: PASSES, delay: PASSES } }]);
  check('perCall: cycles a call, by the port\'s count of its calls', [cost.call.work, cost.call.delay, cost.call.scan], [3879, 1287, 34]);
  check('perCall: the routines no row called are listed with their cycles', Object.keys(cost.uncharged), ['poll', 'wait']);
  check('perCall: and their share of the time', cost.share > 0 && cost.share < 1, true);
}
{
  // with the handlers run whole (the kit's older model) the count is the same kind
  const { t, cycles } = measure({ legacyInterrupts: true }, {});
  check('legacy interrupts: work still costs 3,879', t.self.work / PASSES, 3879);
  check('legacy interrupts: every cycle counted once', t.total, cycles);
}
{
  // with the video chip's holds, the cycles it takes go with the instruction they hold
  const { t, cycles } = measure({ dma: true }, {});
  check('dma: every cycle counted once', t.total, cycles);
  check('dma: delay, which no bad line falls in, or which one does: at least its own', t.self.delay / PASSES >= 1287, true);
}
{
  // a port that calls only four of the routines: wait's cycles go to work, entered last before
  // it, and poll's to delay
  const plain = measure({}, {}).t;
  const { t } = measure({}, { owned: ['main', 'scan', 'work', 'delay'] });
  check('owned: a label the port does not call gives its cycles to the routine entered before it',
    [t.self.work, t.self.delay, t.self.wait, t.self.poll], [plain.self.work + plain.self.wait, plain.self.delay + plain.self.poll, undefined, undefined]);
  check('owned: it is still counted as entered', t.entries.wait, PASSES);
  const P = { main() {}, scan() {}, work() {}, delay() {}, M: new Uint8Array(1) };
  check('port: the port\'s functions name what it calls', measure({}, { port: P }).t.self.work, t.self.work);
}
{
  // place: the wait's loop left out, delay's cycles under a name of their own, scan's given to
  // the address of work
  const plain = measure({}, {}).t;
  const { t } = measure({}, { place: cpu => (cpu.pc >= ADDR.WAIT && cpu.pc < ADDR.DELAY ? null
    : cpu.pc >= ADDR.DELAY && cpu.pc < ADDR.POLL ? 'gateway' : cpu.pc >= ADDR.SCAN && cpu.pc < ADDR.WORK ? ADDR.WORK : undefined) });
  check('place: null leaves the cycles out', [t.left, t.self.wait], [plain.self.wait, undefined]);
  check('place: a name takes them', [t.self.gateway, t.self.delay], [plain.self.delay, undefined]);
  check('place: an address is looked up in the table', t.self.work, plain.self.work + plain.self.scan);
}
{
  const listing = { records: [{ a: 0x1000, t: 'code', l: 'start' }, { a: 0x1004, t: 'code', l: 'b_1004' }, { a: 0x1008, t: 'code' },
    { a: 0x1010, t: 'byte', l: 'table' }, { a: 0x1020, t: 'code', l: 's_1020' }] };
  const r = routines(listing);
  check('routines: labelled instructions, a branch\'s own label and data left out', r.name, ['start', 's_1020']);
  check('routines: an address belongs to the routine at or below it', [r.name[r.index[0x1015]], r.name[r.index[0x1020]], r.index[0x0FFF]], ['start', 's_1020', -1]);
  check('routines: keep chooses otherwise', routines(listing, { keep: () => true }).name, ['start', 'b_1004', 's_1020']);
  let threw = '';
  try { routines([[0x1000, 'one'], [0x1000, 'two']]); } catch (e) { threw = e.message; }
  check('routines: two names at one address are refused', /is both one and two/.test(threw), true);
  threw = '';
  try { new Profiler({ cpu: { step() {}, pc: 0, cycles: 0 }, routines: r }); } catch (e) { threw = e.message; }
  check('a processor with no machine needs inInterrupt', /inInterrupt/.test(threw), true);
}
{
  // beside the lockstep (kit/c64/lockstep.js): each stretch's row takes the routines' cycles with
  // it, and they add up to the stretch's own, the interrupts' to its irqCycles. The port is
  // kit/c64/test_lockstep.js's, the program's routines one function each.
  const { Lockstep } = require('../c64/lockstep.js');
  const M = new Uint8Array(65536), P = { M };
  P.scan = function () { P.io.ciaWrite(0x00, 0xFE); M[0x2002] = P.io.ciaRead(0x01); P.io.ciaWrite(0x00, 0xFF); M[0x2003] = P.io.ciaRead(0x00); };
  P.work = function () {
    M[0x200C] = 0;
    let a = M[0x2004], c = 0;
    for (let x = 0; x < 256; x++) { const t = a + M[0x2100 + x]; c = t >> 8; a = (t & 255) ^ M[0x2002]; }
    M[0x2004] = (a + M[0x2003] + c) & 255; M[0x200A] = M[0x2005]; M[0x200B] = 0;
  };
  P.wait = function* () { yield { wait: 0x80 }; };
  P.delay = function* () { yield { cycles: 1293 }; };
  P.poll = function* () { const a = M[0x2001]; while (M[0x2001] === a) yield; };
  P.irq_top = function () {
    M[0x2006] = P.io.vicRead(0x12); M[0x2001] = (M[0x2001] + 1) & 255; M[0x2008] = P.io.vicRead(0x12);
    M[0xFFFE] = 0x30; M[0xFFFF] = 0x11; P.io.vicWrite(0x12, 0x10); P.io.vicWrite(0x19, 0xFF);
  };
  P.irq_split = function () {
    M[0x2009] = P.io.vicRead(0x19); M[0x2007] = M[0x2004]; M[0x2005] = (M[0x2005] + 1) & 255; M[0x200C] = M[0x2005]; M[0x200B] = 0xFF;
    M[0xFFFE] = 0x00; M[0xFFFF] = 0x11; P.io.vicWrite(0x12, 0x00); P.io.vicWrite(0x19, 0xFF);
  };
  P.main = function* () {
    for (;;) {
      yield { cp: 0x1027 }; M[0x2000] = (M[0x2000] + 1) & 255;
      yield { cp: 0x102A }; P.scan();
      yield { cp: 0x102D }; P.work();
      yield { cp: 0x1030 }; yield* P.wait();
      yield { cp: 0x1033 }; yield* P.delay();
      yield { cp: 0x1036 }; yield* P.poll();
    }
  };
  const m = new Machine({ ram: program(), pc: ADDR.ENTRY, passAt: ADDR.MAIN });
  m.runUntilPass(q => q.passes >= 3);
  const prof = new Profiler({ machine: m, routines: routines(TABLE), port: P });
  const rows = [];
  const r = new Lockstep({ machine: m, port: P, program: p => p.main(), checkpoints: [ADDR.MAIN, ...ADDR.CALLS], waits: [ADDR.WAIT_EXIT],
    irqs: { [ADDR.IRQ_TOP]: 'irq_top', [ADDR.IRQ_SPLIT]: 'irq_split' }, ignore: [0x200A],
    timing: s => rows.push(Object.assign(s, prof.take())) }).run({ passes: PASSES });
  prof.detach();
  check('lockstep: the port and the game agree', r.ok, true);
  const sum = s => Object.values(s.self).reduce((x, y) => x + y, 0) + s.left;
  check('lockstep: a stretch\'s routines add up to its cycles', rows.filter(s => sum(s) !== s.cycles).length, 0);
  check('lockstep: and its interrupts to its irqCycles', rows.filter(s => s.irq !== s.irqCycles).length, 0);
  const cost = perCall(rows);
  check('lockstep: work, scan and delay by the port\'s calls', [cost.call.work, cost.call.scan, cost.call.delay], [3879, 34, 1287]);
}
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
