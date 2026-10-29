'use strict';
// A self-test of kit/c64/lockstep.js on a machine that takes interrupts inside a handler
// (kit/c64/machine.js, its default): a program whose raster handler clears I and works for some
// forty lines while CIA 1's timer interrupts it, beside a port of it written here.
// - The port, and one with a fault, against the machine and against it with legacyInterrupts
//   ("without nest" below), which runs each handler whole.
// - A byte both handlers write, the raster's handler before the timer's comes in and the timer's
//   after: the game keeps the timer's, which ends first and so is run first in the port, and the
//   port keeps it too.
// - The main program's read of the byte the timer counts, given to the port through irqBytes.
// - What replay alone cannot give, with nest: a register of the video chip the raster's handler
//   sets before the timer's comes in and the timer's after; one the timer's reads that the raster's
//   set before it came; one the main program sets after the timer's in the same stretch; a byte
//   the raster's reads after the timer's changed it (irqBytes, in a handler); a byte the
//   raster's saves and puts back while the timer's changes it between; and a colour the timer's
//   writes with its top four bits set, which colour RAM does not keep.
// - A raster's handler that, every eighth time, resets the stack and jumps to a restart in the main
//   program, never returning: the port's handler tells its program, which follows.
// Exits 1 on any failure. node kit/c64/test_lockstep_nest.js
const { Machine } = require('./machine.js');
const { Lockstep, describe } = require('./lockstep.js');

let fails = 0;
const check = (what, got, want) => { if (got !== want) { fails++; console.log('FAIL', what, 'got', got, 'want', want); } else console.log('ok  ', what); };

