// Shared BBC Micro rendering helpers for game pages. No dependencies. Exposes BBC (window.BBC
// on a page; globalThis.BBC in node, where kit/bbc/frame.py tests render) for the screen of
// modes 0 to 6, and BBCMap (the same footprint widget as C64Map, with the BBC's legend words).
// Data comes from the game's listing.json via BBC.load(). Mode 7, teletext, is cells(),
// teletext() and drawTeletext(), in the SAA5050 teletext chip's own letters.
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
  // A listing the build embedded in the page (kit/scripts/build.py, embed_listings), for a game
  // whose listing the site withholds: the pieces of it the page names, in <script
  // type="application/json" data-listing="url">. Before the build fills it in the tag holds only
  // the list of pieces, and is passed over. Every other listing is fetched whole, one file the
  // browser caches for all of a game's tabs.
  function embedded(url) {
    if (typeof document === 'undefined') return null;
    for (const s of document.querySelectorAll('script[type="application/json"][data-listing]'))
      if (s.getAttribute('data-listing') === url) { const L = JSON.parse(s.textContent); return Array.isArray(L) ? null : L; }
    return null;
  }
  function fetched(url) {
    return fetch(url).then(r => { if (r.ok === false) throw new Error(url + ': ' + r.status); return r.json(); });
  }
  // A page of a withheld game opened with ?listing-reads in its address gets the whole listing
  // behind its pieces, with what it reads checked against them (listing-reads.js).
  const READS = typeof document !== 'undefined' && document.currentScript && /[?&]listing-reads(?:[=&]|$)/.test(location.search)
    ? new URL('listing-reads.js', document.currentScript.src).href : null;
  let reads;
  function watched(url, got) {
    if (!READS || !embedded(url)) return got;
    reads = reads || (globalThis.ListingReads ? Promise.resolve() : new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = READS; s.onload = ok; s.onerror = no; document.head.appendChild(s); }));
    return reads.then(() => ListingReads.watch(url, got));
  }
  // Text a widget writes into a canvas stays in the font it was drawn in. A listing in the page,
  // or one the browser has cached, is in hand before the page's fonts have loaded, so a listing
  // is handed over when they have, or after three seconds if they never do.
  function fontsIn() {
    if (typeof document === 'undefined' || !document.fonts || !document.body) return Promise.resolve();
    void document.body.offsetHeight;          // lays the page out, which asks for its fonts
    return Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]);
  }
  // Rebuild a 64 KB image from listing.json records. Bytes the game does not use stay 0 and has[a] is false.
  async function load(url) {
    url = url || 'listing.json';
    if (!listings.has(url))
      listings.set(url, Promise.all([embedded(url) || fetched(url), fontsIn()]).then(([L]) => L)
        .catch(e => { listings.delete(url); throw e; }));
    const L = await listings.get(url);
    const ram = new Uint8Array(0x10000), has = new Uint8Array(0x10000);
    for (const r of L.records) {
      if (!r.b) continue;
      for (let i = 0; i < r.b.length; i++) { ram[r.a + i] = r.b[i]; has[r.a + i] = 1; }
    }
    const names = new Map(L.records.filter(r => r.l).map(r => [r.a, r.l]));
    const byName = new Map(L.records.filter(r => r.l).map(r => [r.l, r.a]));
    return watched(url, { ram, has, names, byName, listing: L,
             bytes: (a, n) => ram.subarray(a, a + n),
             sym: n => { if (!byName.has(n)) throw new Error('no symbol ' + n); return byName.get(n); } });
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

  // The characters the SAA5050 shows in place of ASCII (jsbeeb, src/teletext_data.js), for a
  // page that writes a screen's text as text.
  const TT_CHARS = { 0x23: '£', 0x5B: '←', 0x5C: '½', 0x5D: '→', 0x5E: '↑', 0x5F: '#', 0x60: '—',
                     0x7B: '¼', 0x7C: '‖', 0x7D: '¾', 0x7E: '÷', 0x7F: '■' };
  const ttChar = ch => TT_CHARS[ch] || String.fromCharCode(ch);

  // The SAA5050's characters, &20 to &7F, as the English chip (the BBC Micro's) draws them: nine
  // rows of five dots, top first, each row one base-32 digit with bit 4 the left dot. The chip's
  // cell is six dots by ten rows and a character sits in its bottom right, so a blank column and
  // a blank row part it from its neighbours; g, j, p, q and y reach the bottom row. The shapes are
  // Bedstead's (bjh21.me.uk/bedstead, by Ben Harris and others, public domain), taken from
  // Mullard's datasheet of July 1982 and checked against a real chip. jsbeeb's j is a row shorter,
  // its hook on the row above; every other character is the same as jsbeeb's.
  const SAA5050 = (
    '000000000 444440400 aaa000000 698s88v00 elke5le00 op248j300 8kk8lid00 444000000 ' +   // &20
    '248884200 842224800 4le4el400 044v44000 000004480 000e00000 000000400 01248g000 ' +   // &28
    '4ahhha400 4c4444e00 eh168gv00 v1261he00 26aiv2200 vgu11he00 68guhhe00 v12488800 ' +   // &30
    'ehhehhe00 ehhf12c00 004000400 004004480 248g84200 00v0v0000 842124800 eh2440400 ' +   // &38
    'ehnlnge00 4ahhvhh00 uhhuhhu00 ehggghe00 uhhhhhu00 vgguggv00 vgguggg00 ehggjhf00 ' +   // &40
    'hhhvhhh00 e44444e00 11111he00 hikokih00 ggggggv00 hrllhhh00 hhpljhh00 ehhhhhe00 ' +   // &48
    'uhhuggg00 ehhhlid00 uhhukih00 ehge1he00 v44444400 hhhhhhe00 hhhaa4400 hhhllla00 ' +   // &50
    'hha4ahh00 hha444400 v1248gv00 048v84000 ggggm1247 042v24000 04el44000 aavavaa00 ' +   // &58
    '000v00000 00e1fhf00 gguhhhu00 00fgggf00 11fhhhf00 00ehvge00 244e44400 00fhhhf1e ' +   // &60
    'gguhhhh00 40c444e00 404444448 889aca900 c44444e00 00qllll00 00uhhhh00 00ehhhe00 ' +   // &68
    '00uhhhugg 00fhhhf11 00bc88800 00fge1u00 44e444200 00hhhhf00 00hhaa400 00hhlla00 ' +   // &70
    '00ha4ah00 00hhhhf1e 00v248v00 888893571 aaaaaaa00 o4o4p3571 040v04000 vvvvvvv00'      // &78
  ).split(' ');

  // A character's 20 lines as the chip draws them on an interlaced picture, each line 12
  // half-dots, bit 0 the left: a dot is two half-dots wide and two lines tall. `dots` is its ten
  // rows of six, bit x the dot x from the left. Character rounding fills the inside corner of a
  // diagonal with a half-dot: the upper line of a dot row takes one where the row above steps a
  // dot sideways from it, and the lower line where the row below does, which is how a letter's
  // diagonals come out smooth. Mosaics are not rounded. (jsbeeb, src/teletext.js, builds its
  // glyphs the same way.)
  function lines(dots, round) {
    const row = r => {
      let v = 0;
      if (r >= 0 && r < 10) for (let x = 0; x < 6; x++) if ((dots[r] >> x) & 1) v |= 3 << (2 * x);
      return v;
    };
    const out = new Uint16Array(20);
    for (let l = 0; l < 20; l++) {
      const a = row(l >> 1), b = row((l >> 1) + (l & 1 ? 1 : -1));
      out[l] = round ? a | ((a >> 1) & b & ~(b >> 1)) | ((a << 1) & b & ~(b << 1)) : a;
    }
    return out;
  }
  // The three sets, each 96 characters of 20 lines: letters, then contiguous and separated
  // mosaics. A mosaic's six blocks are dot columns 0-2 and 3-5 by dot rows 0-2, 3-6 and 7-9; a
  // separated block loses its left column and its bottom row. In a mosaic set the characters &40
  // to &5F are the letters.
  let GLYPHS = null;
  function glyphs() {
    if (GLYPHS) return GLYPHS;
    const letter = SAA5050.map(g => {
      const dots = [0];
      for (let r = 0; r < 9; r++) {
        const v = parseInt(g[r], 32);
        let d = 0;
        for (let x = 1; x < 6; x++) if ((v >> (5 - x)) & 1) d |= 1 << x;
        dots.push(d);
      }
      return lines(dots, true);
    });
    const mosaic = sep => letter.map((l, c) => {
      const ch = c + 32;
      if (!(ch & 0x20)) return l;
      const dots = new Array(10).fill(0), on = sixels(ch);
      [[0, 0, 3], [3, 0, 3], [0, 3, 4], [3, 3, 4], [0, 7, 3], [3, 7, 3]].forEach(([x0, y0, h], i) => {
        if (on[i]) for (let y = 0; y < h; y++) for (let x = 0; x < 3; x++)
          if (!(sep && (x === 0 || y === h - 1))) dots[y0 + y] |= 1 << (x0 + x);
      });
      return lines(dots, false);
    });
    return (GLYPHS = { letter, contiguous: mosaic(false), separated: mosaic(true) });
  }

  // The 12 half-dots of a line fill 16 pixels, so a pixel can hold parts of two: how much of
  // each, in quarters of a half-dot, three to the pixel. A pixel takes its share of the
  // foreground colour, mixed in light rather than in the numbers that code it, as a television
  // mixes it (and jsbeeb does).
  const COVER = Array.from({ length: 16 }, (_, i) => {
    const out = [];
    for (let j = 0; j < 12; j++) {
      const w = Math.min(3 * i + 3, 4 * j + 4) - Math.max(3 * i, 4 * j);
      if (w > 0) out.push(j, w);
    }
    return out;
  });
  const MIX = [];
  for (let bg = 0; bg < 8; bg++) for (let fg = 0; fg < 8; fg++) for (let w = 0; w < 4; w++)
    MIX.push([0, 1, 2].map(k => Math.round(Math.pow((((fg >> k) & 1) * w + ((bg >> k) & 1) * (3 - w)) / 3, 1 / 2.2) * 255)));

  // A mode 7 screen as pixels: { w: 640, h: 20 a row, rgba, grid }, each cell 16 pixels by 20
  // lines, which is 640 by 500 for 25 rows, the shape of the other modes' 640 by 512 on the same
  // television. Each line of a cell is a line of the chip's character, or under double height
  // one of the top or bottom half's lines drawn twice. phase 1 is the moment flashing cells are
  // hidden; reveal shows concealed ones. grid is cells()'s, for overlays. Needs no canvas, so
  // kit/bbc/frame.py holds it to jsbeeb under node.
  function teletext(bytes, opts = {}) {
    const rows = opts.rows || 25, grid = cells(bytes, rows), W = 640, H = rows * 20, G = glyphs();
    const rgba = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < rows; y++) for (let x = 0; x < 40; x++) {
      const c = grid[y][x];
      const shown = !(c.blank || (c.conceal && !opts.reveal) || (c.flash && opts.phase) || c.ch === 32);
      const g = shown ? (c.mosaic ? (c.sep ? G.separated : G.contiguous) : G.letter)[c.ch - 32] : null;
      const pal = (c.bg * 8 + c.fg) * 4;
      for (let l = 0; l < 20; l++) {
        const bits = g ? g[c.half ? (l >> 1) + (c.half === 2 ? 10 : 0) : l] : 0;
        let o = ((y * 20 + l) * W + x * 16) * 4;
        for (let i = 0; i < 16; i++, o += 4) {
          const cv = COVER[i];
          let w = 0;
          for (let k = 0; k < cv.length; k += 2) if ((bits >> cv[k]) & 1) w += cv[k + 1];
          const rgb = MIX[pal + w];
          rgba[o] = rgb[0]; rgba[o + 1] = rgb[1]; rgba[o + 2] = rgb[2]; rgba[o + 3] = 255;
        }
      }
    }
    return { w: W, h: H, rgba, grid };
  }

  // A mode 7 screen into a canvas: teletext()'s picture, each pixel s by s (640 by 500 at s = 1).
  // Returns the cells, for overlays.
  function drawTeletext(canvas, bytes, opts = {}) {
    const s = opts.s || 1, { w, h, rgba, grid } = teletext(bytes, opts);
    canvas.width = w * s; canvas.height = h * s;
    const ctx = canvas.getContext('2d'), img = new ImageData(rgba, w, h);
    if (s === 1) ctx.putImageData(img, 0, 0);
    else {
      const off = document.createElement('canvas');
      off.width = w; off.height = h; off.getContext('2d').putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, w * s, h * s);
    }
    return grid;
  }

  const hex = (n, w = 4) => '$' + n.toString(16).toUpperCase().padStart(w, '0');
  return { PAL, MODES, DEFAULT, load, pixels, addr, render, drawScreen, screen7, cells, sixels, ttChar, teletext, drawTeletext, hex };
})();

// The BBC Micro's names for the footprint categories; the drawing is makeMemMap in memmap.js.
if (globalThis.makeMemMap) {
  globalThis.BBCMap = globalThis.makeMemMap({
    code: 'code', graphics: 'graphics', levels: 'level data', sound: 'sound', text: 'text', tables: 'tables',
    variables: 'variables', runtime: 'screen, stack and the MOS’s workspace', rom: 'paged ROM (BASIC or a filing system)',
    unused: 'unused' });
}
