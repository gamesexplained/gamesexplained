'use strict';
// The raster interrupt alone against the game's ($CDAA), on moments of play with the screen's
// mode ($3DF8), the raster line and the bytes each band reads stirred; its chip writes (the video
// chip's and the SID's, in order) are compared with memory. The game's handler ends in RTI, which
// the test turns into an RTS back to the caller (its PHA and PLA leave the stack as it came).
const { check } = require('./check.js');
let f = 0;
const only = process.argv[2];
const T = (name, o = {}) => { if (!only || only.split(',').includes(name)) f += check(Object.assign({ name, cases: 1000, outs: ['a', 'x', 'y'] }, o)).fails ? 1 : 0; };
const byte = rnd => [0, 1, 0x7F, 0x80, 0xFF, 0x40, 0xC0, 0xFE, 2, rnd(256), rnd(256)][rnd(11)];
const stir = (M, rnd, list) => { for (const a of list) if (rnd(2)) M[a] = rnd(3) ? rnd(256) : byte(rnd); };
const rti = c => { c.rts(); return false; };
const lines = [0x00, 0x28, 0x32, 0x3D, 0x63, 0x64, 0x71, 0x72, 0x7F, 0x80, 0xC5, 0xCE, 0xD4, 0xD5, 0xD6, 0xD7, 0xE4, 0xFF];
// the handler leaves A, X and Y as it found them: the port's returns them so
const keeps = P => { const f = P.IRQ; P.IRQ = r => { f(r); return r; }; };
T('IRQ', { entry: 0xCDAA, hooks: { 0xCDA9: rti, 0xCF55: rti }, onPort: keeps, setup: (M, c, rnd) => {
  c.latch = rnd(8) ? 1 : 0; c.enable = 1;
  c.raster = rnd(3) ? lines[rnd(lines.length)] : rnd(312);
  if (rnd(3) === 0) M[0x3DF8] = [0, 1, 2, 0x80, 0x81][rnd(5)];
  stir(M, rnd, [0xC37A, 0xC35F, 0xC370, 0xC355, 0xC399, 0x72, 0xC36D, 0x6E, 0x6F, 0x09, 0x0A, 0x10, 0x11, 0x5F, 0x5D, 0x0159]);
  if (rnd(2)) M[0xC36D] = rnd(2);
  for (const a of [0x5FFF, 0x5FFD]) if (rnd(3) === 0) M[a] = 0x5F + rnd(10);
}});
T('WHEELS_TURN', { setup: (M, c, rnd) => { M[0x5FFF] = 0x5E + rnd(7); M[0x5FFD] = 0x63 + rnd(7); stir(M, rnd, [0x0159]); }, outs: ['x', 'y'] });
T('EFFECT', { setup: (M, c, rnd) => ({ a: rnd(16) }), outs: ['a', 'x', 'y'] });
T('NMI', { entry: 0x9A32, hooks: { 0x9A37: rti }, onPort: P => { const f = P.NMI; P.NMI = r => { f(r); return r; }; } });
process.exitCode = f ? 1 : 0;
