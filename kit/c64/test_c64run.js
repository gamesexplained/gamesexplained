#!/usr/bin/env node
// kit/c64/c64run.js, the C64 a port of a disk game is checked against, with its disk drive and its
// stand-in for the KERNAL. A made-up program, BOOTER at $1000, does what a game does through the
// KERNAL: LOAD a file by a pattern to an address of its own, LOAD one the disk does not hold, read
// a sector with the drive's block-read command (OPEN "#", OPEN 15 with "U1", CHKIN, CHRIN), SAVE a
// file, then count frames in a raster interrupt reached through $0314, write the SID, move the
// raster compare past the frame's end, and call a KERNAL routine the runner does not stand in for.
// The files kit/c64/disk.py pack writes are read back as the runner reads them.
//   node kit/c64/test_c64run.js
const fs = require('fs'), os = require('os'), path = require('path');
const C64Run = require('./c64run.js');

let failed = 0;
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) failed++; };
const FRAME = C64Run.FRAME;

// BOOTER, assembled by hand: its listing is in the comments
const code = {
  0x1000: [0xA9, 0x01, 0xA2, 0x08, 0xA0, 0x00, 0x20, 0xBA, 0xFF,   // SETLFS 1,8,0
    0xA9, 0x04, 0xA2, 0x00, 0xA0, 0x11, 0x20, 0xBD, 0xFF,          // SETNAM "DAT*"
    0xA9, 0x00, 0xA2, 0x00, 0xA0, 0x20, 0x20, 0xD5, 0xFF,          // LOAD to $2000
    0x8E, 0x00, 0x03, 0x8C, 0x01, 0x03, 0x08, 0x68, 0x8D, 0x02, 0x03,   // the end and the flags to $0300-$0302
    0xA9, 0x04, 0xA2, 0x04, 0xA0, 0x11, 0x20, 0xBD, 0xFF,          // SETNAM "NONE"
    0xA9, 0x00, 0xA2, 0x00, 0xA0, 0x30, 0x20, 0xD5, 0xFF,          // LOAD to $3000
    0x8D, 0x03, 0x03, 0x08, 0x68, 0x8D, 0x04, 0x03,                // A and the flags to $0303-$0304
    0xA9, 0x05, 0xA2, 0x08, 0xA0, 0x05, 0x20, 0xBA, 0xFF,          // SETLFS 5,8,5
    0xA9, 0x01, 0xA2, 0x08, 0xA0, 0x11, 0x20, 0xBD, 0xFF,          // SETNAM "#"
    0x20, 0xC0, 0xFF,                                              // OPEN
    0xA9, 0x0F, 0xA2, 0x08, 0xA0, 0x0F, 0x20, 0xBA, 0xFF,          // SETLFS 15,8,15
    0xA9, 0x0B, 0xA2, 0x10, 0xA0, 0x11, 0x20, 0xBD, 0xFF,          // SETNAM "U1 5 0 18 3"
    0x20, 0xC0, 0xFF,                                              // OPEN
    0xA2, 0x05, 0x20, 0xC6, 0xFF, 0xA0, 0x00,                      // CHKIN 5
    0x20, 0xCF, 0xFF, 0x99, 0x00, 0x40, 0xC8, 0xD0, 0xF7,          // CHRIN to $4000,Y for 256
    0xA9, 0x0F, 0x20, 0xC3, 0xFF, 0xA9, 0x05, 0x20, 0xC3, 0xFF, 0x20, 0xE7, 0xFF,   // CLOSE 15, 5, CLALL
    0xA9, 0x01, 0xA2, 0x08, 0xA0, 0x00, 0x20, 0xBA, 0xFF,          // SETLFS 1,8,0
    0xA9, 0x06, 0xA2, 0x20, 0xA0, 0x11, 0x20, 0xBD, 0xFF,          // SETNAM "@0:OUT"
    0xA9, 0x00, 0x85, 0xFB, 0xA9, 0x20, 0x85, 0xFC,                // $FB/$FC = $2000
    0xA9, 0xFB, 0xA2, 0x04, 0xA0, 0x20, 0x20, 0xD8, 0xFF,          // SAVE $2000-$2003
    0x78, 0xA9, 0x00, 0x8D, 0x14, 0x03, 0xA9, 0x12, 0x8D, 0x15, 0x03,   // SEI, $0314 = $1200
    0xA9, 0x64, 0x8D, 0x12, 0xD0, 0xA9, 0x1B, 0x8D, 0x11, 0xD0,    // the raster interrupt on line 100
    0xA9, 0x01, 0x8D, 0x1A, 0xD0, 0x58,                            // enabled, CLI
    0xAD, 0x10, 0x03, 0xC9, 0x0A, 0x90, 0xF9,                      // wait for 10 of them
    0xA9, 0x0F, 0x8D, 0x18, 0xD4,                                  // the SID's volume
    0xA9, 0x9B, 0x8D, 0x11, 0xD0,                                  // $D011 bit 7: the compare is line 356
    0xAD, 0x10, 0x03, 0xC9, 0x14, 0x90, 0xF9,                      // wait for 20
    0x20, 0xD2, 0xFF,                                              // CHROUT
    0x4C, 0xE6, 0x10],                                             // JMP *
  0x1100: [...'DAT*NONE#'].map((c) => c.charCodeAt(0)),
  0x1110: [...'U1 5 0 18 3'].map((c) => c.charCodeAt(0)),
  0x1120: [...'@0:OUT'].map((c) => c.charCodeAt(0)),
  0x1200: [0xAD, 0x19, 0xD0, 0x29, 0x01, 0xF0, 0x0C,               // the raster's flag, or on to $EA31
    0x8D, 0x19, 0xD0, 0xEE, 0x10, 0x03, 0xA9, 0x02, 0x8D, 0x20, 0xD0, 0xEA,   // ack, count, border red
    0x4C, 0x31, 0xEA],
};
const booter = new Uint8Array(0x218 + 2);
booter[0] = 0x00; booter[1] = 0x10;
for (const [a, b] of Object.entries(code)) booter.set(b, +a - 0x1000 + 2);
const sector = Uint8Array.from({ length: 256 }, (_, i) => i ^ 0x5A);
const files = { BOOTER: booter, DATA: Uint8Array.of(0x00, 0xC0, 1, 2, 3, 4, 5) };

