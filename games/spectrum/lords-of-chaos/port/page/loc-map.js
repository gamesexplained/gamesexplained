/* loc-map */
// The map window as the game draws it (draw_map $A94C, draw_block $A7B6, thing_graphic $A84A),
// on a 64 KB memory M laid out as the game's: the engine (character sets 0 and 1) under a scenario
// ($D003 up). Every drawing goes into M's own screen ($4000 bitmap, $5800 attributes), byte for
// byte as the game's routines leave it, so Spectrum.drawScreen shows it and a test can hold it to
// the game's own code run on the kit's Z80 (test_map.js).
//   LOCMap.thing(M, v)           { set, graphic, colours } of map byte v, from the things table
//   LOCMap.block(M, v, row, col) draws thing v as a square at character row and column (3 x 3 cells)
//   LOCMap.window(M, r0, c0)     draws the 7 x 7 window whose top left square is row r0, column c0,
//                                wrapping at 36, at the top left of the screen
//   LOCMap.square(M, r, c)       the map byte at row r, column c
//   LOCMap.text(M, n)            the scenario's message n as text (word numbers, control codes skipped;
//                                a new line, $FF, inside a word reads as a space)
var LOCMap = (function () {
  const w = (M, a) => M[a] | M[(a + 1) & 0xFFFF] << 8;
  // the screen address of character row r, column c, pixel line k (screen_rows $AF61)
  const pix = (r, c, k) => 0x4000 + ((r & 0x18) << 8) + ((r & 7) << 5) + (k << 8) + c;
  function thing(M, v) {
    const t = w(M, 0xD032) + 5 * v;
    return { set: M[t], graphic: M[t + 1], colours: M[t + 2] };
  }
  function block(M, v, row, col, set, graphic, colours) {
    if (set === undefined) ({ set, graphic, colours } = thing(M, v));
    const font = w(M, 0xD07A + 2 * set);
    const g = w(M, 0xD038) + 9 * graphic, cs = w(M, 0xD036) + 9 * colours;
    for (let i = 0; i < 9; i++) {
      const r = row + ((i / 3) | 0), c = col + i % 3, ch = M[g + i];
      for (let k = 0; k < 8; k++) M[pix(r, c, k)] = M[(font + 8 * ch + k) & 0xFFFF];
      M[0x5800 + 32 * r + c] = M[cs + i];
    }
  }
  const square = (M, r, c) => M[w(M, 0xD030) + 36 * (r % 36) + (c % 36)];
  function window(M, r0, c0) {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) block(M, square(M, r0 + y, c0 + x), 3 * y, 3 * x);
  }
  // entry n (from 1) of a list whose entries start with their length (find_entry $ABF4)
  function entry(M, base, n) { let a = base; for (let i = 1; i < n; i++) a += M[a]; return a; }
  function word(M, n) {
    const a = entry(M, w(M, 0xD00D), n);
    let s = '';
    for (let i = 1; i < M[a]; i++) { const ch = M[a + i]; s += ch === 0xFA || ch === 0xFF ? ' ' : ch < 0x80 ? String.fromCharCode(ch) : ''; }
    return s;
  }
  function text(M, n) {
    const a = entry(M, w(M, 0xD00B), n), out = [];
    for (let i = 1; i < M[a]; i++) {
      const c = M[a + i];
      if (c === 0xFF || c === 0xFD || c === 0xFC) continue;
      if (c === 0xFE) { i += 1; continue; }
      if (c === 0xFB) { i += 2; continue; }
      out.push(word(M, c));
    }
    return out.join(' ').replace(/\s+/g, ' ').trim();
  }
  // The ULA's colours, 0-7 normal and 8-15 bright (site/lib/spectrum.js's PAL)
  const PAL = [[0,0,0],[0,0,215],[215,0,0],[215,0,215],[0,215,0],[0,215,215],[215,215,0],[215,215,215],
               [0,0,0],[0,0,255],[255,0,0],[255,0,255],[0,255,0],[0,255,255],[255,255,0],[255,255,255]];
  // Copies the screen's character cells, rows r0 to r0 + rows - 1 and columns c0 on, from M into the
  // ImageData img at pixel (dx, dy), as the Spectrum shows them (flash off).
  function paint(M, img, r0, c0, rows, cols, dx, dy) {
    const W = img.width, d = img.data;
    for (let r = r0; r < r0 + rows; r++) for (let c = c0; c < c0 + cols; c++) {
      const at = M[0x5800 + 32 * r + c], br = (at >> 6 & 1) << 3;
      const ink = PAL[(at & 7) | br], paper = PAL[(at >> 3 & 7) | br];
      for (let k = 0; k < 8; k++) {
        const b = M[pix(r, c, k)];
        for (let x = 0; x < 8; x++) {
          const col = b & (0x80 >> x) ? ink : paper;
          const o = 4 * ((dy + 8 * (r - r0) + k) * W + dx + 8 * (c - c0) + x);
          d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
        }
      }
    }
  }
  // The whole 36 x 36 map into img (864 x 864 pixels), each square drawn by block() in a scratch
  // copy of M and painted from its screen. over(v, r, c) may give another map byte to draw.
  function whole(M, img, over) {
    const S = M.slice();
    for (let r = 0; r < 36; r++) for (let c = 0; c < 36; c++) {
      const v = over ? over(square(M, r, c), r, c) : square(M, r, c);
      block(S, v, 0, 0);
      paint(S, img, 0, 0, 3, 3, 24 * c, 24 * r);
    }
  }
  return { thing, block, window, square, text, word, entry, paint, whole, PAL };
})();
// end of loc-map
