// The scripts ($68F5-$6FBC): the interpreter of the condition scripts every object and area
// carries (FCL), and the bordered message it shows full-view. A script is tokens, each an opcode
// in its low six bits and, in its top two, the event it answers ($00 a step taken, $40 the
// timer's tick, $80 a shot, $C0 a use; $1084 holds the pass's events); a token for an event the
// pass has not had is passed over. Its length is $13AE + the opcode. IF-like tokens set the skip
// flag ($68E4) when their test fails, ELSE flips it and ENDIF clears it, and every other token is
// passed over while it is set. The tokens: score, strength, objects shown, hidden, destroyed and
// tested (here or in another area), the variables at $2438 and the bits at $2439, sounds, a move
// to another area, a message in the panel or across the view, a redraw, a pause, and $30, which
// runs another object's script in the middle of this one.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.fcl = function (P) {
  const M = P.M, io = P.io;
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const at = (zp, y) => M[(ptr(zp) + y) & 0xFFFF];
  const put = (zp, y, v) => { M[(ptr(zp) + y) & 0xFFFF] = v & 255; };

  // EXPAND_BORDERED_ROW_30: a row of 30 bytes at ($7A) from the three at $2023 + X (the left
  // edge, 28 of the middle, the right edge); ($7A) moves on a row and X past the three.
  P.EXPAND_BORDERED_ROW_30 = function (r) {
    let x = r.x;
    put(0x7A, 0, M[0x2023 + x]);
    x = (x + 1) & 255;
    const mid = M[0x2023 + x];
    M[0x68F2] = x;
    for (let y = 1; y <= 0x1C; y++) put(0x7A, y, mid);
    x = (M[0x68F2] + 1) & 255;
    put(0x7A, 0x1D, M[0x2023 + x]);
    x = (x + 1) & 255;
    const s = M[0x7A] + 0x1E;
    M[0x7A] = s & 255;
    if (s > 255) M[0x7B] = (M[0x7B] + 1) & 255;
    return { a: s & 255, x, y: 0x1D, c: s >> 8 };
  };

  // The bordered message ($6D63): the sprites off, the view's buffer filled with the border, the
  // lines of message A (the table at $13EE: a count, then for each line its step across, its step
  // down in rows, and its length, $FF for the player's name at $1C4E) drawn in, the view's colours
  // set for it and the buffer shown, until a control is pressed.
  function* bordered(idx) {
    M[0x1C74] = 1;
    M[0x246F] = io.vicRead(0x15);
    io.vicWrite(0x15, 0xFC & io.vicRead(0x15));
    setp(0x7A, 0x8952);
    let x = 0, n;
    for (n = 6; n; n--) x = P.EXPAND_BORDERED_ROW_30({ x }).x;
    for (n = 0x56; n; n--) x = P.EXPAND_BORDERED_ROW_30({ x: 0x12 }).x;
    for (n = 6; n; n--) x = P.EXPAND_BORDERED_ROW_30({ x: (x - 6) & 255 }).x;
    x = (idx << 1) & 255;
    M[0x7E] = M[0x13EE + x]; M[0x7F] = M[0x13EF + x];
    M[0x7C] = 0x75; M[0x7D] = 0x1C;
    M[0x68F2] = 0;
    let lines = at(0x7E, 0), y = 0, o;
    do {
      setp(0x7E, ptr(0x7E) + 1);
      M[0x68F2] = (at(0x7E, 0) + M[0x68F2]) & 255;
      setp(0x7C, ptr(0x7C) + ((at(0x7E, 1) << 1) & 255));
      y = 2;
      const len = at(0x7E, 2);
      setp(0x7E, ptr(0x7E) + 3);
      if (len === 0xFF) {
        const back = ptr(0x7E);
        M[0x7E] = 0x4E; M[0x7F] = 0x1C;
        o = P.DRAW_TEXT_HIGH_BIT_MERGE({ a: M[0x1C4D], x: M[0x68F2], y });
        setp(0x7E, back - 1);
      } else {
        o = P.DRAW_TEXT_HIGH_BIT_MERGE({ a: len, x: M[0x68F2], y });
        setp(0x7E, ptr(0x7E) + len);
      }
      x = o.x; y = o.y;
      lines = (lines - 1) & 255;
    } while (lines);
    setp(0x7A, ptr(0x10A0));
    o = P.CLEAR_LINEAR_30BYTE_ROWS({ x: 0x0D, y, c: 1 });
    M[0x7A] = 0xCE; M[0x7B] = 0x94;
    o = P.CLEAR_LINEAR_30BYTE_ROWS({ x: 9, y: o.y, c: 1 });
    const s34 = M[0x2434], s33 = M[0x2433], s32 = M[0x2432];
    M[0x2436] = 9; M[0x2438] = 9; M[0x2437] = 7;
    o = P.UPDATE_VIEWPORT_COLOR_CELLS({ x: o.x, y: o.y });
    M[0x2436] = s32; M[0x2437] = s33; M[0x2438] = s34;
    M[0x1064] = 1;
    o = P.BLIT_LINEAR_BUFFER_FORWARD_TO_VIC_BITMAP({ x: o.x, y: o.y });
    for (;;) {
      yield { cp: 0x6E8E };
      o = P.READ_CONTROL_INPUT({ x: o.x, y: o.y });
      if (o.c) break;
    }
    io.vicWrite(0x15, M[0x246F]);
    M[0x1C74] = 8;
    M[0x105A] |= 8;
    return o;
  }
  P.CHECKPOINTS.push(0x6E8E);

  // EXECUTE_FCL_STREAM: the script of A bytes at ($7C), from its first token; ($7C) as it was
  // after. X is the last token's opcode (the caller's X when it ran none).
  P.EXECUTE_FCL_STREAM = function* (r) {
    let x = r.x, y = r.y, a = r.a, o;
    M[0x68F0] = r.a;
    const outer = ptr(0x7C);
    M[0x68E4] = 0;
    const end = () => { setp(0x7C, outer); return { a: M[0x7C], x, y }; };
    // FIND_OBJECT_BY_ID, which keeps X and Y
    const find = (fa, fy) => { o = P.FIND_OBJECT_BY_ID({ a: fa, x, y: fy }); x = o.x; y = o.y; return o.a === 0; };
    for (;;) {
      y = 0;
      const t = at(0x7C, 0), op = t & 0x3F;
      M[0x68E6] = op;
      const cond = t & 0xC0;
      const need = cond === 0x40 ? 8 : cond === 0x80 ? 4 : cond === 0xC0 ? 2 : 1;
      // 'next', 'skip' (the test failed: skip set, then next), 'end', or 'run' (on at the new ($7C))
      let go = 'next';
      if (!(M[0x1084] & need)) go = 'next';
      else if (op === 0x2D) M[0x68E4] = 0;
      else if (op === 0x2C) M[0x68E4] ^= 1;
      else if (M[0x68E4]) go = 'next';
      else if (op === 0x01) {
        // score: three bytes, high first
        M[0x68F3] = at(0x7C, 1); x = at(0x7C, 2); a = at(0x7C, 3);
        o = P.ADD_SCORE_U24({ a, x, y: M[0x68F3] }); y = o.y;
      } else if (op === 0x13) {
        // strength, by a signed byte: up to 24 at most, and below nothing the game is over
        y = 1;
        const v = at(0x7C, 1);
        a = (v + P.irqByte(0x2455)) & 255;
        if (!(v & 0x80)) { if (a >= 0x18) a = 0x18; }
        else if (a & 0x80) { M[0x109B] = 2; a = 0; }
        M[0x2455] = a;
      } else if ([0x03, 0x04, 0x05, 0x10, 0x1E, 0x1F].includes(op)) {
        // an object of this area (or the shared list): toggled, shown, hidden, destroyed, or
        // tested for being shown or hidden
        y = 1;
        M[0x105C] = at(0x7C, 1);
        const back = ptr(0x7C);
        if (!find(0, 1)) { setp(0x7C, back); go = 'skip'; }
        else if (op === 0x1E || op === 0x1F) {
          y = 0;
          x = at(0x7C, 0);
          setp(0x7C, back);
          const hidden = (x & 0x40) !== 0;
          go = (op === 0x1E ? hidden : !hidden) ? 'skip' : 'next';
        } else {
          y = 0;
          const p = ptr(0x7C);
          if (!(M[p] & 0x20)) {
            let show;
            if (op === 0x10) { M[p] |= 0x20; show = false; }
            else if (op === 0x03) show = (M[p] & 0x40) !== 0;
            else show = op === 0x04;
            if (show) {
              if (M[p] & 0x40) {
                M[p] &= 0xBF;
                if ((M[p] & 0x0F) === 2) { M[0x1099] = (M[0x1099] + 1) & 255; M[0x105A] |= 0x10; }
                else { M[p] |= 0x10; M[0x1086] = 1; M[0x1059] |= 4; }
              }
            } else if (!(M[p] & 0x40)) {
              M[p] |= 0x40;
              if ((M[p] & 0x0F) === 2) {
                if (M[0x1099]) { M[0x1099] = (M[0x1099] - 1) & 255; M[0x105A] |= 0x10; }
              } else {
                // hidden: out of the scene's drawing list too, and the view redrawn
                M[0x1087] = 1;
                setp(0x7A, ptr(0x10A6) + 4);
                if (M[0x106A]) {
                  M[0x68F2] = M[0x106A];
                  x = M[0x105C];
                  for (;;) {
                    M[0x7E] = at(0x7A, 0); M[0x7F] = at(0x7A, 1);
                    y = 0;
                    if (x === at(0x7E, 0)) {
                      y = 1;
                      if (at(0x7E, 1) & 0x80) M[0x106B] = (M[0x106B] - 1) & 255;
                      put(0x7E, 1, 0);
                      M[0x105A] |= 8;
                      break;
                    }
                    setp(0x7A, ptr(0x7A) + 4);
                    M[0x68F2] = (M[0x68F2] - 1) & 255;
                    if (!M[0x68F2]) break;
                  }
                }
              }
            }
          }
          setp(0x7C, back);
        }
      } else if ([0x06, 0x07, 0x08, 0x11, 0x20, 0x21].includes(op)) {
        // an object of another area, the same without the scene's upkeep
        M[0x105C] = at(0x7C, 2);
        const back = ptr(0x7C);
        if (find(at(0x7C, 1), 1)) {
          y = 0;
          const p = ptr(0x7C);
          if (op === 0x20 || op === 0x21) {
            x = M[p];
            const hidden = (x & 0x40) !== 0;
            go = (op === 0x20 ? hidden : !hidden) ? 'skip' : 'next';
          } else if (!(M[p] & 0x20)) {
            if (op === 0x11) M[p] |= 0x20;
            const show = op === 0x07 || (op === 0x06 && (M[p] & 0x40) !== 0);
            if (show) M[p] &= 0xBF; else M[p] |= 0x40;
          }
        }
        setp(0x7C, back);
      } else if ([0x09, 0x0A, 0x0B, 0x14, 0x2E, 0x2F].includes(op)) {
        // a variable at $2438: up, down, set, or tested equal, above or below
        y = 1;
        x = at(0x7C, 1);
        const v = 0x2438 + x;
        if (op === 0x09) M[v] = (M[v] + 1) & 255;
        else if (op === 0x0A) M[v] = (M[v] - 1) & 255;
        else {
          y = 2;
          const b = at(0x7C, 2);
          if (op === 0x14) M[v] = b;
          else if (op === 0x0B) go = b === M[v] ? 'next' : 'skip';
          else if (op === 0x2E) go = b < M[v] ? 'next' : 'skip';
          else go = M[v] < b ? 'next' : 'skip';
        }
      } else if ([0x0C, 0x0D, 0x0E, 0x1D].includes(op)) {
        // a bit of $2439: set (bit 31 starts the music), cleared, toggled or tested
        a = (at(0x7C, 1) - 1) & 255;
        x = 0;
        while (a >= 8) { a -= 8; x++; }
        y = 1;
        M[0x68F1] = 1;
        if (a) {
          M[0x68F2] = a;
          do { M[0x68F1] = (M[0x68F1] << 1) & 255; M[0x68F2] = (M[0x68F2] - 1) & 255; } while (M[0x68F2]);
        }
        const bit = M[0x68F1];
        let set = op === 0x0C, clear = op === 0x0D;
        if (op === 0x1D) { if (bit & M[0x2439 + x]) clear = true; else set = true; }
        if (set) {
          M[0x2439 + x] |= bit;
          y = 1;
          if (at(0x7C, 1) === 0x1F) {
            M[0x123A] = 1; M[0x1239] = 1;
            o = P.SID_PLAYER_INITIALIZE({ a: 1, x, y });
            if (o && o.x !== undefined) x = o.x;
            if (o && o.y !== undefined) y = o.y;
          }
        } else if (clear) M[0x2439 + x] &= bit ^ 0xFF;
        else {
          y = 2;
          go = ((bit & M[0x2439 + x]) ? 1 : 0) === at(0x7C, 2) ? 'next' : 'skip';
        }
      } else if (op === 0x0F || op === 0x1C) {
        // a sound: $1C's waits for the redraw when one is due
        y = 1;
        if (op === 0x1C && ((M[0x1059] & 4) || (M[0x105A] & 8))) M[0x105E] = at(0x7C, 1);
        else P.SID_INITIALIZE_IF_ENABLED({ a: at(0x7C, 1), x, y });
      } else if (op === 0x12) {
        // to area b1, at entrance b2: a new area scores 100,000 the first time; the escape's bit
        // ($243C bit 6) plays its tune and leaves the view as it is
        M[0x1047] = M[0x2429];
        M[0x105E] = 7;
        M[0x2429] = at(0x7C, 1);
        y = 2;
        M[0x1066] = at(0x7C, 2);
        const back = ptr(0x7C);
        P.ENTER_DESTINATION_AREA({ a: M[0x7D], x, y });
        setp(0x7C, back);
        x = 0;
        a = M[0x2429];
        while (a >= 8) { x++; a -= 8; }
        let b = 1;
        for (y = a; y; y--) b = (b << 1) & 255;
        if (!(b & M[0x243D + x])) {
          M[0x243D + x] |= b;
          P.ADD_SCORE_U24({ a: 0, x: 0x44, y: 0x5C });
        }
        y = 0xFF; x = 0xFC;
        if (M[0x243C] & 0x40) { M[0x105E] = 0x0D; y = 0; x = 4; }
        M[0x105A] = y; M[0x1059] = x;
      } else if (op === 0x22) {
        // a message: under 128 one of the panel's ($1410 + 16 each), shown for 50 ticks; 128 and
        // over the bordered message across the view
        const back = ptr(0x7C);
        y = 1;
        const b = at(0x7C, 1);
        if (b & 0x80) {
          o = yield* bordered(b & 0x7F);
          x = o.x; y = o.y;
        } else {
          setp(0x7E, 0x1410 + ((b - 1) & 255) * 16);
          M[0x7C] = 0x6F; M[0x7D] = 0x1D;
          o = P.DRAW_TEXT_TO_BITMAP({ a: 0x0F, x: 2, y });
          x = o.x; y = o.y;
          if (!M[0x109B]) { M[0x1063] = 0x32; M[0x105A] |= 0x20; }
        }
        setp(0x7C, back);
      } else if (op === 0x1A) {
        // the scene drawn now
        const back = ptr(0x7C);
        o = yield* P.RENDER_SCENE_IF_DIRTY({ a: M[0x7D], x, y });
        if (o && o.x !== undefined) x = o.x;
        if (o && o.y !== undefined) y = o.y;
        setp(0x7C, back);
        M[0x1059] = 0; M[0x105A] = 0;
      } else if (op === 0x1B) {
        // a pause of b1 ticks
        y = 1;
        M[0x1063] = at(0x7C, 1);
        while (M[0x1063]) yield;
      } else if (op === 0x23) go = 'next';
      else if (op === 0x30) {
        // object b1's script run from here on, in place of the rest of this one
        y = 1;
        M[0x105C] = at(0x7C, 1);
        if (!find(0, 1)) return end();
        setp(0x7E, 0x13DF + (at(0x7C, 0) & 0x0F));
        a = (at(0x7C, 8) - at(0x7E, 0)) & 255;
        y = 0;
        if (!a) return end();
        M[0x68F0] = a;
        setp(0x7C, ptr(0x7C) + at(0x7E, 0));
        continue;
      } else return end();
      if (go === 'skip') M[0x68E4] = 1;
      // the next token
      x = M[0x68E6];
      const len = M[0x13AE + x];
      if (!len) return end();
      setp(0x7C, ptr(0x7C) + len);
      const left = (M[0x68F0] - len) & 255;
      M[0x68F0] = left;
      if (!left || (left & 0x80)) return end();
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
