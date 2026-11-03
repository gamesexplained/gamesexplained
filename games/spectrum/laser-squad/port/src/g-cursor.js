// The cursor and the crosshair: moving them over the view, scrolling the view at its edges, and the
// readout of the square under the cursor.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.cursor = P => {
  const M = P.M, V = P.V;
  const inc = a => { M[a] = M[a] + 1 & 255; };
  const dec = a => { M[a] = M[a] - 1 & 255; return M[a]; };
  // $5D16: whether the cursor is on show as it blinks; $B71A counts down to its next blink.
  // $5D1C: which ways the view scrolled (bit 0 up, 1 down, 2 left, 3 right); $5D1D: a way was held;
  // $635B: the view scrolled; $5D13: the cursor's square before it moved.
  const SCROLLED = 0x635B;

  // $61C3: one step of cursor mode. The cursor blinks (on for 255 turns, off for 140) while the
  // controls are read; each turn it moves if a way is held, and the square under it is described
  // when it stops. Returns at the first turn nothing moves it.
  P.def(0x61C3, 'cursorStep', function* () {
    for (;;) {
      if (dec(0xB71A) === 0) {
        if (!M[0x5D16]) { P.drawCursor(); M[0x5D16] = 1; M[0xB71A] = 0xFF; }
        else { P.eraseCursor(); M[0x5D16] = 0; M[0xB71A] = 0x8C; }
      }
      yield* P.readControls();
      P.spend(119 * 13 + 8 + 7);
      P.moveCursor();
      P.squareReadout();
      if (!M[0x5D1D]) return {};
      M[0xB71A] = 1; M[0x5D16] = 0;
    }
  });

  // $6215: aim. The crosshair blinks (each 256 turns, $5D17) and moves with the controls, faster
  // the longer a way is held; returns when fire is pressed.
  P.def(0x6215, 'crosshairLoop', function* () {
    for (;;) {
      if (dec(0x5D17) === 0) P.crosshairBlink();
      yield* P.readControls();
      const a = M[0x5D2A];
      if (!(a & 1)) return {};
      if ((a | 0xE1) === 0xFF) { M[0x5D18] = 0; M[0x5D1B] = 0; }
      else P.crosshairMove();
      P.delay1();
    }
  });
  // $6244: blink the crosshair: $5D1A says whether it is drawn, and the drawing is XOR.
  P.def(0x6244, 'crosshairBlink', () => { M[0x5D1A] = 1 - M[0x5D1A] & 255; return P.drawCrosshair(); });
  // $624F: move the crosshair a square. Off it comes, the cursor's square moves; if the view scrolled
  // it is left off, otherwise it is drawn again after a delay that shortens as the way is held.
  P.def(0x624F, 'crosshairMove', () => {
    if (M[0x5D1A]) P.drawCrosshair();
    P.readMove();
    if (M[SCROLLED]) { P.scrollView(); M[0x5D1A] = 0; M[SCROLLED] = 0; return {}; }
    P.drawCrosshair();
    if (!M[0x5D18]) P.delay200();
    P.accelDelay();
    M[0x5D17] = 0; M[SCROLLED] = 0; M[0x5D1A] = 1; M[0x5D18] = 1;
    return { a: 1 };
  });
  // $6286: 12 turns of a loop of ($5D1B) (256 for 0), which then shortens by 6, to 8 at least.
  P.def(0x6286, 'accelDelay', () => {
    const n = M[0x5D1B] || 256;
    P.spend(7 + 12 * (46 + 17 * n) - 5 + 51);
    let a = M[0x5D1B] - 6 & 255;
    M[0x5D1B] = a;
    if (a < 8) M[0x5D1B] = a = 8;
    return { a, b: 0 };
  });

  // $62A4: the readout. When the cursor stops ($5D10 clear), the square under it is described
  // (message 3 first, unless $A36F is set, then $6818); when it moves again the description goes
  // (message 3 again) after a pause.
  P.def(0x62A4, 'squareReadout', () => {
    if (!M[0x5D1D]) {
      if (M[0x5D10]) return {};
      M[0x5D10] = 1;
      if (M[0xA36F]) return {};
      P.infoText({ a: 3 });
      P.squareInfo();
      return {};
    }
    if (!M[0x5D10]) return {};
    if (!M[0xA36F]) P.infoText({ a: 3 });
    for (let i = 0; i < 160; i++) P.delay1();
    M[0x5D10] = 0;
    return { a: 0, b: 0 };
  });

  // $62F6: move the cursor by the controls, and show it.
  P.def(0x62F6, 'moveCursor', () => { P.readMove(); if (M[0x5D1D]) P.showMove(); return {}; });

  // $6301: move the cursor's square a step for each way held (up, down, right, left, in that order),
  // or the view when the cursor is at its edge. $5D1E counts the ways held, less one.
  P.def(0x6301, 'readMove', () => {
    M[0x5D1C] = 0; M[0x5D1D] = 0; M[0x5D1E] = 0;
    M[0x5D13] = M[V.CURSOR_ROW]; M[0x5D14] = M[V.CURSOR_COL];
    const a = M[0x5D2A];
    if (!(a & 2)) { P.cursorUp(); P.noteMove(); }
    if (!(a & 4)) { P.cursorDown(); P.noteMove(); }
    if (!(a & 8)) { P.cursorRight(); P.noteMove(); }
    if (!(a & 16)) { P.cursorLeft(); P.noteMove(); }
    dec(0x5D1E);
    return { a, hl: 0x5D1E };
  });
  // $632D, $6336, $633F, $6348: a step one way, and noted ($6351).
  for (const [at, name, step] of [[0x632D, 'stepUp', 'cursorUp'], [0x6336, 'stepDown', 'cursorDown'], [0x633F, 'stepRight', 'cursorRight'],
    [0x6348, 'stepLeft', 'cursorLeft']]) {
    P.def(at, name, () => { P[step](); P.noteMove(); return {}; });
  }
  P.def(0x6351, 'noteMove', () => { M[0x5D1D] = 1; inc(0x5D1E); return { a: 1, hl: 0x5D1E }; });
  // $635C, $6380, $63A0, $63C0: a step right, left, up or down. At the cursor's edge ($B718 the
  // last row and column, $B719 the first) the view moves instead, unless it is at the map's own
  // (70 views across, 40 down), and the way is noted in $5D1C.
  const step = (at, name, k, lim, view, edge, d, bit) => P.def(at, name, () => {
    if (M[k] !== M[lim]) { M[k] = M[k] + d & 255; return {}; }
    if (M[view] === edge) return { a: edge, zf: true };
    M[view] = M[view] + d & 255;
    M[SCROLLED] = 1;
    M[0x5D1C] |= bit;
    return { a: 1 };
  });
  step(0x635C, 'cursorRight', V.CURSOR_COL, 0xB718, V.VIEW_COL, 0x45, 1, 8);
  step(0x6380, 'cursorLeft', V.CURSOR_COL, 0xB719, V.VIEW_COL, 0, -1, 4);
  step(0x63A0, 'cursorUp', V.CURSOR_ROW, 0xB719, V.VIEW_ROW, 0, -1, 1);
  step(0x63C0, 'cursorDown', V.CURSOR_ROW, 0xB718, V.VIEW_ROW, 0x27, 1, 2);

  // $63E2: show the move: after a scroll, the view drawn again and the cursor on it; otherwise the
  // cursor at its new square, the old square drawn again, and a pause of 80 delays.
  P.def(0x63E2, 'showMove', () => {
    if (M[SCROLLED]) { M[SCROLLED] = 0; P.scrollView(); return P.drawCursor(); }
    P.drawCursor();
    P.drawSquareAt({ hl: P.w(0x5D13), de: P.w(V.VIEW_ROW) });
    for (let i = 0; i < 80; i++) P.delay1();
    return { b: 0 };
  });

  // $640A: draw the view again after a scroll, by the ways in $5D1C, through the jumps at $6418:
  // from the bottom row up after a scroll up, from the right after a scroll left, and otherwise the
  // usual way, by rows or (right) by columns. Up and down at once ($5D1C 3 or 7) draws nothing.
  const SCROLL = [0x646C, 0x612A, null, 0x64B0, 0x646C, 0x612A, null, 0x6181, 0x646C, 0x612A];
  P.def(0x640A, 'scrollView', () => {
    const i = M[0x5D1C] - 1 & 255;
    if (i < SCROLL.length) return SCROLL[i] === null ? { a: i } : P.jump(SCROLL[i]);
    return P.jump(0x6418 + 3 * i & 0xFFFF);
  });

  // $6436: draw the cursor, tile $AF in white on black, at its square in the view.
  P.def(0x6436, 'drawCursor', () => {
    M[V.PRINT_ROW] = 2 * M[V.CURSOR_ROW] + 1; M[V.PRINT_COL] = 2 * M[V.CURSOR_COL] + 1;
    M[V.ATTR] = 0x47;
    return P.drawTile({ a: 0xAF });
  });
  // $644A: take the cursor off: the map's square drawn over it, unless $B71B is set.
  P.def(0x644A, 'eraseCursor', () => {
    if (M[0xB71B]) return { a: M[0xB71B] };
    return P.drawSquareAt({ hl: P.w(V.CURSOR_ROW), de: P.w(V.VIEW_ROW) });
  });
  // $6456: draw the map's square at the view's square HL (L the row, H the column), the view's
  // corner in DE.
  P.def(0x6456, 'drawSquareAt', r => {
    P.setw(V.PRINT_ROW, r.hl);
    const pos = r.hl + r.de & 0xFFFF;
    const sq = M[P.mapAddr(pos & 255, pos >> 8)];
    P.setw(V.PRINT_ROW, 2 * r.hl + 0x101 & 0xFFFF);
    return P.drawSquare({ a: sq });
  });

  // $646C: draw the view from its bottom row up.
  P.def(0x646C, 'drawViewUp', () => {
    P.setw(V.MAP_PTR, P.mapAddr(M[V.VIEW_ROW] + 10 & 255, M[V.VIEW_COL]));
    M[V.PRINT_ROW] = 0x15;
    for (let y = 0; y < 11; y++) {
      M[V.PRINT_COL] = 1;
      for (let x = 0; x < 11; x++) {
        const p = P.w(V.MAP_PTR);
        P.setw(V.MAP_PTR, p + 1);
        P.drawSquare({ a: M[p] });
        M[V.PRINT_COL] += 2;
      }
      P.setw(V.MAP_PTR, P.w(V.MAP_PTR) + 0xFFA5);
      M[V.PRINT_ROW] -= 2;
    }
    P.count('view');
    return { b: 0, hl: V.PRINT_ROW, zf: false };
  });
  // $64B0: draw the view from its right-hand column leftwards.
  P.def(0x64B0, 'drawViewLeft', () => {
    P.setw(V.MAP_PTR, P.mapAddr(M[V.VIEW_ROW], M[V.VIEW_COL] + 10 & 255));
    M[V.PRINT_COL] = 0x15;
    for (let x = 0; x < 11; x++) {
      M[V.PRINT_ROW] = 1;
      for (let y = 0; y < 11; y++) {
        const p = P.w(V.MAP_PTR);
        P.setw(V.MAP_PTR, p + 80);
        P.drawSquare({ a: M[p] });
        M[V.PRINT_ROW] += 2;
      }
      P.setw(V.MAP_PTR, P.w(V.MAP_PTR) + 0xFC8F);
      M[V.PRINT_COL] -= 2;
    }
    P.count('view');
    return { b: 0, hl: V.PRINT_COL, zf: false };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
