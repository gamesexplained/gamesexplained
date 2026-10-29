'use strict';
// A self-test of kit/nes/machine.js on a program of its own: a reset that clears the RAM, waits for
// two vertical blanks, writes a palette, a nametable and the scroll, reads a byte back through PPUDATA and
// turns the screen and the NMI on; an NMI handler that counts frames, sends the sprite page with
// the DMA, writes one queued tile, resets the scroll and sets the frame flag; and a main loop that
// waits on the flag, counts its passes, reads controller 1 and controller 2, queues a tile, and
// spends a frame and a half's work when A is held, so that an NMI falls inside a pass. The program is
// kit/nes/test_lockstep.js's too (program(), below).
// Then the machine is held to jsnes: kit/nes/fixtures/machine.json holds the RAM, the PPU's memory
// and the sprite table jsnes left after the same program ran the same frames with the same
// buttons (recorded by node kit/nes/check_machine.js --program, which needs the kit's server).
// Exits 1 on any failure. node kit/nes/test_machine.js
const fs = require('fs');
const path = require('path');
const { Machine, BUTTON } = require('./machine.js');
const { OPCODES } = require('../cpu/cpu6502.js');

// --- a small assembler: [mnemonic, mode, operand] or a label ('name:'); operands may be labels
const CODE = {};
OPCODES.forEach(([name, mode], op) => { if (!(name + ' ' + mode in CODE)) CODE[name + ' ' + mode] = op; });
function assemble(origin, lines) {
  const labels = {};
  let pc = origin;
  const size = mode => (mode === 'imp' || mode === 'acc') ? 1 : ['abs', 'abx', 'aby', 'ind'].includes(mode) ? 3 : 2;
  for (const l of lines) { if (typeof l === 'string') labels[l.replace(/:$/, '')] = pc; else pc += size(l[1]); }
  const out = [];
  pc = origin;
  for (const l of lines) {
    if (typeof l === 'string') continue;
    const [name, mode, operand] = l, op = CODE[name + ' ' + mode];
    if (op === undefined) throw new Error('no opcode for ' + name + ' ' + mode);
    out.push(op);
    let v = typeof operand === 'string' ? labels[operand] : operand;
    if (typeof operand === 'string' && v === undefined) throw new Error('no label ' + operand);
    if (mode === 'rel') { v = v - (pc + 2); if (v < -128 || v > 127) throw new Error('branch out of range to ' + operand); out.push(v & 0xFF); }
    else if (size(mode) === 2) out.push(v & 0xFF);
    else if (size(mode) === 3) out.push(v & 0xFF, (v >> 8) & 0xFF);
    pc += size(mode);
  }
  return { bytes: Uint8Array.from(out), labels };
}

