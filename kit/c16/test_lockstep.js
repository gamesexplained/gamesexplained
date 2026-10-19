'use strict';
// A self-test of kit/c16/lockstep.js: a program of the kit's own on the C16 machine, beside a port
// of it written here, and ports with one fault each of the kinds the lockstep has to name. The
// program has what a C16 game's interrupts do to a port: a raster interrupt that clears the I flag
// and lets the next one in while it works, a main program that an interrupt comes into the middle
// of and that reads what it wrote, a polling loop, and the keyboard read through $FD30 and $FF08.
// Exits 1 on any failure. node kit/c16/test_lockstep.js
const { Machine } = require('./machine.js');
const { Lockstep, POLL, describe } = require('./lockstep.js');
const { asm } = require('../cpu/asm6502.js');

const SOURCE = `
start:  sei
        lda #<irq
        sta $0314
        lda #>irq
        sta $0315
        lda #$00
        sta $2010          ; the interrupt's state: 0 for line 0, 1 for line 100
        sta $FF0B          ; the raster compare at line 0
        lda #$02
        sta $FF0A          ; the raster interrupt on
        sta $FF09
        cli
main:   inc $2000          ; passAt
c_scan: jsr scan
c_work: jsr work
c_poll: jsr poll
        jmp main

scan:   lda #$FD           ; keyboard row 1 (W and A among it) into $2002
        sta $FD30
        sta $FF08
        lda $FF08
        sta $2002
        rts

; work: sums the table at $2100 five times over with the keyboard's row, 19,000 cycles or so, so
; that the interrupt at line 0 comes in the middle; then $200A = $2001, the frame count as that
; interrupt has left it
work:   ldy #5
        lda $2004
w1:     ldx #0
w2:     clc
        adc $2100,x
        eor $2002
        inx
        bne w2
        dey
        bne w1
        sta $2004
        lda $2001
        sta $200A
        rts

; poll: until the interrupt at line 0 counts the next frame
poll:   lda $2001
p1:     cmp $2001
        beq p1
        rts

; The interrupt, entered through the KERNAL (A, X and Y pushed). At line 0 it counts the frame,
; sets the next at line 100, clears the I flag and works on through it: part1 is long enough for
; the interrupt at line 100 to come in its middle, and part2 reads what that one wrote.
irq:    lda $FF09
        sta $FF09
        lda $2010
        bne s1
        inc $2001
        lda #100
        sta $FF0B
        lda #1
        sta $2010
        lda $FF1D
        sta $2006
        cli
c_p1:   jsr part1
c_p2:   jsr part2
        jmp out
s1:     inc $2005
        lda $FF1E
        sta $2009
        lda #0
        sta $FF0B
        sta $2010
out:    pla
        tay
        pla
        tax
        pla
        rti

part1:  ldy #7             ; 9,000 cycles or so
        ldx #0
d1:     dex
        bne d1
        dey
        bne d1
        rts
part2:  lda $2005
        sta $2008
        rts
`;
const { bytes, labels: L } = asm(0x1000, SOURCE);
const CPS = [L.main, L.c_scan, L.c_work, L.c_poll, L.c_p1, L.c_p2];

function game() {
  const ram = new Uint8Array(65536);
  ram.set(bytes, 0x1000);
  for (let i = 0; i < 256; i++) ram[0x2100 + i] = (i * 13 + 7) & 255;
  return new Machine({ ram, pc: L.start, passAt: L.main });
}

// The port, one function to each of the program's routines. faults changes one thing in it.
function port(faults = {}) {
  const M = new Uint8Array(65536), P = { M };
  P.setup = function () {
    M[0x0314] = L.irq & 255; M[0x0315] = L.irq >> 8;
    M[0x2010] = 0; P.io.write(0xFF0B, 0);
    P.io.write(0xFF0A, 2); P.io.write(0xFF09, 2);
    P.io.cli();
  };
  P.scan = function () {
    if (!faults.noRowSelect) P.io.write(0xFD30, 0xFD);
    P.io.write(0xFF08, 0xFD);
    M[0x2002] = P.io.read(0xFF08);
    if (faults.extraRead) P.io.read(0xFF08);
  };
  P.work = function () {
    let a = M[0x2004];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 256; x++) a = (((a + M[0x2100 + x]) & 255) ^ M[0x2002]);
    M[0x2004] = a;
    M[0x200A] = faults.noIrqByte ? M[0x2001] : P.io.irqByte(0x2001);
  };
  P.poll = function* () {
    const a = P.io.irqByte(0x2001);
    while (faults.pollsForever || P.io.irqByte(0x2001) === a) yield POLL;
  };
  P.part2 = function () { M[0x2008] = M[0x2005]; };
  P.irq = function* () {
    P.io.write(0xFF09, P.io.read(0xFF09));
    if (M[0x2010] === 0) {
      M[0x2001] = (M[0x2001] + 1) & 255;
      P.io.write(0xFF0B, 100);
      M[0x2010] = 1;
      M[0x2006] = P.io.read(0xFF1D);
      P.io.cli();
      yield { cp: L.c_p1 };
      yield { cycles: 8975 };                              // part1 only waits
      if (!faults.noHandlerCp) yield { cp: L.c_p2 };
      P.part2();
    } else {
      M[0x2005] = (M[0x2005] + (faults.nestedWrong ? 2 : 1)) & 255;
      M[0x2009] = P.io.read(0xFF1E);
      P.io.write(0xFF0B, faults.wrongWrite ? 1 : 0);
      M[0x2010] = 0;
    }
  };
  P.start = function* () {
    P.setup();
    for (;;) {
      yield { cp: L.main }; M[0x2000] = (M[0x2000] + 1) & 255;
      yield { cp: L.c_scan }; P.scan();
      if (!faults.skipCp) { yield { cp: L.c_work }; P.work(); }
      yield { cp: L.c_poll }; yield* P.poll();
    }
  };
  return P;
}

