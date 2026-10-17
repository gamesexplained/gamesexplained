// Stand-ins for the four KERNAL routines Chiller calls with the KERNAL banked in: the tail of the
// interrupt ($EA31: the jiffy clock and the keyboard scan), CHROUT ($FFD2) as far as the screen
// editor goes for the cards, and PLOT ($FFF0). The simulator holds no ROM, so the game run on the
// kit's C64 and the port both use these. They keep the KERNAL's variables where the KERNAL keeps
// them, so that the game's reads of them ($A1, $A2, $C5, $028D) see what they would.
// k = { M, colourRead(i), colourWrite(i, v), vicRead(r), vicWrite(r, v), ciaRead(r), ciaWrite(r, v) }
(function (root) {
'use strict';
const SCREEN = 0x0400;
const COLOURS = { 0x05: 1, 0x1C: 2, 0x1E: 5, 0x1F: 6, 0x81: 8, 0x90: 0, 0x95: 9, 0x96: 10, 0x97: 11, 0x98: 12,
  0x99: 13, 0x9A: 14, 0x9B: 15, 0x9C: 4, 0x9E: 7, 0x9F: 3 };
// the unshifted key table's modifiers ($EB81): SHIFT 1, C= 2, CTRL 4 (RUN/STOP, 3, is a key)
const MOD = { 0x0F: 1, 0x34: 1, 0x3D: 2, 0x3A: 4 };

// $EA31's work before it leaves: UDTIM ($FFEA) and SCNKEY ($EA87).
function irqTail(k) {
  const M = k.M;
  // the jiffy clock $A0-$A2, reset at 24 hours ($4F1A01)
  if (++M[0xA2] === 256) { M[0xA2] = 0; if (++M[0xA1] === 256) { M[0xA1] = 0; M[0xA0] = (M[0xA0] + 1) & 255; } }
  if (M[0xA0] === 0x4F && M[0xA1] === 0x1A && M[0xA2] === 0x01) { M[0xA0] = M[0xA1] = M[0xA2] = 0; }
  scnkey(k);
}

// SCNKEY: SFDX ($CB) is the last key found scanning from matrix code 0 up, modifiers aside; LSTX
// ($C5) takes it; SHFLAG ($028D) the modifiers, the last scan's in $028E. SHIFT with C= swaps the
// character sets unless MODE ($0291) bit 7 locks them. The keyboard buffer is not kept: the game
// never reads it.
function scnkey(k) {
  const M = k.M;
  let shift = 0, key = 0x40;
  k.ciaWrite(0, 0);
  if (k.ciaRead(1) !== 0xFF) {
    for (let row = 0; row < 8; row++) {
      k.ciaWrite(0, ~(1 << row) & 0xFF);
      const v = k.ciaRead(1);
      for (let col = 0; col < 8; col++) {
        if (v & (1 << col)) continue;
        const code = row * 8 + col;
        if (MOD[code]) shift |= MOD[code]; else key = code;
      }
    }
  }
  M[0x028D] = shift;
  if (shift === 3 && M[0x028E] !== 3 && !(M[0x0291] & 0x80)) k.vicWrite(0x18, k.vicRead(0x18) ^ 2);
  M[0xCB] = key; M[0xC5] = key; M[0x028E] = shift;
  k.ciaWrite(0, 0x7F);
}

// The screen editor, physical rows: TBLX ($D6) the cursor's row, PNTR ($D3) its column within the
// logical line (0-79), LDTB1 ($D9-$F1) bit 7 set where a row starts a logical line, COLOR ($0286),
// RVS ($C7), MODE ($0291). A row printed past column 39 is joined to a blank row opened below it,
// as the KERNAL does.
const start = (M, r) => (M[0xD9 + r] & 0x80) !== 0;
function lineStart(M, r) { while (r > 0 && !start(M, r)) r--; return r; }
function row(M) { return M[0xD6]; }
function col(M) { return M[0xD3] - 40 * (row(M) - lineStart(M, row(M))); }
function setPos(M, r, c) {
  M[0xD6] = r;
  const s = lineStart(M, r);
  M[0xD3] = c + 40 * (r - s);
  const pnt = SCREEN + 40 * s;
  M[0xD1] = pnt & 255; M[0xD2] = pnt >> 8;
  M[0xF3] = pnt & 255; M[0xF4] = (pnt >> 8) + 0xD4;
  M[0xD5] = s < 24 && !start(M, s + 1) ? 79 : 39;
}
function copyRow(k, from, to) {
  const M = k.M;
  for (let i = 0; i < 40; i++) {
    M[SCREEN + 40 * to + i] = M[SCREEN + 40 * from + i];
    k.colourWrite(40 * to + i, k.colourRead(40 * from + i));
  }
}
function clearRow(k, r) {
  const M = k.M, bg = k.vicRead(0x21) & 15;           // revision 3 clears a row's colour to $D021's
  for (let i = 0; i < 40; i++) { M[SCREEN + 40 * r + i] = 0x20; k.colourWrite(40 * r + i, bg); }
}
function scrollUp(k) {
  const M = k.M;
  for (let r = 0; r < 24; r++) { copyRow(k, r + 1, r); M[0xD9 + r] = M[0xDA + r]; }
  clearRow(k, 24); M[0xD9 + 24] |= 0x80;
}
function openBelow(k, r) {                             // a blank row at r + 1, the rows below moved down
  const M = k.M;
  for (let i = 24; i > r + 1; i--) { copyRow(k, i - 1, i); M[0xD9 + i] = M[0xD8 + i]; }
  clearRow(k, r + 1);
  M[0xD9 + r + 1] &= 0x7F;
}
function clearScreen(k) {
  const M = k.M;
  for (let r = 0; r < 25; r++) { clearRow(k, r); M[0xD9 + r] = 0x84 | ((SCREEN + 40 * r) >> 8); }
  M[0xC7] = 0; setPos(M, 0, 0);
}
function down(k) {
  const M = k.M; let r = row(M) + 1; const c = col(M);
  if (r > 24) { scrollUp(k); r = 24; }
  setPos(M, r, c);
}
function put(k, code) {
  const M = k.M; let r = row(M), c = col(M);
  M[SCREEN + 40 * r + c] = code;
  k.colourWrite(40 * r + c, M[0x0286]);
  if (++c < 40) { setPos(M, r, c); return; }
  const s = lineStart(M, r);
  if (r === s && (r === 24 || start(M, r + 1))) {      // a single row grows into a second
    if (r === 24) { scrollUp(k); r = 23; }
    openBelow(k, r);
  } else if (r + 1 > 24) { scrollUp(k); r = 23; }
  setPos(M, r + 1, 0);
}
function chrout(k, a) {
  const M = k.M;
  if (a === 0x0D || a === 0x8D) {
    let r = row(M) + 1;
    while (r <= 24 && !start(M, r)) r++;
    M[0xC7] = 0;
    if (r > 24) { scrollUp(k); r = 24; }
    setPos(M, r, 0); return;
  }
  if (a === 0x93) { clearScreen(k); return; }
  if (a === 0x11) { down(k); return; }
  if (a === 0x91) { const r = row(M); if (r > 0) setPos(M, r - 1, col(M)); return; }
  if (a === 0x9D) { const r = row(M), c = col(M); if (c > 0) setPos(M, r, c - 1); else if (r > 0) setPos(M, r - 1, 39); return; }
  if (a === 0x1D) { const r = row(M), c = col(M); if (c < 39) setPos(M, r, c + 1); else down(k), setPos(M, row(M), 0); return; }
  if (a === 0x12) { M[0xC7] = 0x12; return; }
  if (a === 0x92) { M[0xC7] = 0; return; }
  if (a === 0x08) { M[0x0291] |= 0x80; return; }
  if (a === 0x09) { M[0x0291] &= 0x7F; return; }
  if (a === 0x0E) { k.vicWrite(0x18, k.vicRead(0x18) | 2); return; }
  if (a === 0x8E) { k.vicWrite(0x18, k.vicRead(0x18) & 0xFD); return; }
  if (COLOURS[a] !== undefined) { M[0x0286] = COLOURS[a]; return; }
  let s;
  if (a >= 0x20 && a < 0x40) s = a;
  else if (a >= 0x40 && a < 0x60) s = a - 0x40;
  else if (a >= 0x60 && a < 0x80) s = a - 0x20;
  else if (a >= 0xA0 && a < 0xC0) s = a - 0x40;
  else if (a >= 0xC0 && a < 0xFF) s = a - 0x80;
  else if (a === 0xFF) s = 0x5E;
  else return;                                         // a control code the cards do not use
  put(k, s | (M[0xC7] ? 0x80 : 0));
}
// PLOT with the carry clear: the cursor to row X, column Y.
function plot(k, x, y) { setPos(k.M, x, y); }
// What the KERNAL leaves in these when a program starts: a cleared screen's links, light blue.
function boot(M) {
  for (let r = 0; r < 25; r++) M[0xD9 + r] = 0x84 | ((SCREEN + 40 * r) >> 8);
  M[0x0286] = 14; M[0xC7] = 0; M[0x0291] = 0; M[0x0288] = SCREEN >> 8;
  M[0xC5] = M[0xCB] = 0x40;
  setPos(M, 0, 0);
}

root.ChillerKernal = { irqTail, scnkey, chrout, plot, boot, clearScreen };
})(typeof window !== 'undefined' ? window : globalThis);
