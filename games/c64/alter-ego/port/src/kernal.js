'use strict';
// The machine the game runs on, as far as the game reaches it: the KERNAL routines it calls
// through the jump table at $FF81-$FFF3, the KERNAL's own interrupt at $EA31 (the clock, the
// cassette switch, the keyboard scan) and a 1541 disk drive on the serial bus, holding the game's
// files. They are the machine's, not the game's, so the game run on the kit's C64 and the port use
// these alike: the simulator holds no ROM. The interrupt and the keyboard scan are written from
// KERNAL 901227-03's code at $EA31-$EB79 and $F69B-$F6DC, and GETIN from $F13E and $E5B4, and
// port/test/kernal.js runs that ROM beside them; the decode of a key is written here from the
// C64's keyboard (the KERNAL's tables at $EB81, $EBC2, $EC03 and $EC78 give the same codes, which
// the same test checks). The files and the serial bus are kept at the level of the bus: LISTEN,
// SECOND, CIOUT and UNLSN carry a name or a command to the drive and TALK, TKSA, ACPTR and UNTLK
// fetch its bytes, and OPEN, CLOSE, CHKIN, CHKOUT, CHRIN, CHROUT, GETIN and CLRCHN are the
// KERNAL's on top of them, keeping its tables in zero page and at $0259-$0276 as the ROM does.
// The bus's handshake and its timing are not modelled, nor the screen editor (CHROUT to the
// screen and CHRIN from the keyboard stop with an error: the game does neither).
//
// The drive: AEKernal.drive({ files }) holds the disks' files by name, one store for every disk,
// so the game never has to ask for another; the MAP files are read through the game's fast
// loader, whose transfer AEKernal.fastRecord gives (port/src/disk.js). copyDrive gives a copy that
// goes its own way, as a machine that is copied needs.
// It answers what the game sends it: OPEN of a file to read or, with ",W", to write; "S0:" and
// "S:" (scratch); "UJ" and "U:" (reset: error 73); "I" (initialise); "M-E" at $E6BF, the 1541
// ROM's routine that sets the error channel to 00, OK, which the game sends after it reads the
// status; and reads of the error channel. A "U;", which a 1541 does not answer, leaves the error
// as it is.
//
// Each routine takes k = { rd(a), wr(a, v), drive } (a read and a write through the processor's
// map, the drive) and the registers { a, x, y, c }, and gives back the registers it leaves.
(function (root) {
  const AEKernal = {};

  // ---- the drive
  // files: { NAME: Uint8Array } as the disks hold them (a relative file's records one after
  // another), never changed in place: a file written or scratched gives the drive a new object, so
  // that a copy of the drive (copyDrive) shares the bytes and keeps its own list. A channel open
  // to read keeps the file's name and its place.
  AEKernal.drive = function (o = {}) {
    const files = o.files || {};
    return { base: o.base || files, files, ch: {}, err: [0, ' OK', 0, 0], msg: null, listen: null, talk: null, fast: null };
  };
  AEKernal.copyDrive = function (d) {
    const c = JSON.parse(JSON.stringify({ ch: d.ch, err: d.err, msg: d.msg, listen: d.listen, talk: d.talk, fast: d.fast }));
    return Object.assign(c, { base: d.base, files: d.files });
  };
  // the drive as JSON for a saved moment: the files that differ from base by name, in base64
  AEKernal.driveState = function (d) {
    const s = JSON.parse(JSON.stringify({ ch: d.ch, err: d.err, msg: d.msg, listen: d.listen, talk: d.talk, fast: d.fast }));
    s.written = {}; s.gone = [];
    const b64 = u => (typeof Buffer !== 'undefined' ? Buffer.from(u).toString('base64') : btoa(String.fromCharCode(...u)));
    for (const n of Object.keys(d.files)) if (d.files[n] !== d.base[n]) s.written[n] = b64(d.files[n]);
    for (const n of Object.keys(d.base)) if (!(n in d.files)) s.gone.push(n);
    return s;
  };
  AEKernal.driveFromState = function (s, base) {
    const unb64 = t => (typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(t, 'base64')) : Uint8Array.from(atob(t), ch => ch.charCodeAt(0)));
    const files = Object.assign({}, base);
    for (const n of s.gone || []) delete files[n];
    for (const [n, t] of Object.entries(s.written || {})) files[n] = unb64(t);
    const d = JSON.parse(JSON.stringify({ ch: s.ch, err: s.err, msg: s.msg, listen: s.listen, talk: s.talk, fast: s.fast }));
    return Object.assign(d, { base, files });
  };
  const OK = [0, ' OK', 0, 0];
  const pad2 = n => (n < 10 ? '0' : '') + n;
  const ascii = s => Array.from(s, ch => ch.charCodeAt(0));
  function setError(d, code, text, t = 0, s = 0) { d.err = [code, text, t, s]; d.msg = null; }
  // the error channel's message, built when it is first read and kept until it is read to its end
  function message(d) {
    if (!d.msg) { const [c, t, a, b] = d.err; d.msg = { bytes: ascii(pad2(c) + ',' + t + ',' + pad2(a) + ',' + pad2(b) + '\r'), at: 0 }; }
    return d.msg;
  }
  // a name as the drive takes it: the drive number and the type and mode after commas dropped
  function parseName(bytes) {
    let s = String.fromCharCode(...bytes);
    const parts = s.split(',');
    s = parts[0];
    const write = parts.slice(1).some(p => p.trim().toUpperCase() === 'W');
    const i = s.indexOf(':');
    if (i >= 0) s = s.slice(i + 1);
    return { name: s, write };
  }
  function open(d, sa, bytes) {
    const { name, write } = parseName(bytes);
    if (write) {
      if (d.files[name]) { setError(d, 63, 'FILE EXISTS'); return; }
      d.ch[sa] = { name, write: true, data: [], pos: 0 };
    } else {
      if (!d.files[name]) { setError(d, 62, ' FILE NOT FOUND'); delete d.ch[sa]; return; }
      d.ch[sa] = { name, write: false, pos: 0 };
    }
    setError(d, 0, ' OK');
  }
  function close(d, sa) {
    const c = d.ch[sa];
    if (c && c.write) d.files = Object.assign({}, d.files, { [c.name]: Uint8Array.from(c.data) });
    delete d.ch[sa];
  }
  function command(d, bytes) {
    while (bytes.length && bytes[bytes.length - 1] === 13) bytes = bytes.slice(0, -1);
    const s = String.fromCharCode(...bytes);
    if (s.startsWith('M-E')) {
      const at = bytes[3] | bytes[4] << 8;
      if (at === 0xE6BF) setError(d, 0, ' OK');
      // the game's own drive code, which its boot left in the drive's memory: at $07AF it finds
      // the disk's MAP file, at $0300 it sends the record numbered by the two bytes after
      else if (at === 0x07AF) d.fast = { index: null };
      else if (at === 0x0300 && d.fast) d.fast.index = bytes[5] | bytes[6] << 8;
      else throw new Error('the drive was sent M-E at $' + at.toString(16));
      return;
    }
    if (s === 'UJ' || s === 'U:') { d.ch = {}; d.fast = null; setError(d, 73, 'CBM DOS V2.6 1541'); return; }
    if (s === 'U;') return;
    if (s[0] === 'I') { d.fast = null; setError(d, 0, ' OK'); return; }
    if (s[0] === 'S') {
      const i = s.indexOf(':');
      const name = s.slice(i + 1);
      let n = 0;
      if (d.files[name]) { d.files = Object.assign({}, d.files); delete d.files[name]; n = 1; }
      setError(d, 1, ' FILES SCRATCHED', n, 0);
      return;
    }
    throw new Error('the drive was sent a command it does not know: ' + JSON.stringify(s));
  }
  // The game's drive code sending a record of the MAP file, the 256 bytes its fast transfer puts
  // in the buffer at $8045 ($5DEE-$5E36 on the computer's side): a status, the MAP file's number,
  // then the 254 bytes of the record. The drive here holds all six disks, the one the game asks
  // for (want, its $7E93) always in it: MAP1 is number 1, MAP27 (the second and seventh phases) 2,
  // MAP3 to MAP6 3 to 6. A record past the file's end comes with status 50, RECORD NOT PRESENT.
  const MAPS = { 1: 'MAP1', 2: 'MAP27', 3: 'MAP3', 4: 'MAP4', 5: 'MAP5', 6: 'MAP6' };
  AEKernal.fastRecord = function (d, want) {
    const out = new Uint8Array(256);
    const f = d.files[MAPS[want]], index = d.fast ? d.fast.index : null;
    out[1] = want;
    if (!f || index === null || (index + 1) * 254 > f.length) { out[0] = 50; return out; }
    out.set(f.subarray(index * 254, index * 254 + 254), 2);
    return out;
  };

  // ---- the serial bus, as the KERNAL's routines drive it
  const ST = 0x90;
  const status = (k, bits) => k.wr(ST, k.rd(ST) | bits);
  function busListen(k, dev) {
    if ((dev & 31) !== 8) { status(k, 0x80); k.drive.listen = null; return; }
    k.drive.listen = { sa: null, buf: [] };
  }
  function busTalk(k, dev) {
    if ((dev & 31) !== 8) { status(k, 0x80); k.drive.talk = null; return; }
    k.drive.talk = { sa: null };
  }
  function busSecond(k, sa) {
    const L = k.drive.listen;
    if (!L) return;
    L.sa = sa;
    if ((sa & 0xF0) === 0xE0) close(k.drive, sa & 15);
  }
  function busOut(k, b) {
    const L = k.drive.listen;
    if (!L || L.sa === null) return;
    if ((L.sa & 0xF0) === 0xF0 || (L.sa & 15) === 15) { L.buf.push(b); return; }
    const c = k.drive.ch[L.sa & 15];
    if (c && c.write) c.data.push(b);
  }
  function busUnlisten(k) {
    const L = k.drive.listen;
    k.drive.listen = null;
    if (!L || L.sa === null) return;
    if ((L.sa & 15) === 15) { if (L.buf.length) command(k.drive, L.buf); return; }
    if ((L.sa & 0xF0) === 0xF0) open(k.drive, L.sa & 15, L.buf);
  }
  function busIn(k) {
    const d = k.drive, T = d.talk;
    if (!T || T.sa === null) { status(k, 0x02); return 13; }
    if (T.sa === 15) {
      const m = message(d);
      const b = m.bytes[m.at++];
      if (m.at >= m.bytes.length) { status(k, 0x40); setError(d, 0, ' OK'); }
      return b;
    }
    const c = d.ch[T.sa], f = c && !c.write ? d.files[c.name] : null;
    if (!f || c.pos >= f.length) { status(k, 0x42); return 13; }
    const b = f[c.pos++];
    if (c.pos >= f.length) status(k, 0x40);
    return b;
  }
  AEKernal.bus = { listen: busListen, talk: busTalk, second: busSecond, out: busOut, unlisten: busUnlisten, in: busIn };

  // ---- the KERNAL's file tables: $98 the count, $0259 the logical numbers, $0263 the devices,
  // $026D the secondary addresses (with $60), and LA, SA, FA at $B8, $B9 and $BA
  function find(k, la) {
    const n = k.rd(0x98);
    for (let x = 0; x < n; x++) if (k.rd(0x0259 + x) === la) return x;
    return -1;
  }
  function select(k, x) { k.wr(0xB8, k.rd(0x0259 + x)); k.wr(0xBA, k.rd(0x0263 + x)); k.wr(0xB9, k.rd(0x026D + x)); }
  const fail = (r, n) => Object.assign({}, r, { a: n, c: 1 });
  const done = (r, o = {}) => Object.assign({}, r, { c: 0 }, o);

  const K = {
    SETLFS(k, r) { k.wr(0xB8, r.a); k.wr(0xBA, r.x); k.wr(0xB9, r.y); return done(r); },
    SETNAM(k, r) { k.wr(0xB7, r.a); k.wr(0xBB, r.x); k.wr(0xBC, r.y); return done(r); },
    OPEN(k, r) {
      const la = k.rd(0xB8);
      if (find(k, la) >= 0) return fail(r, 2);
      const x = k.rd(0x98);
      if (x >= 10) return fail(r, 1);
      k.wr(0x98, x + 1);
      k.wr(0x0259 + x, la);
      const sa = k.rd(0xB9) | 0x60;
      k.wr(0xB9, sa); k.wr(0x026D + x, sa);
      const fa = k.rd(0xBA);
      k.wr(0x0263 + x, fa);
      if (fa < 4) throw new Error('OPEN of device ' + fa + ' is not modelled');
      const n = k.rd(0xB7);
      if (!(sa & 0x80) && n) {
        k.wr(ST, 0);
        busListen(k, fa);
        busSecond(k, sa | 0xF0);
        if (k.rd(ST) & 0x80) return fail(r, 5);
        const at = k.rd(0xBB) | k.rd(0xBC) << 8;
        for (let i = 0; i < n; i++) busOut(k, k.rd((at + i) & 0xFFFF));
        busUnlisten(k);
      }
      return done(r);
    },
    CLOSE(k, r) {
      const x = find(k, r.a);
      if (x < 0) return done(r);
      select(k, x);
      const fa = k.rd(0xBA), sa = k.rd(0xB9);
      if (fa >= 4 && !(sa & 0x80)) { busListen(k, fa); busSecond(k, (sa & 0xEF) | 0xE0); busUnlisten(k); }
      const n = k.rd(0x98) - 1;
      k.wr(0x98, n);
      if (x !== n) for (const t of [0x0259, 0x0263, 0x026D]) k.wr(t + x, k.rd(t + n));
      return done(r);
    },
    CHKIN(k, r) {
      const x = find(k, r.x);
      if (x < 0) return fail(r, 3);
      select(k, x);
      const fa = k.rd(0xBA);
      if (fa < 4) throw new Error('CHKIN of device ' + fa + ' is not modelled');
      busTalk(k, fa);
      const sa = k.rd(0xB9);
      if (!(sa & 0x80) && k.drive.talk) k.drive.talk.sa = sa & 15;
      if (k.rd(ST) & 0x80) return fail(r, 5);
      k.wr(0x99, fa);
      return done(r);
    },
    CHKOUT(k, r) {
      const x = find(k, r.x);
      if (x < 0) return fail(r, 3);
      select(k, x);
      const fa = k.rd(0xBA);
      if (fa < 4) throw new Error('CHKOUT of device ' + fa + ' is not modelled');
      busListen(k, fa);
      const sa = k.rd(0xB9);
      if (!(sa & 0x80)) busSecond(k, sa);
      if (k.rd(ST) & 0x80) return fail(r, 5);
      k.wr(0x9A, fa);
      return done(r);
    },
    CLRCHN(k, r) {
      if (k.rd(0x9A) > 3) busUnlisten(k);
      if (k.rd(0x99) > 3) k.drive.talk = null;
      k.wr(0x9A, 3); k.wr(0x99, 0);
      return Object.assign({}, r, { a: 0, x: 3 });
    },
    CLALL(k, r) { k.wr(0x98, 0); return K.CLRCHN(k, r); },
    CHRIN(k, r) {
      const dev = k.rd(0x99);
      if (dev < 4) throw new Error('CHRIN from device ' + dev + ' is not modelled');
      if (k.rd(ST)) return done(r, { a: 13 });
      return done(r, { a: busIn(k) });
    },
    // $F13E: the keyboard's buffer when the input is the keyboard, else CHRIN
    GETIN(k, r) {
      if (k.rd(0x99) === 0) {
        const n = k.rd(0xC6);
        if (!n) return done(r, { a: 0 });
        const y = k.rd(0x0277);
        for (let x = 0; x < n; x++) k.wr(0x0277 + x, k.rd(0x0278 + x));
        k.wr(0xC6, n - 1);
        return done(r, { a: y, x: n, y });
      }
      return K.CHRIN(k, r);
    },
    CHROUT(k, r) {
      const dev = k.rd(0x9A);
      if (dev < 4) throw new Error('CHROUT to device ' + dev + ' is not modelled');
      busOut(k, r.a);
      return done(r);
    },
    READST(k, r) { return Object.assign({}, r, { a: k.rd(ST) }); },
    LISTEN(k, r) { k.wr(ST, 0); busListen(k, r.a); return done(r); },
    SECOND(k, r) { busSecond(k, r.a); return done(r); },
    TALK(k, r) { k.wr(ST, 0); busTalk(k, r.a); return done(r); },
    TKSA(k, r) { if (k.drive.talk) k.drive.talk.sa = r.a & 15; return done(r); },
    CIOUT(k, r) { busOut(k, r.a); return done(r); },
    UNLSN(k, r) { busUnlisten(k); return done(r); },
    UNTLK(k, r) { k.drive.talk = null; return done(r); },
    ACPTR(k, r) { return done(r, { a: busIn(k) }); },
  };
  AEKernal.K = K;
  // the jump table's entries, by address
  AEKernal.ENTRY = { 0xFFBA: 'SETLFS', 0xFFBD: 'SETNAM', 0xFFC0: 'OPEN', 0xFFC3: 'CLOSE', 0xFFC6: 'CHKIN',
    0xFFC9: 'CHKOUT', 0xFFCC: 'CLRCHN', 0xFFCF: 'CHRIN', 0xFFD2: 'CHROUT', 0xFFE4: 'GETIN', 0xFFE7: 'CLALL',
    0xFFB7: 'READST', 0xFFB1: 'LISTEN', 0xFF93: 'SECOND', 0xFFB4: 'TALK', 0xFF96: 'TKSA', 0xFFA8: 'CIOUT',
    0xFFAE: 'UNLSN', 0xFFAB: 'UNTLK', 0xFFA5: 'ACPTR' };

  // ---- the keyboard: what each key gives, by the KERNAL's number (8 x row + column), alone, with
  // and with SHIFT; $FF where it gives nothing, the modifier keys their flags
  const KEYS = [
    // DEL RETURN CRSR-right F7 F1 F3 F5 CRSR-down
    [0x14, 0x0D, 0x1D, 0x88, 0x85, 0x86, 0x87, 0x11], [0x94, 0x8D, 0x9D, 0x8C, 0x89, 0x8A, 0x8B, 0x91],
    // 3 W A 4 Z S E left-SHIFT
    [0x33, 0x57, 0x41, 0x34, 0x5A, 0x53, 0x45, 0x01], [0x23, 0xD7, 0xC1, 0x24, 0xDA, 0xD3, 0xC5, 0x01],
    // 5 R D 6 C F T X
    [0x35, 0x52, 0x44, 0x36, 0x43, 0x46, 0x54, 0x58], [0x25, 0xD2, 0xC4, 0x26, 0xC3, 0xC6, 0xD4, 0xD8],
    // 7 Y G 8 B H U V
    [0x37, 0x59, 0x47, 0x38, 0x42, 0x48, 0x55, 0x56], [0x27, 0xD9, 0xC7, 0x28, 0xC2, 0xC8, 0xD5, 0xD6],
    // 9 I J 0 M K O N
    [0x39, 0x49, 0x4A, 0x30, 0x4D, 0x4B, 0x4F, 0x4E], [0x29, 0xC9, 0xCA, 0x30, 0xCD, 0xCB, 0xCF, 0xCE],
    // + P L - . : @ ,
    [0x2B, 0x50, 0x4C, 0x2D, 0x2E, 0x3A, 0x40, 0x2C], [0xDB, 0xD0, 0xCC, 0xDD, 0x3E, 0x5B, 0xBA, 0x3C],
    // pound * ; HOME right-SHIFT = up-arrow /
    [0x5C, 0x2A, 0x3B, 0x13, 0x01, 0x3D, 0x5E, 0x2F], [0xA9, 0xC0, 0x5D, 0x93, 0x01, 0x3D, 0xDE, 0x3F],
    // 1 left-arrow CTRL 2 SPACE C= Q RUN/STOP
    [0x31, 0x5F, 0x04, 0x32, 0x20, 0x02, 0x51, 0x03], [0x21, 0x5F, 0x04, 0x22, 0xA0, 0x02, 0xD1, 0x83],
  ];
  const PLAIN = [], SHIFTED = [];
  for (let row = 0; row < 8; row++) { PLAIN.push(...KEYS[2 * row]); SHIFTED.push(...KEYS[2 * row + 1]); }
  PLAIN.push(0xFF); SHIFTED.push(0xFF);
  // with C=, the graphics and the colours 9 to 16; with CTRL, the colours 1 to 8, reverse on and
  // off and the control codes, in the same order of keys
  const CBM = [
    0x94, 0x8D, 0x9D, 0x8C, 0x89, 0x8A, 0x8B, 0x91, 0x96, 0xB3, 0xB0, 0x97, 0xAD, 0xAE, 0xB1, 0x01,
    0x98, 0xB2, 0xAC, 0x99, 0xBC, 0xBB, 0xA3, 0xBD, 0x9A, 0xB7, 0xA5, 0x9B, 0xBF, 0xB4, 0xB8, 0xBE,
    0x29, 0xA2, 0xB5, 0x30, 0xA7, 0xA1, 0xB9, 0xAA, 0xA6, 0xAF, 0xB6, 0xDC, 0x3E, 0x5B, 0xA4, 0x3C,
    0xA8, 0xDF, 0x5D, 0x93, 0x01, 0x3D, 0xDE, 0x3F, 0x81, 0x5F, 0x04, 0x95, 0xA0, 0x02, 0xAB, 0x83,
    0xFF];
  const CTRL = [
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x1C, 0x17, 0x01, 0x9F, 0x1A, 0x13, 0x05, 0xFF,
    0x9C, 0x12, 0x04, 0x1E, 0x03, 0x06, 0x14, 0x18, 0x1F, 0x19, 0x07, 0x9E, 0x02, 0x08, 0x15, 0x16,
    0x12, 0x09, 0x0A, 0x92, 0x0D, 0x0B, 0x0F, 0x0E, 0xFF, 0x10, 0x0C, 0xFF, 0xFF, 0x1B, 0x00, 0xFF,
    0x1C, 0xFF, 0x1D, 0xFF, 0xFF, 0x1F, 0x1E, 0xFF, 0x90, 0x06, 0xFF, 0x05, 0xFF, 0xFF, 0x11, 0xFF,
    0xFF];
  AEKernal.decode = { plain: PLAIN, shift: SHIFTED, cbm: CBM, ctrl: CTRL };
  // the tables' addresses in the ROM, which the scan leaves in $F5/$F6
  const TABLES = [[0xEB81, PLAIN], [0xEBC2, SHIFTED], [0xEC03, CBM], [0xEC78, CTRL]];

  // $EA87, SCNKEY: the matrix read a column of $DC00 at a time, the last key held (not a
  // modifier) in $CB and the modifiers in $028D; then $EB48 picks the table by the modifiers
  // (SHIFT and C= together switch the character set, which $0291 can stop) and $EAE0 puts a new
  // key, or a repeat of a held one, in the buffer
  function scan(k) {
    const { rd, wr } = k;
    wr(0x028D, 0); wr(0xCB, 0x40); wr(0xDC00, 0);
    if (rd(0xDC01) === 0xFF) return store(k, 0xFF);
    wr(0xF5, 0x81); wr(0xF6, 0xEB);
    let y = 0, col = 0xFE;
    wr(0xDC00, col);
    for (let end = false; !end;) {
      let a;
      do { a = rd(0xDC01); } while (a !== rd(0xDC01));
      for (let x = 8; ;) {
        const bit = a & 1; a >>= 1;
        if (!bit) { const c = PLAIN[y]; if (c >= 5 || c === 3) wr(0xCB, y); else wr(0x028D, rd(0x028D) | c); }
        if (++y >= 0x41) { end = true; break; }
        if (--x === 0) break;
      }
      if (!end) { col = ((col << 1) | 1) & 0xFF; wr(0xDC00, col); }
    }
    const f = rd(0x028D);
    let table = PLAIN;
    if (f === 3) {
      if (f === rd(0x028E)) return leave(k);
      if (!(rd(0x0291) & 0x80)) wr(0xD018, rd(0xD018) ^ 2);
    } else {
      const [addr, t] = TABLES[f >= 4 ? 3 : f];
      wr(0xF5, addr & 255); wr(0xF6, addr >> 8);
      table = t;
    }
    const y2 = rd(0xCB), x = table[y2];
    if (y2 !== rd(0xC5)) { wr(0x028C, 0x10); return store(k, x); }
    const a = x & 0x7F, mode = rd(0x028A);
    if (!(mode & 0x80)) {
      if (mode & 0x40) return leave(k);
      if (a === 0x7F) return store(k, x);
      if (![0x14, 0x20, 0x1D, 0x11].includes(a)) return leave(k);
    }
    let d = rd(0x028C);
    if (d) { d = (d - 1) & 255; wr(0x028C, d); if (d) return leave(k); }
    const r = (rd(0x028B) - 1) & 255;
    wr(0x028B, r);
    if (r) return leave(k);
    wr(0x028B, 4);
    if (rd(0xC6) !== 0) return leave(k);
    return store(k, x);
  }
  // $EB26: the key noted as the last, and put in the buffer when it gives a code and there is room
  function store(k, code) {
    const { rd, wr } = k;
    wr(0xC5, rd(0xCB));
    wr(0x028E, rd(0x028D));
    if (code !== 0xFF) {
      const x = rd(0xC6);
      if (x < rd(0x0289)) { wr(0x0277 + x, code); wr(0xC6, x + 1); }
    }
    return leave(k);
  }
  function leave(k) { k.wr(0xDC00, 0x7F); }

  // $EA31: the KERNAL's interrupt, from its jiffy clock to the acknowledge of CIA 1. The cursor's
  // blink ($CC clear) is the screen editor's, and stops with an error
  AEKernal.irq = function (k) {
    const { rd, wr } = k;
    // $F69B, UDTIM: the jiffy clock, back to 0 at 24 hours ($4F1A01), and the STOP key in $91
    let t = (rd(0xA0) << 16 | rd(0xA1) << 8 | rd(0xA2)) + 1;
    if (t >= 0x4F1A01) t = 0;
    wr(0xA0, (t >> 16) & 255); wr(0xA1, (t >> 8) & 255); wr(0xA2, t & 255);
    let a;
    do { a = rd(0xDC01); } while (a !== rd(0xDC01));
    if (!(a & 0x80)) {
      wr(0xDC00, 0xBD);
      let x;
      do { x = rd(0xDC01); } while (x !== rd(0xDC01));
      wr(0xDC00, a);
      if (x === 0xFF) wr(0x91, a);
    } else wr(0x91, a);
    if (!rd(0xCC)) throw new Error('the cursor blinks ($CC = 0): the screen editor is not modelled');
    // $EA61: the cassette's switch read, its motor kept off
    const p = rd(0x01);
    if (p & 0x10) { wr(0xC0, 0); wr(0x01, p | 0x20); }
    else if (!rd(0xC0)) wr(0x01, p & 0x1F);
    scan(k);
    rd(0xDC0D);
  };

  root.AEKernal = AEKernal;
})(typeof window !== 'undefined' ? window : globalThis);
