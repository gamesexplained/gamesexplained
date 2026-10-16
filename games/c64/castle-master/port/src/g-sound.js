// The sound: Castle Master's own driver ($C800-$CFEE, its tables $065A-$1046), run on a small 6502
// core over the game's memory, as the How it works page's tune player runs it (cm-music). A music
// driver on a core counts as a port (kit/skills/core/70-minisite, "Play"). Its four entries are the
// game's: SID_PLAYER_INITIALIZE ($CF1B, a tune or an effect in A), SID_PLAYER_TICK ($C885, once a
// frame from the raster interrupt), SID_INITIALIZE_IF_ENABLED ($CFD8, an effect when the sound
// switch is on effects) and SID_CLEAR_REGISTERS ($CFE4). It keeps its state where the game does,
// at $C800-$CFFF and in the zero page ($F7-$FE), patches its own operands, and writes the SID
// through P.io; a read of a voice's register gets the chip's bus, as the game's decrement in place
// at $CF1B does.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.sound = function (P) {
  const m = P.M;
  let a = 0, x = 0, y = 0, sp = 0xFF, pc = 0, n = 0, v = 0, z = 0, c = 0, d = 0;
  const rd = ad => (ad >= 0xD400 && ad < 0xD800 ? P.io.sidRead(ad & 0x1F) : m[ad]);
  const wr = (ad, val) => { if (ad >= 0xD400 && ad < 0xD800) P.io.sidWrite(ad & 0x1F, val); else m[ad] = val; };
  const rmw = (ad, f) => { const t = rd(ad); wr(ad, t); wr(ad, f(t)); };
  const nz = r => { n = r & 0x80; z = r === 0 ? 1 : 0; return r; };
  const push = b => { m[0x100 + sp] = b; sp = (sp - 1) & 255; };
  const pull = () => { sp = (sp + 1) & 255; return m[0x100 + sp]; };
  const flags = () => (n ? 0x80 : 0) | (v ? 0x40 : 0) | 0x30 | (d ? 8 : 0) | 4 | (z ? 2 : 0) | (c ? 1 : 0);
  const setf = p => { n = p & 0x80; v = p & 0x40; d = p & 8; z = p & 2; c = p & 1; };
  const adc = b => {
    if (d) {
      let lo = (a & 15) + (b & 15) + (c ? 1 : 0), hi = (a >> 4) + (b >> 4);
      if (lo > 9) { lo += 6; hi++; }
      z = ((a + b + (c ? 1 : 0)) & 255) === 0 ? 1 : 0; n = (hi << 4) & 0x80; v = (~(a ^ b) & (a ^ (hi << 4)) & 0x80);
      if (hi > 9) hi += 6;
      c = hi > 15 ? 1 : 0; a = ((hi << 4) | (lo & 15)) & 255; return;
    }
    const s = a + b + (c ? 1 : 0); v = (~(a ^ b) & (a ^ s) & 0x80); c = s > 255 ? 1 : 0; a = nz(s & 255);
  };
  const sbc = b => {
    if (d) {
      const s = a - b - (c ? 0 : 1); let lo = (a & 15) - (b & 15) - (c ? 0 : 1), hi = (a >> 4) - (b >> 4);
      if (lo & 16) { lo -= 6; hi--; }
      if (hi & 16) hi -= 6;
      v = ((a ^ b) & (a ^ s) & 0x80); c = s >= 0 ? 1 : 0; nz(s & 255); a = ((hi << 4) | (lo & 15)) & 255; return;
    }
    adc(b ^ 255);
  };
  const cmp = (r, b) => { const s = r - b; c = s >= 0 ? 1 : 0; nz(s & 255); };
  function step() {
    const op = m[pc], b1 = m[(pc + 1) & 0xFFFF], b2 = m[(pc + 2) & 0xFFFF], w = b1 | b2 << 8;
    const zpx = (b1 + x) & 255, zpy = (b1 + y) & 255;
    const izx = m[zpx] | m[(zpx + 1) & 255] << 8, izy = ((m[b1] | m[(b1 + 1) & 255] << 8) + y) & 0xFFFF;
    const abx = (w + x) & 0xFFFF, aby = (w + y) & 0xFFFF;
    const g = op & 3, mode = (op >> 2) & 7;
    let ea = -1, len = 2;
    if (g === 1) { ea = [izx, b1, -2, w, izy, zpx, aby, abx][mode]; len = (mode === 3 || mode >= 6) ? 3 : 2; }
    else { ea = [-2, b1, -2, w, -1, (op === 0x96 || op === 0xB6) ? zpy : zpx, -1, (op === 0xBE) ? aby : abx][mode]; len = (mode === 3 || mode === 7) ? 3 : 2; }
    const M = () => (ea === -2 ? b1 : rd(ea));
    switch (op) {
      case 0x01: case 0x05: case 0x09: case 0x0D: case 0x11: case 0x15: case 0x19: case 0x1D: a = nz(a | M()); break;
      case 0x21: case 0x25: case 0x29: case 0x2D: case 0x31: case 0x35: case 0x39: case 0x3D: a = nz(a & M()); break;
      case 0x41: case 0x45: case 0x49: case 0x4D: case 0x51: case 0x55: case 0x59: case 0x5D: a = nz(a ^ M()); break;
      case 0x61: case 0x65: case 0x69: case 0x6D: case 0x71: case 0x75: case 0x79: case 0x7D: adc(M()); break;
      case 0x81: case 0x85: case 0x8D: case 0x91: case 0x95: case 0x99: case 0x9D: wr(ea, a); break;
      case 0xA1: case 0xA5: case 0xA9: case 0xAD: case 0xB1: case 0xB5: case 0xB9: case 0xBD: a = nz(M()); break;
      case 0xC1: case 0xC5: case 0xC9: case 0xCD: case 0xD1: case 0xD5: case 0xD9: case 0xDD: cmp(a, M()); break;
      case 0xE1: case 0xE5: case 0xE9: case 0xED: case 0xF1: case 0xF5: case 0xF9: case 0xFD: sbc(M()); break;
      case 0x06: case 0x0E: case 0x16: case 0x1E: rmw(ea, t => { c = t >> 7; return nz((t << 1) & 255); }); break;
      case 0x26: case 0x2E: case 0x36: case 0x3E: rmw(ea, t => { const r = ((t << 1) | (c ? 1 : 0)) & 255; c = t >> 7; return nz(r); }); break;
      case 0x46: case 0x4E: case 0x56: case 0x5E: rmw(ea, t => { c = t & 1; return nz(t >> 1); }); break;
      case 0x66: case 0x6E: case 0x76: case 0x7E: rmw(ea, t => { const r = (t >> 1) | (c ? 0x80 : 0); c = t & 1; return nz(r); }); break;
      case 0xC6: case 0xCE: case 0xD6: case 0xDE: rmw(ea, t => nz((t - 1) & 255)); break;
      case 0xE6: case 0xEE: case 0xF6: case 0xFE: rmw(ea, t => nz((t + 1) & 255)); break;
      case 0x0A: c = a >> 7; a = nz((a << 1) & 255); len = 1; break;
      case 0x2A: { const r = ((a << 1) | (c ? 1 : 0)) & 255; c = a >> 7; a = nz(r); len = 1; break; }
      case 0x4A: c = a & 1; a = nz(a >> 1); len = 1; break;
      case 0x6A: { const r = (a >> 1) | (c ? 0x80 : 0); c = a & 1; a = nz(r); len = 1; break; }
      case 0xA2: case 0xA6: case 0xAE: case 0xB6: case 0xBE: x = nz(M()); break;
      case 0xA0: case 0xA4: case 0xAC: case 0xB4: case 0xBC: y = nz(M()); break;
      case 0x86: case 0x8E: case 0x96: wr(ea, x); break;
      case 0x84: case 0x8C: case 0x94: wr(ea, y); break;
      case 0xE0: case 0xE4: case 0xEC: cmp(x, M()); break;
      case 0xC0: case 0xC4: case 0xCC: cmp(y, M()); break;
      case 0x24: case 0x2C: { const t = rd(ea); n = t & 0x80; v = t & 0x40; z = (a & t) === 0 ? 1 : 0; break; }
      case 0xAA: x = nz(a); len = 1; break; case 0xA8: y = nz(a); len = 1; break;
      case 0x8A: a = nz(x); len = 1; break; case 0x98: a = nz(y); len = 1; break;
      case 0xBA: x = nz(sp); len = 1; break; case 0x9A: sp = x; len = 1; break;
      case 0xE8: x = nz((x + 1) & 255); len = 1; break; case 0xCA: x = nz((x - 1) & 255); len = 1; break;
      case 0xC8: y = nz((y + 1) & 255); len = 1; break; case 0x88: y = nz((y - 1) & 255); len = 1; break;
      case 0x18: c = 0; len = 1; break; case 0x38: c = 1; len = 1; break;
      case 0x58: case 0x78: case 0xEA: len = 1; break;
      case 0xB8: v = 0; len = 1; break; case 0xD8: d = 0; len = 1; break; case 0xF8: d = 1; len = 1; break;
      case 0x48: push(a); len = 1; break; case 0x68: a = nz(pull()); len = 1; break;
      case 0x08: push(flags()); len = 1; break; case 0x28: setf(pull()); len = 1; break;
      case 0x10: case 0x30: case 0x50: case 0x70: case 0x90: case 0xB0: case 0xD0: case 0xF0: {
        const f = [n, v, c, z][op >> 6], take = (op & 0x20) ? !!f : !f;
        pc = (pc + 2 + (take ? (b1 < 128 ? b1 : b1 - 256) : 0)) & 0xFFFF; return;
      }
      case 0x4C: pc = w; return;
      case 0x6C: pc = m[w] | m[(w & 0xFF00) | ((w + 1) & 255)] << 8; return;
      case 0x20: { const r = (pc + 2) & 0xFFFF; push(r >> 8); push(r & 255); pc = w; return; }
      case 0x60: { const lo = pull(); pc = ((pull() << 8 | lo) + 1) & 0xFFFF; return; }
      default: throw new Error('the sound driver: opcode $' + op.toString(16) + ' at $' + pc.toString(16));
    }
    pc = (pc + len) & 0xFFFF;
  }
  // A call of the driver with A, returning at the RTS that matches it; the registers it leaves.
  // It runs on the stack page below $FD, which the game's own stack never reaches in a call from
  // the interrupt or from the routines that start an effect.
  function call(entry, r) {
    a = r.a & 255; x = r.x & 255; y = r.y & 255; n = v = d = z = 0; c = r.c ? 1 : 0; sp = 0xFD; m[0x1FF] = 0xFF; m[0x1FE] = 0xFE; pc = entry;
    for (let i = 0; i < 200000; i++) { if (pc === 0xFFFF) return Object.assign({}, r, { a, x, y, c, z, n }); step(); }
    throw new Error('the sound driver ran away at $' + pc.toString(16));
  }
  const regs = r => Object.assign({ a: 0, x: 0, y: 0, c: 0 }, r);
  P.SID_PLAYER_INITIALIZE = r => call(0xCF1B, regs(r));
  P.SID_PLAYER_TICK = r => call(0xC885, regs(r));
  P.SID_INITIALIZE_IF_ENABLED = r => call(0xCFD8, regs(r));
  P.SID_CLEAR_REGISTERS = r => call(0xCFE4, regs(r));
};
})(typeof window !== 'undefined' ? window : globalThis);
