'use strict';
// A self-test of kit/spectrum/machine.js on programs of its own, run by CI. Every expected value is
// worked by hand from the rules machine.js states (the frame, the interrupt, the ULA's port and the
// contention table of kit/skills/spectrum/zx-spectrum-reference), never taken from a run of it. The
// check against the emulator is check_machine.js.
// Exits 1 on any failure. node kit/spectrum/test_machine.js
const fs = require('fs'), os = require('os'), path = require('path');
const { Machine, KEY, loadSna, FRAME, FRAME128 } = require('./machine.js');

let fails = 0;
const check = (what, got, want) => {
  if (got !== want) { fails++; console.log('FAIL', what, 'got', got, 'want', want); } else console.log('ok  ', what);
};
const at = (ram, a, bytes) => bytes.forEach((b, i) => { ram[a + i] = b; });
// One instruction at pc from the frame's T-state t: the T-states it took.
function timed(bytes, t, regs = {}, opts = {}) {
  const ram = new Uint8Array(65536), pc = regs.pc === undefined ? 0x8000 : regs.pc;
  at(ram, pc, bytes);
  const m = new Machine(Object.assign({ ram, regs: Object.assign({ pc }, regs), tstate: t }, opts));
  m.step();
  return m.cpu.tstates - t;
}

// A frame loop in IM 2: the vector at $90FF names the handler at $A000, which counts in $B000.
// $8000 DI; IM 2; LD A,$90; LD I,A; $8007 EI; HALT; JR $8007
function frameLoop() {
  const ram = new Uint8Array(65536);
  at(ram, 0x8000, [0xF3, 0xED, 0x5E, 0x3E, 0x90, 0xED, 0x47, 0xFB, 0x76, 0x18, 0xFC]);
  at(ram, 0x90FF, [0x00, 0xA0]);
  // $A000 PUSH AF; LD A,($B000); INC A; LD ($B000),A; POP AF; RET
  at(ram, 0xA000, [0xF5, 0x3A, 0x00, 0xB0, 0x3C, 0x32, 0x00, 0xB0, 0xF1, 0xC9]);
  return ram;
}

{
  const ram = frameLoop(), seen = [];
  const m = new Machine({ ram, pc: 0x8000, passAt: 0x8007, hooks: { 0xA000: q => { seen.push(q.cpu.tstates); } } });
  m.runFrames(10);
  check('ten frames: nine handlers run', ram[0xB000], 9);
  check('and the tenth taken by the run\'s last halted cycle', m.cpu.pc, 0xA000);
  check('frames counted', m.frames, 10);
  // DI 4, IM 2 8, LD A,n 7, LD I,A 9, EI 4, HALT 4: 36, then halted cycles of 4 to 69888, and 19
  check('the first taken by the halted cycle that ends the frame, 19 T-states on', seen[0], FRAME + 19);
  check('one a frame', seen[1] - seen[0], FRAME);
  check('a pass each frame, the tenth after the run', m.passes, 10);
  m.runPasses(2);
  check('runPasses stops at passAt', m.cpu.pc, 0x8007);
  const s = Machine.restore(m.save());
  s.runFrames(3); m.runFrames(3);
  check('a restored machine runs as the original', Buffer.compare(Buffer.from(s.ram), Buffer.from(m.ram)), 0);
  check('and keeps its time', s.cpu.tstates, m.cpu.tstates);
}

{
  // HALT, from T-state 0 with the interrupts off: the HALT and three halted cycles of 4, R once each
  const ram = new Uint8Array(65536);
  ram[0x8000] = 0x76;
  const m = new Machine({ ram, regs: { pc: 0x8000, r: 0x10 } });
  for (let i = 0; i < 4; i++) m.step();
  check('halted cycles of 4 T-states', m.cpu.tstates, 16);
  check('R counts each', m.cpu.r, 0x14);
  check('the program counter past the HALT', m.cpu.pc, 0x8001);
}
{
  // HALT at $6000 from 14331: 4, then a halted cycle from 14335, held 6 on the address $6001
  const ram = new Uint8Array(65536);
  ram[0x6000] = 0x76;
  const m = new Machine({ ram, regs: { pc: 0x6000 }, tstate: 14331 });
  m.step(); m.step();
  check('a halted cycle in contended memory: 4 + 6', m.cpu.tstates - 14331, 14);
}

