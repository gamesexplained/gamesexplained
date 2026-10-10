'use strict';
// A self-test of kit/c64/machine.js on a program of its own: two raster interrupts, one at line 0
// that counts frames and one at line 16, and a main loop that counts its passes, scans the
// keyboard's row 0 and the joystick, sums a table, waits for a raster line, runs a delay loop and
// polls for the next frame. The program is kit/c64/test_lockstep.js's too (program(), below).
// Then the CIAs' timers, and Machine.fromSnapshot on made-up snapshots of a raster interrupt.
// Exits 1 on any failure. node kit/c64/test_machine.js
const { Machine, KEY } = require('./machine.js');

const MAIN = 0x1027;
// The program's addresses, for test_lockstep.js: the main loop's calls, the raster wait's exit
// and the two handlers.
const ADDR = { ENTRY: 0x1000, MAIN, SCAN: 0x1040, WORK: 0x1057, WAIT: 0x107D, WAIT_EXIT: 0x1084, DELAY: 0x1085,
  POLL: 0x108B, IRQ_TOP: 0x1100, IRQ_SPLIT: 0x1130, CALLS: [0x102A, 0x102D, 0x1030, 0x1033, 0x1036] };

function program() {
  const ram = new Uint8Array(65536);
  const at = (a, bytes) => bytes.forEach((b, i) => { ram[a + i] = b; });
  // $1000: SEI; $01 = $35 (the KERNAL banked out, as a game does); vector $FFFE = $1100; raster
  // compare line 0; enable it; $DC02 = $FF; CLI
  at(0x1000, [0x78, 0xA9, 0x35, 0x85, 0x01, 0xA9, 0x00, 0x8D, 0xFE, 0xFF, 0xA9, 0x11, 0x8D, 0xFF, 0xFF,
    0xA9, 0x00, 0x8D, 0x12, 0xD0, 0xAD, 0x11, 0xD0, 0x29, 0x7F, 0x8D, 0x11, 0xD0,
    0xA9, 0x01, 0x8D, 0x1A, 0xD0, 0xA9, 0xFF, 0x8D, 0x02, 0xDC, 0x58]);
  // $1027 main: INC $2000; JSR scan; JSR work; JSR wait; JSR delay; JSR poll; JMP $1027
  at(MAIN, [0xEE, 0x00, 0x20, 0x20, 0x40, 0x10, 0x20, 0x57, 0x10, 0x20, 0x7D, 0x10, 0x20, 0x85, 0x10,
    0x20, 0x8B, 0x10, 0x4C, MAIN & 255, MAIN >> 8]);
  // $1040 scan: row 0 of the keyboard into $2002, the joystick's port into $2003
  at(0x1040, [0xA9, 0xFE, 0x8D, 0x00, 0xDC, 0xAD, 0x01, 0xDC, 0x8D, 0x02, 0x20,
    0xA9, 0xFF, 0x8D, 0x00, 0xDC, 0xAD, 0x00, 0xDC, 0x8D, 0x03, 0x20, 0x60]);
  // $1057 work: $200C = 0; A = $2004; for X = 0-255: CLC; ADC $2100,X; EOR $2002; then ADC $2003
  // (with the last carry); $2004 = A; $200A = $2005, the count the interrupt at line 16 moved on
  // meanwhile; $200B = 0. 3,879 cycles, so that interrupt falls inside it.
  at(0x1057, [0xA9, 0x00, 0x8D, 0x0C, 0x20, 0xA2, 0x00, 0xAD, 0x04, 0x20, 0x18, 0x7D, 0x00, 0x21, 0x4D, 0x02, 0x20,
    0xE8, 0xD0, 0xF6, 0x6D, 0x03, 0x20, 0x8D, 0x04, 0x20, 0xAD, 0x05, 0x20, 0x8D, 0x0A, 0x20, 0xA9, 0x00, 0x8D, 0x0B, 0x20,
    0x60]);
  // $107D wait: LDA #$80; CMP $D012; BNE (to the CMP); $1084 RTS, the wait's exit
  at(0x107D, [0xA9, 0x80, 0xCD, 0x12, 0xD0, 0xD0, 0xFB, 0x60]);
  // $1085 delay: LDX #0; DEX; BNE (to the DEX); RTS: 1,287 cycles
  at(0x1085, [0xA2, 0x00, 0xCA, 0xD0, 0xFD, 0x60]);
  // $108B poll: LDA $2001; CMP $2001; BEQ (to the CMP); RTS: until the line-0 interrupt counts
  at(0x108B, [0xAD, 0x01, 0x20, 0xCD, 0x01, 0x20, 0xF0, 0xFB, 0x60]);
  // $1100 irq at line 0: PHA; TXA; PHA; $2006 = $D012; INC $2001; a delay of 40 turns; $2008 =
  // $D012, a later line; the vector to $1130 at line 16; LDA #$FF; STA $D019; PLA; TAX; PLA; RTI
  at(0x1100, [0x48, 0x8A, 0x48, 0xAD, 0x12, 0xD0, 0x8D, 0x06, 0x20, 0xEE, 0x01, 0x20,
    0xA2, 0x28, 0xCA, 0xD0, 0xFD, 0xAD, 0x12, 0xD0, 0x8D, 0x08, 0x20,
    0xA9, 0x30, 0x8D, 0xFE, 0xFF, 0xA9, 0x11, 0x8D, 0xFF, 0xFF, 0xA9, 0x10, 0x8D, 0x12, 0xD0,
    0xA9, 0xFF, 0x8D, 0x19, 0xD0, 0x68, 0xAA, 0x68, 0x40]);
  // $1130 irq at line 16: PHA; $2009 = $D019 (the raster's bit latched); $2007 = $2004 (the sum
  // as work found it, still making the next); INC $2005; $200C = $2005; $200B = $FF; the vector
  // back to $1100 at line 0; LDA #$FF; STA $D019; PLA; RTI
  at(0x1130, [0x48, 0xAD, 0x19, 0xD0, 0x8D, 0x09, 0x20, 0xAD, 0x04, 0x20, 0x8D, 0x07, 0x20, 0xEE, 0x05, 0x20,
    0xAD, 0x05, 0x20, 0x8D, 0x0C, 0x20, 0xA9, 0xFF, 0x8D, 0x0B, 0x20,
    0xA9, 0x00, 0x8D, 0xFE, 0xFF, 0xA9, 0x11, 0x8D, 0xFF, 0xFF, 0xA9, 0x00, 0x8D, 0x12, 0xD0,
    0xA9, 0xFF, 0x8D, 0x19, 0xD0, 0x68, 0x40]);
  // $2100: the table work sums
  for (let i = 0; i < 256; i++) ram[0x2100 + i] = (i * 13 + 7) & 255;
  return ram;
}