// The program, at $1000: the raster's interrupt at line 64, the timer's every 1,500 cycles.
const CODE = {
  0x1000: [0x78,                       // sei
    0xA9, 0x35, 0x85, 0x01,            // lda #$35 : sta $01         the I/O in, no ROMs
    0xA9, 0x00, 0x8D, 0xFE, 0xFF,      // lda #$00 : sta $FFFE
    0xA9, 0x11, 0x8D, 0xFF, 0xFF,      // lda #$11 : sta $FFFF       the handler at $1100
    0xA9, 0x40, 0x8D, 0x12, 0xD0,      // lda #$40 : sta $D012       line 64
    0xAD, 0x11, 0xD0, 0x29, 0x7F, 0x8D, 0x11, 0xD0,   // lda $D011 : and #$7F : sta $D011
    0xA9, 0x01, 0x8D, 0x1A, 0xD0,      // lda #$01 : sta $D01A       the raster's interrupt on
    0xA9, 0xDC, 0x8D, 0x04, 0xDC,      // lda #$DC : sta $DC04
    0xA9, 0x05, 0x8D, 0x05, 0xDC,      // lda #$05 : sta $DC05       timer A: 1,500 cycles
    0xA9, 0x81, 0x8D, 0x0D, 0xDC,      // lda #$81 : sta $DC0D       its interrupt on
    0xA9, 0x11, 0x8D, 0x0E, 0xDC,      // lda #$11 : sta $DC0E       started, continuous
    0x58,                              // cli
    0x4C, 0x40, 0x10],                 // jmp main
  0x1040: [0xEE, 0x00, 0x20,           // main: inc $2000            a pass
    0x20, 0x50, 0x10,                  // jsr work
    0x4C, 0x40, 0x10],                 // jmp main
  0x1050: [0xAD, 0x10, 0x20, 0x18,     // work: lda $2010 : clc
    0x6D, 0x00, 0x20, 0x8D, 0x10, 0x20,   // adc $2000 : sta $2010
    0xAD, 0x20, 0x20, 0x8D, 0x11, 0x20,   // lda $2020 : sta $2011    the timer's count, which it moves on
    0xAD, 0x10, 0x20, 0x8D, 0x27, 0xD0,   // lda $2010 : sta $D027    a register the timer's sets too
    0x60],                             // rts
  0x1100: [0x48, 0x8A, 0x48, 0x98, 0x48,   // pha : txa : pha : tya : pha
    0xAD, 0x0D, 0xDC, 0x30, 0x26,      // lda $DC0D : bmi timer
    0xA9, 0x01, 0x8D, 0x19, 0xD0,      // lda #$01 : sta $D019       the raster's
    0x20, 0x70, 0x11,                  // jsr before
    0xA9, 0xAA, 0x8D, 0x42, 0x20,      // lda #$AA : sta $2042       before the wait
    0x58,                              // cli
    0xA0, 0x02, 0xA2, 0x00, 0xCA, 0xD0, 0xFD, 0x88, 0xD0, 0xF8,   // ldy #2 : ldx #0 : dex : bne : dey : bne
    0x20, 0xB0, 0x11, 0xEA, 0xEA, 0xEA,   // jsr after : nop : nop : nop
    0xA9, 0x55, 0x8D, 0x46, 0x20,      // lda #$55 : sta $2046       after it
    0x4C, 0x3D, 0x11],                 // jmp done
  0x1130: [0x20, 0x90, 0x11,           // timer: jsr count
    0xAD, 0x20, 0x20, 0x8D, 0x42, 0x20, 0x8D, 0x46, 0x20,   // lda $2020 : sta $2042 : sta $2046
    0xEA,                              // nop
    0x68, 0xA8, 0x68, 0xAA, 0x68, 0x40],   // done: pla : tay : pla : tax : pla : rti
  0x1170: [0xEE, 0x41, 0x20,           // before: inc $2041
    0xAD, 0x48, 0x20, 0x8D, 0x49, 0x20,   // lda $2048 : sta $2049    saved, to put back
    0xA9, 0x0A, 0x8D, 0x21, 0xD0,      // lda #$0A : sta $D021       before the timer's
    0xAD, 0x41, 0x20, 0x8D, 0x20, 0xD0,   // lda $2041 : sta $D020    which the timer's reads
    0x60],                             // rts
  0x1190: [0xEE, 0x20, 0x20,           // count: inc $2020
    0xAD, 0x20, 0x20, 0x8D, 0x21, 0xD0, 0x8D, 0x27, 0xD0,   // lda $2020 : sta $D021 : sta $D027
    0xAD, 0x20, 0xD0, 0x8D, 0x4A, 0x20,   // lda $D020 : sta $204A
    0xEE, 0x48, 0x20,                  // inc $2048
    0xAD, 0x20, 0x20, 0x09, 0xF0, 0x8D, 0x00, 0xD8,   // lda $2020 : ora #$F0 : sta $D800    colour RAM keeps the low four bits
    0x60],                             // rts
  0x11B0: [0xAD, 0x20, 0x20, 0x8D, 0x43, 0x20,   // after: lda $2020 : sta $2043    the count the timer moved on in the wait
    0xAD, 0x42, 0x20, 0x8D, 0x44, 0x20,   // lda $2042 : sta $2044    $AA, or the timer's if it came
    0xAD, 0x49, 0x20, 0x8D, 0x48, 0x20,   // lda $2049 : sta $2048    put back
    0x60],                             // rts
};
// The restart: the raster's handler goes on at $1070 instead of its end, and there, every eighth
// time, resets the stack and jumps to $1080, which counts the restarts, clears the sum and goes on
// with the loop. The work the interrupt cut short has all been done in the port, as a restart that
// clears what it was doing makes good.
const RESTART = {
  0x112D: [0x4C, 0x70, 0x10],          // jmp $1070
  0x1070: [0xAD, 0x41, 0x20, 0x29, 0x07, 0xD0, 0x06,   // lda $2041 : and #$07 : bne +6
    0xA2, 0xFF, 0x9A, 0x4C, 0x80, 0x10,   // ldx #$FF : txs : jmp $1080
    0x4C, 0x3D, 0x11],                 // jmp done
  0x1080: [0xEE, 0x50, 0x20, 0xA9, 0x00, 0x8D, 0x10, 0x20, 0x58, 0x4C, 0x40, 0x10],   // inc $2050 : lda #0 : sta $2010 : cli : jmp main
};
function program(restart) {
  const ram = new Uint8Array(65536);
  for (const [a, b] of Object.entries(CODE)) ram.set(b, +a);
  if (restart) for (const [a, b] of Object.entries(RESTART)) ram.set(b, +a);
  return ram;
}

// listed: the raster's handler reads $2042 through irqByte.
function port(fault, listed) {
  const M = new Uint8Array(65536), P = { M };
  P.work = function (count) {                              // $1050
    M[0x2010] = (M[0x2010] + M[0x2000]) & 255;
    M[0x2011] = count ? P.io.irqByte(0x2020) : M[0x2020];
    P.io.vicWrite(0x27, M[0x2010]);
  };
  P.irq = function () {                                    // $1100
    if (P.io.ciaRead(0x0D) & 0x80) {
      M[0x2020] = (M[0x2020] + 1) & 255;
      P.io.vicWrite(0x21, M[0x2020]); P.io.vicWrite(0x27, M[0x2020]);
      M[0x204A] = P.io.vicRead(0x20);
      M[0x2048] = (M[0x2048] + 1) & 255;
      P.io.colourWrite(0, M[0x2020] | 0xF0);
      M[0x2042] = M[0x2046] = fault ? (M[0x2020] + 1) & 255 : M[0x2020];
      return;
    }
    P.io.vicWrite(0x19, 0x01);
    M[0x2041] = (M[0x2041] + 1) & 255;
    M[0x2049] = M[0x2048];
    P.io.vicWrite(0x21, 0x0A); P.io.vicWrite(0x20, M[0x2041]);
    M[0x2042] = 0xAA;
    M[0x2043] = M[0x2020];
    M[0x2044] = listed ? P.io.irqByte(0x2042) : M[0x2042];
    M[0x2048] = M[0x2049];
    M[0x2046] = 0x55;
    if (P.restarts && !(M[0x2041] & 7)) P.taken = true;
  };
  P.main_loop = function* (count) {                       // $1040
    for (;;) {
      yield { cp: 0x1040 }; M[0x2000] = (M[0x2000] + 1) & 255;
      yield { cp: 0x1043 }; P.work(count);
      yield { cp: 0x1046 };
    }
  };
  return P;
}