// The interrupt is raised by the instruction during which the frame begins.
const im2 = { im: 2, i: 0x90, sp: 0xC000 };
function near(bytes, t, regs) {
  const ram = frameLoop();
  at(ram, 0x8100, bytes);
  return new Machine({ ram, regs: Object.assign({ pc: 0x8100 }, im2, regs), tstate: t });
}
{
  // LD A,($B100), 13 T-states from 69880: the frame begins during it; taken at its end, 69893, + 19
  const m = near([0x3A, 0x00, 0xB1, 0x00], FRAME - 8, { iff1: 1, iff2: 1 });
  m.step();
  check('taken at the end of the instruction the frame begins in', m.cpu.pc, 0xA000);
  check('19 T-states in IM 2', m.tstate, 5 + 19);
  check('the return address pushed', m.ram[0xBFFE] | (m.ram[0xBFFF] << 8), 0x8103);
  check('IFF1 cleared', m.cpu.iff1, 0);
}
{
  // NOP from 69886 with the interrupts off: lost; EI and a NOP after it take nothing
  const m = near([0x00, 0xFB, 0x00], FRAME - 2, { iff1: 0, iff2: 0 });
  m.step(); m.step(); m.step();
  check('lost when IFF1 is clear', m.cpu.pc, 0x8103);
}
{
  // EI from 69886: the frame begins during it, and the LD A,(nn) after it takes the interrupt
  const m = near([0xFB, 0x3A, 0x00, 0xB1, 0x00], FRAME - 2, { iff1: 0, iff2: 0 });
  m.step(); m.step();
  check('held over an EI to the next instruction', m.cpu.pc, 0xA000);
  check('at its end, 69903, + 19', m.tstate, 15 + 19);
}
{
  // IM 1 goes to $0038, in the ROM: a stop without one, a hook standing in for the ROM's handler
  const regs = { im: 1, iff1: 1, iff2: 1, sp: 0xC000 };
  const m = near([0x3A, 0x00, 0xB1, 0x00], FRAME - 8, regs);
  m.step();
  check('IM 1: to $0038, 13 T-states', m.cpu.pc === 0x38 && m.tstate === 5 + 13, true);
  let msg = '';
  try { m.step(); } catch (e) { msg = e.message; }
  check('no rom: the run stops at $0038', /ROM at \$0038/.test(msg), true);
  const h = near([0x3A, 0x00, 0xB1, 0x00], FRAME - 8, regs);
  h.hooks[0x38] = q => { q.cpu.iff1 = q.cpu.iff2 = 1; q.ret(); };
  h.step(); h.step();
  check('a hook stands in, and the NOP runs', h.cpu.pc, 0x8104);
}

