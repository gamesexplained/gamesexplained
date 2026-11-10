// Big Trouble in Little China pages: draws the game's figures, bitmap shapes and street from the
// bytes of listing.json, loaded by the site's C64.load (../../lib/c64.js). Addresses are the
// listing's: frame lists $0E99, frame records $506E, sprite parts, shapes $27EA/$27FD/$2810,
// street map $2B66, tiles $326E, part colours $01E9/$01ED.
(function () {
  'use strict';
  const PAL = ['#000000', '#ffffff', '#813338', '#75cec8', '#8e3c97', '#56ac4d', '#2e2c9b', '#edf171',
               '#8e5029', '#553800', '#c46c71', '#4a4a4a', '#7b7b7b', '#a9ff9f', '#706deb', '#b2b2b2'];
  let gameP = null;
  function load() { if (!gameP) gameP = C64.load('listing.json'); return gameP; }
  const w = (m, a) => m[a] | m[a + 1] << 8;

  // The 13 figure types: where each one's frame list starts, and how many frames it has (up to the
  // next list's start, which is how the lists are laid out; type 10 has none).
  const TYPE_NAMES = ['Jack Burton', 'Wang Chi', 'Egg Shen', 'Enemy kind 3, the fighter', 'Enemy kind 4, with a gun',
    'Enemy kind 5, with a sword', 'Enemy kind 6, in a broad hat', 'Enemy kind 7, a hat and a gun',
    'Enemy kind 8, a hat and a sword', 'Lo Pan, the boss (kind 9)', '', 'A beaten enemy vanishing', 'Lo Pan appearing'];
  function figureTypes(m) {
    const starts = [];
    for (let t = 0; t < 13; t++) starts.push(w(m, 0x0E99 + 2 * t));
    return starts.map((s, t) => {
      if (!s) return null;
      const end = Math.min(0x0E88, ...starts.filter(x => x > s));
      const recs = [];
      for (let a = s; a < end; a += 2) recs.push(w(m, a));
      return { type: t, name: TYPE_NAMES[t], list: s, recs };
    });
  }
  // One frame: a 12-byte record, three part addresses for each of the two sprite columns. Each
  // address starts 63 bytes (three 21-byte parts) except the third, which gives 42: a column is
  // 56 lines of 24 pixels, as $08A4 lays it into the sprite page and the multiplexer shows it.
  // Multicolour sprite: %01 $D025 (black), %10 the sprite's colour, %11 $D026 (light red).
  function drawFigure(ctx, m, rec, colour, x0, y0, s) {
    const cols = [null, PAL[0], PAL[colour], PAL[10]];
    for (let half = 0; half < 2; half++) {
      let line = 0;
      for (let k = 0; k < 3; k++) {
        const p = w(m, rec + half * 6 + k * 2), n = k < 2 ? 21 : 14;
        for (let r = 0; r < n; r++, line++)
          for (let bx = 0; bx < 3; bx++) {
            const b = m[p + r * 3 + bx];
            for (let px = 0; px < 4; px++) {
              const v = (b >> (6 - 2 * px)) & 3;
              if (!v) continue;
              ctx.fillStyle = cols[v];
              ctx.fillRect(x0 + (half * 24 + bx * 8 + px * 2) * s, y0 + line * s, 2 * s, s);
            }
          }
      }
    }
  }
  // The sprite colours the game gives each figure: the heroes' from the cold start ($1078), the
  // enemy's by kind from the first column of the kinds table ($1201 + 3 x kind).
  function figureColour(m, t) {
    if (t === 0) return 6; if (t === 1) return 15; if (t === 2) return 1;
    if (t >= 3 && t <= 9) return m[0x1201 + 3 * t];
    return m[0x1201 + 27];          // the vanishing and appearing figures belong to the enemy's sprites
  }

  // The street's four parts, by scroll X ($0A23), and their colours: screen byte $01E9 + part
  // (high nibble %01, low nibble %10) and colour memory $01ED + part (%11); %00 is black.
  const PART_STARTS = [0x4A60, 0x24E0, 0x03A0];
  function partAt(x) { return x >= 0x4A60 ? 0 : x >= 0x24E0 ? 1 : x >= 0x03A0 ? 2 : 3; }
  function partColours(m, z) { const s = m[0x01E9 + z]; return [PAL[0], PAL[s >> 4], PAL[s & 15], PAL[m[0x01ED + z] & 15]]; }
  // One map column (16 pixels, 16 character rows) from tile n at $326E + (n-1) x 256.
  function drawColumn(ctx, m, col, x0, s, colours) {
    const t = m[0x2B66 + col], base = 0x326E + (t - 1) * 256;
    for (let row = 0; row < 16; row++)
      for (let ch = 0; ch < 2; ch++)
        for (let y = 0; y < 8; y++) {
          const b = m[base + row * 16 + ch * 8 + y];
          for (let p = 0; p < 4; p++) {
            ctx.fillStyle = colours[(b >> (6 - 2 * p)) & 3];
            ctx.fillRect(x0 + (ch * 8 + p * 2) * s, (row * 8 + y) * s, 2 * s, s);
          }
        }
  }
  // A bitmap shape drawn by $283B: rows of (width) bytes, eight to a character, from $2810.
  function shapeInfo(m, i) { return { w: m[0x27EA + i] + 1, rows: m[0x27FD + i], p: w(m, 0x2810 + 2 * i) }; }
  function drawShape(ctx, m, i, x0, y0, s, colours) {
    const { w: wd, rows, p } = shapeInfo(m, i);
    for (let r = 0; r < rows; r++)
      for (let b = 0; b < wd; b++) {
        const v = m[p + r * wd + b], cx = b >> 3, y = b & 7;
        for (let px = 0; px < 4; px++) {
          const c = (v >> (6 - 2 * px)) & 3;
          if (!c) continue;
          ctx.fillStyle = colours[c];
          ctx.fillRect(x0 + (cx * 8 + px * 2) * s, y0 + (r * 8 + y) * s, 2 * s, s);
        }
      }
  }
  globalThis.BTILC = { PAL, load, figureTypes, drawFigure, figureColour, partAt, partColours, PART_STARTS, drawColumn, shapeInfo, drawShape };
})();
