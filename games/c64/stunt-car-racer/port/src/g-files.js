// Saving and loading ($2AAE-$2C22, $93A8-$97AE): the file's name typed and checked, the KERNAL set
// up again and the file saved or loaded (src/kernal.js stands in for the KERNAL), the result shown;
// the files of the Hall of Fame and of a game for several, scrambled with a run of random numbers
// so that a file changed by hand reads as incorrect data; and a disc's directory.
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.files = P => {
  const M = P.M;

  P.GEN.add('SAVE_OR_LOAD');
  // SAVE_OR_LOAD ($2AAE): a save while $C77B is set, a load otherwise. For a save, the message to
  // ready the tape or disc and a press of fire. The name typed (NAME_ENTRY_AT, into $AEC1, the
  // capitals of letters) and checked (FILE_NAME_CHECK, again until it suits; the C= key leaves).
  // Then the random numbers kept (SAVE_RANDOM), the border red, a file of the Hall of Fame or a
  // game for several made ready (FILE_BUFFER), the screen at $0400 filled with spaces, and with the
  // KERNAL banked in ($01 $36): IOINIT, RAMTAS, the KERNAL's vectors from $0800 (VECTOR), CINT, the
  // border green, the KERNAL's messages on (SETMSG $C0), and the drive set going (command $47 with
  // X 0). The file on device 1 or 8 by $0840 ($2C21): a directory is the name "$" ($94D6) loaded to
  // $4000; otherwise the old file on the disc is scratched (command $47) and the twelve-letter name
  // at $AEC1 saved or loaded: the league's 192 bytes at $8000-$80BF, or for the Hall of Fame and a
  // game for several ($C367) $4000-$41FF or $4000-$40FF. The KERNAL's carry and its status ($90,
  // but for the end of the file, bit 6) go into $C301 bit 7, and on a failure the drive is set going
  // again. Then $A000 put back (it is kept around the KERNAL), a pause, the ROMs out ($01 $35), a
  // failure into $C39A ($80), a directory shown (DIRECTORY_SCREEN), and the game's screen and
  // interrupt back: the file read in where it goes (FILE_BUFFER) and the random numbers put back
  // (LOAD_RANDOM), since RAMTAS has cleared the zero page.
  P.SAVE_OR_LOAD = function* (r) {
    M[0xC39A] = 0;
    M[0x3953] = 7;
    P.PANEL_ROW({ y: 0x13 });
    let q = P.PANEL_ROW({ y: 0x14 });
    M[0x3953] = 0x0F;
    q = P.TEXT_HALF_DOWN({ y: q.y });
    if (M[0xC77B]) {
      q = P.FILE_MESSAGE({ x: 0x71, y: q.y });
      const y = (M[0x0840] + 9) & 255;
      P.FILE_MESSAGE({ x: M[0x952A + y], y });
      q = yield* P.WAIT_FIRE({});
      q = P.FILE_MESSAGE({ x: 0x99, y: q.y });
    }
    for (;;) {
      P.PRINT_STRING_E000({ x: 0x94, y: q.y });
      q = yield* P.NAME_ENTRY_AT({ a: 0xC0, x: 0x78, y: 0xD5 });
      if (M[0xEE35] & 0x80) return q;
      q = yield* P.FILE_NAME_CHECK({});
      if (!q.c) break;
    }
    P.TEXT_ON_ROWS({ y: q.y });
    P.SAVE_RANDOM({});
    yield* P.BORDER_BLANK({ a: 2 });
    P.FILE_BUFFER({ a: 1 });
    for (let x = 0; x < 0xFA; x++) for (const a of [0x0400, 0x04FA, 0x05F4, 0x06EE]) M[a + x] = 0x20;
    P.wr(0xD01A, 0);
    const keep = M[0xA000];
    const k = P.kernal;
    const kernal = function* (name, regs) { const t = k[name](regs); yield { cycles: t.cycles }; return t; };
    M[1] = 0x36;
    yield* kernal('IOINIT', { a: 0x36 });
    M[1] = 0x36;
    yield* kernal('RAMTAS', { a: 0x36 });
    yield* kernal('VECTOR', { x: 0, y: 8, c: 0 });
    yield* kernal('CINT', {});
    P.wr(0xD020, 5);
    yield* kernal('SETMSG', { a: 0xC0 });
    M[1] = 0x36;
    P.DISPATCH({ a: 0x47, x: 0 });
    yield* kernal('SETLFS', { a: 0, x: M[0x2C21 + M[0x0840]], y: 0 });
    let c = -1;
    if (M[0xC367] & 0x80) yield* kernal('SETNAM', { a: 1, x: 0xD6, y: 0x94 });
    else if (P.DISPATCH({ a: 0x47, x: 0x80 }).c) c = 1;
    else yield* kernal('SETNAM', { a: 0x0C, x: 0xC1, y: 0xAE });
    if (c < 0) {
      let t;
      if (M[0xC77B]) {
        M[0xFB] = 0;
        let x = 0xC0, y = 0x80;
        if (M[0xC367]) { y = (((M[0xC367] & 1) ^ 3) + 0x3F) & 255; x = 0; M[0xFC] = 0x40; } else M[0xFC] = 0x80;
        t = yield* kernal('SAVE', { a: 0xFB, x, y });
      } else t = yield* kernal('LOAD', { a: 0, x: 0, y: M[0xC367] ? 0x40 : 0x80 });
      c = t.c;
    }
    M[0xC301] = (M[0xC301] >> 1) | (c << 7);
    if ((yield* kernal('READST', {})).a & 0xBF) M[0xC301] = (M[0xC301] >> 1) | 0x80;
    if (M[0xC301] & 0x80) P.DISPATCH({ a: 0x47, x: 0 });
    M[0xA000] = keep;
    yield* P.DELAY({ y: 0x4B });
    M[1] = 0x35;
    if (M[0xC301] & 0x80) M[0xC39A] = 0x80;
    else if (M[0xC367] & 0x80) yield* P.DIRECTORY_SCREEN({});
    yield* P.BLANK_SCREEN({});
    P.wr(0xD011, 0x2B);
    P.MENU_BITMAP({});
    P.wr(0xD01A, 1);
    P.FILE_BUFFER({ a: 0 });
    return P.LOAD_RANDOM({ y: 9 });
  };

  // FILE_MESSAGE ($95E2): message X of the table at $9535 (characters to $FF)
  P.FILE_MESSAGE = r => {
    let x = r.x & 255;
    for (let a; (a = M[0x9535 + x]) !== 0xFF; x = (x + 1) & 255) P.PRINT_CHAR({ a, x, y: r.y });
    return { a: 0xFF, x, y: r.y, z: 1, c: 1 };
  };

  P.GEN.add('FILE_NAME_CHECK');
  // FILE_NAME_CHECK ($9448): the name typed ($AEC1) for what it starts with, into $C367: "DIR " a
  // directory ($80, and a save becomes a load, $C77B cleared), "HALL" the Hall of Fame ($40), "MP" a
  // game for several (1), anything else the league of one (0). A save of the league with several
  // players, or of a game for several with one, is refused: "File name is not suitable", a key, the
  // message and the name rubbed out, and the carry set
  P.FILE_NAME_CHECK = function* (r) {
    const is = (at, n) => { let x = n - 1; while (x >= 0 && M[0xAEC1 + x] === M[at + x]) x--; return { same: x < 0, x: x & 255 }; };
    let y = 0, t = is(0x94CC, 4);
    if (t.same) y = 0x80;
    else if ((t = is(0x94D0, 4)).same) y = 0x40;
    else if ((t = is(0x94D4, 2)).same) y = 1;
    const x = t.x;
    M[0xC367] = y;
    const ok = a => ({ a, x, y, c: 0 });
    if (!M[0xC77B]) return ok(0);
    if (y & 0x80) { M[0xC77B] = 0; return ok(0); }
    if (y === 0x40) return ok(y);
    if (y === 0 ? M[0x31A1] : !M[0x31A1]) {
      let q = P.TEXT_HALF_DOWN({ y });
      q = P.PRINT_AT({ x: 6, y: 0x16 });
      q = P.FILE_MESSAGE({ x: 0x57, y: q.y });
      q = yield* P.WAIT_KEY({ x: q.x, y: q.y });
      for (let x = 0x19; x; x--) P.PRINT_CHAR({ a: 0x7F, x, y: q.y });
      q = P.PRINT_AT({ x: 0x14, y: 0x13 });
      for (let x = 0x0C; x; x--) P.SPACE({ x, y: q.y });
      return { a: 0x20, x: 0, y: q.y, c: 1 };
    }
    return ok(M[0x31A1]);
  };

  P.GEN.add('FILE_RESULT');
  // FILE_RESULT ($94D7): after a save or a load, unless it was a directory that worked: the file's
  // name and " loaded" or " saved", with " NOT" and why after a failure ($C39A: $80 a problem, $81
  // incorrect data), and a press of fire. $C39A comes back in A
  P.FILE_RESULT = function* (r) {
    if ((M[0xC39A] & 0x80) || !(M[0xC367] & 0x80)) {
      yield* P.PANEL_SCREEN({});
      yield* P.MENU_BACKDROP({});
      M[0x19] = 1;
      let q = P.LINE_START({});
      q = P.DRIVER_NAME({ x: 0x0C, y: q.y });
      if (M[0xC39A] & 0x80) q = P.FILE_MESSAGE({ x: 0, y: q.y });
      let y = M[0xC77B];
      P.FILE_MESSAGE({ x: M[0x952A + y], y });
      if (M[0xC39A] & 0x80) {
        P.LINE_START({});
        y = (M[0xC39A] + 2) & 7;
        P.FILE_MESSAGE({ x: M[0x952A + y], y });
      }
      P.SCREEN_ON({});
      q = yield* P.WAIT_FIRE({});
      P.TEXT_ON_ROWS({ y: q.y });
    }
    const a = M[0xC39A];
    return { a, n: a >> 7, z: a ? 0 : 1 };
  };

  P.GEN.add('DIRECTORY_SCREEN');
  // DIRECTORY_SCREEN ($95EA): the directory loaded at $4000 shown on the KERNAL's screen at $0400:
  // "DIRECTORY:", then the files whose names are twelve characters (a quote at both ends, as the
  // game's own are), three to a row and 54 to a screen, fire for each screen after the first
  P.DIRECTORY_SCREEN = function* (r) {
    let x = 0;
    do { M[0x0400 + x] = 0x20; x = (x - 1) & 255; } while (x);
    for (x = 9; x >= 0; x--) M[0x042A + x] = M[0x9674 + x] & 0x3F;
    M[0x1E] = 0x25; M[0x1F] = 0x40; M[0x48] = 0x90;
    const from = y => M[((M[0x1E] | M[0x1F] << 8) + y) & 0xFFFF];
    const to = (y, v) => { M[((M[0x20] | M[0x21] << 8) + y) & 0xFFFF] = v; };
    for (;;) {
      // $960D: a screen
      x = 0x36; M[0x4A] = 3; M[0x20] = 0xA0; M[0x21] = 0x04;
      for (;;) {
        if (from(0x0D) === 0x22 && from(0) === 0x22) {
          if (!x) { yield* P.WAIT_FIRE({}); break; }
          for (let y = 1; y < 0x0D; y++) to(y, from(y) & 0x3F);
          to(0x0D, 0x20);
          let a = 0x0D;
          M[0x4A] = (M[0x4A] - 1) & 255;
          if (!M[0x4A]) { to(0x0E, 0x20); M[0x4A] = 3; a = 0x0E; }
          const t = M[0x20] + a; M[0x20] = t & 255; M[0x21] = (M[0x21] + (t >> 8)) & 255;
          x = (x - 1) & 255;
        }
        const t = M[0x1E] + 0x20; M[0x1E] = t & 255; M[0x1F] = (M[0x1F] + (t >> 8)) & 255;
        M[0x48] = (M[0x48] - 1) & 255;
        if (!M[0x48]) return yield* P.WAIT_FIRE({});
      }
    }
  };

  // FILE_BUFFER ($93A8): with A 1 before a save, 0 after a load (nothing otherwise, nor after a
  // failure, for the league of one or for a directory): the Hall of Fame's two pages of records
  // under the chips ($DE00, $DF00) copied to $4000 and scrambled (SCRAMBLE_2); or loaded,
  // unscrambled (UNSCRAMBLE_2) and merged, each track's record taken from the file when it is
  // faster than the one held (the times in decimal at +$0C, three bytes, minutes first). A game for
  // several: LEAGUE_FILE. An unscrambling that fails leaves the chips banked out ($01 $34).
  P.FILE_BUFFER = r => {
    let a = ((r.a & 255) ^ M[0xC77B]) & 255;
    if (a) return { a, c: r.c };
    if ((a = M[0xC39A]) & 0x80) return { a, c: r.c };
    a = M[0xC367];
    if ((a & 0x80) || !a) return { a, c: r.c };
    if (M[0xC367] !== 0x40) return P.LEAGUE_FILE({});
    P.ALL_RAM({});
    if (M[0xC77B]) {
      let x = 0;
      do { M[0x4000 + x] = M[0xDE00 + x]; M[0x4100 + x] = M[0xDF00 + x]; x = (x - 1) & 255; } while (x);
      const c = P.SCRAMBLE_2({}).c;
      return Object.assign(P.IO_BACK({}), { c });
    }
    const q = P.UNSCRAMBLE_2({});
    if (q.c) return q;
    for (const [file, held] of [[0x4000, 0xDE00], [0x4100, 0xDF00]]) {
      let x = 0;
      do {
        const f = M[file + x + 0x0C] << 16 | M[file + x + 0x0D] << 8 | M[file + x + 0x0E];
        const h = M[held + x + 0x0C] << 16 | M[held + x + 0x0D] << 8 | M[held + x + 0x0E];
        if (f < h) for (let y = 0; y < 16; y++) M[held + x + y] = M[file + x + y];
        x = (x + 0x10) & 255;
      } while (x);
    }
    // the last CPX #0 leaves the carry set
    return Object.assign(P.IO_BACK({ x: 0 }), { c: 1 });
  };

  // LEAGUE_FILE ($9756): a game for several in the file at $4000: the players' names ($AE40-$AEBF)
  // at $4020, the league's tables ($C728-$C763) at $40A0, how many players ($31A1) at $40DC and the
  // drivers' places ($83B0) at $40E0, scrambled (SCRAMBLE) for a save; unscrambled (UNSCRAMBLE) and
  // put back after a load
  P.LEAGUE_FILE = r => {
    const save = M[0xC77B];
    if (!save) { const q = P.UNSCRAMBLE({}); if (q.c) return q; }
    for (let x = 0x7F; x >= 0; x--) {
      const pairs = [[0xAE40, 0x4020]];
      if (x < 0x3C) pairs.push([0xC728, 0x40A0]);
      if (x < 0x0C) pairs.push([0x83B0, 0x40E0]);
      for (const [held, file] of pairs) { if (save) M[file + x] = M[held + x]; else M[held + x] = M[file + x]; }
    }
    if (save) { M[0x40DC] = M[0x31A1]; return P.SCRAMBLE({}); }
    M[0x31A1] = M[0x40DC];
    return { a: M[0x31A1], x: 0xFF, c: 0 };
  };

  // SCRAMBLE_NEXT ($967E): the scrambling's random numbers: the 16-bit seed at $96A6 times 5, and
  // its bits 2-9 in A
  P.SCRAMBLE_NEXT = r => {
    const s = M[0x96A6] | M[0x96A7] << 8;
    M[0x15] = ((s << 2) >> 8) & 255;
    const n = (s * 5) & 0xFFFF;
    M[0x96A6] = n & 255; M[0x96A7] = n >> 8;
    const a = (n >> 2) & 255;
    M[0x14] = a;
    return { a, x: r.x, y: r.y, c: (n >> 1) & 1, n: a >> 7, z: a ? 0 : 1 };
  };
  // SCRAMBLE ($96A8) and UNSCRAMBLE ($96AD): the page at $4000. The 256 numbers of the run from seed
  // $683B at $4300, and a place in them, $F810 (READ_CONTROLS's count, so any), kept in the page's
  // byte $0F; then SCRAMBLE_PAGE
  const scramble = mode => {
    M[0x19] = mode;
    M[0x1E] = 0; M[0x1F] = 0x40;
    M[0x96A6] = 0x3B; M[0x96A7] = 0x68;
    let x = 0;
    do { M[0x4300 + x] = P.SCRAMBLE_NEXT({ x }).a; x = (x + 1) & 255; } while (x);
    if (!(mode & 0x80)) M[0x400F] = M[0xF810]; else M[0xF810] = M[0x400F];
    return P.SCRAMBLE_PAGE({});
  };
  P.SCRAMBLE = r => scramble(0);
  P.UNSCRAMBLE = r => scramble(0x80);
  // SCRAMBLE_PAGE ($96E1): the page at ($1E), but its byte $0F. Scrambling: bytes $EF, $1F and $FF
  // set to 0 for the check, and each byte replaced by how many numbers of the run, from the place,
  // it took to come to its value; the place then moved on by the number at that count. Unscrambling
  // the same draws backwards: each byte the number its count comes to. Then the check: the three
  // bytes 0, or $C39A $81 (incorrect data) and the carry set
  P.SCRAMBLE_PAGE = r => {
    const base = M[0x1E] | M[0x1F] << 8, at = y => (base + y) & 0xFFFF;
    const un = M[0x19] & 0x80;
    if (!un) { M[at(0xEF)] = 0; M[at(0x1F)] = 0; M[at(0xFF)] = 0; }
    let y = 0, x;
    do {
      x = 0;
      let a;
      for (;;) {
        M[0x17] = M[at(y)];
        M[0x18] = x;
        a = M[0x4300 + M[0xF810]];
        M[0xF810] = (M[0xF810] + 1) & 255;
        x = (M[0x18] + 1) & 255;
        if (un) { if (x === M[0x17]) break; } else if (a === M[0x17]) { a = x; break; }
      }
      M[at(y)] = a;
      M[0xF810] = (M[0xF810] + M[0x4300 + x]) & 255;
      if (y === 0x0E) y++;
      y = (y + 1) & 255;
    } while (y);
    if (!un) return { a: M[0xF810], x, y: 0, c: 1 };
    if (!(M[at(0xEF)] | M[at(0xFF)] | M[at(0x1F)])) return { a: 0, x, y: 0x1F, c: 0 };
    M[0xC39A] = 0x81;
    return { a: 0x81, x, y: 0x1F, c: 1 };
  };
  // SCRAMBLE_2 ($9746), UNSCRAMBLE_2 ($974E): the two pages from $4000, the run going on into the
  // second; the carry is the second page's check
  P.SCRAMBLE_2 = r => { P.SCRAMBLE({}); M[0x1F] = (M[0x1F] + 1) & 255; return P.SCRAMBLE_PAGE({}); };
  P.UNSCRAMBLE_2 = r => { P.UNSCRAMBLE({}); M[0x1F] = (M[0x1F] + 1) & 255; return P.SCRAMBLE_PAGE({}); };
};
})(typeof window !== 'undefined' ? window : globalThis);
