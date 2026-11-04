// Stand-ins for the KERNAL routines the game calls while the KERNAL is banked in: VECTOR ($FF8D) at
// the start-up, and around a save or a load (SAVE_OR_LOAD) IOINIT, RAMTAS, VECTOR, CINT, SETMSG,
// SETLFS, SETNAM, OPEN, CLOSE, READST, LOAD and SAVE. They are the machine's, not the game's, so the
// game run on the kit's C64 and the port use these alike; the simulator holds no ROM. IOINIT,
// RAMTAS and CINT are written from KERNAL 901227-03's code ($FDA3, $FD50, $FF5B) and do to memory
// and the chips what it does (test/t-kernal.js runs that ROM beside them); the rest, the files, are
// as kit/c64/c64run.js has them, on the page's store: m.files, with load(name, device) the bytes
// (the two-byte address first) or null, save(name, device, bytes), remove(name, device) and
// list(device) the names. With no store a file's routine finds no device (error 5). The KERNAL's
// own messages ("SEARCHING FOR", "SAVING"), which SETMSG $C0 turns on, are not printed.
// Each takes m = { M, rd, wr, bits, files }: memory, a read and a write through the processor's
// map, its three bits ($01 as the processor port drives it), and the store; and the registers, and
// gives back the registers it leaves and the cycles it takes.
(function (root) {
'use strict';
// the video chip's 47 registers as CINT sets them, $D000-$D02E: the table at $ECB9-$ECE7 of KERNAL
// 901227-03 (its last byte, the $4C of the code after it, goes to $D02E)
const VIC_INIT = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x9B, 0x37, 0x00, 0x00, 0x00, 0x08, 0x00, 0x14, 0x0F, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x0E, 0x06, 0x01, 0x02, 0x03, 0x04, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x4C];
const nz = a => ({ n: (a >> 7) & 1, z: a ? 0 : 1 });
const K = {
  // VECTOR ($FF8D, $FD1A in the ROM): the 32 bytes of vectors at $0314: with C set copied to X:Y,
  // with C clear set from there
  VECTOR(m, r) {
    const M = m.M;
    M[0xC3] = r.x & 255; M[0xC4] = r.y & 255;
    const b = M[0xC3] | M[0xC4] << 8;
    let a = 0;
    for (let y = 0x1F; y >= 0; y--) {
      a = r.c ? M[0x0314 + y] : M[(b + y) & 0xFFFF];
      M[(b + y) & 0xFFFF] = a;
      M[0x0314 + y] = a;
    }
    return { a, x: r.x & 255, y: 0xFF, n: 1, z: 0, c: r.c, cycles: 32 * 23 };
  },
  // IOINIT ($FF84, $FDA3): the CIAs' interrupts, timers and ports as the KERNAL wants them, the SID's
  // volume off, the video chip in bank 0 ($DD00 7), the processor port $E7 (the ROMs in), CIA 1's
  // timer A at 60 a second ($4025 when $02A6 says PAL, $4295 otherwise) and its interrupt on, and
  // the serial bus's clock line let go ($DD00 bit 4)
  IOINIT(m, r) {
    const w = m.wr;
    w(0xDC0D, 0x7F); w(0xDD0D, 0x7F); w(0xDC00, 0x7F);
    w(0xDC0E, 8); w(0xDD0E, 8); w(0xDC0F, 8); w(0xDD0F, 8);
    w(0xDC03, 0); w(0xDD03, 0); w(0xD418, 0); w(0xDC02, 0xFF);
    w(0xDD00, 7); w(0xDD02, 0x3F);
    w(0x01, 0xE7); w(0x00, 0x2F);
    K.timer(m);
    const a = (m.rd(0xDD00) | 0x10) & 255;
    w(0xDD00, a);
    return Object.assign({ a, x: 0xFF, y: r.y & 255, cycles: 120 }, nz(a));
  },
  // $FDDD-$FF6E: CIA 1's timer A for the jiffy clock, by $02A6, and its interrupt on
  timer(m) {
    if (m.M[0x02A6]) { m.wr(0xDC04, 0x25); m.wr(0xDC05, 0x40); } else { m.wr(0xDC04, 0x95); m.wr(0xDC05, 0x42); }
    m.wr(0xDC0D, 0x81);
    m.wr(0xDC0E, (m.rd(0xDC0E) & 0x80) | 0x11);
  },
  // RAMTAS ($FF87, $FD50): $0002-$0101, $0200-$03FF cleared, the tape's buffer at $033C ($B2), and
  // the RAM test: each byte from $0400 up written with $55 and $AB and read back, and put back as it
  // was, to the first that does not read back. RAM always does, so only the first byte that is not
  // RAM has any effect: with the KERNAL in and BASIC out ($01 $36, as the game calls it) the video
  // chip's registers at $D000, of which $D010 is the last to pass: $D011's bit 7 reads the raster's
  // ninth bit, which one of $55 and $AB does not match, and $D011 keeps the one that failed. The top
  // of memory there ($0283), the start $0800 ($0282) and the screen at $0400 ($0288).
  RAMTAS(m, r) {
    const M = m.M;
    for (let y = 0; y < 256; y++) { M[0x0002 + y] = 0; M[0x0200 + y] = 0; M[0x0300 + y] = 0; }
    M[0xB2] = 0x3C; M[0xB3] = 0x03;
    const bits = m.bits();
    const ram = a => a < 0xA000 || (a < 0xC000 && (bits & 3) !== 3) || (a < 0xD000 && a >= 0xC000) ||
      (a >= 0xD000 && a < 0xE000 && !(bits & 3)) || (a >= 0xE000 && !(bits & 2));
    const io = a => a >= 0xD000 && a < 0xE000 && (bits & 3) && (bits & 4);
    let a = 0x0400, cycles = 2 * 256 * 20;
    for (;; a = (a + 1) & 0xFFFF) {
      if (!(a & 0xFF)) cycles += 8;
      if (ram(a)) { cycles += 50; continue; }
      if (!io(a)) throw new Error('RAMTAS: the test reached a ROM at $' + a.toString(16) + ', which the stand-in does not hold');
      const x = m.rd(a);
      m.wr(a, 0x55);
      if (m.rd(a) !== 0x55) break;
      m.wr(a, 0xAB);
      if (m.rd(a) !== 0xAB) break;
      m.wr(a, x);
      cycles += 50;
    }
    M[0xC1] = 0; M[0xC2] = a >> 8;
    M[0x0283] = a & 255; M[0x0284] = a >> 8;
    M[0x0282] = 0x08; M[0x0288] = 0x04;
    return { a: 4, x: a & 255, y: a >> 8, c: 0, n: 0, z: 0, cycles };
  },
  // CINT ($FF81, $FF5B): the video chip's registers from VIC_INIT, the screen editor's bytes, the
  // screen's line links ($D9-$F3) and its 25 lines cleared, the colour RAM to light blue ($0286)
  // and the screen to spaces, from the bottom line up; the cursor home; then, at the raster's line
  // 0, $02A6 from the video chip's raster flag, which the line $137 that VIC_INIT compares with has
  // set on a PAL machine (this one) and not on an NTSC one; and the jiffy clock's timer as IOINIT
  // sets it
  CINT(m, r) {
    const M = m.M, w = m.wr;
    M[0x9A] = 3; M[0x99] = 0;
    for (let x = 0x2F; x; x--) w(0xCFFF + x, VIC_INIT[x - 1]);
    M[0x0291] = 0; M[0xCF] = 0;
    M[0x028F] = 0x48; M[0x0290] = 0xEB;
    M[0x0289] = 0x0A; M[0x028C] = 0x0A;
    M[0x0286] = 0x0E; M[0x028B] = 0x04;
    M[0xCD] = 0x0C; M[0xCC] = 0x0C;
    let hi = M[0x0288] | 0x80, lo = 0, x;
    for (x = 0; x < 0x1A; x++) {
      M[0xD9 + x] = hi;
      lo += 0x28; if (lo > 255) { lo &= 255; hi = (hi + 1) & 255; }
    }
    M[0xD9 + x] = 0xFF;
    const line = x => {
      M[0xD1] = (x * 0x28) & 255;
      M[0xD2] = (M[0xD9 + x] & 3) | M[0x0288];
    };
    const colourPtr = () => { M[0xF3] = M[0xD1]; M[0xF4] = (M[0xD2] & 3) | 0xD8; };
    for (x = 0x18; x >= 0; x--) {
      line(x); colourPtr();
      const s = M[0xD1] | M[0xD2] << 8, c = M[0xF3] | M[0xF4] << 8;
      for (let y = 0x27; y >= 0; y--) { w((c + y) & 0xFFFF, M[0x0286]); w((s + y) & 0xFFFF, 0x20); }
    }
    M[0xD3] = 0; M[0xD6] = 0;
    line(0);
    M[0xD5] = 0x27;
    colourPtr();
    M[0x02A6] = 1;
    K.timer(m);
    const a = (m.rd(0xDD00) | 0x10) & 255;
    w(0xDD00, a);
    return Object.assign({ a, x: 1, y: 0x84, cycles: 47 * 12 + 25 * 40 * 24 + 19656 }, nz(a));
  },
  // SETMSG ($FF90, $FE18): the messages' flags into $9D; A the status ($90)
  SETMSG(m, r) { m.M[0x9D] = r.a & 255; const a = m.M[0x90]; return Object.assign({ a, x: r.x, y: r.y, cycles: 20 }, nz(a)); },
  // SETLFS ($FFBA): the file's number, device and secondary address
  SETLFS(m, r) { const M = m.M; M[0xB8] = r.a & 255; M[0xBA] = r.x & 255; M[0xB9] = r.y & 255; return { a: r.a, x: r.x, y: r.y, cycles: 18 }; },
  // SETNAM ($FFBD): the name's length and where it is
  SETNAM(m, r) { const M = m.M; M[0xB7] = r.a & 255; M[0xBB] = r.x & 255; M[0xBC] = r.y & 255; return { a: r.a, x: r.x, y: r.y, cycles: 18 }; },
  // READST ($FFB7, $FE07): the status, $90
  READST(m, r) { const a = m.M[0x90]; return Object.assign({ a, x: r.x, y: r.y, cycles: 20 }, nz(a)); },
  name(m) {
    let s = '';
    const a = m.M[0xBB] | m.M[0xBC] << 8;
    for (let i = 0; i < m.M[0xB7]; i++) s += String.fromCharCode(m.rd((a + i) & 0xFFFF));
    return s;
  },
  absent(m, r) { m.M[0x90] = 0x80; return { a: 5, x: r.x, y: r.y, c: 1, cycles: 2000 }; },
  // OPEN ($FFC0): with the drive's command channel (secondary address 15) the command in the name:
  // a scratch, "S0:" and names, takes them off the disk
  OPEN(m, r) {
    if (!m.files) return K.absent(m, r);
    const M = m.M, n = K.name(m);
    if (M[0xB9] === 15) {
      const s = /^S\d?:(.*)$/.exec(n);
      if (s) for (const f of s[1].split(',')) m.files.remove(f, M[0xBA]);
    }
    M[0x90] = 0;
    return { a: r.a, x: r.x, y: r.y, c: 0, cycles: 2000 };
  },
  // CLOSE ($FFC3)
  CLOSE(m, r) { return { a: r.a, x: r.x, y: r.y, c: 0, cycles: 200 }; },
  // LOAD ($FFD5): to X:Y (secondary address 0), its end in X:Y and $AE; on the disk the name "$" is
  // its directory, as the 1541 sends it (DIRECTORY)
  LOAD(m, r) {
    if (!m.files) return K.absent(m, r);
    const M = m.M, name = K.name(m), dev = M[0xBA];
    const b = dev === 8 && name === '$' ? K.DIRECTORY(m.files, dev) : m.files.load(name, dev);
    if (!b) { M[0x90] = 0x42; return { a: 4, x: r.x, y: r.y, c: 1, cycles: 20000 }; }
    const start = M[0xB9] ? b[0] | b[1] << 8 : (r.x & 255) | (r.y & 255) << 8;
    for (let i = 2; i < b.length; i++) m.wr((start + i - 2) & 0xFFFF, b[i]);
    const end = (start + b.length - 2) & 0xFFFF;
    M[0xC3] = start & 255; M[0xC4] = start >> 8; M[0xAE] = end & 255; M[0xAF] = end >> 8;
    M[0x90] = 0x40;
    return { a: r.a, x: end & 255, y: end >> 8, c: 0, cycles: 20000 + b.length * 400 };
  },
  // SAVE ($FFD8): from the address in the zero-page pair A names up to X:Y, not included
  SAVE(m, r) {
    if (!m.files) return K.absent(m, r);
    const M = m.M, a = r.a & 255, start = M[a] | M[(a + 1) & 255] << 8, end = (r.x & 255) | (r.y & 255) << 8;
    const out = new Uint8Array(Math.max(0, end - start) + 2);
    out[0] = start & 255; out[1] = start >> 8;
    for (let i = start; i < end; i++) out[i - start + 2] = m.rd(i);
    m.files.save(K.name(m), M[0xBA], out);
    M[0x90] = 0;
    return { a: r.a, x: r.x, y: r.y, c: 0, cycles: 20000 + out.length * 400 };
  },
  // a disk's directory as LOAD "$",8 gives it: the heading (a blank name: the game reads only the
  // files' lines), a 32-byte line for each file (its blocks of 254 bytes, its name in quotes, PRG)
  // and the blocks free of the 1541's 664, each line a BASIC line, with the load address $0401 first
  DIRECTORY(files, dev) {
    const out = [0x01, 0x04];
    const line = (n, text) => { out.push(0x01, 0x01, n & 255, n >> 8); for (const ch of text) out.push(ch.charCodeAt(0) & 255); out.push(0); };
    line(0, '\x12"' + ' '.repeat(16) + '" 00 2A');
    let used = 0;
    for (const n of files.list(dev)) {
      const b = files.load(n, dev), blocks = Math.max(1, Math.ceil((b ? b.length : 0) / 254));
      used += blocks;
      const pad = blocks < 10 ? 3 : blocks < 100 ? 2 : 1;
      const s = ' '.repeat(pad) + '"' + n + '"' + ' '.repeat(Math.max(0, 16 - n.length)) + ' PRG';
      line(blocks, s.padEnd(27));
    }
    line(664 - used, 'BLOCKS FREE.'.padEnd(25));
    out.push(0, 0);
    return Uint8Array.from(out);
  },
};
// a store of files on the devices (1 the tape, 8 the disc), kept in memory: made empty, or a copy of
// another; dump() writes it out as text, to compare two
K.Store = class {
  constructor(from) { this.f = new Map(from ? [...from.f].map(([k, b]) => [k, b.slice()]) : []); }
  load(name, dev) { const b = this.f.get(dev + ':' + name); return b ? b.slice() : null; }
  save(name, dev, bytes) { this.f.set(dev + ':' + name, Uint8Array.from(bytes)); }
  remove(name, dev) { this.f.delete(dev + ':' + name); }
  list(dev) { return [...this.f.keys()].filter(k => k.startsWith(dev + ':')).map(k => k.slice(k.indexOf(':') + 1)); }
  dump() { return [...this.f].map(([k, b]) => k + '=' + Array.from(b, v => v.toString(16).padStart(2, '0')).join('')).join(';'); }
};
// the machine's hooks at the jump table, for the game's code run on the kit's C64: files, the store
// (none in the tests)
const ADDR = { 0xFF81: 'CINT', 0xFF84: 'IOINIT', 0xFF87: 'RAMTAS', 0xFF8D: 'VECTOR', 0xFF90: 'SETMSG',
  0xFFB7: 'READST', 0xFFBA: 'SETLFS', 0xFFBD: 'SETNAM', 0xFFC0: 'OPEN', 0xFFC3: 'CLOSE', 0xFFD5: 'LOAD', 0xFFD8: 'SAVE' };
K.ADDR = ADDR;
K.hooks = (files = null) => {
  const h = {};
  for (const [a, name] of Object.entries(ADDR)) {
    h[a] = c => {
      const m = { M: c.m, rd: x => c.rd(x), wr: (x, v) => c.wr(x, v), bits: () => (c.pdata | ~c.pdir) & 7, files };
      const q = K[name](m, { a: c.a, x: c.x, y: c.y, c: c.c });
      for (const k of ['a', 'x', 'y', 'c', 'n', 'z']) if (q[k] !== undefined) c[k] = q[k] & 255;
      if (q.cycles) c.cycles += q.cycles;
      c.rts();
      return false;
    };
  }
  return h;
};
root.SCRKernal = K;
const G = root.SCRGroups = root.SCRGroups || {};
G.kernal = P => {
  const m = { M: P.M, rd: a => P.rd(a), wr: (a, v) => P.wr(a, v), bits: () => P.M[1] & 7 };
  Object.defineProperty(m, 'files', { get: () => P.io.files || null });
  P.kernal = {};
  for (const name of Object.values(ADDR)) P.kernal[name] = r => K[name](m, r);
};
})(typeof window !== 'undefined' ? window : globalThis);
