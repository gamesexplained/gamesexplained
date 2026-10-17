// Saving and loading ($0423-$0659, $87B1-$87CB): the game's position written as a file: the
// $6A bytes of state from $2406 (the first, $EA, marks a saved game) and every object's flags
// byte, area by area, gathered at ($10A0) and saved through the KERNAL under the name typed
// ("NAME `CM", "@0:" before it on disk); a load reads the file back there and puts each byte
// back, or prints INVALID FILE when its first byte is not $EA. Around the KERNAL the game swaps
// its zero page with the KERNAL's (kept at $DF02-$DFFF, under the I/O) and puts back the
// KERNAL's vectors.
//
// The KERNAL's routines are the machine's (these, and SETMSG, which the start-up calls), not the game's, so the port has its own, written from
// what each does to memory (as kit/c64/c64run.js's stand-ins are), on the files the page keeps:
// - P.io.load(name) gives a file's bytes, its two-byte address first, or null when there is none
//   of that name (? matches any letter; an empty name, the tape's "the next file", any file);
// - P.io.save(name, bytes) keeps one, "@0:" left off the name.
// The page keeps its files in the browser whichever device is chosen, tape or disk. PLOT keeps the
// cursor's column and row ($D3, $D6) and not the KERNAL's line pointers, and the vectors the
// KERNAL would put back from its ROM ($FD30) are not copied: the page has no KERNAL for them to
// point at, and the game sets its own again before it uses them.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.save = function (P) {
  const M = P.M, io = P.io;
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const at = (zp, y) => M[(ptr(zp) + y) & 0xFFFF];
  const R = (r, o) => Object.assign({}, r, o);

  const name = () => {
    let s = '';
    const a = ptr(0xBB);
    for (let i = 0; i < M[0xB7]; i++) s += String.fromCharCode(P.rd((a + i) & 0xFFFF));
    return s;
  };
  P.kernal = {
    SETMSG: r => { M[0x9D] = r.a; return R(r, {}); },
    PLOT: r => { if (!r.c) { M[0xD6] = r.x; M[0xD3] = r.y; } return R(r, {}); },
    SETLFS: r => { M[0xB8] = r.a; M[0xBA] = r.x; M[0xB9] = r.y; return R(r, {}); },
    SETNAM: r => { M[0xB7] = r.a; M[0xBB] = r.x; M[0xBC] = r.y; return R(r, {}); },
    // LOAD to X/Y with secondary address 0, to the file's own address otherwise
    LOAD: r => {
      const b = io.load ? io.load(name()) : null;
      if (!b) { M[0x90] = 0x42; return R(r, { a: 4, c: 1 }); }
      const start = M[0xB9] ? b[0] | b[1] << 8 : r.x | r.y << 8;
      for (let i = 2; i < b.length; i++) P.wr((start + i - 2) & 0xFFFF, b[i]);
      const end = (start + b.length - 2) & 0xFFFF;
      M[0xC3] = start & 255; M[0xC4] = start >> 8; M[0xAE] = end & 255; M[0xAF] = end >> 8;
      M[0x90] = 0x40;
      return R(r, { x: end & 255, y: end >> 8, c: 0 });
    },
    // SAVE from the address in the zero-page pair A names up to X/Y, not included
    SAVE: r => {
      const start = M[r.a] | M[(r.a + 1) & 255] << 8, end = r.x | r.y << 8;
      const out = new Uint8Array(Math.max(0, end - start) + 2);
      out[0] = start & 255; out[1] = start >> 8;
      for (let a = start; a < end; a++) out[a - start + 2] = P.rd(a);
      if (io.save) io.save(name().replace(/^@?\d?:/, ''), out);
      M[0x90] = 0;
      return R(r, { c: 0 });
    },
  };

  // SWAP_GAME_AND_KERNAL_ZERO_PAGE: $02-$FF exchanged with $DF02-$DFFF (RAM, the I/O out).
  P.SWAP_GAME_AND_KERNAL_ZERO_PAGE = function (r) {
    M[1] = 0x34;
    for (let x = 2; x < 256; x++) { const t = M[x]; M[x] = M[0xDF00 + x]; M[0xDF00 + x] = t; }
    M[1] = 0x35;
    return { a: 0x35, x: 0, y: r.y };
  };
  // RESTORE_KERNAL_VECTORS: the KERNAL in, the output vector at the game's CUSTOM_CHROUT and the
  // NMI's at its own handler, the sprites off.
  P.RESTORE_KERNAL_VECTORS = function (r) {
    M[1] = 0x37;
    M[0x0326] = 0xCF; M[0x0327] = 0x86;
    M[0x0318] = 0x79; M[0x0319] = 0x75;
    io.vicWrite(0x15, 0);
    return { a: 0, x: r.x, y: 0xFF };
  };

  // The objects area by area: save_begin_database_flags starts at the first area's first object
  // ($7E), save_next_database_area moves to the next area's (Y the area table's index, kept at
  // $0413; $0411 its object count), save_next_database_object to the next object, counting down.
  P.save_next_database_area = function (r) {
    let y = (r.y + 1) & 255;
    const s = at(0x7A, y) + M[0x109C];
    M[0x7E] = s & 255;
    y = (y + 1) & 255;
    M[0x7F] = (at(0x7A, y) + M[0x109D] + (s >> 8)) & 255;
    M[0x0413] = y;
    M[0x0411] = at(0x7E, 1);
    setp(0x7E, ptr(0x7E) + 8);
    return { a: M[0x7E], x: r.x, y: 1 };
  };
  P.save_begin_database_flags = function (r) {
    M[0x7A] = M[0x109E]; M[0x7B] = M[0x109F];
    M[0x0410] = M[0x9D00];
    return P.save_next_database_area({ x: r.x, y: 0xFF });
  };
  P.save_next_database_object = function (r) {
    setp(0x7E, ptr(0x7E) + at(0x7E, 8));
    M[0x0411] = (M[0x0411] - 1) & 255;
    return { a: M[0x7F], x: r.x, y: M[0x0413], z: M[0x0411] ? 0 : 1 };
  };
  // every object's flags byte, to ($7C) on (from) or back from it (to)
  const objects = (from) => {
    let o = P.save_begin_database_flags({ x: 0 });
    for (;;) {
      if (from) M[ptr(0x7C)] = M[ptr(0x7E)];
      else M[ptr(0x7E)] = M[ptr(0x7C)];
      setp(0x7C, ptr(0x7C) + 1);
      o = P.save_next_database_object({ x: 0 });
      if (!o.z) continue;
      M[0x0410] = (M[0x0410] - 1) & 255;
      if (!M[0x0410]) return o;
      o = P.save_next_database_area({ x: 0, y: o.y });
    }
  };
  const state = (from) => {
    for (let y = 0; y < 0x6A; y++) {
      if (from) M[(ptr(0x7C) + y) & 0xFFFF] = M[0x2406 + y];
      else M[0x2406 + y] = M[(ptr(0x7C) + y) & 0xFFFF];
    }
    setp(0x7C, ptr(0x7C) + 0x6A);
  };

  // LOAD_SAVE_DISPATCH: A $53 saves, anything else loads (the menu's S and L); the music stopped,
  // the zero page swapped, and with two controls held nothing but the view drawn again.
  P.LOAD_SAVE_DISPATCH = function* (r) {
    M[0x1C71] = r.a === 0x53 ? 0 : 1;
    M[0x123A] = 0; M[0xC806] = 0;
    P.SID_CLEAR_REGISTERS({});
    let o = P.SWAP_GAME_AND_KERNAL_ZERO_PAGE({ y: r.y });
    if (M[0x1379] < 2) {
      o = yield* P.PROMPT_SAVE_DEVICE_AND_NAME(o);
      M[1] = 0x37;
      M[0x0412] = M[0x1230];
      P.kernal.PLOT({ a: o.a, x: 4, y: 5, c: 0 });
      P.kernal.SETLFS({ a: 0x20, x: M[0x1052], y: 0 });
      let x = 0x68;
      M[0x1230] = 0;
      if (M[0x1052] === 8 && !M[0x1C71]) { x = 0x65; M[0x1230] += 3; }
      const n = M[0x1C71] && M[0x1052] !== 8 && !M[0x0412] ? 0 : 8;
      P.kernal.SETNAM({ a: (n + M[0x1230]) & 255, x, y: 0x1C });
      M[1] = 0x35;
      if (!M[0x1C71]) {
        // save: the state and the flags gathered from ($10A0), and saved
        M[0x7C] = M[0x10A0]; M[0x7D] = M[0x10A1];
        state(true);
        objects(true);
        P.RESTORE_KERNAL_VECTORS({ x: 0 });
        M[0x2B] = M[0x10A0]; M[0x2C] = M[0x10A1];
        P.kernal.SAVE({ a: 0x2B, x: M[0x7C], y: M[0x7D] });
        P.SWAP_GAME_AND_KERNAL_ZERO_PAGE({});
        P.INSTALL_RUNTIME_VECTORS({});
        M[1] = 0x35;
      } else {
        P.RESTORE_KERNAL_VECTORS({ x: 0 });
        const l = P.kernal.LOAD({ a: 0, x: M[0x10A0], y: M[0x10A1] });
        P.SWAP_GAME_AND_KERNAL_ZERO_PAGE({});
        P.INSTALL_RUNTIME_VECTORS({});
        M[1] = 0x35;
        if (!l.c) {
          M[0x7C] = M[0x10A0]; M[0x7D] = M[0x10A1];
          if (at(0x7C, 0) !== 0xEA) {
            M[0x7C] = 0xC9; M[0x7D] = 0x1D; M[0x7E] = 0x14; M[0x7F] = 0x04;
            M[0x1C74] = 8;
            P.DRAW_TEXT_TO_BITMAP({ a: 0x0E, x: 0 });
          } else {
            // load: each byte put back, and the sight's sprites on again if it was in use
            state(false);
            objects(false);
            let a = M[0x246F] & 0xFC;
            if (M[0x2467]) a |= 3;
            M[0x246F] = a;
            M[1] = 0x35;
          }
        }
      }
      M[0x123A] = M[0x123B]; M[0xC806] = M[0x123B];
    }
    M[0x1059] = 0xFD; M[0x105A] = 0xFF;
    M[0x1064] = 1;
    return yield* P.RENDER_SCENE_IF_DIRTY({});
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