{
  // The ULA's port: keys held, the half-rows a read selects, bits 5 and 7 set, bit 6 the last bit 4
  // written. $8000 LD A,$10; OUT ($FE),A; then IN A,($FE) from $FE, $7F, $00 into $B000-$B002;
  // LD A,7; OUT ($FE),A; IN A,($FE) from $FD into $B003; IN A,($FF) from $FF into $B004
  const ram = new Uint8Array(65536);
  at(ram, 0x8000, [0x3E, 0x10, 0xD3, 0xFE,
    0x3E, 0xFE, 0xDB, 0xFE, 0x32, 0x00, 0xB0, 0x3E, 0x7F, 0xDB, 0xFE, 0x32, 0x01, 0xB0, 0x3E, 0x00, 0xDB, 0xFE, 0x32, 0x02, 0xB0,
    0x3E, 0x07, 0xD3, 0xFE, 0x3E, 0xFD, 0xDB, 0xFE, 0x32, 0x03, 0xB0, 0x3E, 0xFF, 0xDB, 0xFF, 0x32, 0x04, 0xB0, 0x18, 0xFE]);
  const m = new Machine({ ram, pc: 0x8000 });
  m.ulaLog = [];
  m.press('CAPS'); m.press('SPACE'); m.press(KEY.B); m.press('A');
  m.runTStates(400);
  check('$FEFE: CAPS SHIFT, EAR high', ram[0xB000], 0xFE);
  check('$7FFE: SPACE and B', ram[0xB001], 0xEE);
  check('$00FE: every half-row ANDed', ram[0xB002], 0xEE);
  check('$FDFE: A, EAR low', ram[0xB003], 0xBE);
  check('an odd port reads $FF', ram[0xB004], 0xFF);
  check('the border', m.border, 7);
  check('both writes logged', m.ulaLog.map(e => e[1]).join(), '16,7');
  check('KEY.ENTER is half-row 6, bit 0', KEY.ENTER, 0x30);
}

{
  // Contention, from the table: 6, 5, 4, 3, 2, 1, 0, 0 from T-state 14335, 128 T-states a line
  check('NOP at $6000 from 14335: 4 + 6', timed([0x00], 14335, { pc: 0x6000 }), 10);
  check('from 14336: 4 + 5', timed([0x00], 14336, { pc: 0x6000 }), 9);
  check('from 14341: no wait', timed([0x00], 14341, { pc: 0x6000 }), 4);
  check('from 14460, the line\'s last wait: 4 + 1', timed([0x00], 14460, { pc: 0x6000 }), 5);
  check('from 14334, before the picture', timed([0x00], 14334, { pc: 0x6000 }), 4);
  check('from 14463, the right border', timed([0x00], 14463, { pc: 0x6000 }), 4);
  check('from 14559, the next line', timed([0x00], 14559, { pc: 0x6000 }), 10);
  check('from 57119, the last line of the picture', timed([0x00], 57119, { pc: 0x6000 }), 10);
  check('from 57343, after the picture', timed([0x00], 57343, { pc: 0x6000 }), 4);
  check('at $8000: none', timed([0x00], 14335), 4);
  check('without contention: none', timed([0x00], 14335, { pc: 0x6000 }, { contention: false }), 4);
  // LD A,(HL) from $8000: the fetch to 14339, then the read of $4000 waits 2
  check('LD A,(HL) reading $4000: 7 + 2', timed([0x7E], 14335, { h: 0x40, l: 0 }), 9);
  // INC BC with I = $40: two internal cycles on I x 256 + R, at 14339 (2) and 14342 (0)
  check('INC BC with I = $40: 6 + 2', timed([0x03], 14335, { i: 0x40 }), 8);
  check('INC BC with I = $3F: 6', timed([0x03], 14335, { i: 0x3F }), 6);
  // OUT ($FE),A: the fetch and n to 14342, then the I/O cycle by the port (A x 256 + $FE)
  check('OUT to $40FE (contended, even) from 14336: 1+6, 3+0', timed([0xD3, 0xFE], 14336, { a: 0x40 }), 17);
  check('OUT to $80FE (even) from 14336: 1, 3+5', timed([0xD3, 0xFE], 14336, { a: 0x80 }), 16);
  check('OUT to $40FF (contended, odd) from 14335: 1, 1+6, 1, 1+6', timed([0xD3, 0xFF], 14335, { a: 0x40 }), 23);
  check('OUT to $80FF: 4', timed([0xD3, 0xFF], 14335, { a: 0x80 }), 11);
}

