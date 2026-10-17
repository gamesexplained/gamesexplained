/* jsw-collide */
// The video chip's sprite collisions, as Jet Set Willy reads them: $D01E, a bit for each sprite that
// has touched another, and $D01F, a bit for each that has touched the graphics, each set as the beam
// draws the pixels and cleared by the read. site/lib/c64.js draws a frame after the port has run it
// and does not find collisions, so the Play tab finds them here as its clock moves, and test_play.js
// gives the game's own code the same, on the kit's C64, which has none.
//
// It follows the chip's sprites line by line as renderFrame does (the C64 reference; Christian Bauer,
// "The MOS 6567/6569 video controller (VIC-II) and its application in the Commodore 64", 1996,
// section 3.8): each sprite's fetch starts on the line its Y names while $D015 enables it, and its
// rows show from the next line, 21 of them, each twice when $D017 expands it. A pixel of sprite X x
// is drawn in cycle floor(x / 8) + 14 of its line (cycles counted from 0, the raster's step; the C64
// reference: a write in cycle c shows from the picture's x = 8(c - 13), and the picture's x is the
// sprite's X + 8). Two sprites' pixels on one place set both their bits in $D01E, in the border too;
// a sprite's pixel on a foreground pixel of the graphics sets its bit in $D01F. The graphics are the
// text and extended colour modes, the two this game draws while sprites are on: a pixel is
// foreground where the glyph's bit is set, and the glyph of an extended colour cell is its code's low
// six bits. Read as the beam meets them: the screen and the glyphs as they stand when the line is
// worked out, the registers as they stand where a write splits a line. Not modelled: the multicolour
// and bitmap modes, a sprite's X past 503, and the cycle-by-cycle sprite fetches within a line.
//
// const C = JSWCollide.create(regs, vmem)  regs, the 64 registers as written; vmem(a), the byte the
//                                         chip reads at a within its bank (a < $4000)
// C.to(cycle)        work out every pixel drawn before cycle (the processor's count; a frame is
//                    312 lines of 63 cycles and line 0 starts at cycle 0)
// C.read(r, cycle)   $D01E (r $1E) or $D01F (r $1F) read in cycle: its bits, and the register cleared
// C.peek(r, cycle)   the same without clearing it
// C.mask            the sprites the chip fetched on the last line worked out, a bit each: on those
//                    lines it holds the processor (the C64 reference), which the Play tab's clock counts
// C.save(), C.load(s)
globalThis.JSWCollide = (function () {
  'use strict';
  const LINE = 63, LINES = 312, W = 504;
  function create(regs, vmem) {
    const spr = [0, 1, 2, 3, 4, 5, 6, 7].map(() => ({ dma: false, on: false, mcbase: 0, ff: true, row: [0, 0, 0], rowOn: false }));
    const C = { ss: 0, sb: 0, line: 0, x: 0, mask: 0 };        // line: the absolute line being drawn; x: drawn up to there
    const who = new Uint8Array(W), touched = [];
    // the sprites' state at a line's start (cycles 15 and 16): a fetch moves on, and ends after its 63rd byte
    function startLine() {
      for (let n = 0; n < 8; n++) {
        const s = spr[n];
        if (!(regs[0x17] >> n & 1)) s.ff = true;
        if (s.dma && s.ff) { s.mcbase += 3; if (s.mcbase >= 63) { s.dma = false; s.on = false; } }
      }
    }
    // the line's end (cycles 55 to 63): a fetch starts where Y matches, and the next line's rows are read
    function endLine(y) {
      const ptrs = (regs[0x18] >> 4) * 0x400 + 0x3F8;
      C.mask = 0;
      for (let n = 0; n < 8; n++) {
        const s = spr[n], ye = regs[0x17] >> n & 1, match = regs[2 * n + 1] === (y & 0xFF);
        if (ye) s.ff = !s.ff; else s.ff = true;
        if (!s.dma && (regs[0x15] >> n & 1) && match) { s.dma = true; s.mcbase = 0; if (ye) s.ff = false; }
        if (s.dma && match) s.on = true;
        s.rowOn = s.dma && s.on;
        if (s.dma) {
          C.mask |= 1 << n;
          const p = vmem(ptrs + n) * 64;
          for (let i = 0; i < 3; i++) s.row[i] = vmem((p + ((s.mcbase + i) & 63)) & 0x3FFF);
        }
      }
    }
    // pixels x0 to x1 - 1 of frame line y
    function pixels(y, x0, x1) {
      for (let n = 0; n < 8; n++) {
        const s = spr[n];
        if (!s.rowOn) continue;
        const sx = regs[2 * n] | (regs[0x10] >> n & 1) << 8, xe = regs[0x1D] >> n & 1, mc = regs[0x1C] >> n & 1;
        if (sx >= W) continue;
        const bits = s.row[0] << 16 | s.row[1] << 8 | s.row[2], w = xe ? 48 : 24, b = 1 << n;
        if (!bits) continue;
        for (let dx = 0; dx < w; dx++) {
          const X = (sx + dx) % W;
          if (X < x0 || X >= x1) continue;
          const p = xe ? dx >> 1 : dx;
          const set = mc ? (bits >> (22 - (p & ~1))) & 3 : (bits >> (23 - p)) & 1;
          if (!set) continue;
          if (!who[X]) touched.push(X);
          else C.ss |= who[X] | b;
          who[X] |= b;
        }
      }
      if (!touched.length) return;
      // the graphics under them: 25 rows from line 51 and 40 columns from X 24, as this game sets the chip
      const d11 = regs[0x11], d16 = regs[0x16], ys = d11 & 7, xs = d16 & 7;
      const top = d11 & 8 ? 51 : 55, bottom = d11 & 8 ? 251 : 247, left = d16 & 8 ? 24 : 31, right = d16 & 8 ? 344 : 335;
      const text = (d11 & 0x10) && !(d11 & 0x20) && !(d16 & 0x10) && y >= top && y < bottom;
      const t = y - 48 - ys, r = t >> 3, k = t & 7;
      for (const X of touched) {
        if (text && t >= 0 && r < 25 && X >= left && X < right) {
          const u = X - 24 - xs, i = u >> 3;
          if (u >= 0 && i < 40) {
            let code = vmem(((regs[0x18] >> 4) * 0x400 + 40 * r + i) & 0x3FFF);
            if (d11 & 0x40) code &= 0x3F;
            const g = vmem(((regs[0x18] & 0x0E) << 10 | code << 3 | k) & 0x3FFF);
            if (g >> (7 - (u & 7)) & 1) C.sb |= who[X];
          }
        }
        who[X] = 0;
      }
      touched.length = 0;
    }
    // the first pixel drawn in cycle c of a line, and the cycle a pixel is drawn in
    const xAt = (c) => Math.max(0, Math.min(W, 8 * (c - 14)));
    C.to = function (cycle) {
      const L = Math.floor(cycle / LINE), c = cycle - L * LINE;
      if (L < C.line) return;
      while (C.line < L) {
        const y = C.line % LINES;
        if (C.x === 0) startLine();
        pixels(y, C.x, W);
        endLine(y);
        C.line++; C.x = 0;
      }
      const x = xAt(c);
      if (x > C.x) {
        if (C.x === 0) startLine();
        pixels(C.line % LINES, C.x, x);
        C.x = x;
      }
    };
    C.peek = function (r, cycle) { C.to(cycle); return r === 0x1E ? C.ss : C.sb; };
    C.read = function (r, cycle) {
      const v = C.peek(r, cycle);
      if (r === 0x1E) C.ss = 0; else C.sb = 0;
      return v;
    };
    // a start part-way through: the lines before cycle taken as passed
    C.at = function (cycle) { C.line = Math.floor(cycle / LINE); C.x = 0; };
    C.save = () => JSON.parse(JSON.stringify({ ss: C.ss, sb: C.sb, line: C.line, x: C.x, spr }));
    C.load = (s) => {
      Object.assign(C, { ss: s.ss, sb: s.sb, line: s.line, x: s.x });
      s.spr.forEach((t, n) => Object.assign(spr[n], t, { row: t.row.slice() }));
    };
    C.sprites = spr;
    return C;
  }
  return { create };
})();