function machine(rasterFix) {
  const saves = [];
  const D = C64Run.drive({ files, sectors: { '18,3': sector }, onSave: (n, b) => saves.push([n, b]) });
  const R = C64Run.create({ drive: D, keep: {}, rasterFix });
  R.boot({ file: 'BOOTER' });
  return { R, D, saves };
}

const fixes = [];
const { R, D, saves } = machine((i) => fixes.push(i));
let err = null;
try { R.run(40 * FRAME); } catch (e) { err = e; }
const M = R.ram;
check(M[0x2000] === 1 && M[0x2004] === 5 && M[0x0300] === 0x05 && M[0x0301] === 0x20 && !(M[0x0302] & 1),
  'LOAD "DAT*" with secondary address 0 puts DATA at $2000, ends at $2005, carry clear');
check(M[0x0303] === 4 && (M[0x0304] & 1) === 1, 'LOAD of a name the disk does not hold: carry set, A = 4');
check(M.subarray(0x4000, 0x4100).every((b, i) => b === sector[i]), 'U1 reads track 18 sector 3 into the channel, and CHRIN gives it');
const out = D.files.get('OUT');
check(out && out.length === 6 && out[0] === 0 && out[1] === 0x20 && out[2] === 1 && out[5] === 4 &&
  saves.length === 1 && saves[0][0] === 'OUT', 'SAVE "@0:OUT" keeps $2000-$2003 as OUT, with its address, and calls onSave');
check(JSON.stringify(R.loads.map((l) => l[0])) === JSON.stringify(['LOAD BOOTER', 'LOAD DAT*', 'LOAD NONE', 'READ 18,3', 'SAVE @0:OUT']),
  'R.loads lists the loads, the block read and the save in order');
check(M[0x0310] === 20 && fixes.length === 1 && fixes[0].line === 356 && R.m.cmp === 100,
  'with rasterFix, moving the compare to line 356 is reported and folded back to line 100, and the interrupts go on');
check(err && /CHROUT \(\$FFD2\)/.test(err.message), 'a KERNAL routine with no stand-in stops the run and is named: ' + (err && err.message));
check(R.shown && R.shown.writes.some((w) => w[2] === 0xD020 && w[3] === 2 && w[0] === 100),
  'the border write in the raster interrupt is in the frame\'s writes on line 100');
check(R.sound.some((f) => f.length === 2 && f[0] === 0x18 && f[1] === 0x0F), 'the SID write is in its frame\'s sound');
// $EA31 counts a jiffy for each interrupt that leaves through it: CIA 1's timer, 60 a second, over
// the 20 frames to the CHROUT, and the 20 raster interrupts
const jiffies = M[0xA2] + 256 * M[0xA1], cia = Math.floor(R.cpu.cycles / 16422);
check(jiffies === cia + 20, 'the jiffy clock counts each interrupt through $EA31: ' + jiffies + ', ' + cia + ' of them CIA 1\'s timer');

const stuck = machine(null);
stuck.R.run(40 * FRAME);
check(stuck.R.ram[0x0310] === 10 && stuck.R.m.cmp === 356, 'without rasterFix the interrupt stops at 10, as on the machine');

// a moment saved after the U1 read and restored on a second runner goes on as the first does
const A = machine((i) => {});
A.R.run(5 * FRAME);
const B = C64Run.create({ drive: A.D, keep: {}, rasterFix: () => {}, state: JSON.parse(JSON.stringify(A.R.save())) });
A.R.run(15 * FRAME); B.run(15 * FRAME);
check(A.R.ram.every((v, i) => v === B.ram[i]) && A.R.cpu.pc === B.cpu.pc && A.R.frame === B.frame && B.ram[0x0310] === A.R.ram[0x0310],
  'a moment saved and restored on another runner goes on the same: ' + A.R.ram[0x0310] + ' frames counted on each');

// the disk as kit/c64/disk.py pack writes it, read back
const b64 = (b) => Buffer.from(b).toString('base64');
const packed = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'c64run-')), 'disk.json');
fs.writeFileSync(packed, JSON.stringify({ files: { BOOTER: b64(booter), DATA: b64(files.DATA) }, sectors: { '18,3': b64(sector) } }));
const d = C64Run.read(packed);
check(d.files.BOOTER.length === booter.length && d.files.DATA[6] === 5 && d.sectors['18,3'][255] === (255 ^ 0x5A),
  'read gives the files and the sector back');
process.exit(failed ? 1 : 0);