let fails = 0;
const check = (what, ok, detail = '') => { if (!ok) { fails++; console.log('FAIL', what, detail); } else console.log('ok  ', what); };
const lockstep = (P, o = {}) => new Lockstep(Object.assign({ machine: o.machine || game(), port: P, program: Q => Q.start(),
  checkpoints: CPS, irqs: { [L.irq]: 'irq' }, irqBytes: [0x2001] }, o));
// The keys, changing from pass to pass: the work's sum takes them in.
const input = (n, m) => { m.releaseAll(); if (n % 3 === 1) m.press('W'); if (n % 5 === 2) m.press('A'); };

// The port as it should be: 30 passes, the parts' cycles adding up to the game's, and the nested
// interrupt where it came.
{
  const rows = [], m = game();
  const ls = lockstep(port(), { machine: m, timing: r => rows.push(r) });
  const c0 = m.cpu.cycles;
  const r = ls.run({ passes: 30, onPass: input });
  check('a faithful port runs 30 passes in step', r.ok && r.passes === 30, describe(r));
  check('the game took the nested interrupts', m.irqs > 100, m.irqs + ' interrupts');
  const sum = rows.reduce((s, x) => s + x.cycles, 0);
  check('the parts\' own cycles add up to the game\'s', sum === m.cpu.cycles - c0, sum + ' against ' + (m.cpu.cycles - c0));
  const top = rows.filter(x => x.kind === 'irq' && x.marks.length === 2);
  check('the interrupt at line 0 passes its two checkpoints, in three stretches', top.length > 20 &&
    top.every(x => x.stretches.length === 3 && x.calls.part2 === 1 && x.marks[0] < x.marks[1] && x.marks[1] < x.cycles &&
    x.declared === 8975));
  const work = rows.filter(x => x.kind === 'main' && x.from === L.c_work);      // passes 1 to 29: the 30th stops at its start
  check('the stretch through work is timed with work\'s call', work.length === 29 && work.every(x => x.calls.work === 1 && x.cycles > 19000),
    JSON.stringify(work.slice(0, 3)));
  check('the machine is given back', m.onIrq === null && m.onRti === null && !Object.prototype.hasOwnProperty.call(m, 'ioRead') &&
    m.cpu.reads === null && m.hooks[L.c_work] === undefined && typeof m.hooks[L.main] === 'function');
  const again = ls.run({ passes: 5, onPass: input });
  check('a second run goes on from the first', again.ok && again.passes === 5, describe(again));
  const every = lockstep(port(), { every: true }).run({ passes: 10, onPass: input });
  check('every: memory the same at every checkpoint', every.ok && every.passes === 10, describe(every));
}

// One fault each: the lockstep must stop and say what.
const faults = [
  ['a main program that reads an interrupt\'s byte from its own memory', { noIrqByte: true },
    r => r.diffs.length === 1 && r.diffs[0].bytes[0].address === 0x200A],
  ['a nested interrupt that writes the wrong value', { nestedWrong: true },
    r => r.diffs.length === 1 && r.diffs[0].bytes.some(b => b.address === 0x2005) && r.diffs[0].bytes.some(b => b.address === 0x2008)],
  ['a handler that writes the wrong value to TED', { wrongWrite: true },
    r => /wrote \$01 to \$FF0B where the game wrote \$00 to \$FF0B/.test(r.diverged && r.diverged.why)],
  ['a handler that misses a checkpoint', { noHandlerCp: true },
    r => new RegExp('passed \\$' + L.c_p2.toString(16).toUpperCase() + ', and the port\'s returned').test(r.diverged && r.diverged.why)],
  ['a main program that skips a checkpoint', { skipCp: true },
    r => new RegExp('reached \\$' + L.c_poll.toString(16).toUpperCase() + ' where the game reached \\$' +
      L.c_work.toString(16).toUpperCase()).test(r.diverged && r.diverged.why)],
  ['a read of TED the game did not make', { extraRead: true },
    r => /the port read \$FF08, and the game read no more/.test(r.diverged && r.diverged.why)],
  ['a write to the keyboard\'s rows left out', { noRowSelect: true },
    r => /wrote \$FD to \$FF08 where the game wrote \$FD to \$FD30/.test(r.diverged && r.diverged.why)],
  ['a polling loop that never leaves', { pollsForever: true },
    r => /polls on its way to a checkpoint/.test(r.diverged && r.diverged.why)],
];
for (const [what, f, ok] of faults) {
  const r = lockstep(port(f)).run({ passes: 10, onPass: input });
  check('named: ' + what, !r.ok && ok(r), describe(r));
}
{
  const r = lockstep(port(), { irqs: {} }).run({ passes: 3 });
  check('named: an interrupt with no handler in the port', !r.ok && /no port handler for the interrupt at/.test(r.diverged && r.diverged.why), describe(r));
}
{
  const r = lockstep(port({ noIrqByte: true })).run({ passes: 8, onPass: input, stopOnDiff: false });
  check('stopOnDiff false goes on after a difference', r.passes === 8 && r.diffs.length >= 5, describe(r));
}

console.log(fails ? fails + ' failed' : 'all passed');
process.exit(fails ? 1 : 0);
