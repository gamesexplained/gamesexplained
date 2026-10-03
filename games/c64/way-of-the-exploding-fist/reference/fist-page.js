// The widgets of the Way of the Exploding Fist tabs, built by work/build_pages.py from the ports in
// work/fist.js (tested in work/test_ports.js against the game) and the widgets in work/page.js.
// Ports for the How it works page, each read from the game's own routine and tested in
// work/test_ports.js against the snapshot or the game's code in kit/c64/cpu6502.js.
// ram: a Uint8Array(65536) of the game's bytes (C64.load on the page, the snapshot in tests).
var FIST = (function () {
  'use strict';
  const w16 = (m, a) => m[a] | m[a + 1] << 8;

  // bitmap_unpack $17BB: backdrop i's packed bitmap, read backwards, written downwards from $F53F.
  // Returns the list of writes in the order the game makes them, so the page can replay it.
  function unpackBitmap(ram, i, out) {
    const head = w16(ram, 0x1839 + 2 * i);
    let src = (head + w16(ram, head)) & 0xFFFF, dst = 0xF53F;
    const order = [];
    for (;;) {
      const c = ram[src];
      if (c === 0) break;
      if (c < 0x80) {
        dst -= c; src -= c + 1;
        for (let y = c; y > 0; y--) { out[dst + y] = ram[src + y]; order.push(dst + y); }
      } else {
        const n = c & 0x7F, v = ram[src - 1];
        src -= 2; dst -= n;
        for (let y = n; y > 0; y--) { out[dst + y] = v; order.push(dst + y); }
      }
    }
    return order;
  }

  // colour_unpack $1849/$188B: backdrop i's colours, a nybble stream (low nybble first) in three
  // passes: colour RAM low nybbles from $D8C8, screen high and low nybbles from $CCC8.
  // out[$D800...] stands for colour RAM.
  function unpackColour(ram, i, out) {
    let p = w16(ram, 0x1841 + 2 * i), lowNext = true;
    const nyb = () => {
      const b = ram[p];
      if (lowNext) { lowNext = false; return b & 15; }
      lowNext = true; p++; return b >> 4;
    };
    for (const [start, keep] of [[0xD8C8, 0xF0], [0xCCC8, 0x0F], [0xCCC8, 0xF0]]) {
      let dst = start;
      const put = v => { out[dst] = (out[dst] & keep) | (keep === 0xF0 ? v : v << 4); dst++; };
      for (;;) {
        const n = nyb(), x = n & 7;
        if (x === 0) break;
        if (n & 8) { const v = nyb(); for (let k = 0; k < x; k++) put(v); }
        else for (let k = 0; k < x; k++) put(nyb());
      }
    }
  }

  // The sprite builder $3914 (plain) and $3BC5/$3E3D (mirrored): the nine 64-byte sprites of a
  // shape frame, slot 0-8 in rows of three. A cell of 0 leaves the slot empty (null). With
  // direct (the bull, $5D = $40) the frame byte is the sprite pointer itself.
  function pose(ram, frame, mirrored, direct) {
    const slots = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const col = mirrored ? 2 - c : c;
      const cell = ram[0x7AE0 + (3 * r + col) * 79 + frame];
      if (!cell) { slots.push(null); continue; }
      const base = direct ? 0xC000 + 64 * cell
                          : (ram[0x7F00 + cell] << 8) | ram[0x38B0 + (cell & 3)];
      const s = new Uint8Array(64);
      if (!mirrored) for (let k = 0; k < 64; k++) s[k] = ram[base + k];
      else for (let x = 62; x >= 0; x -= 3)
        for (let k = 0; k < 3; k++) s[x - 2 + k] = ram[0x7E00 + ram[base + x - k]];
      slots.push(s);
    }
    return slots;
  }

  // anim_list_table $7720: the steps of animation (= move) n: [ticks, frame, dx, dy] each.
  function anim(ram, n) {
    const s = w16(ram, 0x7720 + 2 * n), e = w16(ram, 0x7722 + 2 * n), out = [];
    for (let a = s; a < e; a += 4) out.push([ram[a], ram[a + 1], ram[a + 2], ram[a + 3]]);
    return out;
  }

  // The hit test $2B8E-$2C1D for fighters facing each other: move m, defender frame f, distance d
  // (signed, along the attacker's facing). 2 whole point, 1 half, 0 miss.
  function grade(ram, m, f, d) {
    const p = ram[w16(ram, 0x121D + 2 * m) + f];
    if (p === 0x80) return 0;
    const aim = (p + 0x80) & 255, dist = (d + 0x80) & 255;
    const full = ram[0x11BD + m], half = ram[0x11D6 + m];
    if (!ram[0x11A8 + m]) {                       // forward blows, $2BEB-$2C04
      if (dist === aim) return 2;
      if (dist > aim) return 0;
      if (((dist + full) & 255) >= aim) return 2;
      if (((dist + half) & 255) >= aim) return 1;
      return 0;
    }
    if (dist === aim) return 2;                   // backward blows, $2C05-$2C1D
    if (dist < aim) return 0;
    if (((dist - full) & 255) < aim) return 2;
    if (((dist - half) & 255) < aim) return 1;
    return 0;
  }

  // The speech player $311A: sample k as a list of half-wave lengths in seconds. Each byte picks
  // a timer B period from $0200/$0300; measured live, the time to the next volume flip is
  // 9 x period + 108 cycles of the PAL clock (timer A underflows every 9 cycles).
  function speech(ram, k) {
    const s = 0xF540 + w16(ram, 0xF540 + 4 * k), e = 0xF540 + w16(ram, 0xF542 + 4 * k), out = [];
    for (let a = s; a < e; a++) {
      const per = ram[0x0200 + ram[a]] | ram[0x0300 + ram[a]] << 8;
      out.push((9 * per + 108) / 985248);
    }
    return out;
  }

  return { unpackBitmap, unpackColour, pose, anim, grade, speech };
})();

