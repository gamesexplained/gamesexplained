#!/usr/bin/env node
// Holds the page's two rebuilt frames to the game. The page draws SC_FRAME1 (part one) and SC_FRAME2 (part
// two) with C64.drawFrame; this test runs the same C64.renderFrame in node and compares each picture with
// the emulator's own picture of the frame, reference/frame-part1.png and reference/frame-part2.png (384 by
// 272 pixels, the pictures frame.py compare checks), and the memory each frame carries with the listing:
//   * every pixel of the drawing must agree with the picture, for the palette index to colour mapping that
//     the picture itself gives (the emulator paints a grey dot where a colour register changes mid-line,
//     which is allowed, up to 16 pixels);
//   * every byte of a character set the frame carries ($D000-$DFFF) must be the listing's.
//   node games/c64/short-circuit/test_frame.js [page.html]
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const page = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'index.html');
const { SC_FRAME1, SC_FRAME2 } = g.run(page, 'frames', 'SC_FRAME1', 'SC_FRAME2');
g.lib('c64'); const C64 = globalThis.C64;
const ram = g.listing().ram;
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };

function png(file) {   // 8-bit RGBA, not interlaced
  const d = fs.readFileSync(file);
  let o = 8, w = 0, h = 0; const idat = [];
  while (o < d.length) {
    const n = d.readUInt32BE(o), t = d.toString('latin1', o + 4, o + 8), body = d.subarray(o + 8, o + 8 + n);
    if (t === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); if (body[8] !== 8 || body[9] !== 6 || body[12]) throw new Error('png: not 8-bit RGBA, not interlaced'); }
    if (t === 'IDAT') idat.push(body);
    o += 12 + n;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = 4, stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = out.subarray(y * stride, (y + 1) * stride);
    const up = y ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0, b = up[i], c = i >= bpp ? up[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      row[i] = v & 255;
    }
  }
  return { w, h, rgba: out };
}
let checked = 0;
for (const [F, file] of [[SC_FRAME1, 'reference/frame-part1.png'], [SC_FRAME2, 'reference/frame-part2.png']]) {
  const r = C64.renderFrame(F), p = png(path.join(__dirname, file));
  if (r.w !== p.w || r.h !== p.h) { fail(file, 'size', r.w, r.h, 'against', p.w, p.h); continue; }
  const votes = Array.from({ length: 16 }, () => new Map());
  for (let i = 0; i < r.w * r.h; i++) {
    const c = p.rgba.readUInt32BE(i * 4), m = votes[r.px[i]];
    m.set(c, (m.get(c) || 0) + 1);
  }
  const main = votes.map(m => [...m.entries()].sort((a, b) => b[1] - a[1])[0]);
  let off = 0;
  for (let i = 0; i < r.w * r.h; i++) if (main[r.px[i]] && p.rgba.readUInt32BE(i * 4) !== main[r.px[i]][0]) off++;
  const seen = new Set(main.filter(Boolean).map(x => x[0]));
  if (seen.size !== main.filter(Boolean).length) fail(file, 'two palette indexes share a colour in the picture');
  if (off > 16) fail(file, off, 'pixels differ from the emulator picture');
  checked += r.w * r.h - off;
  for (const run of F.ram) {
    if (run.a < 0xD000 || run.a > 0xDFFF) continue;
    const bytes = Buffer.from(run.b, 'base64');
    for (let i = 0; i < bytes.length; i++) if (bytes[i] !== ram[run.a + i]) { fail(file, 'character data at $' + (run.a + i).toString(16), 'is not the listing’s'); break; }
  }
}
console.log(bad ? bad + ' difference(s)' : `frame test passed: ${checked} pixels agree with the emulator's pictures of both parts`);
process.exit(bad ? 1 : 0);