// The game from its start, run on for a few passes; a lockstep beside it from there.
function machine(nest, restart) {
  const m = new Machine({ ram: program(restart), pc: 0x1000, passAt: 0x1040, cia: true, legacyInterrupts: !nest });
  m.runUntilPass(q => q.passes >= 3);
  return m;
}
const lockstep = (nest, P, more = {}) => new Lockstep(Object.assign({ machine: machine(nest), port: P,
  program: p => p.main_loop(more.irqBytes !== undefined), checkpoints: [0x1040, 0x1043, 0x1046], irqs: { 0x1100: 'irq' } }, more));
const PASSES = 20000;                                      // some fifty frames
const passes = () => PASSES;
// On the game: a timer's interrupt inside the raster's handler (between its CLI at $1117 and the
// end of its wait at $1128), and whether the last write of $2042 was one
function watch(m) {
  const w = { inside: 0, last: false, raster: false };
  m.hooks[0x1117] = () => { w.raster = true; return false; };
  m.hooks[0x1128] = () => { w.raster = false; return false; };
  m.hooks[0x1114] = () => { w.last = false; return false; };
  m.hooks[0x1136] = () => { if (w.raster) w.inside++; w.last = w.raster; return false; };
  return w;
}

// 1. The game: with nest, the timer's interrupt comes inside the raster's wait; without it, never.
for (const nest of [true, false]) {
  const m = machine(nest), w = watch(m);
  m.runFrames(100);
  check((nest ? 'with nest' : 'without it') + ', the timer\'s interrupt inside the raster\'s handler ' + w.inside + ' times in 100 frames', w.inside > 0, nest);
}

// 2. The port, against the game with nest and without it.
for (const nest of [true, false]) {
  const r = lockstep(nest, port(), { ignore: [0x2011, 0x2044] }).run({ passes: passes() });
  check((nest ? 'with nest' : 'without nest') + ': ' + r.passes + ' passes identical', r.ok && r.passes === passes(), true);
  if (!r.ok) console.log(describe(r).split('\n').slice(0, 4).join('\n'));
}

// 3. The order of the writes: at the passes where the game's $2042 was last written by the timer
// inside the raster's handler, after the handler's own $AA, the port's holds the timer's too.
{
  const m = machine(true), w = watch(m);
  const ls = new Lockstep({ machine: m, port: port(), program: p => p.main_loop(false), checkpoints: [0x1040, 0x1043, 0x1046], irqs: { 0x1100: 'irq' }, ignore: [0x2011, 0x2044] });
  let inside = 0;
  const r = ls.run({ passes: passes(), onPass: () => { if (w.last) inside++; } });
  check('the timer\'s write inside the raster\'s handler last at ' + inside + ' pass starts, all identical', r.ok && inside > 0, true);
}

// 4. A fault in the timer's handler is found, with nest and without.
for (const nest of [true, false]) {
  const r = lockstep(nest, port(true), { ignore: [0x2011, 0x2044] }).run({ passes: passes() });
  const at = new Set(r.diffs.flatMap(d => d.bytes.map(b => b.address)));
  check((nest ? 'with nest' : 'without nest') + ': the fault found at $2042 or $2046', !r.ok && (at.has(0x2042) || at.has(0x2046)), true);
}

// 5. work reads the count the timer moves on: through irqBytes the port reads what the game's work
// read, wherever the timer fell; without, the race shows at $2011 and nowhere else.
{
  const r = lockstep(true, port(false, true), { irqBytes: [0x2020, 0x2042] }).run({ passes: passes() });
  check('irqBytes with nest: ' + r.passes + ' passes identical', r.ok && r.passes === passes(), true);
  if (!r.ok) console.log(describe(r).split('\n').slice(0, 4).join('\n'));
  const r2 = lockstep(true, port()).run({ passes: passes(), stopOnDiff: false });
  const at = new Set(r2.diffs.flatMap(d => d.bytes.map(b => b.address)));
  check('without irqBytes the races show at $2011 and $2044 alone', [...at].sort().join(), [0x2011, 0x2044].join());
}

