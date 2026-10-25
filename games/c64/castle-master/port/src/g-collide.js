// Collision ($4FA3-$5DD0, $803D-$8213): a step from where the player stands ($2407-$240C, x y z,
// 16 bits each, a world byte being 64 units) to where they would go ($104C-$1051), swept as a box
// the collision radius ($1048) wide and the player's height ($2413) tall. The sweep meets each
// object's faces that it crosses (the far point on the line found by a multiply and a divide);
// the nearest blocking face stops the step short of it, a face no higher than a step lets the
// player climb it, the floor below is found again, and a drop longer than the fall limit costs
// strength. An object that moves onto the player crushes them.
//
// An object record is: flags (bit 6 hidden, bit 4 moved, low nibble its kind), x y z, its size
// across, up and deep, its number, and its length. The step's scratch is the game's ($4F5A-$4FA2:
// the step $4F5A, the sweep's far and near corners $4F60 and $4F66, the face's point $4F6C, the
// best stop and its sides $4F7E-$4F8F, the floor's point $4F90, the step's direction bits $4F96:
// 1/2 x down/up, 4/8 y, $10/$20 z), kept at its addresses since the routines share it.
//
// Two of the game's routines leave by their caller's caller (they pull return addresses off the
// stack): a first blocking face when the radius is 0 ends the whole step, and an object found
// where the player would be pushed back ends the push. The port returns { escape: true } there,
// and each caller between passes it up.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.collide = function (P) {
  const M = P.M;
  const w = a => M[a] | M[a + 1] << 8;
  const setw = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
  // the sign of a 16-bit difference, as the 6502's N after the high bytes' SBC
  const neg = v => (v & 0x8000) !== 0;
  const rec = i => M[(w(0x7E) + i) & 0xFFFF];
  const next = (zp, x) => { setw(zp, w(zp) + M[(w(zp) + 8) & 0xFFFF]); return (x - 1) & 255; };
  // SCALE_WORLD_BYTE_BY_64 into $82/$83 (a sum of two bytes keeps only its low byte, as the
  // game adds them in A first)
  const sc = v => { v &= 255; M[0x83] = v >> 2; M[0x82] = (v & 3) << 6; return M[0x82] | M[0x83] << 8; };
  const swapw = (a, b) => { const t = w(a); setw(a, w(b)); setw(b, t); };
  // (n times $8C) over $8C again, through the game's own 32-bit multiply and divide: the line's
  // other coordinate where it crosses a face. $88/$89 is set to n first, as the game does.
  const ratio = (n, mul, div) => {
    setw(0x88, n); M[0x8C] = M[mul]; M[0x8D] = M[mul + 1];
    P.MUL_S16_S16_TO_S32({ a: M[0x8D] });
    for (let i = 0; i < 4; i++) M[0x88 + i] = M[0x82 + i];
    M[0x8C] = M[div]; M[0x8D] = M[div + 1];
    P.DIV_S32_BY_S16({ a: M[0x8D] });
    return w(0x88);
  };
  // the radius in $84/$85, and its negative
  const radius = () => { M[0x84] = M[0x1048]; M[0x85] = 0; };
  const negRadius = () => { M[0x84] = (-M[0x84]) & 255; if (M[0x84]) M[0x85] = 0xFF; };

  P.SCALE_WORLD_BYTE_BY_64 = r => { sc(r.a); return { a: M[0x82], x: r.x, y: r.y, c: 0 }; };

  // COMPUTE_MANHATTAN_DISTANCE_FROM_PLAYER: |dx| + |dy| + |dz| from the player to the point at
  // X/Y (low, high), into $82/$83; the point's address goes in the LDAs' operands.
  P.COMPUTE_MANHATTAN_DISTANCE_FROM_PLAYER = function (r) {
    M[0x5564] = M[0x556E] = r.x; M[0x5565] = M[0x556F] = r.y;
    const at = r.x | r.y << 8;
    M[0x82] = 0; M[0x83] = 0;
    for (let i = 0; i < 6; i += 2) {
      let d = ((M[(at + i) & 0xFFFF] | M[(at + i + 1) & 0xFFFF] << 8) - w(0x2407 + i)) & 0xFFFF;
      if (d & 0x8000) d = (-d) & 0xFFFF;
      setw(0x84, d);
      setw(0x82, w(0x82) + d);
    }
    return { a: M[0x83], x: 6, y: r.y, c: 1 };
  };

  // SCAN_OBJECTS_FOR_COLLISION: the point the step was pushed back to ($4F84) tried against every
  // object of the area and of the shared list; inside one, the push is abandoned (the step stays
  // where it was stopped), otherwise the step goes to it, with the bump's sound.
  P.SCAN_OBJECTS_FOR_COLLISION = function (r) {
    let y = r.y, o;
    for (const [n, list] of [[0x242A, 0x242B], [0x1060, 0x1061]]) {
      if (!M[n]) continue;
      setw(0x7E, w(list));
      o = P.SCAN_OBJECT_LIST_FOR_CANDIDATE_OVERLAP({ a: M[0x7F], x: M[n], y });
      if (o.escape) return { a: o.a, x: o.x, y: o.y };
      y = o.y;
    }
    M[0x105D] = 0;
    for (let i = 5; i >= 0; i--) M[0x104C + i] = M[0x4F84 + i];
    M[0x105E] = 0x0C;
    return { a: 0x0C, x: 0xFF, y };
  };
  P.SCAN_OBJECT_LIST_FOR_CANDIDATE_OVERLAP = function (r) {
    let x = r.x;
    do {
      if (!(rec(0) & 0x40)) {
        setw(0x82, sc(rec(2)) - w(0x4F97));
        if (neg(w(0x82) - w(0x4F86)) && neg(w(0x4F86) - sc(rec(2) + rec(5))) &&
            !neg(w(0x4F84) - sc(rec(1))) && !neg(sc(rec(1) + rec(4)) - w(0x4F84) - 1) &&
            !neg(w(0x4F88) - sc(rec(3))) && !neg(sc(rec(3) + rec(6)) - w(0x4F88) - 1)) {
          return { a: 0x54, x, y: 6, escape: true };
        }
      }
      x = next(0x7E, x);
    } while (x);
    return { a: M[0x7E], x: 0, y: 8 };
  };

  // CONSIDER_BLOCKING_FACE_CANDIDATE: the face's stop point ($4F6C, its sides $4F72 and $4F78)
  // kept if it is nearer the player than the best so far ($4F7E); at the same distance a solid
  // kind (3, or 10 and up: 2) beats another (1), and of two alike the one whose top is lower.
  P.CONSIDER_BLOCKING_FACE_CANDIDATE = function (r) {
    P.COMPUTE_MANHATTAN_DISTANCE_FROM_PLAYER({ a: r.a, x: 0x7E, y: 0x4F });
    const d1 = w(0x82);
    P.COMPUTE_MANHATTAN_DISTANCE_FROM_PLAYER({ a: M[0x83], x: 0x6C, y: 0x4F });
    setw(0x82, d1 - w(0x82));
    if (M[0x83] & 0x80) return { a: M[0x83], x: 6, y: 0x4F };
    const t = rec(0) & 0x0F;
    const x = t === 3 || t >= 0x0A ? 2 : 1;
    if (!(M[0x82] | M[0x83]) && M[0x4F99]) {
      if (x === M[0x4F99]) { if (!neg(w(0x4F86) - w(0x4F74))) return { a: M[0x4F87], x, y: 0 }; }
      else if (x < M[0x4F99]) return { a: 0, x, y: 0 };
    }
    M[0x4F99] = x;
    M[0x1082] = rec(7);
    M[0x105D] = 1;
    for (let i = 5; i >= 0; i--) { M[0x4F84 + i] = M[0x4F72 + i]; M[0x4F8A + i] = M[0x4F78 + i]; M[0x4F7E + i] = M[0x4F6C + i]; }
    if (M[0x1048]) return { a: M[0x1048], x: 0xFF, y: 7 };
    return { a: 0x53, x: 0, y: 7, escape: true };
  };

  // FIND_NEAREST_SUPPORT_BELOW_POINT: the highest top of an object under the point $4F90 (x, z)
  // and no higher than its y: the drop to it in $4F9B, the object in $4F9D and its number in
  // $4F9F (0: none).
  P.FIND_NEAREST_SUPPORT_BELOW_POINT = function (r) {
    M[0x4F9B] = M[0x4F92]; M[0x4F9C] = M[0x4F93]; M[0x4F9F] = 0;
    let o = { a: 0, x: r.x, y: r.y };
    for (const [n, list] of [[0x242A, 0x242B], [0x1060, 0x1061]]) {
      if (!M[n]) { o.x = 0; continue; }
      setw(0x7E, w(list));
      o = P.SCAN_OBJECT_LIST_FOR_NEAREST_SUPPORT({ a: M[0x7F], x: M[n], y: o.y });
    }
    return o;
  };
  P.SCAN_OBJECT_LIST_FOR_NEAREST_SUPPORT = function (r) {
    let x = r.x;
    do {
      support: if (!(rec(0) & 0x40)) {
        setw(0x84, w(0x4F92) - sc(rec(2) + rec(5)));
        if (M[0x85] & 0x80) break support;
        if (neg(w(0x4F90) - sc(rec(1))) || neg(sc(rec(1) + rec(4)) - w(0x4F90))) break support;
        if (neg(w(0x4F94) - sc(rec(3))) || neg(sc(rec(3) + rec(6)) - w(0x4F94))) break support;
        setw(0x82, w(0x4F9B) - w(0x84));
        if (M[0x83] & 0x80) break support;
        M[0x4F9B] = M[0x84]; M[0x4F9C] = M[0x85];
        if (!(M[0x82] | M[0x83])) { const t = rec(0) & 0x0F; if (t !== 3 && t < 0x0A) break support; }
        M[0x4F9D] = M[0x7E]; M[0x4F9E] = M[0x7F]; M[0x4F9F] = rec(7);
      }
      x = next(0x7E, x);
    } while (x);
    return { a: M[0x7E], x: 0, y: 8 };
  };

  // SCAN_ALL_OBJECTS_FOR_BLOCKING_FACES: every object of the area and of the shared list.
  P.SCAN_ALL_OBJECTS_FOR_BLOCKING_FACES = function (r) {
    let o = { a: r.a, x: r.x, y: r.y };
    for (const [n, list] of [[0x242A, 0x242B], [0x1060, 0x1061]]) {
      if (!M[n]) { o.x = 0; continue; }
      setw(0x7E, w(list));
      o = P.SCAN_OBJECT_LIST_FOR_BLOCKING_FACES({ a: M[0x7F], x: M[n], y: o.y });
      if (o.escape) return o;
    }
    return o;
  };

  // SCAN_OBJECT_LIST_FOR_BLOCKING_FACES: for each object the sweep's box meets, the face it moves
  // towards on each axis, if the step's line crosses it inside the face (grown by the radius, and
  // by the player's height below); 'next' leaves the object, 'fall' tries the next axis.
  const faceX = () => {
    let a;
    radius();
    if (M[0x4F96] & 1) a = rec(1) + rec(4);
    else if (M[0x4F96] & 2) { negRadius(); a = rec(1); }
    else return 'fall';
    setw(0x4F6C, sc(a) + w(0x84));
    if (!neg(w(0x4F66) - w(0x4F6C)) || neg(w(0x4F60) - w(0x4F6C))) return 'fall';
    const z = w(0x240B) + ratio(w(0x4F6C) - w(0x2407), 0x4F5E, 0x4F5A);
    setw(0x4F70, z); setw(0x4F76, z); setw(0x4F7C, z);
    setw(0x82, sc(rec(3)) - M[0x1048]);
    if (neg(w(0x4F70) - w(0x82))) return M[0x4F96] & 0x10 ? 'next' : 'fall';
    setw(0x82, sc(rec(3) + rec(6)) + M[0x1048]);
    if (!neg(w(0x4F70) - w(0x82))) return M[0x4F96] & 0x20 ? 'next' : 'fall';
    const y = w(0x2409) + ratio(w(0x4F6C) - w(0x2407), 0x4F5C, 0x4F5A);
    setw(0x4F6E, y); setw(0x4F7A, y);
    const v = sc(rec(2));
    setw(0x84, w(0x4F6E) + w(0x4F97));
    if (neg(w(0x84) - v)) return M[0x4F96] & 4 ? 'next' : 'fall';
    if (!neg(w(0x4F6E) - sc(rec(2) + rec(5)))) return M[0x4F96] & 8 ? 'next' : 'fall';
    M[0x4F74] = M[0x82]; M[0x4F75] = M[0x83];
    M[0x4FA0]++;
    setw(0x4F72, w(0x4F6C) - M[0x4FA0]); setw(0x4F78, w(0x4F6C) + M[0x4FA0]);
    if (!(M[0x4F96] & 1)) swapw(0x4F72, 0x4F78);
    M[0x4FA0]--;
    return P.CONSIDER_BLOCKING_FACE_CANDIDATE({}).escape ? 'escape' : 'next';
  };
  const faceY = () => {
    let a;
    radius();
    if (M[0x4F96] & 4) a = rec(2) + rec(5);
    else if (M[0x4F96] & 8) { negRadius(); a = rec(2); }
    else return 'fall';
    setw(0x4F6E, sc(a) + w(0x84));
    if (!neg(w(0x4F68) - w(0x4F6E)) || neg(w(0x4F62) - w(0x4F6E))) return 'fall';
    const z = w(0x240B) + ratio(w(0x4F6E) - w(0x2409), 0x4F5E, 0x4F5C);
    setw(0x4F70, z); setw(0x4F7C, z);
    setw(0x82, sc(rec(3)) - M[0x1048]);
    if (neg(w(0x4F70) - w(0x82))) return M[0x4F96] & 0x10 ? 'next' : 'fall';
    setw(0x82, sc(rec(3) + rec(6)) + M[0x1048]);
    if (!neg(w(0x4F70) - w(0x82))) return M[0x4F96] & 0x20 ? 'next' : 'fall';
    const x = w(0x2407) + ratio(w(0x4F6E) - w(0x2409), 0x4F5A, 0x4F5C);
    setw(0x4F6C, x); setw(0x4F78, x);
    setw(0x82, sc(rec(1)) - M[0x1048]);
    if (neg(w(0x4F6C) - w(0x82))) return M[0x4F96] & 1 ? 'next' : 'fall';
    setw(0x82, sc(rec(1) + rec(4)) + M[0x1048]);
    if (!neg(w(0x4F6C) - w(0x82))) return M[0x4F96] & 2 ? 'next' : 'fall';
    setw(0x4F7A, M[0x4F96] & 4 ? w(0x4F6E) + M[0x1048] : w(0x4F6E) - M[0x1048]);
    return P.CONSIDER_BLOCKING_FACE_CANDIDATE({}).escape ? 'escape' : 'next';
  };
  const faceZ = () => {
    let a;
    radius();
    if (M[0x4F96] & 0x10) a = rec(3) + rec(6);
    else if (M[0x4F96] & 0x20) { negRadius(); a = rec(3); }
    else return 'next';
    setw(0x4F70, sc(a) + w(0x84));
    if (!neg(w(0x4F6A) - w(0x4F70)) || neg(w(0x4F64) - w(0x4F70))) return 'next';
    const x = w(0x2407) + ratio(w(0x4F70) - w(0x240B), 0x4F5A, 0x4F5E);
    setw(0x4F6C, x); setw(0x4F72, x); setw(0x4F78, x);
    setw(0x82, sc(rec(1)) - M[0x1048]);
    if (neg(w(0x4F6C) - w(0x82))) return 'next';
    setw(0x82, sc(rec(1) + rec(4)) + M[0x1048]);
    if (!neg(w(0x4F6C) - w(0x82))) return 'next';
    const y = w(0x2409) + ratio(w(0x4F6C) - w(0x2407), 0x4F5C, 0x4F5A);
    setw(0x4F6E, y); setw(0x4F7A, y);
    const v = sc(rec(2));
    setw(0x84, w(0x4F6E) + w(0x4F97));
    if (neg(w(0x84) - v)) return 'next';
    if (!neg(w(0x4F6E) - sc(rec(2) + rec(5)))) return 'next';
    M[0x4F74] = M[0x82]; M[0x4F75] = M[0x83];
    M[0x4FA0]++;
    setw(0x4F76, w(0x4F70) - M[0x4FA0]); setw(0x4F7C, w(0x4F70) + M[0x4FA0]);
    if (!(M[0x4F96] & 0x10)) swapw(0x4F76, 0x4F7C);
    M[0x4FA0]--;
    return P.CONSIDER_BLOCKING_FACE_CANDIDATE({}).escape ? 'escape' : 'next';
  };
  P.SCAN_OBJECT_LIST_FOR_BLOCKING_FACES = function (r) {
    let x = r.x;
    do {
      if (!(rec(0) & 0x40) &&
          neg(sc(rec(1)) - w(0x4F60)) && neg(w(0x4F66) - sc(rec(1) + rec(4))) &&
          neg(sc(rec(2)) - w(0x4F62)) && neg(w(0x4F68) - sc(rec(2) + rec(5))) &&
          neg(sc(rec(3)) - w(0x4F64)) && neg(w(0x4F6A) - sc(rec(3) + rec(6)))) {
        let f = faceX();
        if (f === 'fall') f = faceY();
        if (f === 'fall') f = faceZ();
        if (f === 'escape') return { a: 0x53, x: 0, y: 7, escape: true };
      }
      x = next(0x7E, x);
    } while (x);
    return { a: 1, x: 0, y: 8 };
  };

  // SOLVE_PLAYER_COLLISION: the step from $2407 to $104C made, stopped or slid; X is 1 when the
  // player moved. Outside the world's square ($1FC0 on x and z) only a step back in is checked.
  const inside = (xa, za) => !(M[xa + 1] & 0x80) && neg(w(xa) - 0x1FC0) && !(M[za + 1] & 0x80) && neg(w(za) - 0x1FC0);
  const commit = y => {
    M[0x2417] = inside(0x104C, 0x1050) ? 0 : 1;
    let a = 0;
    for (let i = 0; i < 6; i++) {
      a = M[0x104C + i];
      if (a !== M[0x2407 + i]) {
        for (let j = 5; j >= 0; j--) M[0x2407 + j] = M[0x104C + j];
        return { a: M[0x104C], x: 1, y: 0xFF };
      }
    }
    return { a, x: 0, y };
  };
  P.SOLVE_PLAYER_COLLISION = function (r) {
    let y = r.y;
    if (M[0x1048]) {
      for (const a of [M[0x104D], M[0x1051]]) if (a === 0x7F || a === 0x9F) return { a, x: 0, y };
      const x = (inside(0x104C, 0x1050) ? 2 : 0) + (inside(0x2407, 0x240B) ? 1 : 0);
      if (x !== 1 && x !== 3) return commit(y);
    }
    M[0x4FA2] = 3;
    for (const a of [0x4F99, 0x4F9A, 0x4F9F, 0x4F97, 0x4F98, 0x4FA1]) M[a] = 0;
    M[0x4F86] = M[0x4F87] = 0xFF;
    M[0x4FA0] = M[0x1048] ? M[0x1048] - 1 : 0;
    if (!M[0x2418]) {
      M[0x4F9A] = 2;
      for (let i = 5; i >= 0; i--) M[0x4F90 + i] = M[0x2407 + i];
      sc(M[0x2413]); M[0x4F97] = M[0x82]; M[0x4F98] = M[0x83];
    }
    // the sweep's box on each axis, and the step's direction bits
    setw(0x82, w(0x4FA0) << 1);
    let x = 0;
    for (y of [4, 2, 0]) {
      x = (x << 2) & 255;
      setw(0x4F60 + y, w(0x104C + y) + w(0x4FA0));
      setw(0x4F66 + y, w(0x2407 + y) - w(0x4FA0));
      M[0x4F7E + y] = M[0x4F8A + y] = M[0x104C + y]; M[0x4F7F + y] = M[0x4F8B + y] = M[0x104D + y];
      setw(0x4F5A + y, w(0x104C + y) - w(0x2407 + y));
      if (M[0x4F5B + y] & 0x80) {
        x++;
        const near = w(0x4F66 + y);
        setw(0x4F66 + y, w(0x4F60 + y) - w(0x82));
        setw(0x4F60 + y, near + w(0x82));
      } else if (M[0x4F5A + y] | M[0x4F5B + y]) x += 2;
    }
    y = 0xFE;
    if (!x) return { a: 0, x: 0, y: 0xFE };
    M[0x4F96] = x;
    if (!M[0x2418]) {
      // on foot: the box raised to the step's height, then the floor found under the step, and
      // the step slid along the edge of what it stands on until it is on it or off it
      M[0x4FA0]++;
      setw(0x4F68, w(0x4F68) + w(0x4FA0));
      setw(0x4F62, w(0x4F62) - w(0x4FA0));
      M[0x4FA0]--;
      setw(0x4F62, w(0x4F62) + w(0x4F97));
      for (;;) {
        P.FIND_NEAREST_SUPPORT_BELOW_POINT({});
        if (M[0x4F9B] | M[0x4F9C]) break;
        if (!M[0x4F9F]) { M[0x4F9A] = 0; break; }
        M[0x4FA2]--;
        if (!M[0x4FA2]) break;
        M[0x7E] = M[0x4F9D]; M[0x7F] = M[0x4F9E];
        if (neg(sc(rec(1)) - w(0x104C)) && !neg(sc(rec(1) + rec(4)) - w(0x104C)) &&
            neg(sc(rec(3)) - w(0x1050)) && !neg(sc(rec(3) + rec(6)) - w(0x1050))) {
          for (let i = 5; i >= 0; i--) M[0x4F90 + i] = M[0x104C + i];
          P.FIND_NEAREST_SUPPORT_BELOW_POINT({});
          M[0x4F9A] = 0;
          break;
        }
        let a = -1;
        if (M[0x4F96] & 1) a = rec(1); else if (M[0x4F96] & 2) a = rec(1) + rec(4);
        if (a >= 0) {
          setw(0x4F90, sc(a));
          setw(0x4F94, w(0x240B) + ratio(w(0x4F90) - w(0x2407), 0x4F5E, 0x4F5A));
          if (!neg(w(0x4F94) - sc(rec(3))) && neg(w(0x4F94) - sc(rec(3) + rec(6)))) {
            setw(0x4F90, M[0x4F96] & 1 ? w(0x4F90) - M[0x1048] : w(0x4F90) + M[0x1048]);
            continue;
          }
        }
        if (M[0x4F96] & 0x10) a = rec(3); else if (M[0x4F96] & 0x20) a = rec(3) + rec(6); else break;
        setw(0x4F94, sc(a));
        setw(0x4F90, w(0x2407) + ratio(w(0x4F94) - w(0x240B), 0x4F5A, 0x4F5E));
        setw(0x4F94, M[0x4F96] & 0x10 ? w(0x4F94) - M[0x1048] : w(0x4F94) + M[0x1048]);
      }
    }
    const o = P.SCAN_ALL_OBJECTS_FOR_BLOCKING_FACES({});
    if (o.escape) return { a: 0x53, x: 0, y: o.y };
    y = o.y;
    if (!M[0x1048]) return { a: 0, x: 1, y };
    if (M[0x4F9A]) {
      P.COMPUTE_MANHATTAN_DISTANCE_FROM_PLAYER({ x: 0x90, y: 0x4F });
      const d1 = w(0x82);
      P.COMPUTE_MANHATTAN_DISTANCE_FROM_PLAYER({ x: 0x7E, y: 0x4F });
      if (neg(d1 - w(0x82))) {
        // the floor's point is nearer than any stop: the step goes there, dropping to the floor
        M[0x105D] = 0;
        for (let i = 5; i >= 0; i--) M[0x104C + i] = M[0x4F90 + i];
        const v = w(0x4F92) - w(0x4F9B);
        setw(0x4F92, v); setw(0x104E, v);
        const a = ((w(0x4F9B) << 2) >> 8) & 255;
        M[0x4F9B] = (M[0x4F9B] << 2) & 255;
        if (a === M[0x2414] || ((a - M[0x2414]) & 0x80)) { M[0x1082] = M[0x4F9F]; M[0x105E] = 0x0C; }
        else P.APPLY_FALL_DAMAGE({});
        return commit(y);
      }
    }
    for (let i = 5; i >= 0; i--) M[0x104C + i] = M[0x4F8A + i];
    if (!M[0x1082]) M[0x1082] = M[0x4F9F];
    if (M[0x2418] || (M[0x4F87] & 0x80)) return commit(y);
    // stopped against a face no taller than a step: pushed back to its top, if nothing is there
    const d = w(0x4F86) - w(0x104E);
    M[0x82] = ((d & 255) << 2) & 255;
    const a = (((d & 0xFFFF) << 2) >> 8) & 255;
    if (a <= M[0x2415]) y = P.SCAN_OBJECTS_FOR_COLLISION({ y }).y;
    return commit(y);
  };

  // CHECK_NEWLY_VISIBLE_CRUSH: the player's place in world bytes ($B0-$B2), each moved object
  // tried against it (crushed: the game over with $109B 7, carry set), then the step solved.
  P.CHECK_NEWLY_VISIBLE_CRUSH = function (r) {
    M[0x1086] = 0;
    for (let i = 0; i < 3; i++) {
      M[0x104C + 2 * i] = M[0x2407 + 2 * i]; M[0x104D + 2 * i] = M[0x2408 + 2 * i];
      M[0x82] = (M[0x2407 + 2 * i] << 2) & 255;
      M[0xB0 + i] = ((w(0x2407 + 2 * i) << 2) >> 8) & 255;
    }
    for (const [n, list] of [[0x242A, 0x242B], [0x1060, 0x1061]]) {
      if (!M[n]) continue;
      M[0x7A] = M[list]; M[0x7B] = M[list + 1];
      const o = P.SCAN_UPDATED_OBJECTS_FOR_CRUSH({ x: M[n] });
      if (o.escape) return { a: 0x80, x: o.x, y: o.y, c: 1 };
    }
    const o = P.SOLVE_PLAYER_COLLISION({ y: 8 });
    return { a: o.a, x: o.x, y: o.y, c: 0 };
  };
  const lt = (a, b) => ((a - b) & 0x80) !== 0;
  P.SCAN_UPDATED_OBJECTS_FOR_CRUSH = function (r) {
    let x = r.x;
    const R = i => M[(w(0x7A) + i) & 0xFFFF];
    do {
      crush: if (R(0) & 0x10) {
        M[(w(0x7A)) & 0xFFFF] = R(0) & 0xEF;
        let a = (R(1) - 1) & 255;
        if (!lt(a, M[0xB0])) break crush;
        if (lt((a + R(4)) & 255, M[0xB0])) break crush;
        a = (R(3) - 1) & 255;
        if (!lt(a, M[0xB2])) break crush;
        if (lt((a + R(6)) & 255, M[0xB2])) break crush;
        a = (R(2) - 1) & 255;
        if (!lt(a, M[0xB1])) break crush;
        M[0x82] = M[0xB1];
        if (M[0x2413]) M[0x82] = (M[0xB1] - (M[0x2413] - 1)) & 255;
        if (lt((R(2) - 1 + R(5)) & 255, M[0x82])) break crush;
        M[0x109B] = 7;
        const o = P.CLEAR_LINEAR_30BYTE_ROWS({ x, y: 8, c: 0 });
        P.BLIT_LINEAR_VIEWPORT_TO_VIC_BITMAP({ x: o.x, y: o.y });
        M[0x1059] = 0; M[0x105A] = 0;
        return { a: 0, x: 0xFF, y: 8, escape: true };
      }
      x = next(0x7A, x);
    } while (x);
    return { a: M[0x7A], x: 0, y: 8 };
  };

  // APPLY_FALL_DAMAGE: 5 points of strength lost (none left: the game over, $109B 4), the view
  // cleared to black for a frame, and the thud.
  P.APPLY_FALL_DAMAGE = function (r) {
    M[0x2410] = 0; P.plug.whole(0x2410);
    let a = (P.irqByte(0x2455) - 5) & 255;
    if (a & 0x80) { M[0x109B] = 4; a = 0; }
    M[0x2455] = a;
    const c = P.CLEAR_LINEAR_30BYTE_ROWS({ x: r.x, y: r.y, c: 0 });
    const o = P.BLIT_LINEAR_VIEWPORT_TO_VIC_BITMAP({ x: c.x, y: c.y });
    M[0x105E] = 8;
    return { a: 8, x: o.x, y: o.y };
  };

  // DROP_PLAYER_TO_SUPPORT: the player's feet ($2409 less their height) let fall as a step
  // straight down, flying for once, so that the floor stops them; a drop of a whole step's
  // height or more marks the view and the panel to redraw, and one past the fall limit hurts.
  // The height is snapped to the floor's 32-unit grid.
  P.DROP_PLAYER_TO_SUPPORT = function (r) {
    M[0x1087] = 0;
    M[0x104C] = M[0x2407]; M[0x104D] = M[0x2408]; M[0x1050] = M[0x240B]; M[0x1051] = M[0x240C];
    M[0x104E] = 0; M[0x104F] = 0;
    M[0x2418] = 1;
    M[0x83] = (M[0x2413] - 1) & 255;
    const h = M[0x83] << 6;
    M[0x83] = h >> 8; M[0x82] = h & 255; M[0x816A] = h & 255; M[0x816B] = h >> 8;
    const v = w(0x2409) - h;
    setw(0x8168, v); setw(0x2409, v);
    P.SOLVE_PLAYER_COLLISION({});
    M[0x2418] = 0;
    const a = (((w(0x8168) - w(0x2409)) & 0xFFFF) << 2 >> 8) & 255;
    if (a) {
      M[0x1059] |= 0x14;
      if (a >= M[0x2414]) P.APPLY_FALL_DAMAGE({});
    }
    const s = ((M[0x2409] & 0xC0) | 0x20) + M[0x816A];
    M[0x2409] = s & 255;
    M[0x240A] = (M[0x240A] + M[0x816B] + (s >> 8)) & 255;
    return { a: M[0x240A] };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
