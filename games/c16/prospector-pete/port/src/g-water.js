// The flood: the water list at $0200 (three bytes a cell: address, then row, deepest first, $5B the
// last cell's index), filled a stage at a time (water_fill) and let flow on (water_flow and the
// four flow_ routines), cells added in order (add_water) and taken off (drop_water); water_step is
// irq_play's call.
(function (root) {
'use strict';
(root.PeteGroups = root.PeteGroups || {}).water = function (P) {
const M = P.M;
const ptr = a => (M[a] | M[a + 1] << 8) & 0x3FFF;
const OPEN = v => v === 0 || v === 0xA3 || v === 0x6F || v === 0xA2;

// One step of the flood (water_step, $23F3).
P.water_step = function () {
  if (M[0x59] !== 0) {
    P.water_fill();
    if (M[0x58] !== 0) { M[0x59] = (M[0x59] - 1) & 0xFF; return; }
  }
  for (;;) {                                               // b_2401
    P.water_flow();
    if (M[0x6E] !== 0 || M[0x0202] === 0) break;
    M[0x58] = 0;
  }
  M[0x59] = 0x03;
};

// Every cell on the list that is still filling, one stage on; $58 the row of the deepest moved
// (water_fill, $2418).
P.water_fill = function () {
  M[0x5D] = M[0x5B];
  M[0x58] = 0;
  for (;;) {                                               // b_2420
    const i = M[0x5D];
    M[0x70] = M[0x0200 + i]; M[0x71] = M[0x0201 + i];
    const x = M[0x0202 + i];
    if (x === 0) return;
    const q = ptr(0x70);
    if ((M[q] & 0x03) !== 0x03) { M[q] = (M[q] + 1) & 0xFF; M[0x58] = x; }
    P.N.water++;
    const s = M[0x5D] - 3; M[0x5D] = s & 0xFF;
    if (s < 0) return;
  }
};

// Every cell on the list that has filled flows on and becomes full water, leaving the list
// (water_flow, $244E).
P.water_flow = function () {
  M[0x5D] = 0; M[0x6E] = 0;
  for (;;) {                                               // j_2454
    const i = M[0x5D];
    M[0x70] = M[0x0200 + i]; M[0x71] = M[0x0201 + i]; M[0x5A] = M[0x0202 + i];
    if (M[0x5A] === 0) return;
    P.N.flow++;
    // the neighbours' pointers, each sum carrying from the last: above, below, left, right
    let s, c;
    s = M[0x70] - 0x5A; M[0x72] = s & 0xFF; c = s < 0 ? 0 : 1;
    s = M[0x71] - 1 + c; M[0x73] = s & 0xFF; c = s < 0 ? 0 : 1;
    s = M[0x70] + 0x59 + c; M[0x74] = s & 0xFF; c = s >> 8;
    s = M[0x71] + c; M[0x75] = s & 0xFF; c = s >> 8;
    s = M[0x70] - 1 + c; M[0x76] = s & 0xFF; c = s < 0 ? 0 : 1;
    s = M[0x71] - 1 + c; M[0x77] = s & 0xFF; c = s < 0 ? 0 : 1;
    s = M[0x70] + c; M[0x78] = s & 0xFF; c = s >> 8;
    s = M[0x71] + c; M[0x79] = s & 0xFF;
    M[0x5C] = 0;
    const q = ptr(0x70), v = M[q];
    if (v === 0x6B) { M[q] = 0x6C; P.flow_right(); P.flow_down(); P.flow_up(); }
    else if (v === 0x67) { M[q] = 0x6C; P.flow_left(); P.flow_down(); P.flow_up(); }
    else if (v === 0x63) { M[q] = 0x6C; P.flow_left(); P.flow_right(); P.flow_down(); }
    else if (v === 0x5F) { P.flow_left(); P.flow_right(); P.flow_up(); }
    else M[0x5C] = (M[0x5C] + 1) & 0xFF;                   // still filling
    let a;
    if (M[0x5C] === 0) { P.drop_water(); a = M[0x5D]; }    // j_24F4
    else { a = (M[0x5D] + 3) & 0xFF; M[0x5D] = a; }
    if (a > M[0x5B]) return;                               // j_2507
  }
};

// Water into the open cell left of $70 ($64), right of it ($68), below it ($60, a row deeper), or
// above it (flow_left, $2511; flow_right; flow_down; flow_up).
P.flow_left = function () {
  const q = ptr(0x76), v = M[q];
  if (!OPEN(v)) return { a: v };
  M[q] = 0x64;
  return P.add_water({ x: 0x06 });
};
P.flow_right = function () {
  const q = ptr(0x78), v = M[q];
  if (!OPEN(v)) return { a: v };
  M[q] = 0x68;
  return P.add_water({ x: 0x08 });
};
P.flow_down = function () {
  const q = ptr(0x74);
  let a = M[q];
  if (!OPEN(a)) return { a };
  for (;;) {
    M[q] = 0x60;                                           // b_2549
    M[0x5A] = (M[0x5A] + 1) & 0xFF;
    a = P.add_water({ x: 0x04 }).a;
    const x = M[0x5A];
    M[0x5A] = (M[0x5A] - 1) & 0xFF;
    if (x >= M[0x58]) { M[0x58] = x; return { a, x }; }
    // b_255F with A as add_water left it: a list index of $6F or $A2 sends it round again
    if (a !== 0xA3 && a !== 0x6F && a !== 0xA2) return { a, x };
  }
};
P.flow_up = function () {
  const q = ptr(0x72), v = M[q];
  if (OPEN(v)) {
    if (((M[0x5A] - 1) & 0xFF) < M[0x57] && M[0x58] !== 0) {   // not yet: a rising edge
      M[ptr(0x70)] = 0x5F;
      M[0x5C] = (M[0x5C] + 1) & 0xFF;
      return;
    }
    M[q] = 0x5C;                                           // b_258E
    M[0x5A] = (M[0x5A] - 1) & 0xFF;
    P.add_water({ x: 0x02 });
    M[0x5A] = (M[0x5A] + 1) & 0xFF;
    const x = (M[0x5A] - 1) & 0xFF;
    if (x < M[0x57]) M[0x57] = x;
  }
  M[ptr(0x70)] = 0x6C;                                     // b_25A4
};

// The cell at index $5D off the list (drop_water, $25A9).
P.drop_water = function () {
  let x = M[0x5D];
  do {
    M[0x0200 + x] = M[0x0203 + x]; M[0x0201 + x] = M[0x0204 + x]; M[0x0202 + x] = M[0x0205 + x];
    x = (x + 3) & 0xFF;
    P.N.drop++;
  } while (x <= M[0x5B]);
  if (M[0x5B] !== 0) M[0x5B] = (M[0x5B] - 3) & 0xFF;
};

// The cell whose address is at $70 + X onto the list at its row ($5A), deeper rows first; $5D moved
// on when the cell went in at or before it; $6E set (add_water, $25CF). Returns A as the game's
// code leaves it: $5D when that moved, else $5B.
P.add_water = function (r = {}) {
  const x = r.x || 0;
  let y = 0;
  for (;;) {                                               // b_25D1
    const v = M[0x0202 + y];
    if (v === 0) break;
    if (v < M[0x5A]) { y = shift(y); break; }
    y = (y + 3) & 0xFF;
    if (y === 0) { y = shift(0); break; }
  }
  M[0x0200 + y] = M[(0x70 + x) & 0xFF]; M[0x0201 + y] = M[(0x71 + x) & 0xFF];   // b_2603
  M[0x0202 + y] = M[0x5A];
  let s = M[0x5B] + 3; M[0x5B] = s & 0xFF;
  let a = s & 0xFF, c = s >> 8;
  if (y <= M[0x5D]) { s = M[0x5D] + 3; M[0x5D] = a = s & 0xFF; c = s >> 8; }
  else c = 1;
  M[0x6E] = 0xFF;
  P.N.add++;
  return { a, x, y: 0, c };
};
// add_water from b_25DF: the cells from index at on move down one place; returns at.
function shift(at) {
  M[0x6F] = at;
  let y = M[0x5B];
  for (;;) {                                               // b_25E3
    M[0x0203 + y] = M[0x0200 + y]; M[0x0204 + y] = M[0x0201 + y]; M[0x0205 + y] = M[0x0202 + y];
    y = (y - 3) & 0xFF;
    P.N.add++;
    if (y === 0xFD || y < M[0x6F]) break;
  }
  return (y + 3) & 0xFF;
}
};
})(typeof window !== 'undefined' ? window : globalThis);
