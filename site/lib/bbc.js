// Shared BBC Micro rendering helpers for game pages. No dependencies. Exposes BBC (window.BBC
// on a page; globalThis.BBC in node, where kit/bbc/frame.py tests render) for the screen of
// modes 0 to 6, and BBCMap (the same footprint widget as C64Map, with the BBC's legend words).
// Data comes from the game's listing.json via BBC.load(). Mode 7, teletext, is not drawn here.
globalThis.BBC = (function () {
  // The eight physical colours the video ULA can show.
  const PAL = ['#000000', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff'];

  // The bitmap modes as the MOS sets them up (kit/skills/bbc/bbc-reference): bits a pixel,
  // pixels across, bytes in a character row, character rows, scan lines a row (modes 3 and 6
  // leave two blank under each), where the screen starts and how big it is, which is also
  // where an address past &7FFF wraps back to.
  const MODES = {
    0: { bpp: 1, w: 640, rowBytes: 640, rows: 32, lines: 8, base: 0x3000, size: 0x5000 },
    1: { bpp: 2, w: 320, rowBytes: 640, rows: 32, lines: 8, base: 0x3000, size: 0x5000 },
    2: { bpp: 4, w: 160, rowBytes: 640, rows: 32, lines: 8, base: 0x3000, size: 0x5000 },
    3: { bpp: 1, w: 640, rowBytes: 640, rows: 25, lines: 10, base: 0x4000, size: 0x4000 },
    4: { bpp: 1, w: 320, rowBytes: 320, rows: 32, lines: 8, base: 0x5800, size: 0x2800 },
    5: { bpp: 2, w: 160, rowBytes: 320, rows: 32, lines: 8, base: 0x5800, size: 0x2800 },
    6: { bpp: 1, w: 320, rowBytes: 320, rows: 25, lines: 10, base: 0x6000, size: 0x2000 },
  };
  // The MOS's palette after MODE: logical colour to physical. Mode 2's 8 to 15 flash between
  // two colours, n - 8 and its opposite, 15 - n; `phase` 1 shows the second.
  const DEFAULT = { 1: [0, 7], 2: [0, 1, 3, 7], 4: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] };

  // Listings fetched so far, by URL, as C64.load keeps them.
  const listings = new Map();
  // Rebuild a 64 KB image from listing.json records. Bytes the game does not use stay 0 and has[a] is false.
  async function load(url) {
    url = url || 'listing.json';
    if (!listings.has(url))
      listings.set(url, fetch(url).then(r => r.json()).catch(e => { listings.delete(url); throw e; }));
    const L = await listings.get(url);
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

  // The logical colours of the pixels one screen byte holds, left to right. A pixel's bits are
  // spread through the byte: in two colours it is one bit, 7 first; in four, pixel i is bits
  // 7-i and 3-i; in sixteen, the left pixel is bits 7, 5, 3 and 1 and the right 6, 4, 2 and 0.
  // A game's sprites are bytes in the same form.
  function pixels(byte, bpp) {
    const out = [];
    if (bpp === 1) for (let i = 0; i < 8; i++) out.push((byte >> (7 - i)) & 1);
    else if (bpp === 2) for (let i = 0; i < 4; i++) out.push(((byte >> (7 - i)) & 1) << 1 | ((byte >> (3 - i)) & 1));
    else if (bpp === 4) for (let i = 0; i < 2; i++) {
      const b = byte << i;
      out.push(((b >> 7) & 1) << 3 | ((b >> 5) & 1) << 2 | ((b >> 3) & 1) << 1 | ((b >> 1) & 1));
    } else throw new Error('bpp ' + bpp + ': 1, 2 or 4');
    return out;
  }

  // The address of the byte holding pixel (x, y), y counting pixel rows from the top (blank
  // lines of modes 3 and 6 not counted). The screen is character rows of rowBytes, each cell
  // eight bytes one above the other, so the byte under a byte is the next address within a
  // cell and rowBytes on at a row's end. Past &7FFF the hardware wraps by the screen's size.
  function addr(mode, x, y, base) {
    const M = MODES[mode];
    if (!M) throw new Error('mode ' + mode + ': 0 to 6');
    let a = (base == null ? M.base : base) + (y >> 3) * M.rowBytes + Math.floor(x * M.bpp / 8) * 8 + (y & 7);
    if (a >= 0x8000) a -= M.size;
    return a;
  }

  // The screen as physical colour numbers, one per pixel: { w, h, px }, h counting the blank
  // lines of modes 3 and 6. `base` is where the CRTC starts the screen (its R12 and R13 times
  // eight), `palette` maps logical colours to physical ones, 8 to 15 being mode 2's flashing
  // pairs, of which `phase` picks one.
  function render(ram, { mode, base, palette, phase = 0 } = {}) {
    const M = MODES[mode];
    if (!M) throw new Error('mode ' + mode + ': 0 to 6 (mode 7 is teletext)');
    const pal = palette || DEFAULT[M.bpp];
    const per = 8 / M.bpp, h = M.rows * M.lines, px = new Uint8Array(M.w * h);
    for (let row = 0; row < M.rows; row++) for (let line = 0; line < 8; line++) {
      const y = row * 8 + line, out = (row * M.lines + line) * M.w;
      for (let x = 0; x < M.w; x += per) {
        const p = pixels(ram[addr(mode, x, y, base)], M.bpp);
        for (let i = 0; i < per; i++) {
          const c = pal[p[i]];
          px[out + x + i] = c < 8 ? c : phase ? 15 - c : c - 8;
        }
      }
    }
    return { w: M.w, h, px };
  }

  // The screen into a canvas, each pixel as wide as the mode makes it (one, two or four of
  // mode 0's) and two of them tall, as a television shows it: 640 by 512 at s = 1.
  function drawScreen(canvas, ram, opts = {}) {
    const { w, h, px } = render(ram, opts), s = opts.s || 1, pw = 640 / w * s, ph = 2 * s;
    canvas.width = 640 * s; canvas.height = h * ph;
    canvas.style.imageRendering = 'pixelated';
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      ctx.fillStyle = PAL[px[y * w + x]];
      ctx.fillRect(x * pw, y * ph, pw, ph);
    }
    return canvas;
  }

  const hex = (n, w = 4) => '$' + n.toString(16).toUpperCase().padStart(w, '0');
  return { PAL, MODES, DEFAULT, load, pixels, addr, render, drawScreen, hex };
})();

// The BBC Micro's names for the footprint categories; the drawing is makeMemMap in memmap.js.
if (globalThis.makeMemMap) {
  globalThis.BBCMap = globalThis.makeMemMap({
    code: 'code', graphics: 'graphics', levels: 'level data', sound: 'sound', text: 'text', tables: 'tables',
    variables: 'variables', runtime: 'screen, stack and the MOS’s workspace', rom: 'paged ROM (BASIC or a filing system)',
    unused: 'unused' });
}
