// The screen: clearing it, characters and tiles, and the map's view.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.screen = P => {
  const M = P.M, V = P.V;
  // the screen address of each character row's top line, from the table at $6042
  const rowAddr = row => P.w(0x6042 + 2 * row);
  // the attribute address of the character cell whose top line is at screen address a
  const attrOf = a => (((a >> 8) >> 3 & 3) | 0x58) << 8 | (a & 255);

  // $602C: clear the screen to black; $602D: to the colours in A. The attributes are filled from
  // $5AFF down, then the pixels cleared from $57FF down.
  const fill = a => {
    M.fill(a, 0x5800, 0x5B00);
    M.fill(0, 0x4000, 0x5800);
    return { a, b: 0, c: 0, bc: 0, d: 0x3F, e: 0xFF, de: 0x3FFF, h: 0x40, l: 0, hl: 0x4000 };
  };
  P.def(0x602C, 'clearScreen', () => fill(0));
  P.def(0x602D, 'clearScreenA', r => fill(r.a));

  // $6072: print character A at the row and column in PRINT_ROW and PRINT_COL, from the font at
  // $B139 (the character's 8 bytes at $B139 + 8 x A), in the colours in ATTR.
  P.def(0x6072, 'printChar', r => {
    const ch = r.a;
    let s = rowAddr(M[V.PRINT_ROW]) + M[V.PRINT_COL] & 0xFFFF;
    const f = 0xB139 + 8 * ch & 0xFFFF;
    for (let i = 0; i < 8; i++) M[s + 256 * i & 0xFFFF] = M[f + i & 0xFFFF];
    M[attrOf(s)] = M[V.ATTR];
    return { b: 0 };
  });

  // $6107: copy 8 bytes from DE down a character cell from the screen address HL.
  const cell = (hl, de) => { for (let i = 0; i < 8; i++) M[hl + 256 * i & 0xFFFF] = M[de + i & 0xFFFF]; return de + 8 & 0xFFFF; };
  P.def(0x6107, 'copyCell', r => { const de = cell(r.hl, r.de); return { b: 0, de, d: de >> 8, e: de & 255 }; });

  // $60AF: draw tile A, 16 x 16 pixels, at the row and column in PRINT_ROW and PRINT_COL (two
  // characters by two), from its 32 bytes at $E8DF + 32 x A (top left, top right, bottom left,
  // bottom right), all four cells in the colours in ATTR. TILE_GFX keeps the tile's address.
  P.def(0x60AF, 'drawTile', r => {
    const gfx = 0xE8DF + 32 * r.a & 0xFFFF;
    P.setw(V.TILE_GFX, gfx);
    const row = M[V.PRINT_ROW], col = M[V.PRINT_COL];
    const top = rowAddr(row) + col & 0xFFFF, bot = rowAddr(row + 1) + col & 0xFFFF;
    let de = gfx;
    de = cell(top, de); de = cell(top + 1, de); de = cell(bot, de); de = cell(bot + 1, de);
    const at = M[V.ATTR], br = attrOf(bot + 1 + 0x700 & 0xFFFF);
    M[br] = at; M[br - 1] = at; M[br - 32] = at; M[br - 33] = at;
    return { a: at, b: 0, c: 0x1F, bc: 0x1F, de, d: de >> 8, e: de & 255, hl: br - 33, h: br - 33 >> 8, l: br - 33 & 255 };
  });

  // $6112: the map's square at row E and column D: HL = $D6BF + 80 x E + D. The map is 80 squares
  // across and 50 down, a byte each.
  const mapAddr = (row, col) => 0xD6BF + 80 * row + col & 0xFFFF;
  P.mapAddr = mapAddr;
  P.def(0x6112, 'mapSquare', r => {
    const hl = mapAddr(r.e, r.d);
    return { hl, h: hl >> 8, l: hl & 255, de: 0xD6BF, d: 0xD6, e: 0xBF, a: r.d, b: 0 };
  });

  // $616E: draw the map's square A at the row and column in PRINT_ROW and PRINT_COL: its colours and
  // its tile from the scenario's table of squares, two bytes each, at the address in $B716.
  P.def(0x616E, 'drawSquare', r => {
    const t = P.w(0xB716) + 2 * r.a & 0xFFFF;
    M[V.ATTR] = M[t];
    return P.drawTile({ a: M[t + 1 & 0xFFFF] });
  });

  // $612A: draw the view: the 11 x 11 squares of the map from VIEW_ROW and VIEW_COL, row by row,
  // at character rows and columns 1 to 21 of the screen. $B715 is cleared (the scanner is not on
  // show); MAP_PTR walks the map.
  P.def(0x612A, 'drawView', () => {
    M[0xB715] = 0;
    P.setw(V.MAP_PTR, mapAddr(M[V.VIEW_ROW], M[V.VIEW_COL]));
    M[V.PRINT_ROW] = 1;
    for (let y = 0; y < 11; y++) {
      M[V.PRINT_COL] = 1;
      for (let x = 0; x < 11; x++) {
        const p = P.w(V.MAP_PTR);
        const sq = M[p];
        P.setw(V.MAP_PTR, p + 1);
        P.drawSquare({ a: sq });
        M[V.PRINT_COL] += 2;
      }
      P.setw(V.MAP_PTR, P.w(V.MAP_PTR) + 69);
      M[V.PRINT_ROW] += 2;
    }
    P.count('view');
    return { b: 0, zf: false };
  });

  // $6181: the same, column by column (after the view has scrolled).
  P.def(0x6181, 'drawViewColumns', () => {
    P.setw(V.MAP_PTR, mapAddr(M[V.VIEW_ROW], M[V.VIEW_COL]));
    M[V.PRINT_COL] = 1;
    for (let x = 0; x < 11; x++) {
      M[V.PRINT_ROW] = 1;
      for (let y = 0; y < 11; y++) {
        const p = P.w(V.MAP_PTR);
        const sq = M[p];
        P.setw(V.MAP_PTR, p + 80);
        P.drawSquare({ a: sq });
        M[V.PRINT_ROW] += 2;
      }
      P.setw(V.MAP_PTR, P.w(V.MAP_PTR) + 0xFC91);
      M[V.PRINT_COL] += 2;
    }
    P.count('view');
    return { b: 0, c: 0, zf: true };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
