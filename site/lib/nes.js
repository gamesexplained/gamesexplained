// Shared NES rendering helpers for game pages. No dependencies. Exposes NES (window.NES on a page;
// globalThis.NES in node, where kit/nes/frame.py and its test render) and NESMap (the same
// footprint widget as C64Map, with the NES's legend words).
//
// The NES draws from the PPU's own 16 KB, which the CPU's image does not hold: a page carries
// the pieces its widget draws (the tiles, a nametable, the palette RAM, the sprite table), read
// from a snapshot with kit/nes/snapshot.py's ppu() and oam(), embedded in the page as data
// (AGENTS.md, "No binaries, ever": the pictures a viewer shows, never the whole CHR ROM).
//
//   NES.PALETTE                 the 64 colours as '#rrggbb', in jsnes 2.1.0's palette
//   NES.tile(chr, n)            tile n of a pattern table as 64 colour indices, 0 to 3
//   NES.frame(ppu, oam, opts)   one picture, 256 by 240 colour numbers (0 to 63)
//   NES.draw(ctx, pixels, w, h, scale)   paint colour numbers onto a canvas
//   NES.ppu(opts)               the PPU's registers and memory as the CPU reaches them (below)
//
// frame() follows the rules in kit/skills/nes/nes-reference, "The PPU": the background through
// the scroll and the four nametables, each attribute quarter's palette, the backdrop, sprites of
// 8 by 8 or 8 by 16 with their flips, at most eight on a line with the lower number in front, a
// sprite behind the background, and the left 8 pixels' clipping. What it does not do: a change
// to the scroll or the registers part way down the screen (a split is drawn in two calls, one
// per band, `top` and `bottom`), colour emphasis (PPUMASK bits 5 to 7) and the greyscale bit.
// `python3 kit/nes/frame.py test` holds it to jsnes's own picture.
globalThis.NES = (function () {
  // jsnes 2.1.0, src/ppu/palette-table.js, loadNTSCPalette: jsnes keeps each as 0xBBGGRR. The
  // console has no RGB palette of its own (the television decides), so a page names this one.
  const BGR = [0x525252, 0xB40000, 0xA00000, 0xB1003D, 0x740069, 0x00005B, 0x00005F, 0x001840, 0x002F10, 0x084A08, 0x006700, 0x124200, 0x6D2800, 0x000000, 0x000000, 0x000000,
    0xC4D5E7, 0xFF4000, 0xDC0E22, 0xFF476B, 0xD7009F, 0x680AD7, 0x0019BC, 0x0054B1, 0x006A5B, 0x008C03, 0x00AB00, 0x2C8800, 0xA47200, 0x000000, 0x000000, 0x000000,
    0xF8F8F8, 0xFFAB3C, 0xFF7981, 0xFF5BC5, 0xFF48F2, 0xDF49FF, 0x476DFF, 0x00B4F7, 0x00E0FF, 0x00E375, 0x03F42B, 0x78B82E, 0xE5E218, 0x787878, 0x000000, 0x000000,
    0xFFFFFF, 0xFFF2BE, 0xF8B8B8, 0xF8B8D8, 0xFFB6FF, 0xFFC3FF, 0xC7D1FF, 0x9ADAFF, 0x88EDF8, 0x83FFDD, 0xB8F8B8, 0xF5F8AC, 0xFFFFB0, 0xF8D8F8, 0x000000, 0x000000];
  const RGB = BGR.map(v => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff]);
  const hex2 = n => n.toString(16).padStart(2, '0');
  const PALETTE = RGB.map(([r, g, b]) => '#' + hex2(r) + hex2(g) + hex2(b));

  // A tile is 16 bytes: eight of bit 0 of each pixel, then eight of bit 1, the leftmost pixel in
  // bit 7. `chr` is a pattern table or the whole 8 KB; n counts tiles from its start.
  function tile(chr, n) {
    const out = new Uint8Array(64), o = n * 16;
    for (let y = 0; y < 8; y++) {
      const lo = chr[o + y], hi = chr[o + y + 8];
      for (let x = 0; x < 8; x++) out[y * 8 + x] = ((lo >> (7 - x)) & 1) | (((hi >> (7 - x)) & 1) << 1);
    }
    return out;
  }

  // One tile's colour index at a pixel inside it, read straight from the pattern table.
  const pixel = (ppu, base, n, x, y) =>
    ((ppu[base + n * 16 + y] >> (7 - x)) & 1) | (((ppu[base + n * 16 + y + 8] >> (7 - x)) & 1) << 1);

  // The picture as colour numbers. ppu is the PPU's 16 KB as the PPU sees it, the nametables'
  // mirroring applied (kit/nes/snapshot.py, ppu); oam the 256-byte sprite table. opts: ctrl and
  // mask, PPUCTRL and PPUMASK as written; scrollX and scrollY, the two PPUSCROLL writes; top and
  // bottom, the lines to draw (0 and 239), the rest left as they are in `into`, the picture to
  // draw over (a new one when there is none).
  function frame(ppu, oam, opts = {}) {
    const ctrl = opts.ctrl || 0, mask = opts.mask === undefined ? 0x1e : opts.mask;
    const sx = opts.scrollX || 0, sy = opts.scrollY || 0;
    const top = opts.top || 0, bottom = opts.bottom === undefined ? 239 : opts.bottom;
    const out = opts.into || new Uint8Array(256 * 240);
    const bgTable = ctrl & 0x10 ? 0x1000 : 0, spTable = ctrl & 0x08 ? 0x1000 : 0, tall = !!(ctrl & 0x20);
    const backdrop = ppu[0x3f00] & 0x3f;
    const bgOpaque = new Uint8Array(256);
    for (let y = top; y <= bottom; y++) {
      // the background: the nametable bits of PPUCTRL are bit 8 of each scroll
      for (let x = 0; x < 256; x++) {
        let c = 0, pal = 0;
        if (mask & 0x08 && (x >= 8 || mask & 0x02)) {
          const wx = (x + sx + (ctrl & 1) * 256) % 512, wy = (y + sy + ((ctrl >> 1) & 1) * 240) % 480;
          const nt = 0x2000 + ((wx >> 8) + (wy >= 240 ? 2 : 0)) * 0x400, ly = wy % 240, lx = wx & 255;
          const tx = lx >> 3, ty = ly >> 3;
          c = pixel(ppu, bgTable, ppu[nt + ty * 32 + tx], lx & 7, ly & 7);
          pal = (ppu[nt + 0x3c0 + (ty >> 2) * 8 + (tx >> 2)] >> (((ty & 2) << 1) | (tx & 2))) & 3;
        }
        bgOpaque[x] = c ? 1 : 0;
        out[y * 256 + x] = c ? ppu[0x3f00 + pal * 4 + c] & 0x3f : backdrop;
      }
      if (!(mask & 0x10)) continue;
      // the sprites on this line: the first eight in the table, the lower number in front.
      // A sprite's top is its Y plus one.
      const h = tall ? 16 : 8, line = [];
      for (let i = 0; i < 64 && line.length < 8; i++) {
        const r = y - (oam[i * 4] + 1);
        if (r >= 0 && r < h) line.push(i);
      }
      const done = new Uint8Array(256);
      for (const i of line) {
        const t = oam[i * 4 + 1], at = oam[i * 4 + 2], left = oam[i * 4 + 3];
        let r = y - (oam[i * 4] + 1);
        if (at & 0x80) r = h - 1 - r;
        let base = spTable, n = t;
        if (tall) { base = t & 1 ? 0x1000 : 0; n = (t & 0xfe) + (r >= 8 ? 1 : 0); }
        for (let px = 0; px < 8; px++) {
          const x = left + px;
          if (x > 255 || done[x] || (x < 8 && !(mask & 0x04))) continue;
          const c = pixel(ppu, base, n, at & 0x40 ? 7 - px : px, r & 7);
          if (!c) continue;
          done[x] = 1;                   // a sprite behind still hides the sprites after it
          if (!(at & 0x20) || !bgOpaque[x]) out[y * 256 + x] = ppu[0x3f10 + (at & 3) * 4 + c] & 0x3f;
        }
      }
    }
    return out;
  }

  // Paint colour numbers, w by h, onto a 2D context at `scale` canvas pixels a pixel.
  function draw(ctx, pixels, w = 256, h = 240, scale = 1) {
    const img = ctx.createImageData(w * scale, h * scale), d = img.data;
    for (let y = 0; y < h * scale; y++)
      for (let x = 0; x < w * scale; x++) {
        const [r, g, b] = RGB[pixels[((y / scale) | 0) * w + ((x / scale) | 0)] & 0x3f], o = (y * w * scale + x) * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  }

  // --- the PPU's registers and memory ----------------------------------------------------------
  // A model of what the CPU reaches through $2000-$2007 and $4014 (kit/skills/nes/nes-reference,
  // "The registers"): the control and mask registers, the status flags, the sprite table and its
  // address, the shared address and scroll registers with their write toggle, the read buffer,
  // and the PPU's memory with the cartridge's mirroring. A page's port writes to it as the game
  // writes to the chip, and draws from image() and scroll(); kit/nes/machine.js runs the game's
  // own code on one, and kit/nes/lockstep.js compares the two.
  //   const p = NES.ppu({ chr, mirroring: 'horizontal' | 'vertical' | 'four' | 'single0' | 'single1' })
  //   p.write(r, v)       a store to $2000 + r (r 0 to 7, the mirrors folded by the caller)
  //   p.read(r)           a load from it: $2002 clears the vertical blank flag and the toggle, and
  //                       $2007 reads a byte late below the palettes
  //   p.dma(bytes)        $4014: 256 bytes into the sprite table from its address
  //   p.vblank            the vertical blank flag, which the machine sets and clears with the beam
  //   p.nmi()             the NMI line: the flag and PPUCTRL's bit 7
  //   p.image()           the 16 KB as the PPU sees it, for NES.frame
  //   p.scroll()          { ctrl, mask, scrollX, scrollY } as the game last set them with $2000 and
  //                       $2005 (a write to $2006 changes them too, as it does the chip's), for
  //                       NES.frame; nametable the picture's top left comes from ctrl's bits 0-1
  //   p.log               with { log: true }: every write to $2000, $2001, $2005 and $2006 as
  //                       [cycle, scroll()] (cycle is write's third argument), for a page that
  //                       draws a split in bands; the page clears it each frame
  //   p.save(), p.load(s) the whole state as plain data
  // The write to $2000 and the second write to $2005 change the scroll the next picture starts
  // from; $2006 sets the address the next $2007 reaches and the scroll with it.
  const NT_MAP = { horizontal: [0, 0, 1, 1], vertical: [0, 1, 0, 1], four: [0, 1, 2, 3], single0: [0, 0, 0, 0], single1: [1, 1, 1, 1] };
  function ppu(opts = {}) {
    const chr = opts.chr || new Uint8Array(0x2000);
    const nt = NT_MAP[opts.mirroring || 'horizontal'];
    if (!nt) throw new Error('NES.ppu: mirroring is horizontal, vertical, four, single0 or single1');
    const p = {
      chr, mirroring: opts.mirroring || 'horizontal', nt: new Uint8Array(0x1000), pal: new Uint8Array(0x20), oam: new Uint8Array(256),
      ctrl: 0, mask: 0, oamAddr: 0, t: 0, v: 0, x: 0, w: 0, buffer: 0, vblank: 0, hit: 0, overflow: 0, log: opts.log ? [] : null,
    };
    // where an address lands: the pattern tables (read only), a physical nametable, or the palette
    const fold = a => { a &= 0x3FFF; if (a >= 0x3F00) { a &= 0x1F; return 0x10000 | ((a & 0x13) === 0x10 ? a & 0x0F : a); }
      if (a >= 0x3000) a -= 0x1000; return a < 0x2000 ? a : 0x2000 | (nt[(a >> 10) & 3] << 10) | (a & 0x3FF); };
    const peek = a => { const f = fold(a); return f & 0x10000 ? p.pal[f & 0x1F] : f < 0x2000 ? chr[f] : p.nt[f & 0xFFF]; };
    const poke = (a, v) => { const f = fold(a); if (f & 0x10000) p.pal[f & 0x1F] = v & 0x3F; else if (f >= 0x2000) p.nt[f & 0xFFF] = v; };
    p.peek = peek; p.poke = poke;
    const scroll = () => ({ ctrl: (p.ctrl & 0xFC) | ((p.t >> 10) & 3), mask: p.mask, scrollX: ((p.t & 0x1F) << 3) | p.x, scrollY: (((p.t >> 5) & 0x1F) << 3) | ((p.t >> 12) & 7) });
    p.scroll = scroll;
    p.nmi = () => (p.vblank && (p.ctrl & 0x80)) ? 1 : 0;
    p.write = (r, v, cycle) => {
      v &= 0xFF;
      switch (r & 7) {
        case 0: p.ctrl = v; p.t = (p.t & 0x73FF) | ((v & 3) << 10); break;
        case 1: p.mask = v; break;
        case 3: p.oamAddr = v; break;
        case 4: p.oam[p.oamAddr] = v; p.oamAddr = (p.oamAddr + 1) & 0xFF; break;
        case 5: if (!p.w) { p.x = v & 7; p.t = (p.t & 0x7FE0) | (v >> 3); p.w = 1; } else { p.t = (p.t & 0x0C1F) | ((v & 7) << 12) | ((v & 0xF8) << 2); p.w = 0; } break;
        case 6: if (!p.w) { p.t = (p.t & 0x00FF) | ((v & 0x3F) << 8); p.w = 1; } else { p.t = (p.t & 0x7F00) | v; p.v = p.t; p.w = 0; } break;
        case 7: poke(p.v, v); p.v = (p.v + (p.ctrl & 4 ? 32 : 1)) & 0x7FFF; break;
        default: return;
      }
      if (p.log && ((r & 7) === 0 || (r & 7) === 1 || (r & 7) === 5 || (r & 7) === 6)) p.log.push([cycle === undefined ? 0 : cycle, scroll()]);
    };
    p.read = r => {
      switch (r & 7) {
        case 2: { const v = (p.vblank << 7) | (p.hit << 6) | (p.overflow << 5); p.vblank = 0; p.w = 0; return v; }
        case 4: return p.oam[p.oamAddr];
        case 7: {
          const a = p.v & 0x3FFF;
          let out;
          if (a >= 0x3F00) { out = peek(a); p.buffer = peek(a - 0x1000); } else { out = p.buffer; p.buffer = peek(a); }
          p.v = (p.v + (p.ctrl & 4 ? 32 : 1)) & 0x7FFF;
          return out;
        }
        default: return 0;
      }
    };
    p.dma = bytes => { for (let i = 0; i < 256; i++) p.oam[(p.oamAddr + i) & 0xFF] = bytes[i]; };
    p.image = () => { const out = new Uint8Array(0x4000); out.set(chr, 0); for (let a = 0x2000; a < 0x4000; a++) out[a] = peek(a); return out; };
    p.save = () => ({ nt: Array.from(p.nt), pal: Array.from(p.pal), oam: Array.from(p.oam), ctrl: p.ctrl, mask: p.mask, oamAddr: p.oamAddr,
      t: p.t, v: p.v, x: p.x, w: p.w, buffer: p.buffer, vblank: p.vblank, hit: p.hit, overflow: p.overflow });
    p.load = s => { p.nt.set(s.nt); p.pal.set(s.pal); p.oam.set(s.oam); for (const k of ['ctrl', 'mask', 'oamAddr', 't', 'v', 'x', 'w', 'buffer', 'vblank', 'hit', 'overflow']) p[k] = s[k]; return p; };
    return p;
  }

  return { PALETTE, RGB, tile, frame, draw, ppu };
})();

if (globalThis.makeMemMap) {
  globalThis.NESMap = globalThis.makeMemMap({
    code: 'code', graphics: 'graphics', levels: 'level data', sound: 'sound', text: 'text', tables: 'tables',
    variables: 'variables', runtime: 'stack, the RAM’s mirrors and the chips’ registers', rom: 'ROM',
    unused: 'unused' });
}