{
  // The ROM: read as given, a write to it lost; without one, a read of it stops the run
  const rom = new Uint8Array(0x4000);
  rom[0x1000] = 0xAA;
  const ram = new Uint8Array(65536);
  at(ram, 0x8000, [0x3E, 0x55, 0x32, 0x00, 0x10, 0x3A, 0x00, 0x10, 0x18, 0xFE]);
  const m = new Machine({ ram, pc: 0x8000, rom });
  for (let i = 0; i < 4; i++) m.step();
  check('a write to the ROM is lost', m.cpu.a, 0xAA);
  check('a saved machine holds no ROM', Buffer.from(m.save().ram, 'base64')[0x1000], 0);
  check('restored with it', Machine.restore(m.save(), { rom }).ram[0x1000], 0xAA);
  const n = new Machine({ ram: new Uint8Array(ram), pc: 0x8005 });
  let msg = '';
  try { n.step(); } catch (e) { msg = e.message; }
  check('without a rom, a read of it stops the run', /ROM at \$1000/.test(msg), true);
}

{
  // A 48K .sna: the header's registers, and the program counter popped from the stack
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'machine-'));
  const file = path.join(dir, 't.sna');
  const h = Buffer.alloc(27);
  h[0] = 0x3F;
  [[1, 0x1122], [3, 0x3344], [5, 0x5566], [7, 0x7788], [9, 0x99AA], [11, 0xBBCC], [13, 0xDDEE], [15, 0x5C3A], [17, 0x1234],
    [21, 0x6677], [23, 0xFF00]].forEach(([o, v]) => h.writeUInt16LE(v, o));
  h[19] = 4; h[20] = 0x55; h[25] = 1; h[26] = 2;
  const mem = Buffer.alloc(49152);
  mem.writeUInt16LE(0x8123, 0xFF00 - 0x4000);
  fs.writeFileSync(file, Buffer.concat([h, mem]));
  const { ram, regs, border } = loadSna(file);
  fs.rmSync(dir, { recursive: true });
  check('the PC from the stack', regs.pc, 0x8123);
  check('SP after the pop', regs.sp, 0xFF02);
  check('IFF1 and IFF2 from bit 2', regs.iff1 + regs.iff2, 2);
  check('AF, HL, IX, IM, R', [regs.a, regs.f, regs.h, regs.l, regs.ix, regs.im, regs.r].join(),
    [0x66, 0x77, 0x99, 0xAA, 0x1234, 1, 0x55].join());
  check('the shadow pairs', [regs.af_, regs.bc_, regs.de_, regs.hl_].join(), [0x7788, 0x5566, 0x3344, 0x1122].join());
  check('the border', border, 2);
  const m = new Machine({ ram, regs });
  check('a machine from it', m.cpu.pc === 0x8123 && m.cpu.iy === 0x5C3A && m.cpu.iff1 === 1, true);
}

