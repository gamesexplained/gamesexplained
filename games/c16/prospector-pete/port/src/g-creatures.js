// The creatures: their step from irq_play (move_creatures), the way each chooses (chase_across,
// chase_updown, move_creature) and the explosions that kill them (creature_blast).
(function (root) {
'use strict';
(root.PeteGroups = root.PeteGroups || {}).creatures = function (P) {
const M = P.M, io = P.io, POLL = P.POLL;
const zw = a => M[a & 0xFF] | M[(a + 1) & 0xFF] << 8;

// Each creature out, 3 to 0 ($96): killed by an explosion, on through its step, or at the end of
// one off another way, after Pete five times in eight (move_creatures, $2778). One shut in on all
// four sides keeps looking for good, and the interrupt never returns: it polls here for ever.
P.move_creatures = function* () {
  M[0x96] = 0x03;
  M[0xB0] = 0;
  for (;;) {                                               // j_2780
    let n = M[0x96];
    P.N.creature++;
    if (M[(0x23 + n) & 0xFF] !== 0) {
      P.creature_blast({ x: n });
      n = M[0x96];
      if (M[(0x23 + n) & 0xFF] !== 0) {
        if (M[(0x28 + n) & 0xFF] < 0x03) M[(0x28 + n) & 0xFF]++;
        else yield* P.b_279D();
      }
    }
    M[0x96] = (M[0x96] - 1) & 0xFF;                        // j_2837
    if (M[0x96] & 0x80) return;
  }
};
// move_creatures from $279D: creature $96 at the end of its step chooses its way.
P.b_279D = function* () {
  const n = M[0x96];
  M[0x97] = (M[0x06] - M[(0x8A + n) & 0xFF]) & 0xFF;
  M[0x98] = (M[0x07] - M[(0x8A + n) & 0xFF]) & 0xFF;     // the column, not the row ($8E)
  M[0x99] = (M[(0x4B + n) & 0xFF] - 1) & 0xFF;
  const k = n << 2 & 0xFF;
  M[0x9C] = k;
  let s = M[(0x30 + k) & 0xFF] - 0x5A; M[0x84] = s & 0xFF;
  M[0x85] = (M[(0x31 + k) & 0xFF] - (s < 0 ? 1 : 0)) & 0xFF;
  const above = M[0x84] | M[0x85] << 8;
  let c = 0;
  for (let x = 3; x >= 0; x--) {                           // b_27C4: the four ways, 0 open
    let v = M[(above + M[0x28AD + x]) & 0x3FFF];
    c = v === 0x6F || v >= 0xA2 ? 1 : 0;                   // the carry the last CMP leaves
    if ((v >= 0x5C && v < 0x6D) || v === 0x6F || v === 0xA2) v = 0;
    M[0x92 + x] = v;
  }
  if ((M[0x98] & M[0x97]) !== 0) {
    c = 1;
    if (((io.read(0xFF00) ^ io.read(0xFF02)) & 0x07) < 0x05) {
      const across = !((io.read(0xFF1E) ^ io.read(0xFF00)) & 1);
      if (across) {
        if (!P.chase_across().c) return;
        if (!P.chase_updown().c) return;
      } else {                                             // b_2807
        if (!P.chase_updown().c) return;
        if (!P.chase_across().c) return;
      }
    }
  }
  M[0x9B] = 0x01;                                          // b_2811: another way, from a random one
  let a = ((io.read(0xFF1E) ^ io.read(0xFF00)) + io.read(0xFF1D) + c) & 0xFF;
  if (!(M[0x92] === 0 || M[0x93] === 0 || M[0x94] === 0 || M[0x95] === 0)) for (;;) yield POLL;   // shut in
  let x;
  for (;;) {                                               // b_281E
    x = a & 0x03;
    if (M[0x92 + x] === 0) {
      if (M[0x28B1 + x] !== M[0x99]) break;                // b_2829: not straight back
      M[0x9B] = (M[0x9B] - 1) & 0xFF;
      if (M[0x9B] !== 0) break;                            // back, when nothing else is open
    }
    a = (x + 1) & 0xFF;                                    // b_2825
  }
  P.move_creature({ x });
};

// Creature $96 starts a move in direction X + 1 (move_creature, $283F).
P.move_creature = function (r) {
  const d = (r.x + 1) & 0xFF;
  M[0x9A] = d;
  const k = M[0x9C], n = M[0x96];
  M[(0x32 + k) & 0xFF] = M[(0x30 + k) & 0xFF]; M[(0x33 + k) & 0xFF] = M[(0x31 + k) & 0xFF];
  M[(0x28 + n) & 0xFF] = 0;
  M[(0x4B + n) & 0xFF] = d;
  const row = (0x8E + n) & 0xFF, col = (0x8A + n) & 0xFF;
  // the branches after each INC and DEC go on when the result is 0, as the 6502's do
  let at = d >= 0x03 ? (d === 0x03 ? 2 : 3) : (d === 0x01 ? 1 : 0);
  for (;;) {
    if (at === 0) { M[row] = (M[row] + 1) & 0xFF; if (M[row] !== 0) break; at = 1; }
    else if (at === 1) { M[row] = (M[row] - 1) & 0xFF; if (M[row] !== 0) break; at = 2; }
    else if (at === 2) { M[col] = (M[col] - 1) & 0xFF; if (M[col] !== 0) break; at = 3; }
    else { M[col] = (M[col] + 1) & 0xFF; break; }
  }
  const s = M[0x28AC + d] + M[0x84];                      // b_286E: its new cell
  M[(0x30 + k) & 0xFF] = s & 0xFF;
  const t = M[0x85] + (s >> 8);
  M[(0x31 + k) & 0xFF] = t & 0xFF;
  return { a: t & 0xFF, x: k, c: t >> 8 };
};

// After Pete across ($97) or up and down ($98): carry clear when the creature moved (chase_across,
// $2880; chase_updown, $2899).
P.chase_across = function () { return chase(M[0x97] & 0x80 ? 0x02 : 0x03); };
P.chase_updown = function () { return chase(M[0x98] & 0x80 ? 0x00 : 0x01); };
function chase(x) {
  if (M[0x92 + x] !== 0 || M[0x28B1 + x] === M[0x99]) return { c: 1 };
  P.move_creature({ x });
  return { c: 0 };
}

// Creature X is killed if its cell is an explosion: the one it leaves for steps 0 and 1, the one
// it enters after (creature_blast, $28B5).
P.creature_blast = function (r) {
  const k = r.x << 2 & 0xFF;
  M[0x9C] = k;
  const v = M[(M[(0x28 + r.x) & 0xFF] < 0x02 ? zw(0x32 + k) : zw(0x30 + k)) & 0x3FFF];
  if (v !== 0xA2) return;
  M[(0x23 + M[0x96]) & 0xFF] = 0;
  M[0xB0] = (M[0xB0] + 1) & 0xFF;
};
};
})(typeof window !== 'undefined' ? window : globalThis);