const RESET = 0xC000, NMI = 0xC100, MAIN = 0xC200, PASS = 0xC208;
// The program's addresses, for test_lockstep.js: the main loop's calls, the pass's start (the
// instruction after the wait loop) and the handler.
const ADDR = { RESET, NMI, MAIN, PASS, READ_PADS: 0xC240, WORK: 0xC280, QUEUE: 0xC2A0, WAIT_FLAG: 0xC2C0, CALLS: [] };
function program() {
  const ram = new Uint8Array(65536);
  const put = (a, b) => ram.set(b, a);
  // $C000 reset
  const reset = assemble(RESET, [
    ['sei', 'imp'], ['cld', 'imp'], ['ldx', 'imm', 0xFF], ['txs', 'imp'],
    ['lda', 'imm', 0], ['sta', 'abs', 0x2000], ['sta', 'abs', 0x2001],
    ['ldx', 'imm', 0], 'c1:', ['sta', 'zpx', 0x00], ['sta', 'abx', 0x0100], ['sta', 'abx', 0x0200], ['sta', 'abx', 0x0300],   // RAM cleared, as a game does
    ['sta', 'abx', 0x0400], ['sta', 'abx', 0x0500], ['sta', 'abx', 0x0600], ['sta', 'abx', 0x0700], ['inx', 'imp'], ['bne', 'rel', 'c1'],
    'w1:', ['bit', 'abs', 0x2002], ['bpl', 'rel', 'w1'],
    'w2:', ['bit', 'abs', 0x2002], ['bpl', 'rel', 'w2'],
    ['lda', 'imm', 0x3F], ['sta', 'abs', 0x2006], ['lda', 'imm', 0x00], ['sta', 'abs', 0x2006],
    ['ldx', 'imm', 0], 'p1:', ['lda', 'abx', 0xC0F0], ['sta', 'abs', 0x2007], ['inx', 'imp'], ['cpx', 'imm', 8], ['bne', 'rel', 'p1'],
    ['lda', 'imm', 0x20], ['sta', 'abs', 0x2006], ['lda', 'imm', 0x00], ['sta', 'abs', 0x2006],
    ['ldx', 'imm', 0], 'n1:', ['txa', 'imp'], ['sta', 'abs', 0x2007], ['inx', 'imp'], ['bne', 'rel', 'n1'],
    ['lda', 'imm', 0x20], ['sta', 'abs', 0x2006], ['lda', 'imm', 0x10], ['sta', 'abs', 0x2006],
    ['lda', 'abs', 0x2007], ['lda', 'abs', 0x2007], ['sta', 'zp', 0x10],        // the byte at $2010, after the dummy read
    ['lda', 'imm', 5], ['sta', 'abs', 0x2005], ['lda', 'imm', 7], ['sta', 'abs', 0x2005],
    ['ldx', 'imm', 0], 's1:', ['txa', 'imp'], ['eor', 'imm', 0x55], ['sta', 'abx', 0x0200], ['inx', 'imp'], ['bne', 'rel', 's1'],
    ['lda', 'abs', 0x2002], ['lda', 'imm', 0x1E], ['sta', 'abs', 0x2001], ['lda', 'imm', 0x90], ['sta', 'abs', 0x2000],
    ['jmp', 'abs', MAIN],
  ]);
  put(RESET, reset.bytes);
  put(0xC0F0, [0x0F, 0x16, 0x27, 0x30, 0x0F, 0x12, 0x22, 0x32]);
  // $C100 the NMI handler
  const nmi = assemble(NMI, [
    ['pha', 'imp'], ['txa', 'imp'], ['pha', 'imp'], ['tya', 'imp'], ['pha', 'imp'],
    ['inc', 'zp', 0x03],
    ['lda', 'imm', 0], ['sta', 'abs', 0x2003], ['lda', 'imm', 2], ['sta', 'abs', 0x4014],
    ['lda', 'zp', 0x31], ['beq', 'rel', 'skip'],
    ['lda', 'imm', 0x20], ['sta', 'abs', 0x2006], ['lda', 'zp', 0x03], ['sta', 'abs', 0x2006], ['lda', 'zp', 0x30], ['sta', 'abs', 0x2007],
    ['lda', 'imm', 0], ['sta', 'zp', 0x31],
    'skip:', ['lda', 'imm', 0], ['sta', 'abs', 0x2005], ['sta', 'abs', 0x2005],
    ['lda', 'abs', 0x2002], ['sta', 'zp', 0x04],
    ['lda', 'imm', 1], ['sta', 'zp', 0x02],
    ['pla', 'imp'], ['tay', 'imp'], ['pla', 'imp'], ['tax', 'imp'], ['pla', 'imp'], ['rti', 'imp'],
  ]);
  put(NMI, nmi.bytes);
  // $C200 main: the wait, then the pass: JSR read_pads; JSR work; JSR queue; JMP main
  const main = assemble(MAIN, [
    ['lda', 'imm', 0], ['sta', 'zp', 0x02],
    'wait:', ['lda', 'zp', 0x02], ['beq', 'rel', 'wait'],
    ['inc', 'zp', 0x20],                                                           // $C208, the pass
    ['jsr', 'abs', ADDR.READ_PADS], ['jsr', 'abs', ADDR.WORK], ['jsr', 'abs', ADDR.QUEUE],
    ['jmp', 'abs', MAIN],
  ]);
  put(MAIN, main.bytes);
  ADDR.CALLS = [0xC20A, 0xC20D, 0xC210];                                           // the three JSRs
  // $C240 read_pads: strobe; eight reads of $4016 into $21 and of $4017 into $24; $22 += $21
  const pads = assemble(ADDR.READ_PADS, [
    ['lda', 'imm', 1], ['sta', 'abs', 0x4016], ['lda', 'imm', 0], ['sta', 'abs', 0x4016],
    ['ldx', 'imm', 8], 'r1:', ['lda', 'abs', 0x4016], ['lsr', 'acc'], ['rol', 'zp', 0x21], ['lda', 'abs', 0x4017], ['lsr', 'acc'], ['rol', 'zp', 0x24], ['dex', 'imp'], ['bne', 'rel', 'r1'],
    ['lda', 'zp', 0x22], ['clc', 'imp'], ['adc', 'zp', 0x21], ['sta', 'zp', 0x22], ['rts', 'imp'],
  ]);
  put(ADDR.READ_PADS, pads.bytes);
  // $C280 work: $23 += frame counter; when A is held (bit 7 of $21), a delay of about two frames
  const work = assemble(ADDR.WORK, [
    ['lda', 'zp', 0x23], ['clc', 'imp'], ['adc', 'zp', 0x03], ['sta', 'zp', 0x23],
    ['lda', 'zp', 0x21], ['bpl', 'rel', 'done'],
    ['ldy', 'imm', 35], 'd1:', ['ldx', 'imm', 0], 'd2:', ['dex', 'imp'], ['bne', 'rel', 'd2'], ['dey', 'imp'], ['bne', 'rel', 'd1'],
    'done:', ['rts', 'imp'],
  ]);
  put(ADDR.WORK, work.bytes);
  // $C2A0 queue: the tile for the NMI to write, $30 = $20 + $21, $31 = 1; a sprite moves
  const queue = assemble(ADDR.QUEUE, [
    ['lda', 'zp', 0x20], ['clc', 'imp'], ['adc', 'zp', 0x21], ['sta', 'zp', 0x30], ['lda', 'imm', 1], ['sta', 'zp', 0x31],
    ['inc', 'abs', 0x0203], ['rts', 'imp'],
  ]);
  put(ADDR.QUEUE, queue.bytes);
  // $C2C0 wait_flag: a wait on the frame flag as a routine, for checkGen (main has its own loop)
  put(ADDR.WAIT_FLAG, assemble(ADDR.WAIT_FLAG, ['w:', ['lda', 'zp', 0x02], ['beq', 'rel', 'w'], ['lda', 'imm', 0], ['sta', 'zp', 0x02], ['inc', 'zp', 0x05], ['rts', 'imp']]).bytes);
  put(0xC300, [0x4C, 0x00, 0xC3]);                                                 // irq_hang
  put(0xFFFA, [NMI & 255, NMI >> 8, RESET & 255, RESET >> 8, 0x00, 0xC3]);
  return ram;
}