// createDriver for site/lib/sid.js: runs the game's own music driver ($09A5, called once a frame
// by the line-255 interrupt) in a small 6502 interpreter over the bytes $0400-$1159 and the zero
// page it uses, as the game loads them. $FF is the song request: 1-4, or 0 for silence.
// The interpreter is Delta's page's, with reads of $D41B/$D41C answered from readback().
function createDriver(M) {
  const mem = new Uint8Array(0x10000);
  mem.set(M.bytes, M.base);
  const sid = new Uint8Array(25);
  let writes = [], osc3 = 0, env3 = 0;
  let A = 0, X = 0, Y = 0, S = 0xFF, PC = 0, N = 0, V = 0, D = 0, I = 1, Z = 0, C = 0;
  const rd = a => { a &= 0xFFFF; if (a === 0xD41B) return osc3; if (a === 0xD41C) return env3; return mem[a]; };
  const wr = (a, v) => { a &= 0xFFFF; v &= 255; if (a >= 0xD400 && a <= 0xD418) { sid[a - 0xD400] = v; writes.push(a - 0xD400, v); } else mem[a] = v; };
  const nz = v => { v &= 255; N = v >> 7; Z = v === 0 ? 1 : 0; return v; };
  const push = v => { mem[0x100 | S] = v & 255; S = (S - 1) & 255; };
  const pull = () => { S = (S + 1) & 255; return mem[0x100 | S]; };
  const getP = () => (N << 7) | (V << 6) | 0x30 | (D << 3) | (I << 2) | (Z << 1) | C;
  const setP = p => { N = p >> 7 & 1; V = p >> 6 & 1; D = p >> 3 & 1; I = p >> 2 & 1; Z = p >> 1 & 1; C = p & 1; };
  const w16 = a => rd(a) | rd(a + 1) << 8;
  function adc(v) { const s = A + v + C; V = (~(A ^ v) & (A ^ s) & 0x80) ? 1 : 0; C = s > 255 ? 1 : 0; A = nz(s); }
  function cmp(r, v) { const d = r - v; C = d >= 0 ? 1 : 0; nz(d); }
  function ea(mode) {
    let a;
    switch (mode) {
      case 'zp': return rd(PC++);
      case 'zpx': return (rd(PC++) + X) & 255;
      case 'zpy': return (rd(PC++) + Y) & 255;
      case 'abs': a = w16(PC); PC += 2; return a;
      case 'abx': a = (w16(PC) + X) & 0xFFFF; PC += 2; return a;
      case 'aby': a = (w16(PC) + Y) & 0xFFFF; PC += 2; return a;
      case 'izx': { const z = (rd(PC++) + X) & 255; return rd(z) | rd((z + 1) & 255) << 8; }
      case 'izy': { const z = rd(PC++); return ((rd(z) | rd((z + 1) & 255) << 8) + Y) & 0xFFFF; }
    }
  }
  const OPS = {};
  const def = (codes, fn) => { for (const [op, mode] of codes) OPS[op] = [fn, mode]; };
  def([[0xA9,'imm'],[0xA5,'zp'],[0xB5,'zpx'],[0xAD,'abs'],[0xBD,'abx'],[0xB9,'aby'],[0xA1,'izx'],[0xB1,'izy']], v => { A = nz(v); });
  def([[0xA2,'imm'],[0xA6,'zp'],[0xB6,'zpy'],[0xAE,'abs'],[0xBE,'aby']], v => { X = nz(v); });
  def([[0xA0,'imm'],[0xA4,'zp'],[0xB4,'zpx'],[0xAC,'abs'],[0xBC,'abx']], v => { Y = nz(v); });
  def([[0x69,'imm'],[0x65,'zp'],[0x75,'zpx'],[0x6D,'abs'],[0x7D,'abx'],[0x79,'aby'],[0x61,'izx'],[0x71,'izy']], v => adc(v));
  def([[0xE9,'imm'],[0xE5,'zp'],[0xF5,'zpx'],[0xED,'abs'],[0xFD,'abx'],[0xF9,'aby'],[0xE1,'izx'],[0xF1,'izy']], v => adc(v ^ 255));
  def([[0x29,'imm'],[0x25,'zp'],[0x35,'zpx'],[0x2D,'abs'],[0x3D,'abx'],[0x39,'aby'],[0x21,'izx'],[0x31,'izy']], v => { A = nz(A & v); });
  def([[0x09,'imm'],[0x05,'zp'],[0x15,'zpx'],[0x0D,'abs'],[0x1D,'abx'],[0x19,'aby'],[0x01,'izx'],[0x11,'izy']], v => { A = nz(A | v); });
  def([[0x49,'imm'],[0x45,'zp'],[0x55,'zpx'],[0x4D,'abs'],[0x5D,'abx'],[0x59,'aby'],[0x41,'izx'],[0x51,'izy']], v => { A = nz(A ^ v); });
  def([[0xC9,'imm'],[0xC5,'zp'],[0xD5,'zpx'],[0xCD,'abs'],[0xDD,'abx'],[0xD9,'aby'],[0xC1,'izx'],[0xD1,'izy']], v => cmp(A, v));
  def([[0xE0,'imm'],[0xE4,'zp'],[0xEC,'abs']], v => cmp(X, v));
  def([[0xC0,'imm'],[0xC4,'zp'],[0xCC,'abs']], v => cmp(Y, v));
  def([[0x24,'zp'],[0x2C,'abs']], v => { N = v >> 7; V = v >> 6 & 1; Z = (A & v) ? 0 : 1; });
  const ST = { 0x85:['zp','A'],0x95:['zpx','A'],0x8D:['abs','A'],0x9D:['abx','A'],0x99:['aby','A'],0x81:['izx','A'],0x91:['izy','A'],
               0x86:['zp','X'],0x96:['zpy','X'],0x8E:['abs','X'],0x84:['zp','Y'],0x94:['zpx','Y'],0x8C:['abs','Y'] };
  const RMW = { 0x06:['zp','asl'],0x16:['zpx','asl'],0x0E:['abs','asl'],0x1E:['abx','asl'],0x46:['zp','lsr'],0x56:['zpx','lsr'],0x4E:['abs','lsr'],0x5E:['abx','lsr'],
                0x26:['zp','rol'],0x36:['zpx','rol'],0x2E:['abs','rol'],0x3E:['abx','rol'],0x66:['zp','ror'],0x76:['zpx','ror'],0x6E:['abs','ror'],0x7E:['abx','ror'],
                0xE6:['zp','inc'],0xF6:['zpx','inc'],0xEE:['abs','inc'],0xFE:['abx','inc'],0xC6:['zp','dec'],0xD6:['zpx','dec'],0xCE:['abs','dec'],0xDE:['abx','dec'] };
  function sh(kind, v) {
    switch (kind) {
      case 'asl': C = v >> 7; return nz(v << 1);
      case 'lsr': C = v & 1; return nz(v >> 1);
      case 'rol': { const c = C; C = v >> 7; return nz(v << 1 | c); }
      case 'ror': { const c = C; C = v & 1; return nz(v >> 1 | c << 7); }
      case 'inc': return nz(v + 1);
      case 'dec': return nz(v - 1);
    }
  }
  const BR = { 0x10: () => !N, 0x30: () => N, 0x50: () => !V, 0x70: () => V, 0x90: () => !C, 0xB0: () => C, 0xD0: () => !Z, 0xF0: () => Z };
  function step() {
    const op = rd(PC++);
    if (OPS[op]) { const [fn, mode] = OPS[op]; fn(mode === 'imm' ? rd(PC++) : rd(ea(mode))); return; }
    if (ST[op]) { const [mode, r] = ST[op]; wr(ea(mode), r === 'A' ? A : r === 'X' ? X : Y); return; }
    if (RMW[op]) { const [mode, k] = RMW[op]; const a = ea(mode); wr(a, sh(k, rd(a))); return; }
    if (BR[op]) { const o = rd(PC++); if (BR[op]()) PC = (PC + (o < 128 ? o : o - 256)) & 0xFFFF; return; }
    switch (op) {
      case 0x0A: A = sh('asl', A); return; case 0x4A: A = sh('lsr', A); return;
      case 0x2A: A = sh('rol', A); return; case 0x6A: A = sh('ror', A); return;
      case 0xAA: X = nz(A); return; case 0xA8: Y = nz(A); return; case 0x8A: A = nz(X); return; case 0x98: A = nz(Y); return;
      case 0xBA: X = nz(S); return; case 0x9A: S = X; return;
      case 0xE8: X = nz(X + 1); return; case 0xCA: X = nz(X - 1); return; case 0xC8: Y = nz(Y + 1); return; case 0x88: Y = nz(Y - 1); return;
      case 0x18: C = 0; return; case 0x38: C = 1; return; case 0x58: I = 0; return; case 0x78: I = 1; return;
      case 0xB8: V = 0; return; case 0xD8: D = 0; return; case 0xF8: D = 1; return; case 0xEA: return;
      case 0x48: push(A); return; case 0x68: A = nz(pull()); return; case 0x08: push(getP()); return; case 0x28: setP(pull()); return;
      case 0x4C: PC = w16(PC); return;
      case 0x6C: { const a = w16(PC); PC = rd(a) | rd((a & 0xFF00) | ((a + 1) & 255)) << 8; return; }
      case 0x20: { const t = w16(PC); const r = (PC + 1) & 0xFFFF; push(r >> 8); push(r); PC = t; return; }
      case 0x60: { const lo = pull(), hi = pull(); PC = ((hi << 8 | lo) + 1) & 0xFFFF; return; }
    }
    throw new Error('opcode ' + op.toString(16) + ' at ' + (PC - 1).toString(16));
  }
  function call(entry) {
    S = 0xFF; push(0xFF); push(0xFE); PC = entry; let n = 0;
    while (PC !== 0xFFFF) { step(); if (++n > 200000) throw new Error('runaway at ' + PC.toString(16)); }
  }
  const active = () => (mem[0x0CA1] | mem[0x0CA2] | mem[0x0CA3]) & 0x80;
  let on = false;
  return {
    init(t) { for (let r = 0; r < 25; r++) sid[r] = 0; writes = []; mem[0x0D3A] = 0; mem[0xFF] = t; call(0x09A5); on = true; },
    stop() { writes = []; mem[0xFF] = 0; call(0x09A5); on = false; },
    play() { writes = []; if (!on) return; call(0x09A5); if (!active()) on = false; },
    readback(e, o) { env3 = e; osc3 = o; },
    sid, get writes() { return writes; }, playing: () => on,
    voice(x) {
      return { semitone: mem[0x0CCD + x], octave: mem[0x0CCA + x], order: mem[0x0CB0 + x], active: !!(mem[0x0CA1 + x] & 0x80) };
    },
    mem,
  };
}