// The 128: eight banks, each filled with its number times $11, banks 5 and 2 and the paged one in
// view as the machine expects them.
function banks128(paged = 0) {
  const banks = [0, 1, 2, 3, 4, 5, 6, 7].map(n => new Uint8Array(0x4000).fill(n * 0x11));
  const ram = new Uint8Array(65536);
  ram.set(banks[5], 0x4000); ram.set(banks[2], 0x8000); ram.set(banks[paged], 0xC000);
  return { ram, banks };
}
{
  // $7000 LD A,3; LD BC,$7FFD; OUT (C),A; LD A,($C000); LD ($7100),A; LD A,$5A; LD ($C001),A;
  // XOR A; OUT (C),A
  const { ram, banks } = banks128();
  at(ram, 0x7000, [0x3E, 0x03, 0x01, 0xFD, 0x7F, 0xED, 0x79, 0x3A, 0x00, 0xC0, 0x32, 0x00, 0x71, 0x3E, 0x5A, 0x32, 0x01, 0xC0,
    0xAF, 0xED, 0x79]);
  const m = new Machine({ ram, banks, model: 128, regs: { pc: 0x7000 } });
  for (let i = 0; i < 9; i++) m.step();
  check('128: bank 3 paged in at $C000 is read there', ram[0x7100], 0x33);
  check('128: paging back to bank 0 brings its bytes', ram[0xC001], 0x00);
  check('128: and bank 3 keeps what was written', m.bank(3)[1], 0x5A);
  check('128: bank 5 is $4000 and bank 2 $8000', m.bank(5)[0] + ',' + m.bank(2)[0], 0x55 + ',' + 0x22);
  check('128: the value last written to $7FFD', m.paging, 0);
  // bank 5 paged in at $C000 is the RAM at $4000: $7000 LD A,5; OUT (C),A; LD A,$A5; LD ($C010),A;
  // LD A,($4011); LD ($C011),A; LD A,3; OUT (C),A
  ram[0x4011] = 0x3C;
  at(ram, 0x7015, [0x3E, 0x05, 0xED, 0x79, 0x3E, 0xA5, 0x32, 0x10, 0xC0, 0x3A, 0x11, 0x40, 0x32, 0x11, 0xC0, 0x3E, 0x03, 0xED, 0x79]);
  m.cpu.pc = 0x7015;
  for (let i = 0; i < 6; i++) m.step();
  check('128: bank 5 at $C000 writes the RAM at $4000', ram[0x4010] + ',' + m.bank(5)[0x11], 0xA5 + ',' + 0x3C);
  check('128: and its $C000 is contended, as bank 5', m.contended(0xC000), true);
  m.step(); m.step();
  check('128: bank 3 back in', ram[0xC010] + ',' + ram[0xC011] + ',' + m.mem.paged, 0x33 + ',' + 0x33 + ',' + 3);
  m.page(0x02);
  check('128: bank 2 at $C000 is the RAM at $8000, not contended', m.mem.alias(0xC123) + ',' + m.contended(0xC000), 0x8123 + ',false');
  m.page(0x0F);
  check('128: bit 3 shows bank 7', m.screen, 7);
  m.page(0x21);
  m.page(0x03);
  check('128: bit 5 locks the port', m.paging + ',' + m.mem.paged, 0x21 + ',' + 1);
}
{
  // An excerpt of the ROM: ROM 0's $0000-$0003 only. $7000 LD A,($0002); LD ($7100),A;
  // LD A,$10; OUT (C),A (ROM 1); LD A,($0002)
  const { ram, banks } = banks128();
  at(ram, 0x7000, [0x3A, 0x02, 0x00, 0x32, 0x00, 0x71, 0x3E, 0x10, 0x01, 0xFD, 0x7F, 0xED, 0x79, 0x3A, 0x02, 0x00]);
  const rom = new Uint8Array(0x8000);
  rom.set([0xF3, 0x01, 0x2B, 0x69]);
  const m = new Machine({ ram, banks, model: 128, rom, romRanges: [[0, 4]], regs: { pc: 0x7000 } });
  for (let i = 0; i < 2; i++) m.step();
  check('128: a byte the excerpt holds is read', ram[0x7100], 0x2B);
  for (let i = 0; i < 3; i++) m.step();
  let msg = '';
  try { m.step(); } catch (e) { msg = e.message; }
  check('128: the same address in ROM 1, outside the excerpt, stops the run', /ROM at \$0002/.test(msg), true);
  const r = Machine.restore(m.save(), { rom, romRanges: [[0, 4]] });
  check('128: a restored machine keeps the excerpt\'s bounds', r.romHas(2) + ',' + r.romHas(4), 'false,false');
  r.page(0);
  check('128: and with ROM 0 back, holds its bytes', r.romHas(3) + ',' + r.ram[3], 'true,' + 0x69);
}
{
  // Contention on the 128 starts at T-state 14361, and $C000 up is contended with an odd bank in:
  // a NOP fetched there at 14361 waits 6 and takes 4
  const nop = (paged, pc, t) => {
    const { ram, banks } = banks128(paged);
    ram[pc] = 0;
    const m = new Machine({ ram, banks, model: 128, paging: paged, regs: { pc }, tstate: t });
    m.step();
    return m.cpu.tstates - t;
  };
  check('128: a NOP at $C000 with bank 1 in, at T-state 14361', nop(1, 0xC000, 14361), 10);
  check('128: with bank 0 in, none', nop(0, 0xC000, 14361), 4);
  check('128: at $4000, 14361', nop(0, 0x4000, 14361), 10);
  check('128: at $4000, 14335, before the picture', nop(0, 0x4000, 14335), 4);
  check('128: at $4000, a line on (228 T-states)', nop(0, 0x4000, 14361 + 228), 10);
}
{
  const ram = frameLoop(), seen = [];
  const m = new Machine({ ram, model: 128, pc: 0x8000, hooks: { 0xA000: q => { seen.push(q.cpu.tstates); } } });
  m.runFrames(3);
  check('128: a frame of 70,908 T-states, the first interrupt 19 T-states after it', seen[0], FRAME128 + 19);
  check('128: one a frame', seen[1] - seen[0], 70908);
}
{
  // The AY: $7000 LD BC,$FFFD; LD A,1; OUT (C),A; LD B,$BF; LD A,$FF; OUT (C),A; LD B,$FF;
  // IN A,(C); LD ($7100),A
  const { ram, banks } = banks128();
  at(ram, 0x7000, [0x01, 0xFD, 0xFF, 0x3E, 0x01, 0xED, 0x79, 0x06, 0xBF, 0x3E, 0xFF, 0xED, 0x79, 0x06, 0xFF, 0xED, 0x78,
    0x32, 0x00, 0x71]);
  const m = new Machine({ ram, banks, model: 128, regs: { pc: 0x7000 } });
  m.ayLog = [];
  for (let i = 0; i < 9; i++) m.step();
  check('128: register 1 keeps four bits, read back through $FFFD', ram[0x7100], 0x0F);
  check('128: the write logged', m.ayLog.length + ',' + m.ayLog[0][1] + ',' + m.ayLog[0][2], '1,1,15');
  check('128: and no border change', m.border, 7);
  const r = Machine.restore(JSON.parse(JSON.stringify(m.save())));
  check('128: a restored machine keeps its banks, paging and AY', [r.bank(3)[0], r.bank(7)[5], r.ay.regs[1], r.model].join(),
    [0x33, 0x77, 0x0F, 128].join());
}
{
  // A 128K .sna: banks 5, 2 and 3 (paged), the PC, $7FFD = 3, a TR-DOS flag, then 0, 1, 4, 6, 7
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'machine-'));
  const file = path.join(dir, 't.sna');
  const h = Buffer.alloc(27);
  h.writeUInt16LE(0x6000, 23);
  const bank = n => Buffer.alloc(0x4000, n * 0x11);
  fs.writeFileSync(file, Buffer.concat([h, bank(5), bank(2), bank(3), Buffer.from([0x21, 0x85, 0x03, 0x00]),
    bank(0), bank(1), bank(4), bank(6), bank(7)]));
  check('128 .sna: 131,103 bytes', fs.statSync(file).size, 131103);
  const sna = loadSna(file);
  fs.rmSync(dir, { recursive: true });
  check('128 .sna: the PC as stored, the SP as is', sna.regs.pc + ',' + sna.regs.sp, 0x8521 + ',' + 0x6000);
  check('128 .sna: $7FFD and the banks', [sna.model, sna.paging, sna.banks[4][0], sna.banks[3][9], sna.ram[0xC000]].join(),
    [128, 3, 0x44, 0x33, 0x33].join());
  const m = new Machine(Object.assign({}, sna));
  check('128 .sna: a machine from it', m.bank(7)[0] + ',' + m.mem.paged, 0x77 + ',' + 3);
}

process.exit(fails ? 1 : 0);
