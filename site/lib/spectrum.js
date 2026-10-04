// Shared ZX Spectrum rendering helpers for game pages. No dependencies. Exposes Spectrum
// (window.Spectrum in a page, globalThis.Spectrum elsewhere) for the ULA screen, and
// SpectrumMap (the same footprint widget as C64Map, with the Spectrum's legend words).
// Data comes from the game's listing.json via Spectrum.load().
globalThis.Spectrum = (function () {
  // The ULA's 16 colours: 0-7 normal, 8-15 the same eight at bright.
  const PAL = ['#000000', '#0000d7', '#d70000', '#d700d7', '#00d700', '#00d7d7', '#d7d700', '#d7d7d7',
               '#000000', '#0000ff', '#ff0000', '#ff00ff', '#00ff00', '#00ffff', '#ffff00', '#ffffff'];
  const BITMAP = 0x4000, ATTRS = 0x5800;

  // Rebuild the 64 KB image from listing.json records; the $0000-$3FFF ROM is not the game and
  // stays zero. Bytes no record covers have has[a] false.
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

  // The address of the byte holding pixel (x, y): the bitmap is stored a third of the
  // screen at a time, so the top two bits of y and the low three bits are swapped around.
  function bitmapAddr(x, y) {
    return BITMAP + (((y & 0xc0) << 5) | ((y & 0x07) << 8) | ((y & 0x38) << 2)) + (x >> 3);
  }

  // One pixel, 0 or 1.
  function pixel(ram, x, y) {
    return (ram[bitmapAddr(x, y)] >> (7 - (x & 7))) & 1;
  }

  // The attribute for the 8x8 cell holding (x, y): ink, paper, bright and flash.
  function attr(ram, x, y) {
    const a = ram[ATTRS + ((y >> 3) << 5) + (x >> 3)];
    return { ink: a & 7, paper: (a >> 3) & 7, bright: (a >> 6) & 1, flash: a >> 7, raw: a };
  }

  // Which of the two colours a pixel shows, honouring flash: ink where the bit is set.
  function colour(ram, x, y, on, phase) {
    const a = attr(ram, x, y);
    const p = a.paper | (a.bright << 3), i = a.ink | (a.bright << 3);
    const flipped = a.flash && phase;
    return (on ^ flipped) ? i : p;
  }

  // The whole screen, border and all, into a canvas: 256x192 plus a border of `border` pixels.
  // `borderColour` 0-7, `phase` selects the flash state, `s` scales each pixel.
  function drawScreen(canvas, ram, { borderColour = 7, border = 16, phase = 0, s = 2 } = {}) {
    canvas.width = (256 + 2 * border) * s; canvas.height = (192 + 2 * border) * s;
    canvas.style.imageRendering = 'pixelated';
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = PAL[borderColour & 7]; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < 192; y++) for (let x = 0; x < 256; x++) {
      ctx.fillStyle = PAL[colour(ram, x, y, pixel(ram, x, y), phase)];
      ctx.fillRect((x + border) * s, (y + border) * s, s, s);
    }
    return canvas;
  }

  // A grid of the 96 ROM-font glyphs, when the page has them: eight bytes a glyph, MSB first.
  function drawCharset(canvas, font, { n = 96, per = 16, s = 2, ink = '#d7d7d7', bg = '#000000' } = {}) {
    canvas.width = per * 9 * s; canvas.height = Math.ceil(n / per) * 9 * s;
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = ink;
    for (let g = 0; g < n; g++) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++)
      if (font[g * 8 + y] & (0x80 >> x))
        ctx.fillRect(((g % per) * 9 + x) * s, (Math.floor(g / per) * 9 + y) * s, s, s);
    return canvas;
  }

  const hex = (n, w = 4) => '$' + n.toString(16).toUpperCase().padStart(w, '0');
  return { PAL, load, bitmapAddr, pixel, attr, colour, drawScreen, drawCharset, hex };
})();

// The Spectrum's names for the footprint categories; the drawing is makeMemMap in memmap.js.
if (globalThis.makeMemMap) {
  globalThis.SpectrumMap = globalThis.makeMemMap({
    code: 'code', graphics: 'graphics', levels: 'level data', sound: 'sound', text: 'text', tables: 'tables',
    variables: 'variables', runtime: 'screen, attributes and working memory', rom: "ROM (the machine's routines)",
    unused: 'unused' });
}