const FIST_FRAME = {"schema":1,"standard":"PAL","lines":312,"cycles":63,"about":"","vic":[172,218,196,218,220,218,192,202,216,202,240,202,0,0,0,0,0,27,0,209,0,63,216,0,57,253,241,0,255,0,22,63,243,243,240,241,243,240,250,241,241,241,242,242,242,247,252],"cia2":[192,63],"cpu":[47,21],"writes":[[0,32,65534,176],[0,38,65535,47],[9,42,53240,10],[9,50,53241,11],[9,58,53242,0],[10,14,53244,20],[10,22,53245,21],[10,33,53255,160],[10,37,53257,160],[10,41,53259,160],[10,48,53249,136],[10,52,53251,136],[10,56,53253,136],[90,27,65534,98],[90,33,65535,45],[90,61,53265,59],[91,4,53281,241],[156,27,53249,157],[156,31,53251,157],[156,35,53253,157],[156,53,65534,156],[157,5,53240,13],[157,11,53241,14],[157,17,53242,15],[177,32,53249,178],[177,36,53251,178],[177,40,53253,178],[178,10,65534,214],[178,16,53240,0],[178,22,53241,0],[178,28,53242,0],[180,35,53255,181],[180,39,53257,181],[180,43,53259,181],[181,12,65534,17],[181,26,53244,23],[181,32,53245,24],[181,38,65535,46],[183,39,53281,247],[201,35,53255,202],[201,39,53257,202],[201,43,53259,202],[201,61,65534,255],[202,20,53244,26],[202,26,53245,27],[202,32,65535,47],[217,32,53249,218],[217,36,53251,218],[217,40,53253,218],[217,46,53240,93],[217,52,53241,94],[217,58,53242,95],[218,22,65534,229],[218,28,65535,48],[255,38,65534,242],[255,44,65535,49],[255,50,53265,27],[255,57,53281,243]],"colour":"BgYGDg4GDg4GBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYODgYODgYGBgYGBg4OBg4OBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGDg4GDg4GBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYAAAAAAAMAAAAGBgAGBgIABgYHAgICAgICAgICAgICAAAAAAMDAwMAAgICAgILCgoDAwMDAwgDBAMEBAQEAwMDAwQEAwMGAwkJCQoJCQkJCQIDAgMDAgICAwoDAwoKAwoEDAUMDwwDAwMLCwMDAwMCCwoGCQkKCgQLAwMDAwoCAgsDAwMDAwMOCAwODw8EBA8PBAQEAwMEDgQJCgoKDgoEAwMDAwoCAgsEAwsDDAwMCwQEDw8LCwsLDAgFCAgIBA4FDAUFBQoFBAMDAwMCCgoLCwAMDw8PDwQJDAkJCwsLBAoFBQUFBQUFBQUFBQUFBQUDBQYCCgsCAgQMDA8PBQQECwsEBAsEBAUFCAICBQIHCAgIBQkFCQkFCQoKBAICAgICBAUEBQQFDAwMBQwMCwsNCQICDA4CAg0JBQUFCQUFBQkJBAcJCAICCwQFDQUJBQ0LBQUFBQUMBg4ODg4ODg0NDQoNCgoKCgoFBQUJCQgICAQKBwcFBQcMBw8HBwcGDg4PDg4ODg4ODg4KDg4ODg4OBQUFBQUFBQUFBQkNDQ0ICw8HBwcHBwsODg4ODg4ODg4ADAwODg4ODgUFBQUFBQUFBQgIBQgFBQgMDAwMDAwLDA8IDw8ODg4JDAwMCAgODg4HBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBw==","ram":[{"a":49152,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":49792,"b":"AAAAAAAAAAFAAAVQABqgCilQAKXwAJdQAhfcCB38AB3wAD/QAr/QCq/wKq/qKq+qKquqKmuqqmuqqmr6qav5"},{"a":49856,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAqAAAqqAAqqvwqqv/Vqv/AaQ/"},{"a":49984,"b":"qa/4qb/2qv/mq/5aq/pqq+maKuWmCppmCmqaAmqVAGqkAGqpAGqqABqqAAKpAACrAAAoAAAAAAAAAAAAAAAA"},{"a":50048,"b":"AAAPAAAAoAAAqoAAqqgAqqqAqqqoqqqqqqqqWqqqBWqqABaqgAFqcAAa/wAK/8AA/8AAD8AAA8AAAAAAAAAA"},{"a":50112,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAA/AAA/8AA//AA//wAf/wAg/wAAPwAADwAAAAAAAAAAAAAAAAAAAAA"},{"a":50432,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAACAAABAAADAAABAAANAAAPAAADAAAB"},{"a":50496,"b":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAVAAAqQAAWoAA1aAAdQAA9SAA3QAA3QAA/wAA"},{"a":50624,"b":"AAADAAAAAAAKAAAqMACq/AKq/wr6//r+P/r/D+r/A+q/AGqrACoqAAAqAAAqAAAqAAAqAAAWAAAlAAAqAAAq"},{"a":50688,"b":"/wAA/4AAv6AAvqAAvqgA+mgA+qgAqagApqgA+qgA+qAA+qAA6oAAakAApYAAqoAAqkAApUAAVYAAWoAAVoAA"},{"a":50816,"b":"AACpAAKpAAKmAAqmAAqmAAqqACqpACqkACqgACqAACqAAKoAAKoAAKoAAagFBqhVDqlV/6VV/+VV/9UAA9AA"},{"a":50880,"b":"pqAApqgApqgAqqoAqqoAqqoAmqoABqoAAaqAAKqAAGqAABqgABqgVAqgVQqgVUagVVGgVVZcQVX/ABX/AAB/"},{"a":52224,"b":"ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMCAgICAyOCAgICAgICAgIDAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwICAgICAgICAyIFBMQVlFUiAyMjIyMgIyMjIyMjIyMjYyIyMyOTk5OTAzMzMzMzk5MjSzs5CQsLA0Ojo6OjoyMjKiojs3NzczMzQzOzuzNzc3NzMzMzMzNjY0NDY6Ojo6OqOrOysqCqOzojIyMjQ0SEM8tEy/rDqkOzQ0NDQ5Y2M2NDQ6OqM5OToyq6urq7K6OzK0S7REpOT0z5T0xMTPzzQ0s7M0tDQ2ND46OTmeqZ6usrKyuiuruiOzNDS0NDT0xLz85DTExMTE9PTUNDQ041RO5aesp3WnlbYmtrC6srIyAzQ0TMTExLy8m8vLz8nEqYSo2NiJiXx4iYmJyaenqZqlo7OzK6KrsDtGRkxMTDy8xMTJy8TLy9qpWVhXclxa1ZXVqFqapaWapTU7s7q6urq0x8TViZXUS7S1y7W1xcWlUsXF4i/OxZWNnZqaramaqVpaWVl1NYW4VFp6WtiFvcWlra3a2ny9XVZvP/L89mVl5eXllZWVldWpmppaV1lZVFlUla2Hh423+3W//W/OvH9+rw8/P/3f9gwMzz/KwvrZqamprdjYnU2dTdWFhYXVjHU/bz8+bsd/f4+HeHiHh4fOoH6Hj/Jvb6eH142NjdfX19fX2NeHh8c3NzdnNzfHtzc3N2c3Nzc3p6BwNzeHh4d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3dw=="},{"a":53240,"b":"XV5fABob"},{"a":55104,"b":"ABVUVVVVVVVVVVVVFVVVAAFVAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":55168,"b":"AAAAVVVAVVVVVVVVVAAVVUAAVUAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":55232,"b":"AAAAAAAAVAAAVVQAVVQAFVQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":57600,"b":"AAAAAAAAAAA="},{"a":57728,"b":"PGZufnZmPAA="},{"a":57744,"b":"PGYGDBgwfgA="},{"a":57792,"b":"PGZmPGZmPAA="},{"a":57864,"b":"PGZmfmZmZgA="},{"a":57896,"b":"fmBgfGBgfgA="},{"a":57952,"b":"YGBgYGBgfgA="},{"a":57984,"b":"fGZmfGBgYAA="},{"a":58000,"b":"fGZmfGxmZgA="},{"a":58056,"b":"ZmZmPBgYGAA="},{"a":58944,"b":"VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf//////+/f7VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVWqqqqqqqqqqqqqqqqqqqqqVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVqqqqqqqqqqqqqqqqqqqqqv//////////////////////////////////////////VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf1l/WX9Ze2pVVVVVVVVVVVVVVVVVVVVV/////////////////////1VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVdVVVVVVVVV/VVVVVVVVVVXqqqqqqqqqupVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVlpYmaFVVVaaKaFmapaqqBZVVphpFZWVWqmqUmZZaqKUlhmipaqqqqqqqqqq//////////9VVVVVVVVVVf////////r6///++eamWZbu7rvuurvuu+r6/n//Xffdqqqqqvr9fVb//////////1VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX//////////6qqqqqqqaSRVVVee88PP/DgsPyAjAjACurAyAAKChYK8MAACgAAwvCqCooA4goyLFXV1TUB/ADw//////+/DwtVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVWqqqqqqqqqqqqqqqqqqqqqVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVNVVVWVlZaamKKGFaaopcdXallX3vkkmaq+uWaZWe8/4+/1z99V1RXPpWVFVeXl/+iVVVVVVVVVVX//////////////////////v///////++qqvr69fX1VVVVW7qlvrq/VVX5qbe1taellZWV1dXV1VVVVVVVVVXV//////////////////////////////////////////////////76+v76wCYKIIWGCisIBRpaSlVsZaftaZPbaQsjL7qqqqqq7+KjoJSUtqUUMQ+RQQkGKk8BZOAkAViYkIQEEgFA1ADPsCgAkCQdV5Wl6gqwDgPCVVVVlSrAuOCqqqqqquo6A6qqqqqqqqrqVVVVVVVVVVX//////////1VVVVVVVVVVVVVVVVVVVVVVVVlee2677lWVper++v77lVGmlrm9q+/3z9cZpp+fz+VnvDH303/+XX1J6emJ9am98fXV3D/8P+rppptvfvrrqqqVVWpqbzX////////////////////////////////V9f3//////6Wqqurm5d3VX6lX6qr9V91ppVVVXf+p7f///vr6WvpaaqqqqqqqqqpVVVVVVVVVVVVVVVVVVVVV//////////5VVVZaaqCKC2qqgAorL+zPHnx+8sIKCuZhaajqel5XVSyqqqqv/3+X8/RTVjX7//99X087+/6vqq6qqqqq6uqqZlqVpqamqq9Clqqqaqq/1SoKWqqrvdV1hJWl6erq6urp6g7/v6qqqlCWqaqq/qqrlalaqbqdR3dVVZWVq6w7/lVFVV677rP8VVVVLovuy86tt9133Xfdd7vuu+677rvtZplmmWaZZvld99133muqqFRGb7/+78u/auo99dmvr7+qqXVf//vtt/3F5erP+6up+aWx1d3fe//qqqqqqqpaav//////////////////////////////////V9X9////urquXlXdvuv/v7v5VZW6//u6/VVpVv3t9+///f2t/e366qqqqqqqqlVVVVVVVlpqVVVaaqqvq/+WWViKJpe9tSQTX3vkeILJx2zWZYeXlcHqrnpikiUFRapqWtr29fr6qfrr+7qqVaqq//v+ev+/6qpV311fVXr1qlVXVWVVqVr1VVVVVVVX/VWZaZmVV/1Vddd/X3/+enp/f/////bX+qusu7NVlM337vuPapmyprnvyW20p6tiuu/47khu6+/+lfZPf1GGZG6+b8d5mc23/av/ft5d3nv5/99++v57/v9Yddc9xW9FlU/fRdd9Grui/3PXt1FXf3d/d9f////9qv6////VV7VX/+//f389eVXqb29/U1dFn3/rq4u7O76o//////+TK5SqqqqqqiqqYqqqqqqpqqqqqqqqqlpVla/d/3d3X6qqqpmZmVWa////1tZW3v+qqqp9XXXVVVVVfVVfaquvv///VVVVV19ddVd9/df3XXzz9e3k4r3FmaaWN/aVlZmllVaKKFJKJlpq7Tqvqrr7+++v9f3+/v7+/v5V9X96enp6+lVV/6qmplqqZmam9vb19fVaWlpbW1tbW1VV/6qqqqqqVVql9fX19fWvv7+/v7+/v5Snnnt+/+z77mejv+e9t79+8j72VVVaplmVlZVXfde/mWpWVf91/67m5nn9/6q/qtX1d1dV9Z/5WpZVtV11XdWy/rqv/L6/r/0JWv21/e3rzvq6y+7//upXI1X+u+utlOjClfWui6y0YRqkp3VfztkRd25q9d1XfdqdpxVf+mpqv62lZ3v7qr8meaS5y+fi5tVUkdVkv/LvRVVaVlUV1x+pqaldVZXV9eqqu7vqe1W1qvu766pVVVWu766pVVVXflV1V1VVfVW3qZVWWmqqqmp99df/////+pWnWqutqarq9dedru9qepo51hP+v9XfzG+7a6pqJWiZqqaq6tbe/T97e3u7e3t/X1fX19/X1Vpq//////9VaqJmZVVqparzP3399VX1WqIof///f1WKpip1dVV19aUpqX9/d3d3enp6mqqqqqqq//92WX5bb7+6pbd93X/766ur19f/6qqqqZX7+qmllZWVnZpWVX9/f35+9d9d/7q6ubra9d33v6qqqqqrm6qqqqmrZZdbq6//Wf1/f3//f39b7arqrZfX//7/amr/9rmIrz+atfnU6e9RwaplmVN3VV8fVqmfn531V3pff6+zqfL6frefjR0+dXc+RJeNHX422lt/T3zaWpYVmV9SnrfUT2fiXcfoli66esyiKoqqv/PrLre9Nb2RW2lJXVc1VXUdj6rq6uXZ1VrafNVWVVTVUVR677/vssor4i7fXUdXhSRbbObh+d7/X//3MVz2ctrq6uv6/7sv++7676WlpeX15aW16ujq6dbq5dn33Perrvvqqj/Tf8/+q676zzv//fXVWWX8v/9XmVaWaqv+/v5WVlZ+2tra2vf39/eVlVVVX/76q1VVVmu////vqV////v/vf3////ru/+v/r//3f/f11/fu//+//f/31/t9fn++/Z7/r6/rmvVfdd/v/66r6vV333quq6q2vVfVa6uq6qqVvX96vq++76qVV/Os5aVqSr6/P/qynh2VV//8tXVWnV+vzxvbmtX1ff1/Sqqvv7KetZ16+2tl7723jLhpxJ+KM/9l68/uw+7WB7rtV4bl5efn33F6VRVVVdXVf947uXVVf46V/7Gtr7J++k1stVWSdUW1f9G/We1nabGY39v0L6zVWX3d1F916amlmvTrcdTzLeM/quqZqqpG72qqpmqm75qVal3////////r6+vb6+vv72/t523nbedd6nVd9133Xfd/7vuu+6777+v9d133////++//f39/fb2/empqampqamnp6enp6enp///7/7v/+//+q67qr7rvqr+/7v+/7rv/7v/////v6v+v/////6v6//vv//+6/++/+u+d3f/d93/637Xf/Xfvv/quv991/91//7+/f7+/fXZ/v7e/n7e3Zr///7/+/r/fs//+///7v+/7z+jv////f2/vO/zf3337o7//Pzc3/f9mp7m5sn5+fl42dpq6qq3R2umnfrpp3fVcsZ5o8R9f89P/89+T3/769zf+nb/f/dfvYqus+v//91bX5+f35+be73///u+7v/+d/e39/aX25v/92//qrvv+rq6+uaZqVZmqu+tlqmn7bqat1+2ZpV16/dZrVZbWuVZql9p5tdqn1Zra2tra2tre3ftt5mlppll7rvuu+/////vv////////////////////v////////+q6vr//////1dXV1dXV9///v////VVVVX/+///q1lVVf/7///6lWVl////X79ZaWb///7//WpZVf/v//+aqlVVf////5aZmmr/////Z2mVqv//////u6qqt5WdnZ2Xla3v//7+/nt/6+r6+vX19dVV3/3/f5lmqaq7+v//e39fVt/td/7Z/v+///v//f/2+/++3n6e/39v9/QXRX/HoqqqUd//P7+Zqar//f/2lWapquv6bnv+VZlm/+66+qqvrle+6quvv6352V//X/XepVqqfdXX199lmqpXX3//9ZqqqvX91de9qqqq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"},{"a":65535,"b":"MQ=="}],"capture":{"phase_cycles_uncertain":0,"frame_cycles":19648,"frame_ended_on_line":0,"picture_lines_low":0,"writes_account_for_end_state":true,"ram_bytes_changed_during_frame":306,"colour_cells_changed_during_frame":0}};
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const hex = (n, w) => '$' + n.toString(16).toUpperCase().padStart(w || 2, '0');
  const PAL = ['#000000', '#ffffff', '#813338', '#75cec8', '#8e3c97', '#56ac4d', '#2e2c9b', '#edf171',
               '#8e5029', '#553800', '#c46c71', '#4a4a4a', '#7b7b7b', '#a9ff9f', '#706deb', '#b2b2b2'];
  const needSite = 'This widget reads the game’s bytes from listing.json and the site’s shared scripts: open the page from the built site, not from disk.';
  const MOVES = { 1: 'stand', 2: 'walk forward', 3: 'walk back', 4: 'crouch', 5: 'jump', 6: 'high punch',
    7: 'down-forward from a crouch', 8: 'somersault backwards', 9: 'somersault forwards', 0x0A: 'fire + down',
    0x0B: 'fire + down-forward', 0x0C: 'fire + forward', 0x0D: 'fire + up-forward', 0x0E: 'flying kick',
    0x0F: 'fire + up-back', 0x10: 'fire + down-back', 0x11: 'fire + back', 0x12: 'turn round', 0x18: 'punch' };

  // A multicolour sprite at (px, py): %01 $D025 (black), %10 the fighter's colour, %11 $D026 (light red),
  // as the game sets them ($19BD, $19C2; the frame's registers show 0 and $0A).
  function drawSpriteMC(ctx, s, px, py, k, colour) {
    const cols = [null, PAL[0], PAL[colour], PAL[10]];
    for (let r = 0; r < 21; r++) for (let b = 0; b < 3; b++) {
      const v8 = s[r * 3 + b];
      for (let q = 0; q < 4; q++) {
        const v = (v8 >> (6 - 2 * q)) & 3;
        if (!v) continue;
        ctx.fillStyle = cols[v];
        ctx.fillRect(px + (b * 8 + q * 2) * k, py + r * k, 2 * k, k);
      }
    }
  }
  function drawPose(cv, slots, k, colour, grid) {
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#edf171'; ctx.fillRect(0, 0, cv.width, cv.height);
    slots.forEach((s, i) => {
      const x = (i % 3) * 24 * k, y = Math.floor(i / 3) * 21 * k;
      if (s) drawSpriteMC(ctx, s, x, y, k, colour);
      if (grid) { ctx.strokeStyle = s ? 'rgba(31,95,168,.8)' : 'rgba(128,128,128,.5)'; ctx.strokeRect(x + .5, y + .5, 24 * k - 1, 21 * k - 1); }
    });
  }

  /* 02 the frame */
  function frameWidget() {
    const cv = $('frameCv');
    if (!globalThis.C64) { cv.replaceWith(Object.assign(document.createElement('p'), { className: 'fx-need', textContent: needSite })); return; }
    C64.drawFrame(cv, FIST_FRAME, 2);
    const base = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
    let on = false;
    const lines = [...new Set(FIST_FRAME.writes.map(w => w[0]))];
    $('bandBtn').onclick = () => {
      on = !on; $('bandBtn').classList.toggle('on', on);
      const ctx = cv.getContext('2d'); ctx.putImageData(base, 0, 0);
      $('bandOut').textContent = on ? FIST_FRAME.writes.length + ' writes on ' + lines.length + ' raster lines' : '';
      if (!on) return;
      // the picture is 384 x 272 pixels from raster line 16 (C64.renderFrame's LINE0)
      const top = 16, sx = cv.width / 384, sy = cv.height / 272;
      ctx.fillStyle = 'rgba(208,74,58,.85)';
      for (const l of lines) { const y = (l - top) * sy; if (y >= 0 && y < cv.height) ctx.fillRect(0, y, cv.width, Math.max(2, sy)); }
    };
  }

  function main(G) {
    const ram = G.ram;

    if ($('poseCv')) {
    /* 01 the fighters */
    const PADS = [['ul', 9, 0x0F], ['u', 5, 0x0E], ['ur', 6, 0x0D], ['l', 3, 0x11], ['c', 1, 1], ['r', 2, 0x0C], ['dl', 8, 0x10], ['d', 4, 0x0A], ['dr', 0x18, 0x0B]];
    const ARROWS = { ul: '↖', u: '↑', ur: '↗', l: '←', c: '○', r: '→', dl: '↙', d: '↓', dr: '↘' };
    let fire = false, mirrored = false, grid = false, frame = 0, timer = null;
    const pc = $('poseCv');
    const show = f => { frame = f; $('frameIn').value = f; $('frameOut').textContent = hex(f) + (f >= 0x3B ? ' (bull)' : '');
      drawPose(pc, FIST.pose(ram, f, mirrored, f >= 0x3B), 3, f >= 0x3B ? 9 : 1, grid); };
    function play(move) {
      clearInterval(timer);
      const steps = FIST.anim(ram, move);
      $('moveOut').textContent = 'Move ' + hex(move) + (MOVES[move] ? ' · ' + MOVES[move] : '') + ' · ' + steps.length + ' steps';
      $('stepTab').innerHTML = '<tr><th>step</th><th>ticks</th><th>frame</th><th>dx</th><th>dy</th></tr>' +
        steps.map((s, i) => `<tr data-i="${i}"><td>${i}</td><td>${s[0]}</td><td>${hex(s[1])}</td><td>${(s[2] << 24) >> 24}</td><td>${(s[3] << 24) >> 24}</td></tr>`).join('');
      let i = 0, left = 0;
      const tick = () => {
        if (left <= 0) {
          if (i >= steps.length) { clearInterval(timer); return; }
          show(steps[i][1]); left = steps[i][0];
          $('stepTab').querySelectorAll('tr').forEach(r => r.classList.toggle('hl', r.dataset.i == i));
          i++;
        }
        left--;
      };
      tick(); timer = setInterval(tick, 40);
    }
    const pad = $('pad');
    for (const [k, plain, fired] of PADS) {
      const b = document.createElement('button'); b.className = 'fx-btn'; b.textContent = ARROWS[k];
      b.title = k; b.onclick = () => play(fire ? fired : plain); pad.appendChild(b);
    }
    $('fireBtn').onclick = () => { fire = !fire; $('fireBtn').classList.toggle('on', fire); };
    $('mirBtn').onclick = () => { mirrored = !mirrored; $('mirBtn').textContent = mirrored ? 'Facing left' : 'Facing right'; show(frame); };
    $('gridBtn').onclick = () => { grid = !grid; $('gridBtn').classList.toggle('on', grid); show(frame); };
    $('frameIn').oninput = e => { clearInterval(timer); show(+e.target.value); };
    play(0x0E);

    }
    if ($('bdCv')) {
    /* 03 the backdrops */
    const NAMES = ['Fuji, pagoda and torii', 'Lake under a volcano', 'Dojo', 'Buddha'];
    const bc = $('bdCv'), bctx = bc.getContext('2d');
    let bd = 0, order = [], mem = null, bdTimer = null;
    function renderBd(k) {
      const img = bctx.createImageData(320, 96), D = img.data;
      const shown = new Uint8Array(65536);
      for (let j = 0; j < k; j++) shown[order[j]] = 1;
      for (let row = 5; row < 17; row++) for (let col = 0; col < 40; col++) {
        const sc = mem[0xCC00 + row * 40 + col], cr = mem[0xD800 + row * 40 + col] & 15;
        const cols = [1, sc >> 4, sc & 15, cr];
        for (let line = 0; line < 8; line++) {
          const a = 0xE000 + row * 320 + col * 8 + line, b = shown[a] ? mem[a] : 0;
          for (let q = 0; q < 4; q++) {
            const c = PAL[shown[a] ? cols[(b >> (6 - 2 * q)) & 3] : 12];
            const v = parseInt(c.slice(1), 16);
            for (let dx = 0; dx < 2; dx++) {
              const o = (((row - 5) * 8 + line) * 320 + col * 8 + q * 2 + dx) * 4;
              D[o] = v >> 16; D[o + 1] = v >> 8 & 255; D[o + 2] = v & 255; D[o + 3] = 255;
            }
          }
        }
      }
      const off = document.createElement('canvas'); off.width = 320; off.height = 96;
      off.getContext('2d').putImageData(img, 0, 0);
      bctx.imageSmoothingEnabled = false; bctx.drawImage(off, 0, 0, 640, 192);
      $('bdOut').textContent = k + ' of ' + order.length + ' bitmap bytes';
    }
    function pickBd(i) {
      clearInterval(bdTimer); bd = i;
      mem = new Uint8Array(65536);
      order = FIST.unpackBitmap(ram, i, mem); FIST.unpackColour(ram, i, mem);
      $('bdIn').max = order.length; $('bdIn').value = order.length; renderBd(order.length);
      $('bdBtns').querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i));
    }
    NAMES.forEach((n, i) => { const b = document.createElement('button'); b.className = 'fx-btn'; b.textContent = n; b.onclick = () => pickBd(i); $('bdBtns').appendChild(b); });
    $('bdIn').oninput = e => { clearInterval(bdTimer); renderBd(+e.target.value); };
    $('bdPlay').onclick = () => { clearInterval(bdTimer); let k = 0; bdTimer = setInterval(() => { k = Math.min(order.length, k + 40); $('bdIn').value = k; renderBd(k); if (k >= order.length) clearInterval(bdTimer); }, 30); };
    pickBd(0);
    {
      const rows = [0, 1, 2, 3].map(i => {
        const b = ram[0x1839 + 2 * i] | ram[0x183A + 2 * i] << 8, bn = b + (ram[b] | ram[b + 1] << 8) - b + 1;
        const c = ram[0x1841 + 2 * i] | ram[0x1842 + 2 * i] << 8, cn = (i < 3 ? (ram[0x1843 + 2 * i] | ram[0x1844 + 2 * i] << 8) : 0x7200) - c;
        return `<tr><td>${i}</td><td>${NAMES[i]}</td><td>${hex(b, 4)}</td><td>${bn}</td><td>${hex(c, 4)}</td><td>${cn}</td></tr>`;
      }).join('');
      $('bdTab').innerHTML = '<tr><th></th><th>backdrop</th><th>bitmap at</th><th>bytes</th><th>colours at</th><th>bytes</th></tr>' + rows;
    }

    }
    if ($('music')) {
    /* 04 music */
    if (globalThis.C64Sid) {
      C64Sid.mount($('music'), {
        driver: createDriver, data: { base: 0, bytes: ram.slice(0, 0x1160) },
        tunes: ['1 Attract mode', '2 One-player game', '3 Two-player game', '4 High-score table'],
        filter: '6581', gain: 0.5,
        rows: [
          { k: 'Note', f: v => v.semitone ? 'C C# D D# E F F# G G# A A# B'.split(' ')[v.semitone - 1] + v.octave : 'rest' },
          { k: 'Order step', f: v => String(v.order >> 1) },
          { k: 'Active', f: v => v.active ? 'yes' : 'stopped' },
        ],
      });
    } else $('music').innerHTML = '<p class="fx-need">' + needSite + '</p>';

    }
    if ($('spCv')) {
    /* 05 speech */
    {
      const sc = $('spCv'), sctx = sc.getContext('2d');
      let actx = null;
      const draw = k => {
        const h = FIST.speech(ram, k), total = h.reduce((a, b) => a + b, 0);
        sctx.fillStyle = '#fff'; sctx.fillRect(0, 0, sc.width, sc.height);
        sctx.strokeStyle = '#1f5fa8'; sctx.beginPath();
        let t = 0, lvl = 1; sctx.moveTo(0, 15);
        for (const d of h) { const x = t / total * sc.width; sctx.lineTo(x, lvl ? 15 : 95); lvl ^= 1; sctx.lineTo(x, lvl ? 15 : 95); t += d; }
        sctx.stroke();
        sctx.fillStyle = '#80838a'; sctx.font = '12px IBM Plex Mono, monospace';
        sctx.fillText('sample ' + k + ': ' + h.length + ' flips, ' + total.toFixed(2) + ' s', 8, 108);
        return h;
      };
      for (let k = 0; k < 4; k++) {
        const b = document.createElement('button'); b.className = 'fx-btn'; b.textContent = 'Sample ' + k;
        b.onclick = () => {
          const h = draw(k);
          actx = actx || new (window.AudioContext || window.webkitAudioContext)();
          const rate = actx.sampleRate, total = h.reduce((a, c) => a + c, 0);
          const buf = actx.createBuffer(1, Math.ceil(total * rate) + 1, rate), d = buf.getChannelData(0);
          let t = 0, lvl = 0.25;
          for (const dur of h) { const a = Math.floor(t * rate), e = Math.floor((t + dur) * rate); for (let i = a; i < e; i++) d[i] = lvl; lvl = lvl ? 0 : 0.25; t += dur; }
          let mean = 0; for (let i = 0; i < d.length; i++) mean += d[i]; mean /= d.length; for (let i = 0; i < d.length; i++) d[i] -= mean;
          const src = actx.createBufferSource(); src.buffer = buf; src.connect(actx.destination); src.start();
        };
        $('spBtns').appendChild(b);
      }
      draw(2);
    }

    }
    if ($('gBar')) {
    /* 06 scoring */
    {
      const blows = [6, 7, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x18];
      const sel = $('gMove');
      blows.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = hex(m) + ' ' + (MOVES[m] || ''); sel.appendChild(o); });
      sel.value = 0x0C;
      const bar = $('gBar'), bctx2 = bar.getContext('2d');
      const upd = () => {
        const m = +sel.value, f = +$('gFrame').value;
        $('gFrameOut').textContent = hex(f);
        drawPose($('gPose'), FIST.pose(ram, f, true, false), 2, 2, false);
        bctx2.fillStyle = '#fff'; bctx2.fillRect(0, 0, bar.width, bar.height);
        const lo = -10, hi = 60, w = bar.width / (hi - lo + 1);
        const spans = [];
        for (let d = lo; d <= hi; d++) {
          const g = FIST.grade(ram, m, f, d);
          bctx2.fillStyle = g === 2 ? '#2a8a4a' : g === 1 ? '#c25a00' : '#d5d3cc';
          bctx2.fillRect((d - lo) * w, 10, w - 1, 44);
          if (g) spans.push([d, g]);
        }
        bctx2.fillStyle = '#80838a'; bctx2.font = '11px IBM Plex Mono, monospace';
        for (let d = lo; d <= hi; d += 10) bctx2.fillText(String(d), (d - lo) * w, 72);
        const p = ram[(ram[0x121D + 2 * m] | ram[0x121E + 2 * m] << 8) + f];
        $('gOut').textContent = p === 0x80 ? 'Profile byte $80: a defender in this frame cannot be hit by this blow.'
          : 'Profile byte ' + hex(p) + ' (aims at ' + ((p << 24) >> 24) + '); whole point at ' + spans.filter(s => s[1] === 2).map(s => s[0]).join(', ') +
            (spans.some(s => s[1] === 1) ? '; half at ' + spans.filter(s => s[1] === 1).map(s => s[0]).join(', ') : '');
      };
      sel.onchange = upd; $('gFrame').oninput = upd; upd();
      $('ptsTab').innerHTML = '<tr><th>blow</th>' + blows.map(m => `<td>${hex(m)}</td>`).join('') + '</tr><tr><th>points</th>' +
        blows.map(m => `<td>${ram[0x12A5 + m] * 100}</td>`).join('') + '</tr>';
    }

    }
    if ($('aiTab')) {
    /* 07 opponent */
    {
      const T = [[0x27A9, 'hold a move'], [0x27B5, 'attack spread'], [0x27C1, 'wait when close'], [0x27CD, 'walk'], [0x27D8, 'pause'],
                 [0x27E4, 'move back'], [0x27F0, 'defence mix'], [0x27FC, 'reaction delay']];
      let h = '<tr><th>mask</th>' + Array.from({ length: 12 }, (_, l) => `<th>${l === 0 ? 'Nov' : l <= 10 ? l + ' dan' : l}</th>`).join('') + '</tr>';
      for (const [a, n] of T) h += `<tr><td><code>${hex(a, 4)}</code> ${n}</td>` + Array.from({ length: 12 }, (_, l) => `<td>${hex(ram[a + l])}</td>`).join('') + '</tr>';
      $('aiTab').innerHTML = h;
    }

    }
    if ($('bullCv')) {
    /* 08 the bull */
    {
      const anims = [0x1C, 0x1D, 0x1E, 0x1F];
      let bt = null;
      const bcv = $('bullCv');
      const showB = f => drawPose(bcv, FIST.pose(ram, f, false, true), 3, 9, false);
      showB(FIST.anim(ram, 0x1C)[0][1]);
      $('bullOut').textContent = 'Animations ' + anims.map(a => hex(a)).join(', ') + ': ' + anims.map(a => FIST.anim(ram, a).length).join(', ') + ' steps.';
      $('bullPlay').onclick = () => {
        clearInterval(bt);
        const steps = [].concat(...anims.map(a => FIST.anim(ram, a)));
        let i = 0, left = 0;
        bt = setInterval(() => { if (left <= 0) { if (i >= steps.length) { clearInterval(bt); return; } showB(steps[i][1]); left = steps[i][0]; i++; } left--; }, 40);
      };
    }
    }
  }

  if ($('frameCv')) frameWidget();
  const needs = ['poseCv', 'bdCv', 'music', 'spCv', 'gBar', 'aiTab', 'bullCv'].some(id => $(id));
  if (needs && globalThis.C64) C64.load('listing.json').then(main).catch(e => console.error(e));
  else if (needs) document.querySelectorAll('canvas').forEach(c => { if (c.id !== 'frameCv') c.insertAdjacentHTML('afterend', '<p class="fx-need">' + needSite + '</p>'); });
})();
