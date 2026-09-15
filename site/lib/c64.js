// Shared C64 rendering helpers for game pages. No dependencies. Exposes window.C64.
// Data comes from the game's listing.json (every byte the game uses) via C64.load().
window.C64 = (function () {
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

  const hex = (n, w = 4) => '$' + n.toString(16).toUpperCase().padStart(w, '0');
  return { PAL, load, drawGlyph, drawGlyphMC, drawScreen, drawSprite, drawCharset, canvas, hex };
})();
