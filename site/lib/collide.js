// The video chip's sprite collisions, for a game whose code reads them: $D01E, a bit for each sprite
// whose pixel has met another sprite's, and $D01F, a bit for each whose pixel has met the foreground
// of the graphics, each set as the beam draws the pixels and cleared by a read. C64.renderFrame draws
// a frame after it has run and finds no collisions, so a Play page's clock, and kit/c64/machine.js
// with its option collide, work them out here as the clock moves. No dependencies. Exposes
// C64Collide (window.C64Collide on a page; globalThis.C64Collide in node).
//
// The chip is followed cycle by cycle as C64.renderFrame follows it (site/lib/c64.js): each sprite's
// fetch, from the line its Y names while $D015 enables it, its rows from the next line, each twice
// when $D017 expands it; the bad lines, the rows and the idle state; the top and bottom border. A
// PAL line is 63 cycles, and cycle c of a line (counted from 1, the cycle in which the raster
// steps) draws the 8 pixels from sprite X 8(c - 15), modulo 504: cycles 1-13 draw X 392-495, at the
// right of the picture and beyond it, and cycle 14 X 496-503. Checked against VICE by
// kit/c64/test_machine_collide.js, case by case (kit/c64/fixtures/vic-collide.json, recorded with
// `kit/c64/frame.py collide --record`), which found, on x64sc v3.13.2:
// - Two sprites' pixels on one place set both their bits in $D01E wherever they are, in the border,
//   beyond the right border and across the line's end; a sprite at X 504 or more never shows. A
//   multicolour sprite's pixel is any bit pair but %00, two pixels wide, an expanded one's twice that.
// - A sprite's pixel on a foreground pixel of the graphics sets its bit in $D01F, behind the graphics
//   ($D01B) too: a set bit of a character or a bitmap; in a multicolour cell (multicolour characters
//   with the colour's bit 3 set, and the multicolour bitmap) the pairs %10 and %11. The extended
//   colour mode reads a character's glyph with its code's top two bits clear, and its invalid mixes
//   read the bitmap with address bits 9 and 10 clear, and find the foreground as above. The pattern
//   the chip shows where no row is fetched (the byte at $3FFF of its bank, $39FF with extended
//   colour) is graphics too. Graphics under the left or right border collide; under the top or
//   bottom border (and with the display off) there are none.
// - A read made in cycle r of a line sees every pixel drawn in cycles up to r, and a register written
//   in cycle c (the store's last cycle) counts from the pixels of cycle c + 1, as it shows there.
// Not followed: the mode bits' lag of a cycle, an X scroll changed within a line (the scroll in force
// places every character of the line), and the screen and graphics bytes, read when the pixels are
// worked out, not when the chip fetched them, so the caller works the beam out often (once a line).
//
// const C = C64Collide.create(regs, vmem, colour)
//   regs       the 64 registers as last written (a Uint8Array the caller keeps writing to)
//   vmem(a)    the byte the chip reads at a, 14 bits within its bank: the caller gives the bank
//              (CIA 2's $DD00) and the character ROM, at $1000-$1FFF in banks 0 and 2
//   colour(i)  colour RAM's nibble i (0-1023); without it every cell reads as colour 0
// C.at(cycle)       start at the line holding cycle (counted as the processor counts: line 0 of the
//                   frame starts at cycle 0, a frame is 312 lines of 63)
// C.to(cycle)       work out every pixel drawn before cycle: a write in cycle w calls C.to(w + 1)
//                   first, and so does a read in cycle w
// C.read(r, cycle)  $D01E (r $1E) or $D01F (r $1F) read in cycle: its bits, and the register cleared
// C.peek(r, cycle)  the same, the register kept
// C.irq(cycle)      the interrupt bits the collisions raised up to cycle since the last call, $04
//                   for $D01E and $02 for $D01F as $D019 holds them: a collision raises its bit when
//                   it sets a bit in a register that was 0, and nothing while the register holds one,
//                   so a program that never reads the register is interrupted once (checked against
//                   VICE by kit/c64/test_machine_collide.js, kit/c64/fixtures/vic-collide-irq.json)
// C.armed()         the interrupt bits a collision could raise now: those of the registers at 0
// C.mask            the sprites fetched on the last line worked out, a bit each: on those lines the
//                   chip holds the processor (kit/skills/c64/c64-reference), which a clock may count
// C.save(), C.load(s)
globalThis.C64Collide = (function () {
  'use strict';
  const LINE = 63, LINES = 312, W = 504;
  const SPRITE_CYCLE = new Uint8Array(LINE + 1);
  for (const c of [1, 3, 5, 7, 9, 15, 16, 55, 56, 58, 60, 62]) SPRITE_CYCLE[c] = 1;
  function create(regs, vmem, colour) {
    const col = colour || (() => 0);
    const spr = [0, 1, 2, 3, 4, 5, 6, 7].map(() => ({ dma: false, on: false, mcbase: 0, mc: 0, ff: true,
      row: [0, 0, 0], rowOn: false, next: [0, 0, 0], nextOn: false }));
    // the beam: the next cycle to work out; the rows (renderFrame's vcbase, vc, rc and display, and
    // the frame's display bit at line $30); the top and bottom border; the collisions
    const S = { at: 0, vcbase: 0, vc: 0, rc: 0, display: false, den30: false, badline: false, gn: 0,
      gvc: 0, grc: 0, gdisplay: false, vborder: true, ss: 0, sb: 0, rose: 0, mask: 0, rows: 0 };
    const C = { mask: 0 };
    const who = new Uint8Array(8);

    // whether the graphics are foreground at sprite X x, with the rows as the chip fetched them
    function fg(x) {
      if (S.vborder) return 0;
      const d11 = regs[0x11], d16 = regs[0x16], d18 = regs[0x18], xs = d16 & 7;
      const load = x - ((x - xs) & 7), c = (load >> 3) - 3, bit = x - load;
      if (c < 0 || c >= 40) return 0;
      const ecm = d11 & 0x40, bmm = d11 & 0x20, mcm = d16 & 0x10;
      let byte, cc = 0;
      if (S.gdisplay) {
        const v = (S.gvc + c) & 0x3FF;
        if (bmm) byte = vmem(((d18 & 0x08) << 10 | v << 3 | S.grc) & (ecm ? 0x39FF : 0x3FFF));
        else {
          let code = vmem((d18 >> 4) << 10 | v);
          if (ecm) code &= 0x3F;
          byte = vmem((d18 & 0x0E) << 10 | code << 3 | S.grc);
        }
        cc = col(v) & 15;
      } else byte = vmem(ecm ? 0x39FF : 0x3FFF);
      if (mcm && (bmm || (cc & 8))) return (byte >> (6 - (bit & 6)) & 3) >= 2 ? 1 : 0;
      return byte >> (7 - bit) & 1;
    }

    // the pixels of cycle c of line y
    function pixels(c) {
      if (!S.rows) return;
      const x0 = (8 * (c - 15) + W) % W;
      let any = 0;
      for (let n = 0; n < 8; n++) {
        const s = spr[n];
        if (!(S.rows >> n & 1) || !(s.row[0] | s.row[1] | s.row[2])) continue;
        const sx = regs[2 * n] | (regs[0x10] >> n & 1) << 8;
        if (sx >= W) continue;
        const xe = regs[0x1D] >> n & 1, w = xe ? 48 : 24, d0 = (x0 - sx + W) % W;
        if (d0 >= w && d0 <= W - 8) continue;           // the 8 pixels miss it
        const mc = regs[0x1C] >> n & 1, b = 1 << n;
        for (let p = 0; p < 8; p++) {
          const dx = (d0 + p) % W;
          if (dx >= w) continue;
          const q = xe ? dx >> 1 : dx, byte = s.row[q >> 3];
          if (mc ? byte >> (6 - (q & 6)) & 3 : byte >> (7 - (q & 7)) & 1) { who[p] |= b; any = 1; }
        }
      }
      if (!any) return;
      for (let p = 0; p < 8; p++) {
        const m = who[p];
        if (!m) continue;
        who[p] = 0;
        // a bit set in a register that was 0 raises the interrupt ($D019 bit 2 for $D01E, 1 for $D01F)
        if (m & (m - 1)) { if (!S.ss) S.rose |= 4; S.ss |= m; }
        if (fg(x0 + p)) { if (!S.sb) S.rose |= 2; S.sb |= m; }
      }
    }

    // the top and bottom border at line y (renderFrame closes it at the line's end and at the
    // left edge of the window; here both are taken at the line's cycle 18 and 63)
    function vborder(y) {
      const rsel = regs[0x11] & 8;
      if (y === (rsel ? 251 : 247)) S.vborder = true;
      if (y === (rsel ? 51 : 55) && (regs[0x11] & 0x10)) S.vborder = false;
    }

    // cycle c of line y, as renderFrame's chip half, then its pixels
    function cycle(y, c) {
      const d11 = regs[0x11];
      if (c === 1 && y === 0) { S.vcbase = 0; S.den30 = false; }
      if (y === 0x30 && (d11 & 0x10)) S.den30 = true;
      const bad = y >= 0x30 && y <= 0xF7 && (y & 7) === (d11 & 7) && S.den30;
      if (c === 14) {
        S.badline = bad; S.vc = S.vcbase; S.gn = 0;
        if (bad) { S.rc = 0; S.display = true; }
      } else if (c > 14 && c <= 55 && bad && !S.badline) { S.badline = true; S.display = true; S.gdisplay = true; }
      if (c === 16) { S.gvc = S.vc; S.grc = S.rc; S.gdisplay = S.display; }
      if (c >= 16 && c <= 55 && S.display) S.gn++;
      // the sprites' cycles: an unexpanded sprite's flip-flop is held set, which counts only where
      // it is read (15, 16 and 55), so the rest of the line is skipped
      if (SPRITE_CYCLE[c]) for (let n = 0; n < 8; n++) {
        const s = spr[n], ye = regs[0x17] >> n & 1;
        if (!ye) s.ff = true;
        if (c === 15 && s.dma && s.ff) s.mcbase += 2;
        if (c === 16 && s.dma) {
          if (s.ff) s.mcbase += 1;
          if (s.mcbase >= 63) { s.dma = false; s.on = false; }
        }
        if (c === 55 && ye) s.ff = !s.ff;
        if ((c === 55 || c === 56) && !s.dma && (regs[0x15] >> n & 1) && regs[2 * n + 1] === (y & 0xFF)) {
          s.dma = true; s.mcbase = 0; if (ye) s.ff = false;
        }
        if (c === 58) { s.mc = s.mcbase; if (s.dma && regs[2 * n + 1] === (y & 0xFF)) s.on = true; }
        // pointer and data: sprites 0-2 at the end of this line, 3-7 early in the next
        if (c === (n < 3 ? 58 + 2 * n : 2 * n - 5)) {
          const sp = n < 3 ? s.next : s.row;
          if (s.dma) {
            const ptr = vmem((regs[0x18] >> 4) * 0x400 + 0x3F8 + n) * 64;
            for (let i = 0; i < 3; i++) sp[i] = vmem((ptr + ((s.mc + i) & 63)) & 0x3FFF);
            s.mc += 3;
          }
          if (n < 3) s.nextOn = s.dma && s.on;
          else { s.rowOn = s.dma && s.on; S.rows = s.rowOn ? S.rows | 1 << n : S.rows & ~(1 << n); }
        }
      }
      if (c === 56) {
        let m = 0;
        for (let n = 0; n < 8; n++) if (spr[n].dma) m |= 1 << n;
        S.mask = m;
      }
      if (c === 58) {
        if (S.rc === 7) { S.vcbase = (S.vc + S.gn) & 0x3FF; if (!S.badline) S.display = false; }
        if (S.display) S.rc = (S.rc + 1) & 7;
      }
      if (c === 18) vborder(y);
      pixels(c);
      if (c === LINE) {
        vborder(y);
        for (let n = 0; n < 3; n++) {
          const s = spr[n];
          s.row[0] = s.next[0]; s.row[1] = s.next[1]; s.row[2] = s.next[2]; s.rowOn = s.nextOn;
          S.rows = s.rowOn ? S.rows | 1 << n : S.rows & ~(1 << n);
        }
      }
    }

    C.to = function (cycle_) {
      while (S.at < cycle_) {
        const L = Math.floor(S.at / LINE);
        cycle(L % LINES, S.at - L * LINE + 1);
        S.at++;
      }
      C.mask = S.mask;
    };
    C.at = function (cycle_) { S.at = cycle_ - cycle_ % LINE; };
    C.peek = function (r, cycle_) { C.to(cycle_ + 1); return (r & 0x3F) === 0x1E ? S.ss : S.sb; };
    C.read = function (r, cycle_) {
      const v = C.peek(r, cycle_);
      if ((r & 0x3F) === 0x1E) S.ss = 0; else S.sb = 0;
      return v;
    };
    C.irq = function (cycle_) { C.to(cycle_ + 1); const v = S.rose; S.rose = 0; return v; };
    C.armed = () => (S.ss ? 0 : 4) | (S.sb ? 0 : 2);
    C.save = () => JSON.parse(JSON.stringify({ S, spr }));
    C.load = (s) => {
      Object.assign(S, s.S);
      s.spr.forEach((t, n) => Object.assign(spr[n], t, { row: t.row.slice(), next: t.next.slice() }));
      C.mask = S.mask;
    };
    C.sprites = spr;
    return C;
  }
  return { create, LINE, LINES };
})();
