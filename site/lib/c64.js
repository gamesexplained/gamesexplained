// Shared C64 rendering helpers for game pages. No dependencies. Exposes C64 (window.C64 on a
// page; globalThis.C64 in node or JavaScriptCore, where kit/c64/frame.py tests renderFrame).
// Data comes from the game's listing.json (every byte the game uses) via C64.load().
globalThis.C64 = (function () {
  const PAL = ['#000000', '#ffffff', '#813338', '#75cec8', '#8e3c97', '#56ac4d', '#2e2c9b', '#edf171',
               '#8e5029', '#553800', '#c46c71', '#4a4a4a', '#7b7b7b', '#a9ff9f', '#706deb', '#b2b2b2'];

  // Rebuild a 64 KB image from listing.json records. Bytes the game does not use stay 0 and has[a] is false.
  async function load(url) {
    const L = await fetch(url || 'listing.json').then(r => r.json());
    const ram = new Uint8Array(0x10000), has = new Uint8Array(0x10000);
    for (const r of L.records) {
      if (!r.b) continue;
      for (let i = 0; i < r.b.length; i++) { ram[r.a + i] = r.b[i]; has[r.a + i] = 1; }
    }
    const names = new Map(L.records.filter(r => r.l).map(r => [r.a, r.l]));
    const byName = new Map(L.records.filter(r => r.l).map(r => [r.l, r.a]));
    return { ram, has, names, byName, listing: L,
             bytes: (a, n) => ram.subarray(a, a + n),
             sym: n => { if (!byName.has(n)) throw new Error('no symbol ' + n); return byName.get(n); } };
  }

  // One 8x8 glyph from an 8-byte-per-glyph character set at charset[code*8..].
  function drawGlyph(ctx, charset, code, px, py, s, colour, bg) {
    const o = code * 8;
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(px, py, 8 * s, 8 * s); }
    ctx.fillStyle = colour;
    for (let y = 0; y < 8; y++) {
      const row = charset[o + y];
      for (let x = 0; x < 8; x++) if (row & (0x80 >> x)) ctx.fillRect(px + x * s, py + y * s, s, s);
    }
  }

  // Multicolour glyph: 4x8 double-width pixels, colours [bg, d022, d023, cell colour & 7].
  function drawGlyphMC(ctx, charset, code, px, py, s, cols) {
    const o = code * 8;
    for (let y = 0; y < 8; y++) {
      const row = charset[o + y];
      for (let x = 0; x < 4; x++) {
        const v = (row >> (6 - 2 * x)) & 3;
        if (!v && !cols[0]) continue;
        ctx.fillStyle = cols[v]; ctx.fillRect(px + x * 2 * s, py + y * s, 2 * s, s);
      }
    }
  }

  // A whole 40x25 text screen: screen codes, colour nibbles, charset, background colour index.
  function drawScreen(ctx, { screen, colour, charset, s = 2, bg = 6, cols = 40, rows = 25, invertHi = true }) {
    ctx.fillStyle = PAL[bg & 15]; ctx.fillRect(0, 0, cols * 8 * s, rows * 8 * s);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      drawGlyph(ctx, charset, screen[i], c * 8 * s, r * 8 * s, s, PAL[colour ? colour[i] & 15 : 1]);
    }
  }

  // A 24x21 hires sprite from 63 bytes.
  function drawSprite(ctx, data, px, py, s, colour, expandX = 1, expandY = 1) {
    ctx.fillStyle = colour;
    for (let y = 0; y < 21; y++) for (let bx = 0; bx < 3; bx++) {
      const row = data[y * 3 + bx];
      for (let x = 0; x < 8; x++) if (row & (0x80 >> x))
        ctx.fillRect(px + (bx * 8 + x) * s * expandX, py + y * s * expandY, s * expandX, s * expandY);
    }
  }

  // A grid of every glyph in a charset, n glyphs, `per` per row.
  function drawCharset(ctx, charset, n = 256, per = 32, s = 2, colour = PAL[1], bg = PAL[6]) {
    for (let i = 0; i < n; i++) drawGlyph(ctx, charset, i, (i % per) * 9 * s, Math.floor(i / per) * 9 * s, s, colour, bg);
  }

  // Sized canvas with crisp pixels.
  function canvas(el, w, h) {
    el.width = w; el.height = h; el.style.imageRendering = 'pixelated';
    const ctx = el.getContext('2d'); ctx.imageSmoothingEnabled = false; return ctx;
  }

  const bytes64 = s => typeof s === 'string' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : Uint8Array.from(s);

  // One frame recorded by kit/c64/frame.py, drawn line by line and cycle by cycle with the state
  // in force when the beam got there: the video chip's registers, CIA 2's port A (the video bank)
  // and the sprite pointers as the frame began and at every write, and memory as it began.
  //   F.vic     the 47 registers $D000-$D02E        F.cia2    [$DD00, $DD02]
  //   F.writes  [[line, cycle, address, value], ...] in the order they happened: a register,
  //             $DD00 or $DD02, or RAM (a sprite pointer); cycle 1 is the one in which the
  //             raster line steps, and a write in cycle c shows from the picture's 8-pixel
  //             column c - 13
  //   F.ram     RAM as the frame began, as base64 regions [{a, b}]: all 64 KB, or the bytes
  //             the drawing reads (kit/c64/frame.py trim)   F.colour  the 1024 colour nibbles
  //   F.charrom the 4 KB character ROM, when a band shows it: kit/c64/frame.py supplies it for
  //             its own checks, and a page never embeds it
  // Modelled: character, bitmap and extended colour modes, multicolour, both scrolls, 24/25 rows
  // and 38/40 columns with the border flip-flops (so an opened border stays open), bad lines,
  // the idle pattern, and sprites with expansion, multicolour, priority and reuse within the
  // frame. The frame is run twice and the second drawn, so that what crosses the frame boundary
  // (the border, a sprite) is as the steady state leaves it. Not followed to the pixel: the few
  // pixels after a mid-line change of a mode bit or the scroll, and the grey pixel VICE draws
  // where a colour register changes. Not modelled: sprite collisions, and tricks that move the
  // bad lines within a line.
  // Returns {w, h, px, x0, line0, reads, romReads}: px holds w * h colour indices of VICE's
  // visible PAL area (raster lines 16-287, sprite X -8 to 375); reads marks each RAM address the
  // drawing read.
  function renderFrame(F) {
    const LINES = F.lines || 312, CYC = F.cycles || 63, W = 384, H = 272, LINE0 = 16, X0 = -8;
    if (LINES !== 312 || CYC !== 63) throw new Error('renderFrame models the PAL chip: 312 lines of 63 cycles');
    const start = new Uint8Array(0x10000);
    for (const r of F.ram) start.set(bytes64(r.b), r.a);
    const colour = bytes64(F.colour), rom = F.charrom ? bytes64(F.charrom) : null;
    const px = new Uint8Array(W * H), reads = new Uint8Array(0x10000);
    let romReads = 0;
    const byLine = [];
    for (const w of F.writes) (byLine[w[0]] = byLine[w[0]] || []).push(w);
    // what the chip keeps between lines, and between the two runs of the frame
    const S = { vcbase: 0, vc: 0, rc: 0, display: false, den30: false, vborder: true, mborder: true,
      spr: [0, 1, 2, 3, 4, 5, 6, 7].map(() => ({ dma: false, on: false, mcbase: 0, mc: 0, ff: true,
        row: [0, 0, 0], rowOn: false, next: [0, 0, 0], nextOn: false })),
      seq: { byte: 0, code: 0, cc: 0, idx: 8 } };   // the graphics shift register
    for (let pass = 0; pass < 2; pass++) {
      const draw = pass === 1;
      const R = F.vic.slice(), mem = start.slice();
      let pra = F.cia2[0], ddra = F.cia2[1];
      // the mode bits reach the chip later than a colour does: $D011's extended colour and bitmap
      // bits and $D016's X scroll a cycle later, $D016's multicolour bit half a cycle (measured
      // against VICE)
      let lag11 = R[0x11], lag16 = R[0x16];
      const buf = new Uint8Array(40), cbuf = new Uint8Array(40);
      const gfx = new Uint8Array(40), gcode = new Uint8Array(40), gcol = new Uint8Array(40);
      const vmem = a => {                       // the video chip's view: 14 bits within its bank
        const bank = 3 - ((pra | ~ddra) & 3);
        a &= 0x3FFF;
        if ((bank & 1) === 0 && a >= 0x1000 && a < 0x2000) { romReads++; return rom ? rom[a & 0xFFF] : 0; }
        const x = bank << 14 | a;
        reads[x] = 1;
        return mem[x];
      };
      for (let y = 0; y < LINES; y++) {
        const ws = byLine[y] || [];
        let wi = 0, badline = false, slot = -1;
        const out = y >= LINE0 && y < LINE0 + H ? (y - LINE0) * W : -1;
        if (y === 0) { S.vcbase = 0; S.den30 = false; }
        for (let c = 1; c <= CYC; c++) {
          // the chip's half of cycle c, before the processor's write in it
          const m11 = lag11, m16 = lag16;
          lag11 = R[0x11]; lag16 = R[0x16];
          if (y === 0x30 && (R[0x11] & 0x10)) S.den30 = true;
          if (c === 14) {
            badline = y >= 0x30 && y <= 0xF7 && (y & 7) === (R[0x11] & 7) && S.den30;
            S.vc = S.vcbase;
            if (badline) { S.rc = 0; S.display = true; }
          }
          for (let n = 0; n < 8; n++) {
            const s = S.spr[n], ye = R[0x17] >> n & 1;
            if (!ye) s.ff = true;
            if (c === 15 && s.dma && s.ff) s.mcbase += 2;
            if (c === 16 && s.dma) {
              if (s.ff) s.mcbase += 1;
              if (s.mcbase >= 63) { s.dma = false; s.on = false; }
            }
            if (c === 55 && ye) s.ff = !s.ff;
            if ((c === 55 || c === 56) && !s.dma && (R[0x15] >> n & 1) && R[2 * n + 1] === (y & 0xFF)) {
              s.dma = true; s.mcbase = 0; if (ye) s.ff = false;
            }
            if (c === 58) { s.mc = s.mcbase; if (s.dma && R[2 * n + 1] === (y & 0xFF)) s.on = true; }
            // pointer and data: sprites 0-2 at the end of this line, 3-7 early in the next
            if (c === (n < 3 ? 58 + 2 * n : 2 * n - 5)) {
              const sp = n < 3 ? 'next' : 'row';
              if (s.dma) {
                const ptr = vmem((R[0x18] >> 4) * 0x400 + 0x3F8 + n) * 64;
                for (let i = 0; i < 3; i++) s[sp][i] = vmem(ptr + ((s.mc + i) & 63));
                s.mc += 3;
              }
              if (n < 3) s.nextOn = s.dma && s.on; else s.rowOn = s.dma && s.on;
            }
          }
          if (c >= 15 && c <= 54 && badline) {
            const i = c - 15;
            buf[i] = vmem((R[0x18] >> 4) * 0x400 + ((S.vc + i) & 0x3FF));
            cbuf[i] = colour[(S.vc + i) & 0x3FF] & 15;
          }
          if (c >= 16 && c <= 55) {
            const i = c - 16, ecm = m11 & 0x40, bmm = m11 & 0x20;
            if (S.display) {
              const vci = (S.vc + i) & 0x3FF;
              gfx[i] = bmm ? vmem((R[0x18] & 0x08) << 10 | vci << 3 | S.rc)
                : vmem((R[0x18] & 0x0E) << 10 | (ecm ? buf[i] & 0x3F : buf[i]) << 3 | S.rc);
              gcode[i] = buf[i]; gcol[i] = cbuf[i];
            } else {
              gfx[i] = vmem(ecm ? 0x39FF : 0x3FFF); gcode[i] = 0; gcol[i] = 0;
            }
          }
          if (c === 58) {
            if (S.rc === 7) { S.vcbase = (S.vc + (S.display ? 40 : 0)) & 0x3FF; if (!badline) S.display = false; }
            if (S.display) S.rc = (S.rc + 1) & 7;
          }
          if (c === CYC) {
            const rsel = R[0x11] & 8;
            if (y === (rsel ? 251 : 247)) S.vborder = true;
            if (y === (rsel ? 51 : 55) && (R[0x11] & 0x10)) S.vborder = false;
            for (let n = 0; n < 3; n++) { const s = S.spr[n]; s.row = s.next.slice(); s.rowOn = s.nextOn; }
          }
          // the picture's 8-pixel column c - 14, with the state before this cycle's write
          const k = c - 14;
          if (k >= 0 && k < W / 8) {
            const csel = R[0x16] & 8, rsel = R[0x11] & 8, left = csel ? 24 : 31, right = csel ? 344 : 335;
            const ecm = m11 & 0x40, bmm = m11 & 0x20, q = S.seq;
            for (let p = 0; p < 8; p++) {
              const mcm = (p < 4 ? m16 : R[0x16]) & 0x10, xs = m16 & 7;
              const x = 8 * k + p, X = x + X0;
              // each 8-pixel slot delivers its own column's byte (column i in the slot at X = 24 + 8i)
              // to the shift register at the pixel whose low three bits equal the X scroll, once;
              // a slot whose moment a scroll change skips loses its column, and after eight pixels
              // without a load the register shows background
              const col = (X >> 3) - 3;
              if (col >= 0 && col < 40 && col !== slot && (X & 7) === xs) {
                q.byte = gfx[col]; q.code = gcode[col]; q.cc = gcol[col]; q.idx = 0; slot = col;
              }
              const bit = q.idx, d = bit < 8 ? q.byte : 0;
              q.idx++;
              if (X === right) S.mborder = true;
              if (X === left) {
                if (y === (rsel ? 251 : 247)) S.vborder = true;
                if (y === (rsel ? 51 : 55) && (R[0x11] & 0x10)) S.vborder = false;
                if (!S.vborder) S.mborder = false;
              }
              if (!draw || out < 0) continue;
              if (S.mborder) { px[out + x] = R[0x20] & 15; continue; }
              // the graphics
              const code = q.code, cc = q.cc, pair = bit < 8 ? d >> (6 - (bit & 6)) & 3 : 0;
              const on = bit < 8 ? d >> (7 - bit) & 1 : 0;
              let g, fg;
              if (!bmm && !mcm) {
                fg = !!on; g = on ? cc : ecm ? R[0x21 + (code >> 6)] & 15 : R[0x21] & 15;
              } else if (!bmm) {
                if (cc & 8) { fg = pair >= 2; g = [R[0x21] & 15, R[0x22] & 15, R[0x23] & 15, cc & 7][pair]; }
                else { fg = !!on; g = on ? cc & 7 : R[0x21] & 15; }
              } else if (!mcm) { fg = !!on; g = on ? code >> 4 : code & 15; }
              else { fg = pair >= 2; g = [R[0x21] & 15, code >> 4, code & 15, cc][pair]; }
              if (ecm && (bmm || mcm)) g = 0;             // the invalid modes show black
              // the sprites: the lowest number in front, behind the graphics where $D01B says
              let sc = -1, sn = -1;
              for (let n = 0; n < 8 && sc < 0; n++) {
                const s = S.spr[n];
                if (!s.rowOn) continue;
                const sx = R[2 * n] | (R[0x10] >> n & 1) << 8, xe = R[0x1D] >> n & 1;
                if (sx >= 504) continue;
                const dx = ((X - sx) % 504 + 504) % 504;
                if (dx >= (xe ? 48 : 24)) continue;
                const b = xe ? dx >> 1 : dx, byte = s.row[b >> 3];
                if (R[0x1C] >> n & 1) {
                  const q = byte >> (6 - (b & 6)) & 3;
                  if (q) { sc = q === 1 ? R[0x25] & 15 : q === 2 ? R[0x27 + n] & 15 : R[0x26] & 15; sn = n; }
                } else if (byte >> (7 - (b & 7)) & 1) { sc = R[0x27 + n] & 15; sn = n; }
              }
              px[out + x] = sc >= 0 && !(fg && (R[0x1B] >> sn & 1)) ? sc : g;
            }
          }
          // the processor's half: this cycle's writes
          while (wi < ws.length && ws[wi][1] <= c) {
            const [, , a, v] = ws[wi++];
            if (a >= 0xD000 && a <= 0xD02E) R[a - 0xD000] = v;
            else if (a === 0xDD00) pra = v;
            else if (a === 0xDD02) ddra = v;
            else mem[a] = v;
          }
        }
      }
    }
    return { w: W, h: H, px, x0: X0, line0: LINE0, reads, romReads };
  }

  // A recorded frame drawn into a canvas with PAL, s pixels a pixel.
  function drawFrame(el, F, s = 1) {
    const r = renderFrame(F), ctx = canvas(el, r.w * s, r.h * s);
    const img = ctx.createImageData(r.w * s, r.h * s), rgb = PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
    for (let y = 0; y < r.h * s; y++) for (let x = 0; x < r.w * s; x++) {
      const c = rgb[r.px[(y / s | 0) * r.w + (x / s | 0)]], o = (y * r.w * s + x) * 4;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return r;
  }

  const hex = (n, w = 4) => '$' + n.toString(16).toUpperCase().padStart(w, '0');
  return { PAL, load, drawGlyph, drawGlyphMC, drawScreen, drawSprite, drawCharset, canvas, hex,
           renderFrame, drawFrame };
})();
