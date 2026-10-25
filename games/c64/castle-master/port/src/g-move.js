// Moving and looking ($5DD8-$61A5): the actions the controls give. 3 and 4 step forward and back
// along the facing ($2411, 72 steps a turn, the sine and cosine at $123C), at the speed of the
// movement mode, as a step for the collision solver with the feet raised to the step's height
// (so that a low step is climbed); 5 and 6 turn, 7 and 8 look up and down ($2410, kept out of
// the band $12-$35), 12 levels the view in four frames, 13 turns about. 9, 10 and 11 choose
// crawling, walking or running: strength below 3 allows only crawling and below 5 not running,
// and standing up needs room above. Each prints its word in the panel, and marks the view and
// the panel to be redrawn ($1059, $105A).
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.move = function (P) {
  const M = P.M;
  const w = a => M[a] | M[a + 1] << 8;
  const setw = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
  // the product in $82-$84 times 4, as the game shifts it
  const times4 = () => {
    for (let i = 0; i < 2; i++) {
      const c0 = M[0x82] >> 7, c1 = M[0x83] >> 7;
      M[0x82] = (M[0x82] << 1) & 255; M[0x83] = (M[0x83] << 1 | c0) & 255; M[0x84] = (M[0x84] << 1 | c1) & 255;
    }
  };

  // PRESENT_ACTION_FEEDBACK: the panel's picture of the action, frame Y.
  P.PRESENT_ACTION_FEEDBACK = function (r) {
    M[0x7A] = 0xB0; M[0x7B] = 0x1F; M[0x7C] = 0x65; M[0x7D] = 0x1D;
    const o = P.BLIT_PACKED_2BPP_GRAPHIC({ a: r.y, x: 1, y: r.y, c: r.c });
    M[0x1081] = 0;
    return { a: 0, x: o.x, y: o.y, c: o.c };
  };

  P.DISPATCH_PLAYER_MOVEMENT = function* (r) {
    const act = r.a;
    let x = r.x, y = r.y;
    M[0x5DD3] = 0; M[0x5DD4] = 0;
    const tail = () => {
      M[0x1059] |= M[0x5DD3]; M[0x105A] |= M[0x5DD4];
      return { a: M[0x105A], x, y };
    };
    const moved = () => { M[0x1084] |= 1; return tail(); };
    // the mode's word in the panel, and its click
    const word = () => {
      M[0x1063] = 0x32; M[0x7C] = 0x6F; M[0x7D] = 0x1D;
      const o = P.DRAW_TEXT_TO_BITMAP({ a: 0x0F, x: 2, y });
      const s = P.SID_INITIALIZE_IF_ENABLED({ a: 3, x: o.x, y: o.y });
      x = s.x === undefined ? o.x : s.x; y = s.y === undefined ? o.y : s.y;
      M[0x5DD4] = 0x20;
      return tail();
    };
    const mode = [0x09, 0x0A, 0x0B].indexOf(act);
    M[0x7E] = 0xD0 + 0x10 * (mode < 0 ? 2 : mode);
    if (mode >= 0) {
      x = mode;
      if (x === M[0x2456]) { M[0x7F] = 0x14; return word(); }
      M[0x7E] = 0xC0; M[0x7F] = 0x14;
      M[0x5DD5] = x;
      const s = P.irqByte(0x2455);
      if (s < 3) { if (x !== 0) return word(); }
      else if (s < 5 && x === 2) return word();
      if (!M[0x2456]) {
        // standing up from a crawl: the head raised as a step straight up, flying, must not be
        // stopped
        M[0x104C] = M[0x2407]; M[0x104D] = M[0x2408]; M[0x1050] = M[0x240B]; M[0x1051] = M[0x240C];
        const h = M[0x2416] << 6;
        M[0x5DD1] = h >> 8;
        const lo = (h & 255) + M[0x2409];
        M[0x104E] = lo & 255;
        M[0x5DD2] = M[0x240A];
        M[0x104F] = (M[0x240A] + M[0x5DD1] + (lo >> 8)) & 255;
        const want = [M[0x104E], M[0x104F]];
        M[0x5DD1] = M[0x2409];
        M[0x2418] = 1;
        P.SOLVE_PLAYER_COLLISION({ a: 1, x, y: 0x14 });
        M[0x2418] = 0;
        if (want[0] !== M[0x2409] || want[1] !== M[0x240A]) {
          M[0x2409] = M[0x5DD1]; M[0x240A] = M[0x5DD2];
          M[0x7E] = 0xB0; M[0x7F] = 0x14;
          return word();
        }
        M[0x2412] = (M[0x2412] + 1) & 255;
        M[0x2413] = (M[0x2413] + M[0x2416]) & 255;
      }
      const m = M[0x5DD5];
      M[0x2456] = m;
      M[0x7E] = 0xE0; M[0x7F] = 0x14;
      if (m !== 1) {
        M[0x7E] = 0xF0;
        if (m === 0) {
          // down to a crawl: the eye lowered by a step's height
          M[0x2412] = (M[0x2412] - 1) & 255;
          M[0x2413] = (M[0x2413] - M[0x2416]) & 255;
          const h = M[0x2416] << 6;
          M[0x5DD2] = h >> 8; M[0x5DD1] = h & 255;
          setw(0x2409, w(0x2409) - h);
          M[0x7E] = 0xD0;
        }
      }
      M[0x240F] = M[0x9D46 + M[0x2456]];
      P.MUL_S16_S8_TO_S24({ a: M[0x240F], x: 0, y: M[0x2416] });
      M[0x240D] = M[0x82]; M[0x240E] = M[0x83];
      M[0x5DD3] = 0x14;
      return word();
    }
    if (act === 3 || act === 4) {
      // a step along the facing: the speed (running backwards at the walk's) times the sine and
      // the cosine, the feet raised to a step's height for the solver and lowered after
      x = M[0x240D]; y = M[0x240E];
      if (act === 4 && M[0x2456] === 2) {
        P.MUL_S16_S8_TO_S24({ a: M[0x9D47], x: 0, y: M[0x2416] });
        x = M[0x82]; y = M[0x83];
      }
      M[0x5DD6] = x; M[0x5DD7] = y;
      // the sine or cosine at the facing, between two steps when it stands between them (P.trig);
      // plug-in point: the share of the step this loop takes
      const along = t => {
        P.MUL_S16_S8_TO_S24({ a: M[0x5DD6], x: M[0x5DD7], y: P.trig(t, 0x2411) });
        times4();
        let v = M[0x83] | M[0x84] << 8;
        if (act === 4) { v = (-v) & 0xFFFF; M[0x84] = v >> 8; M[0x83] = v & 255; }
        return P.plug.step(t, (v << 16) >> 16);
      };
      M[0x5DD1] = (M[0x2411] << 1) & 255;
      setw(0x1050, along(0x123D) + w(0x240B));
      P.PRESENT_ACTION_FEEDBACK({ y: act === 3 ? 9 : 10 });
      setw(0x104C, along(0x123C) + w(0x2407));
      M[0x5DD2] = (M[0x2413] - 1) & 255;
      const lift = (M[0x5DD2] << 6) | 0x20;
      M[0x5DD2] = lift >> 8; M[0x5DD1] = lift & 255;
      const feet = w(0x2409) - lift;
      setw(0x2409, feet); setw(0x104E, feet);
      if (P.SOLVE_PLAYER_COLLISION({ y }).x === 1) M[0x5DD3] = 0x34;
      setw(0x2409, w(0x2409) + lift);
      return moved();
    }
    if (act === 5 || act === 6) {
      // a turn by the step the area allows ($9D4C), or a fixed one when $1380 is set; plug-in point:
      // a share of the area's step
      M[0x5DD3] = 0x24;
      const step = M[0x1380] ? 0x12 : P.plug.turn(0x2411, act === 5 ? -M[0x9D4C] : M[0x9D4C]);
      let a;
      if (act === 5) { M[0x82] = step; y = 3; a = (M[0x2411] - step) & 255; if (a & 0x80) a = (a + 0x48) & 255; }
      else { y = 4; a = (step + M[0x2411]) & 255; if (a >= 0x48) a -= 0x48; }
      M[0x2411] = a;
      P.PRESENT_ACTION_FEEDBACK({ y });
      return moved();
    }
    let a;
    if (act === 0x0C) {
      // the view levelled, the panel's picture turning back in four frames
      P.plug.whole(0x2410);
      if (!M[0x2410]) return moved();
      M[0x7A] = 0xB0; M[0x7B] = 0x1F; M[0x7C] = 0x65; M[0x7D] = 0x1D;
      a = 4;
      do {
        a++;
        const o = P.BLIT_PACKED_2BPP_GRAPHIC({ a, x: 1, y });
        x = o.x; y = o.y;
        M[0x1063] = 2;
        while (M[0x1063]) yield;
      } while (a !== 8);
      M[0x1081] = 8;
      a = 0;
    } else if (act === 7 || act === 8) {
      P.PRESENT_ACTION_FEEDBACK({ y: act === 7 ? 1 : 2 });
      if (M[0x1380]) { a = act === 7 ? 0x36 : 0x12; P.plug.whole(0x2410); }
      else {
        // plug-in point: a share of the area's step
        const step = P.plug.turn(0x2410, act === 7 ? -M[0x9D4C] : M[0x9D4C]);
        if (act === 7) { a = M[0x2410] - step; if (a < 0) a = (a + 0x48) & 255; }
        else { a = (M[0x2410] + step) & 255; if (a >= 0x48) a -= 0x48; }
        if (a < 0x36 && a >= 0x12) { a = act === 7 ? 0x36 : 0x12; P.plug.whole(0x2410); }
      }
    } else if (act === 0x0D) {
      M[0x5DD3] = 0x24;
      a = M[0x2411] + 0x24;
      if (a >= 0x48) a -= 0x48;
      M[0x2411] = a;
      return moved();
    } else return tail();
    M[0x2410] = a;
    M[0x5DD3] = 0x44;
    return moved();
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
