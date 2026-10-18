// The KERNAL routines the game calls, written for the port: SETLFS, SETNAM, READST, LOAD, SAVE,
// OPEN, CLOSE, CHKIN, CLRCHN, CLALL and CHRIN. They are the machine's, not the game's, so they are
// written from what each does to memory, the same as kit/c64/c64run.js's stand-ins (the machine the
// port is checked against), and on the disk the page carries:
// - P.io.load(name) gives a file's bytes with its two-byte load address first, or null when the
//   disk has no file of that name (the name as the game passes it; the drive matches it as the
//   1541's DOS does);
// - P.io.block(track, sector) gives a 256-byte sector the game reads by block;
// - P.io.save(name, bytes) keeps a file, its address first.
// Each takes the registers as the port's routines do and leaves them, the carry clear for success.
// The KERNAL's own zero page ($90 the status, $B7-$BC the name and the file's numbers, $AE/$AF the
// end of a load, $C3/$C4 its start) is written where the KERNAL writes it: the game swaps its own
// out first (swap_kernal_zp).
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
G.kernal = function (P) {
  const M = P.M;
  const chans = new Map();          // logical file -> { sa, buf, pos }
  let input = 0;
  const name = () => {
    let s = '';
    const a = M[0xBB] | M[0xBC] << 8;
    for (let i = 0; i < M[0xB7]; i++) s += String.fromCharCode(P.rd((a + i) & 0xFFFF));
    return s;
  };
  const bare = s => s.replace(/^@?\d?:/, '');
  function command(text) {                   // the command channel: a block read into a buffer
    const c = /^(?:U1|UA|B-R)[: ]?\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(text.trim());
    if (!c) return;
    const b = P.io.block(+c[3], +c[4]) || new Uint8Array(256);
    for (const ch of chans.values()) if (ch.sa === +c[1] && ch.buf) { ch.buf.set(b); ch.pos = 0; }
  }
  P.kernal = {
    SETMSG: r => { M[0x9D] = r.a; return r; },
    READST: r => Object.assign({}, r, { a: M[0x90] }),
    SETLFS: r => { M[0xB8] = r.a; M[0xBA] = r.x; M[0xB9] = r.y; return r; },
    SETNAM: r => { M[0xB7] = r.a; M[0xBB] = r.x; M[0xBC] = r.y; return r; },
    // LOAD to X/Y with secondary address 0, to the file's own address otherwise; through the
    // processor's map, as the KERNAL's STA writes
    LOAD: r => {
      const b = M[0xBA] === 8 ? P.io.load(name()) : null;
      if (!b) { M[0x90] = 0x42; return Object.assign({}, r, { a: 4, c: 1 }); }
      const start = M[0xB9] ? b[0] | b[1] << 8 : r.x | r.y << 8;
      for (let i = 2; i < b.length; i++) P.wr((start + i - 2) & 0xFFFF, b[i]);
      const end = (start + b.length - 2) & 0xFFFF;
      M[0xC3] = start & 255; M[0xC4] = start >> 8; M[0xAE] = end & 255; M[0xAF] = end >> 8;
      M[0x90] = 0x40;
      return Object.assign({}, r, { x: end & 255, y: end >> 8, c: 0 });
    },
    // SAVE from the address in the zero-page pair A names up to X/Y, not included
    SAVE: r => {
      const start = M[r.a] | M[(r.a + 1) & 255] << 8, end = r.x | r.y << 8;
      const out = new Uint8Array(Math.max(0, end - start) + 2);
      out[0] = start & 255; out[1] = start >> 8;
      for (let a = start; a < end; a++) out[a - start + 2] = P.rd(a);
      if (P.io.save) P.io.save(bare(name()), out);
      M[0x90] = 0;
      return Object.assign({}, r, { c: 0 });
    },
    OPEN: r => {
      const n = name();
      chans.set(M[0xB8], { sa: M[0xB9], buf: n.startsWith('#') ? new Uint8Array(256) : null, pos: 0 });
      if (M[0xB9] === 15) command(n);
      M[0x90] = 0;
      return Object.assign({}, r, { c: 0 });
    },
    CLOSE: r => { chans.delete(r.a); return Object.assign({}, r, { c: 0 }); },
    CHKIN: r => { input = r.x; return Object.assign({}, r, { c: 0 }); },
    CLRCHN: r => { input = 0; return r; },
    CLALL: r => { chans.clear(); input = 0; return r; },
    CHRIN: r => {
      const ch = chans.get(input);
      if (!ch || !ch.buf) return Object.assign({}, r, { a: 13, c: 0 });
      const a = ch.buf[ch.pos & 255];
      ch.pos++;
      M[0x90] = ch.pos >= 256 ? 0x40 : 0;
      return Object.assign({}, r, { a, c: 0 });
    },
  };
  P.kernal.open = () => chans.size > 0;
};
})(typeof window !== 'undefined' ? window : globalThis);