module.exports = { program, ADDR };

if (require.main === module) {
  const ram = program();
  let fails = 0;
  const check = (what, got, want) => { if (got !== want) { fails++; console.log('FAIL', what, 'got', got, 'want', want); } else console.log('ok  ', what); };
  const m = new Machine({ ram, pc: 0x1000, passAt: MAIN });
  m.runFrames(10);
  check('ten frames, ten interrupts at line 0', ram[0x2001], 10);
  check('one at line 16 after each but the last', ram[0x2005], 9);
  check('frames counted', m.frames, 10);
  check('passes counted at passAt', m.passes & 255, ram[0x2000]);
  check('one pass a frame', m.passes, 10);
  check('no key: row 0 reads $FF', ram[0x2002], 0xFF);
  check('the raster read in the interrupt moves on with its cycles', ram[0x2008] > ram[0x2006], true);
  check('$D019 in the interrupt: the raster\'s bit latched and the IRQ line', ram[0x2009], 0xF1);
  m.press('DEL'); m.runFrames(1);
  check('DEL (row 0, column 0) held', ram[0x2002], 0xFE);
  m.releaseAll(); m.joy = 0x1F & ~16; m.runFrames(1);
  check('fire held: port A bit 4 low', ram[0x2003] & 0x10, 0);
  check('KEY.RETURN is row 0 column 1', KEY.RETURN, 1);
  // stop at a pass and resume without counting it twice
  const n = m.passes;
  m.runUntilPass(q => q.passes >= n + 3);
  check('stopped at passAt', m.cpu.pc, MAIN);
  const s = Machine.restore(m.save());
  s.runPasses(2); m.runPasses(2);
  check('restored machine runs as the original', Buffer.compare(Buffer.from(s.ram), Buffer.from(m.ram)), 0);
  check('restored pass count', s.passes, m.passes);

  // The CIAs' timers (cia: true): CIA 2's timer B, continuous with a latch of 101, raises the NMI
  // every 102 cycles; the handler at $1200 counts in $2010 and reads $DD0D, which clears it. CIA 1's
  // timer A, one-shot with a latch of 999, raises the IRQ once; the handler at $1210 counts in
  // $2011 and reads $DC0D. Joystick port 1 and $DD00 read back.
  {
    const r2 = new Uint8Array(65536);
    const at = (a, bytes) => bytes.forEach((b, i) => { r2[a + i] = b; });
    // $1000: SEI; $01 = $35; vectors; $DD06/7 = 101; $DD0D = $82; $DD0F = $11; $DC04/5 = 999;
    // $DC0D = $81; $DC0E = $19; $DD02 = $03; $DD00 = $02; CLI; $1030: LDA $DC01; STA $2012; JMP $1030
    at(0x1000, [0x78, 0xA9, 0x35, 0x85, 0x01, 0xA9, 0x00, 0x8D, 0xFA, 0xFF, 0xA9, 0x12, 0x8D, 0xFB, 0xFF,
      0xA9, 0x10, 0x8D, 0xFE, 0xFF, 0xA9, 0x12, 0x8D, 0xFF, 0xFF,
      0xA9, 101, 0x8D, 0x06, 0xDD, 0xA9, 0x00, 0x8D, 0x07, 0xDD, 0xA9, 0x82, 0x8D, 0x0D, 0xDD, 0xA9, 0x11, 0x8D, 0x0F, 0xDD]);
    at(0x102D, [0xA9, 999 & 255, 0x8D, 0x04, 0xDC, 0xA9, 999 >> 8, 0x8D, 0x05, 0xDC, 0xA9, 0x81, 0x8D, 0x0D, 0xDC,
      0xA9, 0x19, 0x8D, 0x0E, 0xDC, 0xA9, 0x03, 0x8D, 0x02, 0xDD, 0xA9, 0x02, 0x8D, 0x00, 0xDD, 0x58,
      0xAD, 0x01, 0xDC, 0x8D, 0x12, 0x20, 0xAD, 0x00, 0xDD, 0x8D, 0x13, 0x20, 0x4C, 0x4C, 0x10]);
    at(0x1200, [0x48, 0xEE, 0x10, 0x20, 0xAD, 0x0D, 0xDD, 0x68, 0x40]);
    at(0x1210, [0x48, 0xEE, 0x11, 0x20, 0xAD, 0x0D, 0xDC, 0x68, 0x40]);
    const c = new Machine({ ram: r2, pc: 0x1000, cia: true });
    c.joy1 = 0x1F & ~0x08;
    c.runCycles(102 * 100 + 60);
    check('CIA 2 timer B: an NMI every 102 cycles', Math.abs(r2[0x2010] - 100) <= 1, true);
    check('the machine counted them', c.nmis, r2[0x2010]);
    check('CIA 1 timer A one-shot: one IRQ', r2[0x2011], 1);
    check('joystick port 1 right: $DC01 bit 3 low', r2[0x2012] & 0x0F, 0x07);
    check('$DD00 reads back its outputs, the inputs high', r2[0x2013], 0xFE);
    const back = Machine.restore(c.save());
    back.runCycles(1020); c.runCycles(1020);
    check('a restored machine keeps its timers', back.nmis + r2[0x2010] >= 0 && back.ram[0x2010], c.ram[0x2010]);
  }

  // Machine.fromSnapshot: a game's raster interrupt goes on from a snapshot of play. A snapshot laid
  // out as x64sc writes one (test_cpu6502.js has the other modules), with a VIC-IISC module 1.4:
  // the chip's model, its 64 registers, three words, a byte, the interrupt latch, then the rest.
  // The program, its interrupt already set up, is stopped in its main loop at $C02F, which waits
  // for the handler at $C100 to count a frame in $02; the handler keeps $D012 and $D011 as it
  // finds them in $04 and $05. The same program, saved by vice-mcp v3.13.2 at lines $FB and $105 and
  // with a latched interrupt held off by SEI, gave these registers, 10 October 2026.
  {
    const fs = require('fs'), os = require('os'), path = require('path');
    const mod = (name, major, minor, body) => {
      const h = Buffer.alloc(22);
      h.write(name, 0, 'latin1'); h[16] = major; h[17] = minor; h.writeUInt32LE(22 + body.length, 18);
      return Buffer.concat([h, body]);
    };
    const vsf = ({ d011, d012, irq = 0, p = 0x20, vic = true }) => {
      const head = Buffer.alloc(58);
      head.write('VICE Snapshot File\x1a', 0, 'latin1'); head[19] = 2; head.write('C64SC', 21, 'latin1');
      head.write('VICE Version\x1a', 37, 'latin1'); head[50] = 3; head[51] = 10;
      const cpu = Buffer.alloc(103);
      cpu[11] = 0xF3; cpu.writeUInt16LE(0xC02F, 12); cpu[14] = p;
      const mem = Buffer.alloc(4 + 65536 + 1);
      mem[0] = 0x35; mem[1] = 0x2F;
      const at = (a, bytes) => bytes.forEach((b, i) => { mem[4 + a + i] = b; });
      // $C02F main: LDA $02; CMP $02; BEQ (to the CMP); INC $03; JMP $C02F
      at(0xC02F, [0xA5, 0x02, 0xC5, 0x02, 0xF0, 0xFC, 0xE6, 0x03, 0x4C, 0x2F, 0xC0]);
      // $C100 irq: PHA; INC $02; $04 = $D012; $05 = $D011; LDA #$FF; STA $D019; PLA; RTI
      at(0xC100, [0x48, 0xE6, 0x02, 0xAD, 0x12, 0xD0, 0x85, 0x04, 0xAD, 0x11, 0xD0, 0x85, 0x05,
        0xA9, 0xFF, 0x8D, 0x19, 0xD0, 0x68, 0x40]);
      at(0xFFFE, [0x00, 0xC1]);
      const v = Buffer.alloc(200);
      v[0] = 1; v[1 + 0x11] = d011; v[1 + 0x12] = d012; v[1 + 0x1A] = 0x01; v[1 + 0x20] = 0x0E;
      v[78] = irq; v.writeUInt32LE(d012 | ((d011 & 0x80) << 1), 79);
      return Buffer.concat([head, mod('MAINC64CPU', 1, 5, cpu), mod('C64MEM', 0, 1, mem), mod('CIA1', 2, 5, Buffer.alloc(77)),
        vic ? mod('VIC-IISC', 1, 4, v) : Buffer.alloc(0)]);
    };
    const { readSnapshot } = require('./cpu6502.js');
    const file = path.join(os.tmpdir(), 'test_machine_' + process.pid + '.vsf');
    try {
      fs.writeFileSync(file, vsf({ d011: 0x1B, d012: 0xFB }));
      const s = readSnapshot(file);
      check('readSnapshot: $D011, $D012 and $D01A from VIC-IISC', [s.vic.regs[0x11], s.vic.regs[0x12], s.vic.regs[0x1A]].join(), '27,251,1');
      let v = Machine.fromSnapshot(file);
      check('the compare line and enable from the snapshot', [v.cmp, v.enable, v.vic[0x20], v.cpu.pc, v.cpu.sp, v.cpu.i].join(), '251,1,14,49199,243,0');
      v.runFrames(10);
      check('ten frames from the snapshot, ten interrupts', v.ram[0x02], 10);
      check('each at line $FB', v.ram[0x04], 0xFB);
      const bare = new Machine({ ram: readSnapshot(file).ram, port: s.port, pc: 0xC02F });
      bare.cpu.i = 0; bare.runFrames(10);
      check('the RAM alone: no interrupt, the main loop never passes', bare.ram[0x02], 0);

      fs.writeFileSync(file, vsf({ d011: 0x9B, d012: 0x05 }));
      v = Machine.fromSnapshot(file);
      v.runFrames(3);
      check('$D011\'s bit 7 is the compare\'s bit 8: line $105', [v.cmp, v.ram[0x02], v.ram[0x04], v.ram[0x05] >> 7].join(), '261,3,5,1');

      fs.writeFileSync(file, vsf({ d011: 0x1B, d012: 0x40, irq: 0x81, p: 0x24 }));
      v = Machine.fromSnapshot(file);
      check('a latched interrupt held off by SEI', [v.latch, v.cpu.i].join(), '1,1');
      v.cpu.i = 0; v.runCycles(63);
      check('is taken once the processor allows it', v.ram[0x02], 1);

      fs.writeFileSync(file, vsf({ d011: 0x1B, d012: 0xFB, vic: false }));
      let threw = '';
      try { Machine.fromSnapshot(file); } catch (e) { threw = e.message; }
      check('a snapshot with no VIC-IISC module is refused', /VIC-IISC/.test(threw), true);
    } finally { try { fs.unlinkSync(file); } catch (e) {} }
  }
  process.exit(fails ? 1 : 0);
}
