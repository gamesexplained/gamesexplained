// The Apple II on a page: its graphics drawn from memory, as the kit draws them
// (kit/apple2/screen.py, which kit/apple2/test_frame.py holds this file to, pixel for pixel), and
// Apple2Map (the same footprint widget as C64Map, with the Apple II's legend words).
//
//   Apple2.render(main, aux, sw, mode) -> {width: 560, height: 384, data}   RGBA, 4 bytes a pixel
//   Apple2.draw(canvas, main, aux, sw, mode)                                  the same, onto a canvas
//   Apple2.textBase(row), Apple2.hiresBase(y)                                 page 1's row addresses
//   Apple2.text(main, aux, sw) -> 24 rows of {ch, inverse} cells             the text page, as text
//   Apple2.load(url) -> {ram, has, names, byName, listing, bytes(a, n), sym(label)}   listing.json
//   Apple2.monitor                                                            hooks for the ROM's routines
//
// main and aux are the two 64Ks as arrays of bytes (aux may be null when the game never uses it);
// sw holds the switches by the kit server's names (text, mixed, page2, hires, 80col, 80store,
// dhires), as `chips()["switches"]` gives them; mode forces "lores", "hires" or "dhires". The
// picture is 560 x 384, each hi-res dot two by two, the colours the kit's approximation of NTSC
// colour (kit/apple2/screen.py says which). Text is not drawn: the page shows a game's text as
// text, and the four text rows of mixed mode stay black.
// Apple2.text gives that text: each cell's letter as kit/apple2/screen.py's text_lines gives it, and
// whether the IIe shows it in inverse (flashing counts as inverse, as screen.py draws it), so a page
// can set the screen in its own font. kit/apple2/test_text.py holds the two to each other.
// Apple2.load rebuilds the game image from listing.json, as C64.load and BBC.load do.
// Apple2.monitor stands in for the Monitor ROM's routines that games call, which the kit holds no copy
// of, as hooks for the kit's 6502 (kit/cpu/cpu6502.js, `hooks`): new C64Cpu.CPU(m, ...) and then
// cpu.run({ ..., hooks: { ...Apple2.monitor } }). Each does what the routine does to the registers and
// takes its cycles (kit/skills/apple2/apple2-reference, "Timing"), so a sound the game makes with it
// clicks when the game's does; kit/apple2/test_monitor_hooks.js holds them to the timings measured
// there. WAIT ($FCA8): (26 + 27A + 5A^2) / 2 cycles from the JSR to the instruction after it, A
// left 0, carry set. A = 0, which waits 256 rounds, stops the run, since its measured time is not
// what the formula gives.
globalThis.Apple2 = (function () {
  const W = 560, H = 384;
  const COLOURS = [[0, 0, 0], [227, 30, 96], [96, 78, 189], [255, 68, 253], [0, 163, 96], [156, 156, 156],
                   [20, 207, 253], [208, 195, 255], [96, 114, 3], [255, 106, 60], [156, 156, 156], [255, 160, 208],
                   [20, 245, 60], [208, 221, 141], [114, 255, 208], [255, 255, 255]];
  const BLACK = COLOURS[0], WHITE = COLOURS[15];
  const VIOLET = COLOURS[3], GREEN = COLOURS[12], BLUE = COLOURS[6], ORANGE = COLOURS[9];

  const textBase = row => 0x400 + 0x80 * (row % 8) + 0x28 * Math.floor(row / 8);
  const hiresBase = y => 0x2000 + 0x400 * (y % 8) + 0x80 * (Math.floor(y / 8) % 8) + 0x28 * Math.floor(y / 64);
  // page 2 shows when PAGE2 is on, unless 80STORE makes PAGE2 pick aux memory instead
  const page = sw => (sw.page2 && !sw['80store'] ? 2 : 1);
  const modeOf = sw => (sw.text ? 'text' : sw.hires ? (sw['80col'] && sw.dhires ? 'dhires' : 'hires') : 'lores');
  const hue = (x, high) => (high ? (x % 2 === 0 ? BLUE : ORANGE) : (x % 2 === 0 ? VIOLET : GREEN));

  function render(main, aux, sw, mode) {
    sw = sw || {};
    aux = aux || new Uint8Array(0x10000);
    mode = mode || modeOf(sw);
    const data = new Uint8ClampedArray(W * H * 4);
    for (let i = 3; i < data.length; i += 4) data[i] = 255;
    const put = (x, y, c) => { const i = (y * W + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; };
    const rows = mode === 'text' ? 0 : (sw.mixed ? 20 : 24);
    if (mode === 'lores') {
      const off = 0x400 * (page(sw) - 1), dbl = !!(sw['80col'] && sw.dhires);
      for (let row = 0; row < rows; row++) {
        const a = textBase(row) + off;
        for (let c = 0; c < 40; c++) for (let half = 0; half < 2; half++) {
          const y0 = row * 16 + half * 8;
          if (dbl) {                                   // double lo-res: monochrome, as double hi-res
            [aux, main].forEach((mem, k) => {
              const colour = (mem[a + c] >> (4 * half)) & 15 ? WHITE : BLACK;
              for (let y = y0; y < y0 + 8; y++) for (let x = c * 14 + k * 7; x < c * 14 + k * 7 + 7; x++) put(x, y, colour);
            });
            continue;
          }
          const colour = COLOURS[(main[a + c] >> (4 * half)) & 15];
          for (let y = y0; y < y0 + 8; y++) for (let x = c * 14; x < c * 14 + 14; x++) put(x, y, colour);
        }
      }
    } else if (mode === 'hires' || mode === 'dhires') {
      const off = 0x2000 * (page(sw) - 1), dbl = !!(sw['80col'] && sw.dhires);
      for (let yy = 0; yy < rows * 8; yy++) {
        const a = hiresBase(yy) + off;
        if (dbl) {
          let x = 0;
          for (let c = 0; c < 40; c++) for (const mem of [aux, main]) {
            const b = mem[a + c];
            for (let k = 0; k < 7; k++, x++) { const colour = (b >> k) & 1 ? WHITE : BLACK; put(x, 2 * yy, colour); put(x, 2 * yy + 1, colour); }
          }
          continue;
        }
        const dots = new Uint8Array(280), high = new Uint8Array(280);
        for (let c = 0; c < 40; c++) {
          const b = main[a + c];
          for (let k = 0; k < 7; k++) { dots[c * 7 + k] = (b >> k) & 1; high[c * 7 + k] = b >> 7; }
        }
        for (let x = 0; x < 280; x++) {
          const left = x ? dots[x - 1] : 0, right = x < 279 ? dots[x + 1] : 0;
          let colour;
          if (dots[x]) colour = left || right ? WHITE : hue(x, high[x]);
          else if (left && right) colour = hue(x - 1, high[x - 1]);
          else colour = BLACK;
          for (const dx of [0, 1]) { put(2 * x + dx, 2 * yy, colour); put(2 * x + dx, 2 * yy + 1, colour); }
        }
      }
    }
    return { width: W, height: H, data };
  }

  function draw(canvas, main, aux, sw, mode) {
    const r = render(main, aux, sw, mode);
    canvas.width = r.width; canvas.height = r.height;
    canvas.getContext('2d').putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
    return r;
  }

  // A byte on the text page as the IIe's video ROM shows it: $00-$3F inverse, $40-$7F flashing (with
  // the alternate set, $40-$5F MouseText, shown as a space, and $60-$7F inverse lower case), $80-$FF
  // normal; $00-$1F and $80-$9F show the capitals again, and $7F and $FF a space.
  function cell(b, altchar) {
    if (altchar && b >= 0x40 && b < 0x60) return { ch: ' ', inverse: false };
    let c = b & 0x7F;
    if (b < 0x80 && !(altchar && b >= 0x60)) c = b & 0x3F;
    if (c < 0x20) c += 0x40;
    return { ch: c === 0x7F ? ' ' : String.fromCharCode(c), inverse: b < 0x80 };
  }
  function text(main, aux, sw) {
    sw = sw || {};
    const off = 0x400 * (page(sw) - 1), rows = [];
    for (let row = 0; row < 24; row++) {
      const a = textBase(row) + off, cells = [];
      for (let c = 0; c < 40; c++) {
        if (sw['80col'] && aux) cells.push(cell(aux[a + c], sw.altchar));
        cells.push(cell(main[a + c], sw.altchar));
      }
      rows.push(cells);
    }
    return rows;
  }

  // Listings fetched so far, by URL, as C64.load keeps them; and one the build embedded in the page
  // for a game whose listing the site withholds (kit/scripts/build.py, embed_listings), as BBC.load
  // reads it.
  const listings = new Map();
  function embedded(url) {
    if (typeof document === 'undefined') return null;
    for (const s of document.querySelectorAll('script[type="application/json"][data-listing]'))
      if (s.getAttribute('data-listing') === url) { const L = JSON.parse(s.textContent); return Array.isArray(L) ? null : L; }
    return null;
  }
  function fetched(url) {
    return fetch(url).then(r => { if (r.ok === false) throw new Error(url + ': ' + r.status); return r.json(); });
  }
  const READS = typeof document !== 'undefined' && document.currentScript && /[?&]listing-reads(?:[=&]|$)/.test(location.search)
    ? new URL('listing-reads.js', document.currentScript.src).href : null;
  let reads;
  function watched(url, got) {
    if (!READS || !embedded(url)) return got;
    reads = reads || (globalThis.ListingReads ? Promise.resolve() : new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = READS; s.onload = ok; s.onerror = no; document.head.appendChild(s); }));
    return reads.then(() => ListingReads.watch(url, got));
  }
  // Rebuild a 64 KB image from listing.json records. Bytes the game does not use stay 0 and has[a] is 0.
  async function load(url) {
    url = url || 'listing.json';
    if (!listings.has(url))
      listings.set(url, (embedded(url) ? Promise.resolve(embedded(url)) : fetched(url)).catch(e => { listings.delete(url); throw e; }));
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
  const monitor = Object.freeze({
    0xFCA8(cpu) {                              // WAIT: the JSR's 6 cycles are already counted
      const a = cpu.a;
      if (a === 0) throw new Error('Apple2.monitor: WAIT with A = 0 is not modelled (from ' + hex(cpu.pc) + ')');
      cpu.cycles += (26 + 27 * a + 5 * a * a) / 2 - 6;
      cpu.a = 0; cpu.z = 1; cpu.n = 0; cpu.c = 1;
      cpu.rts();
    },
  });
  return { W, H, COLOURS, textBase, hiresBase, modeOf, render, draw, text, load, hex, monitor };
})();

// The Apple II's names for the footprint categories; the drawing is makeMemMap in memmap.js.
if (globalThis.makeMemMap) {
  globalThis.Apple2Map = globalThis.makeMemMap({
    code: 'code', graphics: 'graphics', levels: 'level data', sound: 'sound', text: 'text', tables: 'tables',
    variables: 'variables', runtime: 'screen, stack and working memory',
    rom: 'I/O, the cards’ ROM, and the Monitor’s ROM or the language card', unused: 'unused' });
}
