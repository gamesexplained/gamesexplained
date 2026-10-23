#!/usr/bin/env node
// site/lib/c64.js's videoMemory, the memory a Play page draws each frame over, with renderFrame.
// A made-up game on a text screen ($0400, characters at $2000, bank 0) moves its clock a line at a
// time and writes the screen where a game would: a character in row 10 at line 60, before the beam
// reaches the row (line 131), and one in row 5 at line 200, after the beam has passed it (line 91).
// The first shows in that frame and the second from the next on, as on the machine; a colour RAM
// change goes in the frame's writes as $1D800 plus its index and is drawn; once a frame has been
// drawn with the page's keep, only the bytes the chip read are compared; a change to a bank other
// than the one on show, which a game that changes banks within the frame shows later in it, is
// logged where it was made; and in bank 3 a change to RAM under the chips is drawn as memory, not
// taken for a write to a register.
//   node kit/c64/test_video_memory.js
const path = require('path');
require(path.join(__dirname, '../../site/lib/c64.js'));
const C64 = globalThis.C64;

let failed = 0;
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) failed++; };

const LINE = 63, FRAME = 312 * LINE;
const M = new Uint8Array(0x10000), colour = new Uint8Array(0x400);
for (let i = 0; i < 8; i++) M[0x2000 + 8 + i] = 0xFF;            // character 1: solid
colour.fill(1);                                                    // white
const vic = new Array(47).fill(0);
vic[0x11] = 0x1B; vic[0x16] = 0xC8; vic[0x18] = 0x18;              // 25 rows, 40 columns, $0400 and $2000
const keep = {};
const vm = C64.videoMemory(M, colour, { keep });

// one frame: the clock moves a line at a time, and at(line) runs as the game would on that line
function frame(n, at) {
  const writes = [], f = vm.begin();
  for (let l = 0; l < 312; l++) {
    vm.at(n * FRAME + l * LINE, writes, 0);
    if (at[l]) at[l]();
  }
  vm.at((n + 1) * FRAME, writes, 0);
  return C64.renderFrame({ vic, cia2: [0x97, 0x3F], writes, mem: f.mem, colourMem: f.colour, keep }).px;
}
// the colour of the first pixel of a character cell (text column c starts at sprite X 24 + 8c,
// row r on raster line 51 + 8r; the picture starts at line 16 and sprite X -8)
const cell = (px, r, c) => px[(51 + 8 * r - 16) * 384 + 32 + 8 * c];

const f0 = frame(0, {
  60: () => { M[0x0400 + 400] = 1; M[0x0400 + 401] = 1; colour[401] = 2; },
  200: () => { M[0x0400 + 200] = 1; },
});
check(cell(f0, 10, 0) === 1, 'a character written at line 60 shows in row 10 (line 131) that frame');
check(cell(f0, 10, 1) === 2, 'a colour RAM change at line 60 is drawn that frame');
check(cell(f0, 5, 0) === 0, 'a character written at line 200 is not in row 5 (line 91) that frame');
const f1 = frame(1, {});
check(cell(f1, 5, 0) === 1, 'it shows in row 5 the next frame');

// only what the chip read is compared now: a byte nothing shows is left for the next frame's copy
const writes = [], f = vm.begin();
vm.at(2 * FRAME, writes, 0);
M[0x0300] = 7; M[0x0400 + 600] = 1;
vm.at(2 * FRAME + LINE, writes, 0);
check(writes.length === 1 && writes[0][2] === 0x0400 + 600 && writes[0][0] === 0,
  'with the page\'s keep, a change to the screen is logged where it was made and one to $0300 is not');
check(f.mem[0x0300] === 0 && vm.begin().mem[0x0300] === 7, 'the change to $0300 is in the next frame\'s copy');

// a game that shows bank 3 above line 200 and bank 0 below it moves bank 0's row 24 while bank 3
// is on show: the change is logged where it was made, and drawn in the frame
{
  const B = new Uint8Array(0x10000), C = new Uint8Array(0x400).fill(1);
  for (let i = 0; i < 8; i++) B[0x2000 + 8 + i] = 0xFF;          // character 1 at $2000: solid
  const v = vic.slice(), kb = {};
  const vmb = C64.videoMemory(B, C, { keep: kb });
  for (let n = 0; n < 2; n++) {                                    // a frame drawn first, for keep's reads
    const w = [], f = vmb.begin();
    w.push([0, 1, 0xDD00, 0x94]);                                   // bank 3 from the top
    for (let l = 0; l < 312; l++) {
      vmb.at(n * FRAME + l * LINE, w, l < 200 ? 3 : 0);   // the bank on show, as the first pages give it
      if (n === 1 && l === 60) B[0x0400 + 960] = 1;                  // row 24, in bank 0
    }
    w.push([200, 1, 0xDD00, 0x97]);                                 // bank 0 from line 200
    w.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    vmb.at((n + 1) * FRAME, w, 0);
    const px = C64.renderFrame({ vic: v, cia2: [0x97, 0x3F], writes: w, mem: f.mem, colourMem: f.colour, keep: kb }).px;
    if (n === 1) {
      check(w.some((x) => x[2] === 0x0400 + 960 && x[0] === 60), 'a change to bank 0 made while bank 3 is on show is logged at its line');
      check(cell(px, 24, 0) === 1, 'and row 24, shown from bank 0 after line 200, shows it that frame');
    }
  }
}

// a game that shows bank 3 can keep its picture under the chips: a change to RAM at $D011 is
// logged as $20000 plus the address, and renderFrame draws it as memory, not as the register
{
  const B = new Uint8Array(0x10000), C = new Uint8Array(0x400).fill(1);
  for (let i = 0; i < 8; i++) B[0xD000 + 8 + i] = 0xFF;          // character 1 at $D000: solid
  const v3 = vic.slice(); v3[0x18] = 0x04;                         // matrix $C000, characters $D000
  const vm3 = C64.videoMemory(B, C), w3 = [], f3 = vm3.begin();
  vm3.at(0, w3, 3);
  B[0xD011] = 0x0B; B[0xC000 + 400] = 1;                           // a byte of character 2, and row 10
  vm3.at(60 * LINE, w3, 3); vm3.at(61 * LINE, w3, 3);
  check(w3.some((w) => w[2] === 0x2D011) && !w3.some((w) => w[2] === 0xD011),
    'a change to RAM at $D011 is logged as $2D011');
  const px = C64.renderFrame({ vic: v3, cia2: [0x94, 0x3F], writes: w3, mem: f3.mem, colourMem: f3.colour }).px;
  check(cell(px, 10, 0) === 1 && cell(px, 20, 0) === 0, 'and drawn as memory: the screen stays on and row 10 shows the character');
}

process.exit(failed ? 1 : 0);
