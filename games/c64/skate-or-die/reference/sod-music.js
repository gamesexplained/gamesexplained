// Skate or Die!'s sound driver for the site's SID player (../../lib/sid.js). createDriver runs the
// game's own code in a small 6502 interpreter (taken from the Delta page) over High Jump's memory:
// init_sound_driver ($22B7), queue_sound_id ($22F5) to start a sound, and update_sid_voices ($232C)
// once a frame, as the main loop does. createDriver refers to nothing outside itself: the player runs
// its source text in an AudioWorklet. Checked against the game itself in kit/c64/machine.js
// (tests/music.js).
const SODMUSIC = {
  createDriver: function (M) {
    const mem = new Uint8Array(0x10000);
    mem.set(M.bytes, M.base);
    const sid = new Uint8Array(25);
    let writes = [], on = false, steps = 0;
    let A = 0, X = 0, Y = 0, S = 0xFF, PC = 0, N = 0, V = 0, D = 0, I = 1, Z = 0, C = 0;
    const rd = a => mem[a & 0xFFFF];
    const wr = (a, v) => { a &= 0xFFFF; v &= 255; if (a >= 0xD400 && a <= 0xD418) { sid[a - 0xD400] = v; writes.push(a - 0xD400, v); } else mem[a] = v; };
    const nz = v => { v &= 255; N = v >> 7; Z = v === 0 ? 1 : 0; return v; };
    const push = v => { mem[0x100 | S] = v & 255; S = (S - 1) & 255; };
    const pull = () => { S = (S + 1) & 255; return mem[0x100 | S]; };
    const getP = () => (N << 7) | (V << 6) | 0x30 | (D << 3) | (I << 2) | (Z << 1) | C;
    const setP = p => { N = p >> 7 & 1; V = p >> 6 & 1; D = p >> 3 & 1; I = p >> 2 & 1; Z = p >> 1 & 1; C = p & 1; };
    const w16 = a => rd(a) | rd(a + 1) << 8;
    function adc(v) {
      const s = A + v + C;
      V = (~(A ^ v) & (A ^ s) & 0x80) ? 1 : 0; C = s > 255 ? 1 : 0; A = nz(s);
    }
    function cmp(r, v) { const d = r - v; C = d >= 0 ? 1 : 0; nz(d); }
    // addressing: returns effective address
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
    const M8 = { imm: null };
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
                 0x86:['zp','X'],0x96:['zpy','X'],0x8E:['abs','X'],0x84:['zp','Y'],0x94:['zpx','Y'],0x8C:['abs','Y']};
    const RMW = { 0x06:['zp','asl'],0x16:['zpx','asl'],0x0E:['abs','asl'],0x1E:['abx','asl'],0x46:['zp','lsr'],0x56:['zpx','lsr'],0x4E:['abs','lsr'],0x5E:['abx','lsr'],
                  0x26:['zp','rol'],0x36:['zpx','rol'],0x2E:['abs','rol'],0x3E:['abx','rol'],0x66:['zp','ror'],0x76:['zpx','ror'],0x6E:['abs','ror'],0x7E:['abx','ror'],
                  0xE6:['zp','inc'],0xF6:['zpx','inc'],0xEE:['abs','inc'],0xFE:['abx','inc'],0xC6:['zp','dec'],0xD6:['zpx','dec'],0xCE:['abs','dec'],0xDE:['abx','dec']};
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
    function call(entry, a) {
      A = a & 255; S = 0xFF; push(0xFF); push(0xFE); PC = entry; let n = 0;
      while (PC !== 0xFFFF) { step(); if (++n > 200000) throw new Error('runaway at ' + PC.toString(16)); }
    }
    // M.base, M.bytes: memory from $0000 as High Jump loads it; M.ids: the sound ID each button starts
    let first = true;
    return {
      init(t) {                                            // init_sound_driver $22B7, then queue_sound_id $22F5
        for (let r = 0; r < 25; r++) sid[r] = 0; writes = [];
        if (first && M.resume) { first = false; on = true; return; }
        call(0x22B7, 0); call(0x22F5, M.ids[t]); on = true; steps = 0;
      },
      stop() { call(0x22B7, 0); on = false; },
      play() { writes = []; if (!on) return; call(0x232C, 0); steps++; if (steps > 2 && !(mem[0x2254] | mem[0x2256] | mem[0x2258]) && !mem[0x221B]) on = false; },
      sid, get writes() { return writes; }, playing: () => on,
      voice(x) {                                           // slots 4, 2, 0 drive SID voices 1, 2, 3 ($29DC)
        const s = [4, 2, 0][x];
        return { id: mem[0x2253 + s], phrase: mem[0x35A9], flags: mem[0x2254 + s] };
      },
      mem,
    };
  },
};
if (typeof module !== 'undefined') module.exports = SODMUSIC;
