// The picture, as the video chip draws what Chiller uses of it: text mode with multicolour
// characters, the border, and eight sprites with multicolour, expansion and priority, from the
// registers and memory as they stand (the game changes nothing in the middle of a frame). The
// frame is the PAL visible area of site/lib/c64.js's renderFrame (384 x 272 from raster line 16
// and sprite X -8), which checks it (port/test/t-screen.js). Out: a colour index per pixel.
(function (root) {
'use strict';
const W = 384, H = 272;
function draw(M, vic, colour, px) {
  const bc = vic[0x20] & 15, d11 = vic[0x11], d16 = vic[0x16], d18 = vic[0x18];
  px.fill(bc);
  const fg = new Uint8Array(W * H);                    // 1 where the characters' foreground is
  if (d11 & 0x10) {
    const ys = d11 & 7, xs = d16 & 7, mcm = d16 & 0x10;
    const scr = (d18 >> 4) << 10, chars = ((d18 >> 1) & 7) << 11;
    const top = (d11 & 8 ? 51 : 55) - 16, bot = (d11 & 8 ? 250 : 246) - 16;
    const left = (d16 & 8 ? 24 : 31) + 8, right = (d16 & 8 ? 343 : 334) + 8;
    const b0 = vic[0x21] & 15, b1 = vic[0x22] & 15, b2 = vic[0x23] & 15;
    for (let y = top; y <= bot; y++) {
      const ly = y + 16 - 0x30 - ys;
      for (let x = left; x <= right; x++) {
        const o = y * W + x;
        if (ly < 0 || ly >= 200) { px[o] = b0; continue; }
        const tx = x - 32 - xs;
        if (tx < 0 || tx >= 320) { px[o] = b0; continue; }
        const cell = (ly >> 3) * 40 + (tx >> 3), code = M[scr + cell], g = M[chars + code * 8 + (ly & 7)], cc = colour[cell] & 15;
        if (mcm && (cc & 8)) {
          const p = (g >> (6 - (tx & 6))) & 3;
          px[o] = p === 0 ? b0 : p === 1 ? b1 : p === 2 ? b2 : cc & 7;
          fg[o] = p >> 1;
        } else {
          const b = (g >> (7 - (tx & 7))) & 1;
          px[o] = b ? cc : b0;
          fg[o] = b;
        }
      }
    }
    // sprites: where two overlap the lower number's pixel is the one drawn, and then its priority
    // bit decides against the characters
    const en = vic[0x15], sp = new Uint8Array(W * H);    // sprite number + 1, colour in spc
    const spc = new Uint8Array(W * H);
    for (let n = 0; n < 8; n++) {
      if (!(en >> n & 1)) continue;
      const sx = vic[2 * n] | ((vic[0x10] >> n & 1) << 8), sy = vic[1 + 2 * n];
      const ex = vic[0x1D] >> n & 1, ey = vic[0x17] >> n & 1, mc = vic[0x1C] >> n & 1;
      const data = M[scr + 0x3F8 + n] * 64, sc = vic[0x27 + n] & 15, m0 = vic[0x25] & 15, m1 = vic[0x26] & 15;
      for (let r = 0; r < (ey ? 42 : 21); r++) {
        let line = sy + 1 + r; if (line >= 312) line -= 312;
        const y = line - 16;
        if (y < 0 || y >= H) continue;
        const a = data + (ey ? r >> 1 : r) * 3, bits = (M[a] << 16) | (M[a + 1] << 8) | M[a + 2];
        for (let i = 0; i < 24; i++) {
          let c;
          if (mc) { const p = (bits >> (22 - (i & ~1))) & 3; if (!p) continue; c = p === 1 ? m0 : p === 2 ? sc : m1; }
          else { if (!((bits >> (23 - i)) & 1)) continue; c = sc; }
          for (let e = 0; e <= ex; e++) {
            let x = sx + (ex ? 2 * i + e : i); if (x >= 504) x -= 504;
            x += 8;
            if (x < 0 || x >= W) continue;
            const o = y * W + x;
            // inside the border only; behind the characters' foreground when its priority bit is set
            if (x < left || x > right || y < top || y > bot || sp[o]) continue;
            sp[o] = n + 1; spc[o] = c;
          }
        }
      }
    }
    for (let o = 0; o < W * H; o++) {
      const n = sp[o];
      if (n && !((vic[0x1B] >> (n - 1) & 1) && fg[o])) px[o] = spc[o];
    }
  }
  return px;
}
root.ChillerScreen = { draw, W, H };
})(typeof window !== 'undefined' ? window : globalThis);
