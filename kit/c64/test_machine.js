'use strict';
// A self-test of kit/c64/machine.js on a program of its own: a raster interrupt on line 0 that
// counts frames, a main loop that counts its passes and scans the keyboard's row 0 and the
// joystick. Exits 1 on any failure. node kit/c64/test_machine.js
const { Machine, KEY } = require('./machine.js');
const ram = new Uint8Array(65536);
const at = (a, bytes) => bytes.forEach((b, i) => { ram[a + i] = b; });
// $1000: SEI; $01 = $35 (the KERNAL banked out, as a game does); vector $FFFE = $1100; raster
// compare line 0; enable it; $DC02 = $FF; CLI
at(0x1000, [0x78, 0xA9, 0x35, 0x85, 0x01, 0xA9, 0x00, 0x8D, 0xFE, 0xFF, 0xA9, 0x11, 0x8D, 0xFF, 0xFF,
  0xA9, 0x00, 0x8D, 0x12, 0xD0, 0xAD, 0x11, 0xD0, 0x29, 0x7F, 0x8D, 0x11, 0xD0,
  0xA9, 0x01, 0x8D, 0x1A, 0xD0, 0xA9, 0xFF, 0x8D, 0x02, 0xDC, 0x58]);
// $1027 main: INC $2000; row 0 of the keyboard into $2002; the joystick's port into $2003; JMP $1027
const MAIN = 0x1027;
at(MAIN, [0xEE, 0x00, 0x20, 0xA9, 0xFE, 0x8D, 0x00, 0xDC, 0xAD, 0x01, 0xDC, 0x8D, 0x02, 0x20,
  0xA9, 0xFF, 0x8D, 0x00, 0xDC, 0xAD, 0x00, 0xDC, 0x8D, 0x03, 0x20, 0x4C, MAIN & 255, MAIN >> 8]);
// $1100 irq: PHA; INC $2001; LDA #$FF; STA $D019; PLA; RTI
at(0x1100, [0x48, 0xEE, 0x01, 0x20, 0xA9, 0xFF, 0x8D, 0x19, 0xD0, 0x68, 0x40]);
let fails = 0;
const check = (what, got, want) => { if (got !== want) { fails++; console.log('FAIL', what, 'got', got, 'want', want); } else console.log('ok  ', what); };
const m = new Machine({ ram, pc: 0x1000, passAt: MAIN });
m.runFrames(10);
check('ten frames, ten raster interrupts', ram[0x2001], 10);
check('frames counted', m.frames, 10);
check('passes counted at passAt', m.passes & 255, ram[0x2000]);
check('no key: row 0 reads $FF', ram[0x2002], 0xFF);
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
process.exit(fails ? 1 : 0);
