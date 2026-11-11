#!/usr/bin/env node
// Hold music.html's Mix-E-Load widget to the program on Delta's tape. The page runs the program's
// own code (reference/mix-e-load.js, block mix-e-load) on the kit's 6502, over the bytes in its
// mixe-data block, so the test holds three things.
// - The bytes: each block is the RAM the emulator held when the tape's loader jumped to the program
//   ($CCDD, from $ED4F), loading the original tape (the Ultimate Tape Archive's Delta) in VICE 3.10
//   with vice-mcp 3.14.0.
// - The sound: started as the loader starts it and played for 2,000 frames with the joystick moving
//   through all four columns and bending notes (HOLDS), the SID's registers after each frame must be
//   those the emulator recorded, stopped at the top of the program's main loop ($CF67) once a pass
//   with the same joystick held. Register 23's bit 3 is left out: the emulator's state call reports
//   the volume register's bit 3 there ($D418), and the program never sets it.
// - The screen: the picture after 300 and after 1,234 frames, drawn by site/lib/c64.js, must be the
//   one that matched the emulator's own picture of the same frame pixel for pixel (kit/c64/frame.py
//   compare: 104,448 of 104,448 pixels).
// It exits 1 on any difference.
//   node games/c64/delta/test_mix_e_load.js
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const { createMixeLoad } = g.run('reference/mix-e-load.js', 'mix-e-load', 'createMixeLoad');
g.lib('c64'); g.lib('cpu6502');
const { C64, C64Cpu } = globalThis;
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const m = g.read('music.html').match(/<script type="application\/json" id="mixe-data">([^<]*)<\/script>/);
if (!m) { console.log('music.html has no mixe-data block'); process.exit(1); }
const D = JSON.parse(m[1]);

const BLOCKS = {                    // address: [length, sha256] of the RAM at $CCDD's first instruction
  0x0005: [2, '548431144999ce11'],                 // the message's pointer
  0x0400: [3072, '80817209bc58600d'],              // the screen, the sprite pointers, the character set and the twinkle
  0xBF00: [4352, '28139bb3d8361f9c'],              // the option lists, the tables, the music driver and the program
  0xE000: [2097, '0fe9056d11e774e4'],              // the scrolling message, to the $FF that ends it
};
check('blocks', D.blocks.map(([a]) => a).join(), Object.keys(BLOCKS).join());
for (const [a, s] of D.blocks) {
  const b = Buffer.from(s, 'base64'), w = BLOCKS[a] || [];
  check('block $' + a.toString(16) + ' length', b.length, w[0]);
  check('block $' + a.toString(16) + ' hash', sha(b).slice(0, 16), w[1]);
}

// [first frame, frame after the last, joystick bits]: 1 up, 2 down, 4 left, 8 right, 16 fire
const HOLDS = [[200, 210, 2], [300, 304, 2], [400, 404, 8], [450, 460, 2], [600, 604, 8], [650, 655, 2],
  [800, 804, 8], [850, 860, 1], [1000, 1100, 17], [1200, 1300, 18], [1400, 1404, 4], [1450, 1475, 2],
  [1600, 1604, 4], [1650, 1660, 1], [1700, 1704, 4], [1750, 1755, 2]];
const SID_SHA = '011d639cd4e138d2f3cee6393995b77150812b845aca72c17ac590f08cfbc153';
const M = createMixeLoad(D, C64Cpu), h = crypto.createHash('sha256');
const take = () => h.update(Buffer.from(Array.from(M.regs, (v, r) => (r === 23 ? v & 0xF7 : v))));
take();
for (let j = 1; j <= 2000; j++) {
  let bits = 0;
  for (const [a, b, v] of HOLDS) if (j >= a && j < b) bits = v;
  M.frame(bits);
  take();
}
check('SID registers, 2,001 frames', h.digest('hex'), SID_SHA);
check('columns at the end ($CF53-$CF58)', Array.from(M.mem.subarray(0xCF53, 0xCF59)).join(), '0,255,0,0,1,4');

const PICTURES = { 300: 'a5c6a5d1ad3886123afc16a8d1a2b66f4b1abf52e8dec2a800c24c7fa8da32dc',
  1234: '733e2913816d1482acdcb010b89f50e9e8fea480186efe6f9496d462bfe3588f' };
for (const [n, want] of Object.entries(PICTURES)) {
  const P = createMixeLoad(D, C64Cpu);
  for (let j = 0; j <= +n; j++) P.frame(0);
  const F = P.picture();
  delete F.keep;                                   // drawn whole, as frame.py draws a recording
  const r = C64.renderFrame(F);
  check('picture after ' + n + ' frames', sha(r.px), want);
}

// a click on a name goes through the program's own routines and lights that name
const C = createMixeLoad(D, C64Cpu);
C.choose(1, 4);
check('choose: bass column chosen', C.column(1).now, 1);
check('choose: TERENDY lit', C.column(1).names[C.column(1).lit], 'TERENDY');
check('choose: bass pattern ($C45C)', C.mem[0xC45C], C.mem[0xCF0E + C.mem[0xCF56]]);

console.log(bad ? bad + ' difference(s)' : 'Mix-E-Load: the bytes, 2,001 frames of sound and two pictures agree');
process.exit(bad ? 1 : 0);
