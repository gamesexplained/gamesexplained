// Shared BBC Micro rendering helpers for game pages. No dependencies. Exposes BBC (window.BBC
// on a page; globalThis.BBC in node, where kit/bbc/frame.py tests render) for the screen of
// modes 0 to 6, and BBCMap (the same footprint widget as C64Map, with the BBC's legend words).
// Data comes from the game's listing.json via BBC.load(). Mode 7, teletext, is cells() and
// drawTeletext(), its letters in the page's own font.
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
  // A listing the build embedded in the page (kit/scripts/build.py, embed_listings): the pieces of
  // it the page names, in <script type="application/json" data-listing="url">. Before the build
  // fills it in the tag holds only the list of pieces, and the listing is fetched instead.
  function embedded(url) {
    if (typeof document === 'undefined') return null;
    for (const s of document.querySelectorAll('script[type="application/json"][data-listing]'))
      if (s.getAttribute('data-listing') === url) { const L = JSON.parse(s.textContent); return Array.isArray(L) ? null : L; }
    return null;
  }
  // Rebuild a 64 KB image from listing.json records. Bytes the game does not use stay 0 and has[a] is false.
  async function load(url) {
    url = url || 'listing.json';
    if (!listings.has(url)) {
      const E = embedded(url);
      listings.set(url, E ? Promise.resolve(E) : fetch(url).then(r => r.json()).catch(e => { listings.delete(url); throw e; }));
    }
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

  // Mode 7, teletext. The SAA5050 draws each row of 40 bytes itself, from the seven bits it
  // reads: 0-31 (128-159 as the MOS stores them; bbc-reference, "Mode 7") are control codes,
  // shown as a space or as the held mosaic, and the rest are characters, or in graphics mode
  // mosaics of six blocks (bytes with bit 5 set; the capitals and &5B-&5F stay characters).
  // cells() works out what each cell shows, as jsbeeb's src/teletext.js does: a colour,
  // graphics, flash or double-height code acts from the next cell on ("set after"), and
  // steady, conceal, the two backgrounds and hold from its own ("set at"). A code with hold on
  // shows the last mosaic, in the colour before the code. A row with double height is drawn as
  // the top halves of those cells, and the row under it as the bottom halves of its own
  // double-height cells, its other cells blank. Every row starts white text on black.
  // Each cell: { code: the byte, ch: the seven bits shown (32 for a space), mosaic: six blocks,
  // sep: separated blocks, fg and bg: colours 0-7, flash, conceal, half: 0, or 1 and 2 for the
  // top and bottom of double height, blank: the cell shows only its background }.
  function cells(bytes, rows = 25) {
    const out = [];
    let second = false;
    for (let y = 0; y < rows; y++) {
      let col = 7, bg = 0, gfx = false, sep = false, hold = false, flash = false, conceal = false, dbl = false;
      let next = { mosaic: false, sep: false }, held = 32, heldSep = false, anyDbl = false;
      const row = [];
      for (let x = 0; x < 40; x++) {
        const code = bytes[y * 40 + x] | 0;
        let d = code & 0x7F;
        const prevCol = col, oldDbl = dbl, wasGfx = gfx, wasHold = hold, cur = next;
        let cellFlash = flash, cellConceal = conceal, mosaic = cur.mosaic, cs = cur.sep;
        if (d < 32) {
          if (d >= 1 && d <= 7) { gfx = false; col = d; conceal = false; }
          else if (d >= 17 && d <= 23) { gfx = true; col = d & 7; conceal = false; }
          else if (d === 8) flash = true;
          else if (d === 9) flash = false;
          else if (d === 12 || d === 13) { dbl = d === 13; if (dbl) anyDbl = true; }
          else if (d === 24) conceal = true;
          else if (d === 25) sep = false;
          else if (d === 26) sep = true;
          else if (d === 28) bg = 0;
          else if (d === 29) bg = col;
          else if (d === 30) hold = true;
          else if (d === 31) hold = false;
          if ((d >= 1 && d <= 7) || (d >= 17 && d <= 23) || d === 25 || d === 26) next = { mosaic: gfx, sep: gfx && sep };
          if (wasGfx && (wasHold || hold) && dbl === oldDbl) { d = held; mosaic = held !== 32; cs = heldSep; }
          else { held = 32; d = 32; mosaic = false; }
        } else if (gfx) {
          if (d & 0x20) { held = d; heldSep = cur.sep; }
        } else held = 32;
        if (cellFlash && !flash) cellFlash = false;
        if (conceal) cellConceal = true;
        row.push({ code, ch: d, mosaic: mosaic && !!(d & 0x20), sep: cs, fg: prevCol, bg, flash: cellFlash,
                   conceal: cellConceal, half: oldDbl ? (second ? 2 : 1) : 0, blank: second && !dbl });
      }
      out.push(row);
      second = second ? false : anyDbl;
    }
    return out;
  }

  // The 1,000 bytes a mode 7 screen shows, in order, from a memory image: the CRTC's start (R12
  // and R13) picks the first, and the display wraps within the 1K at &7C00 (bbc-reference,
  // "Mode 7"), as it does once the MOS has scrolled the screen.
  function screen7(ram, r12 = 0x28, r13 = 0) {
    const start = ((r12 << 8) | r13) & 0x3FF, out = new Uint8Array(1000);
    for (let i = 0; i < 1000; i++) out[i] = ram[0x7C00 + ((start + i) & 0x3FF)];
    return out;
  }

  // The six blocks of a mosaic, top left, top right, middle left, middle right, bottom left,
  // bottom right: bits 0, 1, 2, 3, 4 and 6 of its byte.
  const sixels = ch => [0, 1, 2, 3, 4, 6].map(b => !!(ch & (1 << b)));

  // The characters the SAA5050 shows in place of ASCII (jsbeeb, src/teletext_data.js).
  const TT_CHARS = { 0x23: '£', 0x5B: '←', 0x5C: '½', 0x5D: '→', 0x5E: '↑', 0x5F: '#', 0x60: '—',
                     0x7B: '¼', 0x7C: '‖', 0x7D: '¾', 0x7E: '÷', 0x7F: '■' };
  const ttChar = ch => TT_CHARS[ch] || String.fromCharCode(ch);

  // A mode 7 screen into a canvas, 16 by 20 pixels a cell at s = 1 (640 by 500). Mosaics are
  // drawn exactly; the letters are the page's font (opts.font, a monospace one by default), as
  // the SAA5050's own character shapes are in its ROM. phase 1 is the moment flashing cells are
  // hidden; reveal shows concealed ones. Returns the cells, for overlays.
  function drawTeletext(canvas, bytes, opts = {}) {
    const s = opts.s || 1, rows = opts.rows || 25, W = 16 * s, H = 20 * s;
    const grid = cells(bytes, rows);
    canvas.width = 40 * W; canvas.height = rows * H;
    const ctx = canvas.getContext('2d');
    const font = opts.font || '"Courier New", Courier, monospace';
    for (let y = 0; y < rows; y++) for (let x = 0; x < 40; x++) {
      const c = grid[y][x], X = x * W, Y = y * H;
      ctx.fillStyle = PAL[c.bg]; ctx.fillRect(X, Y, W, H);
      if (c.blank || (c.conceal && !opts.reveal) || (c.flash && opts.phase) || c.ch === 32) continue;
      ctx.save();
      ctx.beginPath(); ctx.rect(X, Y, W, H); ctx.clip();
      ctx.translate(X, Y);
      if (c.half) { ctx.translate(0, c.half === 2 ? -H : 0); ctx.scale(1, 2); }
      ctx.fillStyle = PAL[c.fg];
      if (c.mosaic) {
        const dx = W / 6, dy = H / 10, b = sixels(c.ch), sp = c.sep ? 1 : 0;
        const cols = [[0, 3], [3, 3]], bands = [[0, 3], [3, 4], [7, 3]];
        for (let i = 0; i < 6; i++) if (b[i]) {
          const [cx, cw] = cols[i & 1], [ry, rh] = bands[i >> 1];
          ctx.fillRect((cx + sp) * dx, ry * dy, (cw - sp) * dx, (rh - sp) * dy);
        }
      } else {
        ctx.font = `bold ${Math.round(17 * s)}px ${font}`;
        ctx.textBaseline = 'top';
        const t = ttChar(c.ch), w = ctx.measureText('M').width || W;
        ctx.scale(Math.min(1, (W - 2 * s) / w), 1);
        ctx.fillText(t, s, 2 * s);
      }
      ctx.restore();
    }
    return grid;
  }

  const hex = (n, w = 4) => '$' + n.toString(16).toUpperCase().padStart(w, '0');
  return { PAL, MODES, DEFAULT, load, pixels, addr, render, drawScreen, screen7, cells, sixels, ttChar, drawTeletext, hex };
})();

// The BBC Micro's names for the footprint categories; the drawing is makeMemMap in memmap.js.
if (globalThis.makeMemMap) {
  globalThis.BBCMap = globalThis.makeMemMap({
    code: 'code', graphics: 'graphics', levels: 'level data', sound: 'sound', text: 'text', tables: 'tables',
    variables: 'variables', runtime: 'screen, stack and the MOS’s workspace', rom: 'paged ROM (BASIC or a filing system)',
    unused: 'unused' });
}
