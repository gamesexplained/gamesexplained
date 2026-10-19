// The Apple II on a page: its graphics drawn from memory, as the kit draws them
// (kit/apple2/screen.py, which kit/apple2/test_frame.py holds this file to, pixel for pixel), and
// Apple2Map (the same footprint widget as C64Map, with the Apple II's legend words).
//
//   Apple2.render(main, aux, sw, mode) -> {width: 560, height: 384, data}   RGBA, 4 bytes a pixel
//   Apple2.draw(canvas, main, aux, sw, mode)                                  the same, onto a canvas
//   Apple2.textBase(row), Apple2.hiresBase(y)                                 page 1's row addresses
//
// main and aux are the two 64Ks as arrays of bytes (aux may be null when the game never uses it);
// sw holds the switches by the kit server's names (text, mixed, page2, hires, 80col, 80store,
// dhires), as `chips()["switches"]` gives them; mode forces "lores", "hires" or "dhires". The
// picture is 560 x 384, each hi-res dot two by two, the colours the kit's approximation of NTSC
// colour (kit/apple2/screen.py says which). Text is not drawn: the page shows a game's text as
// text, and the four text rows of mixed mode stay black.
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

  const hex = (n, w = 4) => '$' + n.toString(16).toUpperCase().padStart(w, '0');
  return { W, H, COLOURS, textBase, hiresBase, modeOf, render, draw, hex };
})();

// The Apple II's names for the footprint categories; the drawing is makeMemMap in memmap.js.
if (globalThis.makeMemMap) {
  globalThis.Apple2Map = globalThis.makeMemMap({
    code: 'code', graphics: 'graphics', levels: 'level data', sound: 'sound', text: 'text', tables: 'tables',
    variables: 'variables', runtime: 'screen, stack and working memory',
    rom: 'I/O, the cards’ ROM, and the Monitor’s ROM or the language card', unused: 'unused' });
}