module.exports = { program, ADDR, assemble };

if (require.main === module) {
  let fails = 0;
  const check = (what, got, want) => { if (got !== want) { fails++; console.log('FAIL', what, 'got', got, 'want', want); } else console.log('ok  ', what); };
  const ram = program();
  const m = new Machine({ ram, chr: new Uint8Array(0x2000), pc: RESET, passAt: PASS });
  m.runFrames(3);                                   // the reset's two waits, the set-up, then the first NMI due
  check('two vertical blanks waited for, the screen set up and the third begun', m.frames, 3);
  check('PPUCTRL as written', m.ppu.ctrl, 0x90);
  check('the palette written through $2006 and $2007', m.ppu.pal[3], 0x30);
  check('the nametable row written', m.ppu.peek(0x2047), 0x47);
  check('a read of $2007 is a byte late: the dummy read, then the byte', ram[0x10], 0x10);
  check('the scroll as written', JSON.stringify(m.ppu.scroll()), JSON.stringify({ ctrl: 0x90, mask: 0x1E, scrollX: 5, scrollY: 7 }));
  m.runFrames(10);
  check('ten frames, ten NMIs', ram[0x03], 10);
  check('one pass a frame', ram[0x20], 10);
  check('passes counted at passAt', m.passes, 10);
  check('the sprite page sent by the DMA', m.ppu.oam[0x11], 0x11 ^ 0x55);
  check('the tile the pass before queued, written by the last handler (the next is still to run)', m.ppu.peek(0x2000 | ram[0x03]), ram[0x30] - 1);
  check('the handler\'s read of PPUSTATUS saw the flag up', ram[0x04] & 0x80, 0x80);
  check('no button: controller 1 reads 0', ram[0x21], 0);
  check('the beam at the vertical blank\'s start', m.line, 241);
  m.press('start'); m.press('b', 1); m.runFrames(1);
  check('Start held: bit 3 of the byte', ram[0x21], 0x10);
  check('B on controller 2', ram[0x24], 0x40);
  m.releaseAll(); m.press('a'); m.runFrames(4);
  check('A held: a pass of two frames, so fewer passes than frames', ram[0x03] - ram[0x20] > 0, true);
  check('A held: bit 7', ram[0x21], 0x80);
  // save and restore
  const s = m.save(), m2 = Machine.restore(s);
  m.runFrames(5); m2.runFrames(5);
  check('a restored machine runs the same', Buffer.compare(Buffer.from(m.ram.subarray(0, 0x800)), Buffer.from(m2.ram.subarray(0, 0x800))), 0);
  check('and its PPU too', JSON.stringify(m.ppu.save()) === JSON.stringify(m2.ppu.save()), true);
  // the NMI edge: bit 7 set while the flag is up raises one at once, so a loop that sets and
  // clears it takes one at every turn through the vertical blank, and none outside it
  {
    const r = new Uint8Array(65536);
    // $C000: LDA #$80; STA $2000; LDA #0; STA $2000; JMP $C000; NMI at $C020: INC $41; RTI
    r.set([0xA9, 0x80, 0x8D, 0x00, 0x20, 0xA9, 0x00, 0x8D, 0x00, 0x20, 0x4C, 0x00, 0xC0], 0xC000);
    r.set([0xE6, 0x41, 0x40], 0xC020);
    r.set([0x20, 0xC0, 0x00, 0xC0, 0x20, 0xC0], 0xFFFA);
    const k = new Machine({ ram: r, pc: 0xC000 });
    k.runFrames(2);
    const turns = Math.floor(2273 / 33);                 // 15 cycles a turn and 18 for the handler
    check('an NMI at every turn of a loop setting bit 7 through the vertical blank (' + r[0x41] + ' in 2,273 cycles)', r[0x41] > turns * 0.8 && r[0x41] < turns * 1.2, true);
  }
  // against jsnes: the fixture
  const fx = path.join(__dirname, 'fixtures', 'machine.json');
  if (!fs.existsSync(fx)) { fails++; console.log('FAIL no fixture ' + path.relative(process.cwd(), fx) + ' (node kit/nes/check_machine.js --program records it)'); }
  else {
    const f = JSON.parse(fs.readFileSync(fx, 'utf8'));
    const j = new Machine({ ram: program(), chr: new Uint8Array(0x2000), pc: RESET, passAt: PASS });
    const held = new Set();
    for (let i = 0; i < f.frames.length; i++) {
      const step = f.frames[i];
      for (const [b, c, down] of step.buttons || []) { if (down) j.press(b, c); else j.release(b, c); }
      j.runFrames(1);
    }
    const ram2 = Buffer.from(f.ram, 'base64'), nt = Buffer.from(f.nametables, 'base64'), pal = Buffer.from(f.palette, 'base64'), oam = Buffer.from(f.oam, 'base64');
    let bad = 0;
    for (let a = 0; a < 0x800; a++) if ((a < 0x100 || a >= 0x200) && ram2[a] !== j.ram[a]) bad++;
    for (let a = 0; a < 0x1000; a++) if (nt[a] !== j.ppu.peek(0x2000 + a)) bad++;
    for (let a = 0; a < 0x20; a++) if ((pal[a] & 0x3F) !== j.ppu.peek(0x3F00 + a)) bad++;
    for (let a = 0; a < 0x100; a++) if (oam[a] !== j.ppu.oam[a]) bad++;
    check('after ' + f.frames.length + ' frames with jsnes\'s buttons, the RAM, the PPU\'s memory and the sprite table are jsnes\'s (' + f.jsnes + ')', bad, 0);
    check('and the frames and passes counted agree', j.ram[0x20] === ram2[0x20] && j.ram[0x03] === ram2[0x03], true);
  }
  console.log(fails ? fails + ' FAILED' : 'all machine checks pass');
  process.exit(fails ? 1 : 0);
}
