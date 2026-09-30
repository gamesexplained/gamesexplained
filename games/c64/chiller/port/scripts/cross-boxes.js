'use strict';
// A level at its start, from the game's own code (kit/c64/machine.js), with a box round each of its
// crosses: yellow for the boy's blue ones, red for the girl's. The enemies are left out. Twice the
// C64's pixels. node scripts/cross-boxes.js <level 0-9> <out.png>
const path = require('path');
const { boot } = require('../machine.js'), { toLevel } = require('../jump.js'), { frame, png } = require('../shot.js');
require(path.resolve(__dirname, '../../../../../site/lib/c64.js'));
const n = +process.argv[2], out = process.argv[3];
const m = boot(); m.runUntilPass(() => true); toLevel(m, n);
const vic = Array.from(m.vic); vic[0x15] &= 3;
const r = frame(m.ram, vic, m.colour), rgb = C64.PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
const S = 2, W = r.w * S, H = r.h * S, img = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = rgb[r.px[(y >> 1) * r.w + (x >> 1)]]; img.set([c[0], c[1], c[2], 255], (y * W + x) * 4); }
const box = (x0, y0, w, h, c) => { for (let t = 0; t < 2; t++) for (let x = x0 - t; x <= x0 + w + t; x++) for (const y of [y0 - t, y0 + h + t]) if (x >= 0 && x < W && y >= 0 && y < H) img.set(c, (y * W + x) * 4);
  for (let t = 0; t < 2; t++) for (let y = y0 - t; y <= y0 + h + t; y++) for (const x of [x0 - t, x0 + w + t]) if (x >= 0 && x < W && y >= 0 && y < H) img.set(c, (y * W + x) * 4); };
const rec = m.ram[0x11] | m.ram[0x12] << 8;
for (let k = 0; k < 10; k++) {
  const a = m.ram[rec + 0x5E + 2 * k] | m.ram[rec + 0x5F + 2 * k] << 8; if (a < 0x400 || a >= 0x7E8 || m.ram[a] !== 0x57) continue;
  const i = a - 0x400, red = !(m.colour[i] & 4);
  // the frame's text area starts 32 pixels in and 35 lines down (site/lib/c64.js renderFrame)
  box((32 + (i % 40) * 8) * S - 4, (35 + ((i / 40) | 0) * 8) * S - 4, 8 * S + 8, 8 * S + 8, red ? [255, 64, 64, 255] : [255, 225, 77, 255]);
}
png(out, W, H, img);