// 6. The machine is its own again after a run: take and run given back.
{
  const ls = lockstep(true, port(), { ignore: [0x2011, 0x2044] });
  ls.run({ passes: 100 });
  check('the machine\'s take its own again', Object.prototype.hasOwnProperty.call(ls.m, 'take'), false);
  check('the machine\'s run its own again', Object.prototype.hasOwnProperty.call(ls.m.cpu, 'run'), false);
}

// 7. The restart: the port's handler sets P.taken, its program throws out of the loop at its next
// checkpoint and names $1080, where the game is waiting.
{
  const P = port(), M = P.M, TAKEN = {};
  P.restarts = true;
  const cp = function* (a) { yield { cp: a }; if (P.taken) { P.taken = false; throw TAKEN; } };
  P.main_loop = function* () {
    for (;;) {
      try {
        for (;;) {
          yield* cp(0x1040); M[0x2000] = (M[0x2000] + 1) & 255;
          yield* cp(0x1043); P.work(false);
          yield* cp(0x1046);
        }
      } catch (e) { if (e !== TAKEN) throw e; }
      yield { cp: 0x1080 }; M[0x2050] = (M[0x2050] + 1) & 255; M[0x2010] = 0;
    }
  };
  const m = machine(true, true);
  const ls = new Lockstep({ machine: m, port: P, program: p => p.main_loop(), checkpoints: [0x1040, 0x1043, 0x1046, 0x1080], irqs: { 0x1100: 'irq' }, ignore: [0x2011, 0x2044] });
  const r = ls.run({ passes: passes() });
  check('a handler that restarts the main program: ' + r.passes + ' passes identical, ' + m.ram[0x2050] + ' restarts', r.ok && r.passes === passes() && m.ram[0x2050] > 0, true);
  if (!r.ok) console.log(describe(r).split('\n').slice(0, 4).join('\n'));
  const Q = port(); Q.restarts = true;
  const r2 = new Lockstep({ machine: machine(true, true), port: Q, program: p => p.main_loop(false), checkpoints: [0x1040, 0x1043, 0x1046, 0x1080], irqs: { 0x1100: 'irq' }, ignore: [0x2011, 0x2044] }).run({ passes: passes() });
  check('a port that does not follow it is out of step', !r2.ok && !!r2.diverged, true);
}

// 8. With the video chip compared too, every case below came up, and every pass is identical: the
// timer's $D021 after the raster's (the order of chip writes); its read of $D020, which the
// raster's had set before it came; work's $D027 after the timer's in the same stretch; the
// raster's read of $2042 after the timer's changed it; and its $2048 put back over the timer's.
{
  const m = machine(true), w = watch(m), n = { d021: 0, d020: 0, d027: 0, read: 0, back: 0 };
  let timerD027 = false;
  m.hooks[0x1196] = () => { if (w.raster) n.d021++; return false; };
  m.hooks[0x119C] = () => { if (w.raster) n.d020++; return false; };
  m.hooks[0x1199] = () => { timerD027 = true; return false; };
  m.hooks[0x1050] = () => { timerD027 = false; return false; };
  m.hooks[0x1063] = () => { if (timerD027) n.d027++; return false; };
  m.hooks[0x11A2] = () => { if (w.raster) n.back++; return false; };
  m.hooks[0x11B6] = c => { if (c.m[0x2042] !== 0xAA) n.read++; return false; };
  const ls = new Lockstep({ machine: m, port: port(false, true), program: p => p.main_loop(true), checkpoints: [0x1040, 0x1043, 0x1046],
    irqs: { 0x1100: 'irq' }, irqBytes: [0x2020, 0x2042], chips: ['colour', 'vic'] });
  const r = ls.run({ passes: passes() });
  check('the video chip compared too: ' + r.passes + ' passes identical', r.ok && r.passes === passes(), true);
  if (!r.ok) console.log(describe(r).split('\n').slice(0, 4).join('\n'));
  for (const [k, what] of [['d021', 'the timer\'s $D021 after the raster\'s'], ['d020', 'the timer\'s read of the raster\'s $D020'],
    ['d027', 'work\'s $D027 after the timer\'s'], ['read', 'the raster\'s read of the timer\'s $2042'], ['back', 'the raster\'s $2048 put back over the timer\'s']])
    check(what + ': ' + n[k] + ' times', n[k] > 0, true);
}

console.log(fails ? fails + ' failed' : 'all passed');
process.exit(fails ? 1 : 0);
