// The strategic scanner: the whole map at three pixels a square, the view's frame and the units
// flashing on it, until fire.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.scanner = P => {
  const M = P.M, V = P.V, w = P.w, setw = P.setw;
  // $8495: option 3 of cursor mode. The screen cleared to blue with message $45 and the scenario's
  // messages $A0 and $A1 at the bottom right; a frame round the map; every square of the 80 by 50
  // as the pattern its byte in the table at $D2FF names (bits 3 to 7; 0 for none), three pixels
  // apart from pixel row 9 and column 1; the two keys of the colours. Then, until fire: the units'
  // squares and the view's frame flipped on and off, 100 reads of the controls apart.
  P.def(0x8495, 'scanner', function* () {
    P.infoText({ a: P.clearScreenA({ a: 0x45 }).a });
    P.panelLine({ hl: 0x0315, a: 0xA0 });
    P.panelLine({ hl: 0x0316, a: 0xA1 });
    M[0x5DA6] = 0;
    for (let b = 0xF2; b; b--) {
      M[0x5DA4] = b - 1;
      M[0x5DA3] = 8; P.plot();
      M[0x5DA3] = 0x9F; P.plot();
    }
    for (let b = 0x96; b; b--) {
      M[0x5DA3] = 0x9F - b;
      M[0x5DA4] = 0; P.plot();
      M[0x5DA4] = 0xF1; P.plot();
    }
    const squares = only => {
      setw(0x5D6D, 0xD6BF);
      M[0x5DA7] = 9;
      M[0x5DA8] = 1;
      for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 80; x++) {
          const a = M[w(0x5D6D)];
          if (only) { if (a >= 0x8C) P.patternAt({ a: 0x0F }); }
          else { const p = M[0xD2FF + a] & 0xF8; if (p) P.patternAt({ a: p >> 3 }); }
          setw(0x5D6D, w(0x5D6D) + 1);
          M[0x5DA8] = M[0x5DA8] + 3 & 255;
        }
        M[0x5DA8] = 1;
        M[0x5DA7] = M[0x5DA7] + 3 & 255;
      }
    };
    squares(false);
    setw(0x5DA7, 0x03A2);
    P.patternAt({ a: 1 });
    M[0x5DA7] = 0xAA;
    P.patternAt({ a: 2 });
    M[0x5DA6] = 2;
    yield* P.waitRelease();
    for (;;) {
      for (let b = 100; b; b--) {
        yield* P.readControls();
        P.count('scannerTurn');
        P.delay1();
        if (!(M[0x5D2A] & 1)) {
          P.clearScreen();
          P.drawView();
          return P.showSides();
        }
      }
      squares(true);
      setw(0x5DA7, 0x03A2);
      P.patternAt({ a: 0x0F });
      M[0x5DA7] = 0xAA;
      P.patternAt({ a: 0x0F });
      P.viewFrame();
    }
  });
  // $85CD: pattern A (from 1) at pixel row ($5DA7) and column ($5DA8): its dots, row and column
  // from there, listed to an $FF, from the address at $85F9 + 2 x (A - 1).
  P.def(0x85CD, 'patternAt', r => {
    let hl = w(0x85F9 + 2 * (r.a - 1 & 255) & 0xFFFF);
    for (; M[hl] !== 0xFF; hl = hl + 2 & 0xFFFF) {
      M[0x5DA3] = M[0x5DA7] + M[hl] & 255;
      M[0x5DA4] = M[0x5DA8] + M[hl + 1 & 0xFFFF] & 255;
      P.plot();
    }
    return { hl, a: 0xFF, zf: true };
  });
  // $86E4: the view's frame on the scanner: a square of 33 dots a side round its eleven squares.
  P.def(0x86E4, 'viewFrame', () => {
    M[0x5DA7] = 9 + 3 * M[V.VIEW_ROW] & 255;
    M[0x5DA8] = 1 + 3 * M[V.VIEW_COL] & 255;
    M[0x5DA3] = M[0x5DA7];
    for (let b = 0x21; b; b--) {
      M[0x5DA4] = M[0x5DA8]; P.plot();
      M[0x5DA4] = M[0x5DA8] + 0x20 & 255; P.plot();
      M[0x5DA3] = M[0x5DA3] + 1 & 255;
    }
    M[0x5DA4] = M[0x5DA8] + 1 & 255;
    for (let b = 0x1F; b; b--) {
      M[0x5DA3] = M[0x5DA7]; P.plot();
      M[0x5DA3] = M[0x5DA7] + 0x20 & 255; P.plot();
      M[0x5DA4] = M[0x5DA4] + 1 & 255;
    }
    return { b: 0, hl: 0x5DA4 };
  });
  // $844C: a dot of the scanner (and of the shots, the crosshair and the record's bars) at pixel row
  // ($5DA3) + 8 and column ($5DA4) + 8: set when $5DA6 is 0, with $5DA5 then what was there;
  // cleared when 1; flipped when 2.
  P.def(0x844C, 'plot', () => {
    const de = w(0x5DA3) + 0x0808 & 0xFFFF, y = de & 255, x = de >> 8;
    const hl = 0x4000 | (y & 0xC0) << 5 | (y & 7) << 8 | (y & 0x38) << 2 | x >> 3;
    const b = 0x80 >> (x & 7);
    const mode = M[0x5DA6];
    if (mode === 1) M[hl] &= ~b;
    else if (mode === 2) M[hl] ^= b;
    else { M[0x5DA5] = M[hl] & b; M[hl] |= b; }
    return { hl, b, a: M[hl], de };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
