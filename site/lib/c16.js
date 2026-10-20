// The Commodore 16 and Plus/4 on a page: TED's screen drawn from memory, and C16Map (the same
// footprint widget as C64Map, with the TED machines' legend words). No dependencies. Exposes C16
// (window.C16 on a page; globalThis.C16 in node, where kit/c16/frame.py tests it).
//
//   C16.render(mem, ted, opts) -> {w: 320, h: 200, px}   px: a TED colour byte for each pixel
//   C16.renderBands(bands, opts) -> the same, for a frame whose memory or registers change down it
//   C16.rgba(picture)          -> Uint8ClampedArray, 4 bytes a pixel, for an ImageData
//   C16.draw(canvas, mem, ted, opts)                    the same, onto a canvas, opts.s times
//   C16.rgb(colour) -> [r, g, b];  C16.css(colour) -> '#rrggbb'
//   C16.load(url) -> {ram, has, names, byName, listing, bytes(a, n), sym(label)}   listing.json, as
//                                     C64.load reads it: the 64 KB the listing records, the rest 0
//
// mem is the RAM as the program addresses it: 16 KB on a C16, 64 KB on a Plus/4, or a 64 KB image
// rebuilt from listing.json. RAM repeats through the 64 KB on a machine with less of it, so an
// address is taken modulo opts.size (default mem.length; give 0x4000 for a C16 game drawn from a
// 64 KB image whose character set is at $D000 in RAM, which the C16 reads at $1000). ted is TED's
// 32 registers, $FF00-$FF1F, as numbers, the values the game wrote (reading some back sets bits
// that are not stored: kit/skills/c16/c16-reference, "TED"). The picture is the display window,
// 320 by 200, as TED shows it, its scroll and its narrower windows included.
//
// What TED draws, from its registers (kit/skills/c16/c16-reference, "TED"):
//   $FF06 bit 6 extended colour, bit 5 bitmap, bit 4 the display on (off: border only), bit 3
//   25 rows (off: 24, the border four lines deeper at the top and the bottom), bits 2-0 the
//   vertical scroll (3 puts the first row at the window's top);
//   $FF07 bit 7 256 characters and no reverse, bit 4 multicolour, bit 3 40 columns (off: 38, the
//   border eight pixels wider at each side), bits 2-0 the horizontal scroll;
//   $FF12 bits 5-3 the bitmap's 8 KB, bit 2 characters and bitmaps from ROM;
//   $FF13 bits 7-2 the character set (1 KB steps with 128 characters, 2 KB with 256 or extended colour);
//   $FF14 bits 7-3 the screen, 2 KB: 1 KB of attributes (colour, luminance, flash) then 1 KB of
//   characters; $FF0C-$FF0D the hardware cursor's place; $FF15-$FF18 the background colours, $FF19
//   the border. A bitmap's two colours for each 8 by 8 cell come from the screen: the character's
//   low four bits and the attribute's bits 6-4 for a 0, its high four and bits 2-0 for a 1.
// A colour is a byte, luminance (bits 6-4) times 16 plus colour (bits 3-0); bit 7 is ignored.
// TED's flash and its cursor share one counter: opts.flash 1 (the default) is the moment that
// flashing characters show and the cursor's cell is reversed, 0 the other half. With bit 2 of
// $FF12 set, characters and bitmaps at $8000 and above come from opts.rom, the 32 KB TED reads
// there (the kit's frame.py passes the machine's; a page never carries a ROM,
// kit/skills/core/70-minisite), and none is drawn without it. Below $8000 with that bit set TED
// reads no memory at all, and plus4emu shows whatever the data bus last held, which memory does
// not say: c16.js draws nothing there. The screen itself (attributes and characters) is always
// drawn from the RAM: TED reads it from the ROM when the ROMs are paged in for the processor and
// the screen is at $8000 or above, which no game shows on purpose. Modes that set extended colour
// with bitmap or multicolour show black, as TED does.
//
// The scroll: a vertical scroll below 3 brings in a 26th row, from the 40 places after the
// 1,000th (the screen's spare bytes, then its first 16 again), as plus4emu draws it. What fills
// the pixels a scroll leaves at the left of each line, or above the first row in 25 rows, is
// what TED last held, which memory does not say: plus4emu shows the background colour on most
// lines and a cell's colour on others, and at a vertical scroll of 4 to 6 the last row's cells.
// They are drawn in the background colour. A game that scrolls hides them with the 38-column
// and 24-row window, inside which every pixel is exact (kit/c16/frame.py measures all of it).
globalThis.C16 = (function () {
  // plus4emu's colours (Plus4_ColorToRGB, src/display.cpp), by luminance 0 to 7, colours 0 to 15.
  // Colour 0 is black at every luminance. Measured from the library on 19 October 2026.
  const ROWS = [
    '080808 2c2c2c 621516 004342 580a67 004e00 1f1f8c 383800 562200 492d00 1d4500 630d38 004923 0a2d7a 2f178e 0e4b00',
    '080808 3b3b3b 712425 055251 671976 0b5d0a 2e2f9b 474700 653200 583c00 2d5500 721d47 045932 1a3d89 3e269d 1d5a00',
    '080808 434343 792c2d 0d5a59 6f217f 136512 3737a3 505000 6e3a04 614500 355d00 7a254f 0c613b 224592 462fa6 256300',
    '080808 545454 8a3d3e 1e6b6a 80328f 247623 4848b4 606000 7e4b15 715501 466e00 8b3660 1d724b 3356a3 573fb6 367301',
    '080808 7a7a7a b06364 449190 a658b5 4a9c49 6d6eda 86861a a4713b 977b26 6c941b b15c86 439871 597cc9 7d65dc 5c9927',
    '080808 9c9c9c d18485 66b3b2 c87ad7 6cbd6a 8f8ffb a8a83c c6925c b99d48 8db53c d27da8 64b993 7a9dea 9e87fe 7dbb49',
    '080808 b9b9b9 efa2a3 83d0cf e597f4 89db88 adadff c5c559 e3b07a d6ba65 abd35a f09bc5 82d7b0 98bbff bca4ff 9bd866',
    '080808 f4f4f4 ffddde beffff ffd2ff c4ffc3 e7e7ff ffff94 ffebb4 fff5a0 e5ff95 ffd6ff bdffeb d3f5ff f7dfff d6ffa1'];
  const PALETTE = ROWS.flatMap(r => r.split(' ').map(h => [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16))));
  const rgb = c => PALETTE[c & 0x7F];
  const css = c => '#' + rgb(c).map(v => v.toString(16).padStart(2, '0')).join('');

  // The display window: TED's cells, each 8 by 8 pixels, in its colour bytes, moved by the scroll
  // and framed by the border when the window is 38 columns or 24 rows.
  function render(mem, ted, opts = {}) {
    const W = 320, H = 200, px = new Uint8Array(W * H);
    const reg = i => ted[i] | 0;
    const size = opts.size || mem.length, ramAt = a => mem[a & (size - 1)];
    const c1 = reg(0x06), c2 = reg(0x07), border = reg(0x19);
    if (!(c1 & 0x10)) return { w: W, h: H, px: px.fill(border) };          // display off: the border
    const cells = drawCells(ramAt, reg, opts);
    const xs = c2 & 7, ys = c1 & 7, narrow = !(c2 & 0x08), short = !(c1 & 0x08), back = reg(0x15);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sx = x - xs, sy = y - ys + 3;
      px[y * W + x] = (narrow && (x < 8 || x >= 312)) || (short && (y < 4 || y >= 196)) ? border
        : sx < 0 || sy < 0 ? back : cells[sy * W + sx];
    }
    return { w: W, h: H, px };
  }

  // 26 rows of cells, 320 by 208: the 1,000 places of the screen and the 40 after them; only
  // rows from to to - 1 when they are given (renderBands), into px when it is given.
  function drawCells(ramAt, reg, opts, from = 0, to = 26, px = new Uint8Array(320 * 208)) {
    const W = 320;
    const c1 = reg(0x06), c2 = reg(0x07);
    const mode = (c2 & 0x10 ? 1 : 0) | (c1 & 0x20 ? 2 : 0) | (c1 & 0x40 ? 4 : 0) | (c2 & 0x80 ? 8 : 0);
    const bitmap = mode & 2, ecm = mode & 4, multi = mode & 1;
    if (ecm && (bitmap || multi)) return px;                                  // no such mode: black
    const screen = (reg(0x14) & 0xF8) << 8;
    const chars = (reg(0x13) & (mode & 0x0C ? 0xF8 : 0xFC)) << 8;
    const mask = ecm ? 0x3F : mode & 8 ? 0xFF : 0x7F;
    const base = (reg(0x12) & 0x38) << 10, fromRom = reg(0x12) & 0x04, rom = opts.rom;
    const fetch = a => fromRom ? (a >= 0x8000 && rom ? rom[a - 0x8000] : 0) : ramAt(a);
    const bg = [0x15, 0x16, 0x17, 0x18].map(reg);
    const cursor = (reg(0x0C) & 3) << 8 | reg(0x0D), lit = opts.flash === 0 ? 0 : 1;
    for (let n = Math.max(0, from) * 40, end = Math.min(26, to) * 40; n < end; n++) {
      const p = n & 0x3FF, a = ramAt(screen + p), c = ramAt(screen + 0x400 + p);
      const x0 = (n % 40) * 8, y0 = Math.floor(n / 40) * 8;
      for (let line = 0; line < 8; line++) {
        let b = bitmap ? fetch((base | p << 3 | line) & 0xFFFF) : fetch(chars | (c & mask) << 3 | line);
        const out = (y0 + line) * W + x0;
        if (bitmap) {
          const zero = (a & 0x70) | (c & 0x0F), one = (a & 0x07) << 4 | c >> 4;
          if (multi) {
            const four = [bg[0], one, zero, bg[1]];
            for (let i = 0; i < 4; i++) px[out + 2 * i] = px[out + 2 * i + 1] = four[(b >> (6 - 2 * i)) & 3];
          } else for (let i = 0; i < 8; i++) px[out + i] = (b >> (7 - i)) & 1 ? one : zero;
        } else if (multi && a & 0x08) {
          const four = [bg[0], bg[1], bg[2], a & 0x77];
          for (let i = 0; i < 4; i++) px[out + 2 * i] = px[out + 2 * i + 1] = four[(b >> (6 - 2 * i)) & 3];
        } else {
          const back = ecm ? bg[c >> 6] : bg[0];
          if (!multi && !ecm) {        // flash, reverse and the cursor are the plain text mode's alone
            const here = p === cursor;
            if (a & 0x80 && !here && !lit) b = 0;
            if (c & 0x80 && !(mode & 8)) b ^= 0xFF;
            if (here && lit) b ^= 0xFF;
          }
          for (let i = 0; i < 8; i++) px[out + i] = (b >> (7 - i)) & 1 ? a : back;
        }
      }
    }
    return px;
  }

  // A frame whose memory or registers change as the beam goes down it (a Play tab's, from the
  // port's clock), in bands of the picture's lines, each drawn as render() draws a whole frame
  // from its own memory and registers: bands [{ y0, y1, mem, ted }], lines y0 to y1 of the 200,
  // in order and covering them all. The display is on or off for the whole frame by the first
  // band's $FF06, as TED looks at it once a frame. opts as render's, and opts.px a picture's px to
  // draw into.
  const bandCells = new Uint8Array(320 * 208);
  function renderBands(bands, opts = {}) {
    const W = 320, H = 200, px = opts.px || new Uint8Array(W * H);
    const first = bands[0].ted;
    if (!((first[0x06] | 0) & 0x10)) return { w: W, h: H, px: px.fill(first[0x19] | 0) };
    for (const b of bands) {
      const mem = b.mem, size = opts.size || mem.length, ramAt = a => mem[a & (size - 1)];
      const reg = i => b.ted[i] | 0;
      const c1 = reg(0x06), c2 = reg(0x07), border = reg(0x19);
      const xs = c2 & 7, ys = c1 & 7, narrow = !(c2 & 0x08), short = !(c1 & 0x08), back = reg(0x15);
      const cells = drawCells(ramAt, reg, opts, (b.y0 - ys + 3) >> 3, ((b.y1 - ys + 3) >> 3) + 1, bandCells);
      for (let y = b.y0; y <= b.y1; y++) for (let x = 0; x < W; x++) {
        const sx = x - xs, sy = y - ys + 3;
        px[y * W + x] = (narrow && (x < 8 || x >= 312)) || (short && (y < 4 || y >= 196)) ? border
          : sx < 0 || sy < 0 ? back : cells[sy * W + sx];
      }
    }
    return { w: W, h: H, px };
  }

  function rgba(pic) {
    const out = new Uint8ClampedArray(pic.w * pic.h * 4);
    for (let i = 0; i < pic.px.length; i++) {
      const [r, g, b] = rgb(pic.px[i]);
      out[4 * i] = r; out[4 * i + 1] = g; out[4 * i + 2] = b; out[4 * i + 3] = 255;
    }
    return out;
  }

  // The picture onto a canvas, each pixel s by s (s = 1 by default); TED's pixels are close to
  // square on a PAL television.
  function draw(canvas, mem, ted, opts = {}) {
    const pic = render(mem, ted, opts), s = opts.s || 1;
    canvas.width = pic.w * s; canvas.height = pic.h * s;
    canvas.style.imageRendering = 'pixelated';
    const ctx = canvas.getContext('2d');
    const img = new ImageData(rgba(pic), pic.w, pic.h);
    if (s === 1) ctx.putImageData(img, 0, 0);
    else {
      const tmp = document.createElement('canvas');
      tmp.width = pic.w; tmp.height = pic.h; tmp.getContext('2d').putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, pic.w * s, pic.h * s);
    }
    return pic;
  }

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

  const hex = (n, w = 4) => '$' + n.toString(16).toUpperCase().padStart(w, '0');

  // --- TED's timing: where the processor gets its cycles --------------------------------------
  // A PAL frame is 312 lines of 114 ticks of the double clock (1,773,447 a second). Tick 0 of a
  // line is where TED steps its line count, plus4emu's column 98. The processor's cycle takes one
  // tick at the double clock and two at the single clock, which starts on an even tick, and none
  // while TED holds it to fetch the screen. Measured on plus4emu (939e652), 19 October 2026
  // (kit/c16/fixtures/ted-timing.json):
  //   a line outside the display (the border, or any line of a frame with the display off): the
  //     single clock at ticks 92-101 (TED's refresh), 109 cycles;
  //   a line of the display, 0 to 203 in a frame that began with $FF06's bit 4 set: the single
  //     clock at ticks 4-101, 65 cycles;
  //   a bad line, the line of the display whose low three bits are $FF06's vertical scroll (up to
  //     202) and the line after it, where TED fetches the attributes and then the characters: the
  //     single clock from tick 4, a cycle at tick 4, then TED holds the processor until tick 92,
  //     22 cycles. A write goes on through the hold's first three cycles, ticks 6, 8 and 10, and
  //     the processor stops at its next read: a store that reaches tick 4 lets the next
  //     instruction start at 92 all the same (step, below).
  // TED looks at $FF06's bit 4 once a frame, as line 0 begins: a display turned on or off takes
  // effect at the next frame.
  const LINE = 114, LINES = 312, FRAME = LINE * LINES;
  const BORDER = 0, DISPLAY = 1, BAD = 2;
  // For each kind of line, from the ticks of its single clock and of TED's hold: the tick each
  // cycle starts on (start), its ticks (len), and for each tick the number of cycles that start
  // before it (before).
  const KINDS = [[92, 102, 0, 0], [4, 102, 0, 0], [4, 102, 6, 92]].map(([s0, s1, h0, h1]) => {
    const start = [], len = [];
    for (let t = 0; t < LINE;) {
      if (t >= h0 && t < h1) { t = h1; continue; }
      const single = t >= s0 && t < s1;
      start.push(t); len.push(single ? 2 : 1); t += single ? 2 : 1;
    }
    const before = new Uint8Array(LINE + 1);
    let k = 0;
    for (let t = 0; t <= LINE; t++) { while (k < start.length && start[k] < t) k++; before[t] = k; }
    return { start: Uint8Array.from(start), len: Uint8Array.from(len), before, cycles: start.length };
  });
  // The beam: which kind each line is, from the display and vertical scroll as the game left
  // them. kind(line) for a line of the frame now being drawn; frames after it are taken as
  // this one.
  class Beam {
    constructor(o = {}) {
      this.ff06 = o.ff06 === undefined ? 0x1B : o.ff06;   // as the KERNAL leaves it
      this.shown = o.shown === undefined ? (this.ff06 & 0x10) !== 0 : !!o.shown;   // this frame's display
    }
    kind(line) {
      line %= LINES;
      if (!this.shown || line > 203) return BORDER;
      const v = this.ff06 & 7;
      return ((line & 7) === v && line <= 202) || (((line - 1) & 7) === v && line >= 1 && line <= 203) ? BAD : DISPLAY;
    }
    // A frame begins: TED looks at the display bit.
    frame() { this.shown = (this.ff06 & 0x10) !== 0; }
    // The tick on which n cycles of the processor, the first at tick t or after, have ended.
    after(t, n) {
      let L = Math.floor(t / LINE), p = t - L * LINE;
      for (;;) {
        const K = KINDS[this.kind(L)], k = K.before[p], left = K.cycles - k;
        if (n <= left) { if (n <= 0) return t; const i = k + n - 1; return L * LINE + K.start[i] + K.len[i]; }
        n -= left; L++; p = 0; t = L * LINE;
      }
    }
    // The tick on which the processor's next cycle at tick t or after starts.
    next(t) {
      let L = Math.floor(t / LINE), p = t - L * LINE;
      for (;;) {
        const K = KINDS[this.kind(L)], k = K.before[p];
        if (k < K.cycles) return L * LINE + K.start[k];
        L++; p = 0;
      }
    }
    // The tick of the cycle after one at tick t, when that cycle is a write (write true) or a
    // read: on a bad line a write after the cycle at tick 4 goes on at 6, 8 and 10.
    step(t, write) {
      const p = t % LINE;
      if (write && (p === 4 || p === 6 || p === 8) && this.kind(Math.floor(t / LINE)) === BAD) return t + 2;
      return this.next(t + 1);
    }
    // The processor's cycles that start in ticks t to u - 1.
    cycles(t, u) {
      let n = 0, L = Math.floor(t / LINE), p = t - L * LINE;
      while (L * LINE < u) {
        const K = KINDS[this.kind(L)], end = Math.min(LINE, u - L * LINE);
        if (end > p) n += K.before[end] - K.before[p];
        L++; p = 0;
      }
      return n;
    }
  }
  const timing = { LINE, LINES, FRAME, BORDER, DISPLAY, BAD, KINDS, Beam };

  return { PALETTE, rgb, css, render, renderBands, rgba, draw, load, hex, timing };
})();

// The TED machines' names for the footprint categories; the drawing is makeMemMap in memmap.js.
if (globalThis.makeMemMap) {
  globalThis.C16Map = globalThis.makeMemMap({
    code: 'code', graphics: 'graphics', levels: 'level data', sound: 'sound', text: 'text', tables: 'tables',
    variables: 'variables', runtime: 'screen, stack and the KERNAL’s and BASIC’s work area',
    rom: 'ROM and I/O', unused: 'unused' });
}
