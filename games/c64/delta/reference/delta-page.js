// Delta minisite: the music driver port, the tested ports and the widgets. Built from work/page.
// createDriver for site/lib/sid.js: runs Delta's own music driver ($BDE4 music_play, $C357 set_tune)
// in a small 6502 interpreter over the bytes $BC00-$CFFF as the game loads them.
function createDriver(M) {
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
  return {
    init(t) { for (let r = 0; r < 25; r++) sid[r] = 0; writes = []; call(0xC357, t); on = true; steps = 0; },
    stop() { mem[0xC32E] = 0xC0; call(0xBDE4, 0); on = false; },
    play() { writes = []; if (!on) return; call(0xBDE4, 0); steps++; if (mem[0xC32E] & 0x80 && steps > 2) on = false; },
    sid, get writes() { return writes; }, playing: () => on,
    voice(x) {
      const p = mem[0xC2FE + x], n = mem[0xC2FB + x];
      return { note: n, instrument: p, track: mem[0xC2EC + x], pattern: mem[0xC2EF + x] };
    },
    mem,
  };
}
// Ports of three small routines for the page, tested in test_ports.js against the game's code.
// stars: stars_scroll_mid $1D1B, stars_scroll_fast $1D3B, stars_scroll_slow $1D5E and the toggle in stars_update $1DB9
function starsStep(m) {            // m: memory (Uint8Array) holding $100A-$101C and the three glyph rows
  function roll(addr, times, first, last) {
    let carry = 1;                               // SEC, then ROL once (twice for the fast layer)
    for (let t = 0; t < times; t++) {
      const v = m[addr]; m[addr] = ((v << 1) | carry) & 255; carry = v >> 7;
    }
    if (!carry) {                                // the clear bit fell out: back in at bit 0, stars move left
      m[addr] = 0xFE;
      for (let a = first; a <= last; a++) m[a] = (m[a] - 1) & 255;
    }
  }
  roll(0x4983, 1, 0x1010, 0x1015);               // middle layer, glyph $30 row 3
  roll(0x498E, 2, 0x1016, 0x101B);               // fast layer, glyph $31 row 6
  m[0x101C] ^= 1;
  if (m[0x101C]) roll(0x4978, 1, 0x100A, 0x100F); // slow layer, glyph $2F row 0, every second frame
}
// draw_enemy_shot_0 $25D5: the two glyphs of a shot at position p over glyphs g1, g2 (8 bytes each)
function shotGlyphs(masks, g1, g2, p) {          // masks: the 128 bytes at $FF70
  const a = new Uint8Array(8), b = new Uint8Array(8);
  for (let y = 0; y < 8; y++) { a[y] = masks[p + y] & g1[y]; b[y] = masks[p + 8 + y] & g2[y]; }
  return [a, b];
}
// shop_try_buy $2261: the outcome of touching shop icon k (1-7)
function shopTouch(k, credits, shopUp, bought) {
  if (!shopUp || bought || credits - k < 0) return { hit: true };
  return { hit: false, change: credits - k, blinkIcon: k - 1, blinks: 14 };
}
// Stage data for the page: stage_banner_table $F880, stage_words $EB80, stage_hazard_table $F900,
// and the difficulty rules of fire_rate_set $9BAA and enemy_fire_setup $9100 over difficulty_by_loop $FA20.
const DELTA_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.© 0123456789';
function stageWordCodes(ram, line) { return Array.from(ram.subarray(0xEB80 + 8 * line, 0xEB88 + 8 * line)); }
function stageWordText(ram, line) { return stageWordCodes(ram, line).map(c => DELTA_ALPHA[c] || '?').join('').trim(); }
function stageLines(ram, s) {                      // s: stage number 0-31 ($107D)
  const b0 = ram[0xF880 + 2 * s], b1 = ram[0xF880 + 2 * s + 1];
  return [b0 >> 4, (b0 & 15) + 4, b1 + 0x11];
}
function stageInfo(ram, s, pass) {                 // pass: completed passes, 0-2 (difficulty_set caps it at 2)
  const t = 0xFA20 + 32 * Math.min(pass, 2), c = Math.min(s, 15);
  const h = ram.subarray(0xF900 + 4 * s, 0xF904 + 4 * s);
  return {
    lines: stageLines(ram, s),
    hazards: h[0] !== 0, hazardColours: [h[1] >> 4, h[1] & 15], hazardBytes: Array.from(h),
    rate: ram[t + (c >> 1)],                       // fire_rate_set: $9F00 + min(stage, 15) / 2
    budget: ram[t + 8 + ram[t + 16 + c]],          // enemy_fire_setup: $9F08 indexed by $9F10 + min(stage, 15)
  };
}
const DELTA_FRAME = {"schema":1,"standard":"PAL","lines":312,"cycles":63,"about":"","vic":[31,22,55,22,85,22,103,22,239,22,7,22,37,22,55,22,224,64,0,209,0,255,215,0,19,124,241,0,255,0,0,255,240,246,244,245,252,241,246,254,254,254,254,254,254,254,254],"cia2":[150,63],"cpu":[47,53],"writes":[[45,41,53270,199],[45,50,53265,92],[46,26,53248,64],[46,33,53249,94],[46,40,18424,174],[46,47,53287,252],[47,24,53285,255],[47,32,53286,251],[47,38,53251,50],[47,42,53253,50],[47,46,53255,50],[47,50,53257,50],[47,54,53259,50],[47,58,53261,50],[47,62,53263,50],[48,6,18425,4],[48,13,18426,3],[48,20,18427,0],[48,27,18428,1],[48,34,18429,0],[48,41,18430,4],[48,48,18431,3],[48,55,53250,41],[48,62,53252,17],[49,6,53254,73],[49,13,53256,49],[49,20,53258,25],[49,27,53260,1],[49,34,53262,233],[49,42,53264,120],[49,50,53288,252],[49,54,53289,252],[49,58,53290,252],[49,62,53291,252],[50,3,53292,252],[50,7,53293,252],[50,11,53294,252],[72,15,53264,30],[72,23,53285,241],[72,44,18431,193],[72,53,53262,187],[72,62,53263,224],[73,26,18430,196],[73,35,53260,220],[73,44,53261,224],[74,8,18429,194],[74,17,53258,253],[74,26,53259,224],[74,53,18428,197],[74,62,53256,15],[75,8,53257,204],[75,35,18427,194],[75,44,53254,47],[75,53,53255,208],[76,60,18426,155],[77,6,53252,79],[77,15,53253,224],[77,42,18425,155],[77,51,53250,79],[77,60,53251,224],[222,11,53285,255],[222,35,53255,224],[222,39,53257,224],[222,58,18425,62],[223,9,18426,61],[223,16,18427,60],[223,23,18428,61],[223,30,18429,60],[223,37,18430,64],[223,44,18431,63],[223,51,53250,209],[223,58,53252,185],[224,9,53254,161],[224,16,53256,137],[224,23,53258,113],[224,30,53260,89],[224,37,53262,65],[224,45,53264,0],[245,25,53270,215],[245,39,18424,141],[245,47,18425,127],[245,55,18426,131],[245,63,18427,134],[246,8,18428,141],[246,16,18429,136],[246,24,18430,141],[246,32,18431,141],[246,38,53249,0],[246,42,53251,0],[246,46,53253,0],[246,50,53255,0],[246,54,53257,0],[246,58,53259,0],[246,62,53261,0],[247,3,53263,0],[247,9,53248,31],[247,15,53250,71],[247,21,53252,111],[247,27,53254,151],[247,33,53256,191],[247,39,53258,231],[247,45,53260,15],[247,51,53262,55],[247,63,53264,192],[249,49,53265,64],[251,63,53287,254],[252,8,53288,254],[252,16,53289,254],[252,24,53290,254],[252,32,53291,254],[252,40,53292,254],[252,48,53293,254],[252,56,53294,254],[253,1,53285,241],[253,9,53286,246],[263,36,17402,46],[278,46,17402,111],[283,20,18424,149],[283,26,18425,150],[283,32,18426,153],[283,38,18427,172],[283,44,18428,151],[283,50,18429,152],[283,56,18430,154],[283,62,18431,169],[284,5,53249,22],[284,9,53251,22],[284,13,53253,22],[284,17,53255,22],[284,21,53257,22],[284,25,53259,22],[284,29,53261,22],[284,33,53263,22],[284,45,53260,37],[284,51,53250,55],[284,61,53252,85],[285,4,53254,103],[285,10,53256,239],[285,16,53258,7],[285,22,53264,224]],"colour":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==","ram":[{"a":16384,"b":"AAA/AAPrPAO/789v28+r5s7v+w+vDA5qAA+eAwP+AsD6wcPtcIDlsADfAAD2AwDnNwD6Cwz/DxwwACwAAAwA"},{"a":16448,"b":"/MAA7/wA7v8A9v8wrfwceaysaXzcprwwarwAuf8Aur8Avb8AvrwAv2wPv3wrv7Dn/8P7/wN8/ANsAAPwAAAA"},{"a":16576,"b":"AANswDa/rA2s3w8A6sAA28D/Ow+/NQ6vADWvAP5/D/n+D+v2D5maD2aZD/mqA/aqAO3vAP/vAD//AA/wAAAA"},{"a":16640,"b":"AAAAAAAAAwAAA/AAP/8A//8wu/v8av68mvW8a7W81un//+n/v9f/r/u/v+nz/mvw/q/A/1/A///Aw/8AAD8A"},{"a":17408,"b":"Li4uLi4uLi4wLi4uLrEuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLjAuLi4uLi4uLi4uLi4uLi4uLi4uLi6xLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uMC4uLi5vLi4uLi4uLi4uLi4uLi4uLm8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uMC4uLi6xLi4uLi4uLi4uLi4uLi4uLi4uLm8usS4uLi4uLi4uLi4uLi4uLjAuLi4uLi4uLi4uLi4uLi4uLi4uLi6xLi4uLi4uLi4uLm8uLi4uLi4uLi4uLi4uLi4uLi4uLm8uLi76+y4uLi4uLi4uMC4uLi6xLi4uLi4uLi4uLi4uLrUuLi4uLi4uLi4uLi4uLi4wLi4uLi4uLi4uLi4uLi4uLi4uLi4usS4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLjAuLi4uby4uLi4uLi4uLi4uLi4uLi5vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLjAuLi4usS4uLi4uLi4uLi4uLi4uLi4uLi5vLrEuLi4uLi4uLi4uLi4uLi4wLi4uLi4uLi4uLi4uLi4uLi4uLi4usS4uLi4uLi4uLi5vLi4uLi4uLi4uLi4uLi4uLi4uLi5vLi4uLi4uLi4uLi4uLjAuLi4usS4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uMC4uLi4uLi4uLi4uLi4uLi4uLi4uLrEuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uNC4uLi4uLi4wLi4uLm8uLi4uLi4uLi4uLi4uLi4uby4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4wLi4uLrEuLi4uLi4uLi4uLi4uLi4uLi4uby6xLi4uLi4uLi4uLi4uLi4uMC4uLi4uLi4uLi4uLi4uLi4uLi4uLrEuLi4uLi4uLi4uby4uLi4uLi4uLi4uLi4uLi4uLi4uby4uLi4uLi4uLi4uLi4wLi4uLrEuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLjAuLi4uLi4uLi4uLi4uLi4uLi4uLi6xLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uMC4uLi5vLi4uLi4uLi4uLi4uLi4uLm8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uMC4uLi6xLi4uLi4uLi4uLi4uLi4uLi4uLm8usS4uLi4uLi4uLi4uLi4uLjAuLi4uLi4uLi4uLi4uLi4uLi4uLi6xLi4uLi4uLi4uLm8uLg=="},{"a":18424,"b":"lZaZq5eYmqk="},{"a":18800,"b":"///////////3//////////////3/////////////+/8="},{"a":18848,"b":"///Hg4PH/////8eDg8f//w=="},{"a":18896,"b":"/////0hI////////gYH//w=="},{"a":20224,"b":"AAwAACwADxwwCwz/NwD6AwDnAAD2sADfcIDlwcPtAsD6AwP+AA+eDA5q+w+v5s7v28+r789vPAO/AAPrAAA/"},{"a":20288,"b":"AAAAAAPw/ANs/wN8/8P7v7Dnv3wrv2wPvrwAvb8Aur8Auf8AarwAprwwaXzceaysrfwc9v8w7v8A7/wA/MAA"},{"a":20352,"b":"A/AAD7wAP+/A+6/w72/wNq3/Nb//Nvv/Ovu/53v/2/u/7f+8/n/8Df/8D3/AA//AM//AED8AbAAAeAAA/AAA"},{"a":20416,"b":"AAAAAA/wAD//AP/vAO3vA/aqD/mqD2aZD5maD+v2D/n+AP5/ADWvNQ6vOw+/28D/6sAA3w8ArA2swDa/AANs"},{"a":20480,"b":"AD8Aw/8A///A/1/A/q/A/mvwv+nzr/u/v9f//+n/1un/a7W8mvW8av68u/v8//8wP/8AA/AAAwAAAAAAAAAA"},{"a":24512,"b":"VVVUavqra+qrb6qnfqqXd6pbZulrZr2raa6raa6rZrqrZuqvV6q/Wqr7aqvraq+rar6rP///AAAAAAAAAAAA"},{"a":24768,"b":"VVVUavqrZVVbZmaXfu63f//7aqlraqWraparalqraWqrZaqvVqq/Wqr7aqvraq+rar6rP///AAAAAAAAAAAA"},{"a":24960,"b":"VVVUavqra+Wrb5bnfpvXeq9baqlraWWrZbarZvqra+qrZaqvVqW/Wpb7apvraq+rar6rP///AAAAAAAAAAAA"},{"a":25088,"b":"VVVUavqra9arb2unfb7XeenbZ6l7Z5V7aluram+rZ357Z6p/Ven/WZb7amvrar+rar6rP///AAAAAAAAAAAA"},{"a":25408,"b":"VVVUavqra+qrb6qnfqqXeqpbaqlraqWraparalqraWqrZaqvVqq/Wqr7aqvraq+rar6rP///AAAAAAAAAAAA"},{"a":25920,"b":"AgAACgAAKgAAKQAABQAABgAACgAACgAACwAADwAAAAAAAAAA+Pj46OjohISEhISESEhISEhIrKysvLy8AAAA"},{"a":25984,"b":"8o/o8o+o4k4koUoUoYpYkoloUoUAYsYAq8oAr8oAAAAAAAAA+Pj46OjohISEhISESEhISEhIrKysvLy8AAAA"},{"a":26048,"b":"PgAA+oAA4kAAAUAAJYAAlgAAUAAAYAAAq8AAr8AAAAAAAAAA+Pj46OjohISEhISESEhISEhIrKysvLy8AAAA"},{"a":26112,"b":"8o/o8o+o4k4koUoUoYpYkoloUoUAYsYAq8oAr8oAAAAAAAAA+Pj46OjohISEhISESEhISEhIrKysvLy8AAAA"},{"a":26176,"b":"AAAAAAAAAAAAAAAAAAAA/oAA+oAAAkAACQAAJQAABoAAAoAAYsAAq8AALwAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":26240,"b":"AAAAAAAAAAAAAAAAAAAAPgAA+oAA6kAAoUAAoYAAkoAAUoAAasAAq8AALwAAAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":27200,"b":"D/8ABVVQCqqoD///ANsAP5wAPm8ANWvw/66sqpprVllbqppr/66sNWvwPm8AP5wAANsAD///BVVUCqqgD/8A"},{"a":27328,"b":"AAAAAAAAAAAAAAAAAAAAAAAAD//ABVf1/+5uv7lbvlprf//89VVVCqqqD//AAAAAAAAAAAAAAAAAAAAAAAAA"},{"a":27520,"b":"AAAAAAAAAAAAAAAAAAAAD/8ABVVUOqqq////vppsqllbfp6v/26/NVf1CqqoD/8AAAAAAAAAAAAAAAAAAAAA"},{"a":28800,"b":"AAAAAAAAAAAAAP8AD+vwOqqsOaas5qpr6r6rP9v8P1b8+Jov5uur6r5rOmls"},{"a":28992,"b":"AAAAAAAAAAAAAAAAD//wP6r8+qav5b5r9uurOpqsP1b8+//v6qur9qprOmmsP6r8A//AAAAAAAAA"},{"a":31231,"b":"/w=="}],"capture":{"phase_cycles_uncertain":0,"frame_cycles":19657,"frame_ended_on_line":0,"picture_lines_low":0,"writes_account_for_end_state":true,"ram_bytes_changed_during_frame":76,"colour_cells_changed_during_frame":0}};
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const PAL = ['#000000', '#ffffff', '#813338', '#75cec8', '#8e3c97', '#56ac4d', '#2e2c9b', '#edf171',
               '#8e5029', '#553800', '#c46c71', '#4a4a4a', '#7b7b7b', '#a9ff9f', '#706deb', '#b2b2b2'];
  const hex = (n, w) => '$' + n.toString(16).toUpperCase().padStart(w || 2, '0');
  const needSite = 'This widget reads the game’s bytes from listing.json and the site’s shared scripts: open the page from the built site, not from disk.';
  const VIC = DELTA_FRAME.vic;
  const BG = [VIC[0x21] & 15, VIC[0x22] & 15, VIC[0x23] & 15, VIC[0x24] & 15];

  /* 01 the frame and its bands */
  const BANDS = [
    [45, 50, 'Top of the play area: 38 columns, extended colour on (D011 = $5C); seven sprites placed on line 50 for the top row of rocks.'],
    [72, 77, 'The same seven sprites move down and change shape: the enemies.'],
    [222, 224, 'Again, for the bottom row of rocks on line 224.'],
    [245, 247, 'The icon row along the bottom: eight new shapes and positions.'],
    [249, 249, 'Screen blanked (D011 = $40) while the frame’s game logic runs.'],
    [251, 253, 'Sprite colours for the score panel.'],
    [283, 285, 'In the bottom border: all eight sprites to line 22, the score panel at the top of the next frame.'],
  ];
  if ($('frameCv')) {
  let frameR = null, showBands = false, hlBand = -1;
  function drawFrameAll() {
    if (!window.C64) { $('frameMsg').textContent = needSite; return; }
    const cv = $('frameCv');
    frameR = C64.drawFrame(cv, DELTA_FRAME, 2);
    if (!showBands) return;
    const ctx = cv.getContext('2d');
    BANDS.forEach((b, i) => {
      const y0 = (b[0] - frameR.line0) * 2, y1 = (b[1] - frameR.line0 + 1) * 2;
      ctx.fillStyle = i === hlBand ? 'rgba(255,200,40,.75)' : 'rgba(255,200,40,.4)';
      ctx.fillRect(0, y0, cv.width, Math.max(2, y1 - y0));
    });
  }
  const list = $('bandList');
  list.innerHTML = BANDS.map((b, i) => {
    const w = DELTA_FRAME.writes.filter(x => x[0] >= b[0] && x[0] <= b[1]).length;
    return `<li data-i="${i}">lines ${b[0]}${b[1] > b[0] ? '-' + b[1] : ''} · ${w} writes · ${b[2]}</li>`;
  }).join('');
  list.addEventListener('mouseover', e => { const li = e.target.closest('li'); if (!li) return; hlBand = +li.dataset.i; list.querySelectorAll('li').forEach(x => x.classList.toggle('hl', x === li)); drawFrameAll(); });
  $('bandsBtn').onclick = () => { showBands = !showBands; list.hidden = !showBands; $('bandsBtn').classList.toggle('on', showBands); $('bandsBtn').textContent = showBands ? 'Hide the raster bands' : 'Show the raster bands'; drawFrameAll(); };
  drawFrameAll();
  }

  /* 02 music */
  function mountMusic(root, ram) {
    const S = globalThis.C64Sid;
    if (!S) { root.textContent = needSite; return; }
    const names = ['0 In play'];
    for (let t = 1; t <= 10; t++) names.push(t + ' (unused)');
    names.push('11 Title, game over', '12 Mission complete');
    S.mount(root, {
      driver: createDriver, data: { base: 0xBC00, bytes: ram.slice(0xBC00, 0xD000) }, tunes: names,
      filter: '6581', gain: 0.5,
      rows: [
        { k: 'Note', f: v => hex(v.note) },
        { k: 'Instrument', f: v => hex(v.instrument) },
        { k: 'Track step', f: v => hex(v.track) + ', pattern ' + hex(v.pattern) },
      ],
    });
  }

  /* 03 stars */
  function starsWidget(ram) {
    const m = new Uint8Array(0x10000);
    m.set(ram.subarray(0x1000, 0x1040), 0x1000); m.set(ram.subarray(0x4800, 0x4A00), 0x4800);
    const gc = $('glyphCv').getContext('2d');
    const cv = $('starCv'), S = 2, W = 40 * 8, H = 25 * 8;
    cv.width = W * S; cv.height = H * S; cv.style.width = '100%';
    const ctx = cv.getContext('2d');
    const LAYERS = [[0x100A, 0x2F, BG[1], 'slow'], [0x1010, 0x30, BG[0], 'middle'], [0x1016, 0x31, BG[2], 'fast']];
    let frames = 0;
    function glyphs() {
      gc.fillStyle = '#fff'; gc.fillRect(0, 0, 300, 120);
      LAYERS.forEach(([, g, col, name], k) => {
        const x0 = 10 + k * 98;
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const set = m[0x4800 + g * 8 + y] & (0x80 >> x);
          gc.fillStyle = set ? '#000' : PAL[col]; gc.fillRect(x0 + x * 10, 6 + y * 10, 9, 9);
        }
        gc.fillStyle = '#55585f'; gc.font = '12px IBM Plex Mono, monospace';
        gc.fillText(hex(g) + ' ' + name, x0, 104);
      });
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      LAYERS.forEach(([a, g, col]) => {
        for (let i = 0; i < 6; i++) for (let q = 0; q < 4; q++) {
          const cell = 0x43F8 + q * 256 + m[a + i] - 0x4400;
          if (cell < 0 || cell >= 1000) continue;
          const cx = (cell % 40) * 8, cy = (cell / 40 | 0) * 8;
          for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++)
            if (!(m[0x4800 + g * 8 + y] & (0x80 >> x))) { ctx.fillStyle = PAL[col]; ctx.fillRect((cx + x) * S, (cy + y) * S, S, S); }
        }
      });
      glyphs();
      $('starLab').textContent = 'frame ' + frames;
    }
    let run = true;
    function tick() { starsStep(m); frames++; draw(); }
    setInterval(() => { if (run && !document.hidden) tick(); }, 20);
    $('starBtn').onclick = () => { run = !run; $('starBtn').classList.toggle('on', run); $('starBtn').textContent = run ? 'Running' : 'Paused'; };
    $('starStep').onclick = () => { run = false; $('starBtn').classList.remove('on'); $('starBtn').textContent = 'Paused'; tick(); };
    draw();
  }

  /* 04 shots */
  function shotWidget(ram) {
    const masks = ram.subarray(0xFF70, 0xFFF0);
    const ctx = $('shotCv').getContext('2d');
    let p = 0, under = [0x2E, 0x2E];
    function g(code) { return ram.subarray(0x4800 + code * 8, 0x4808 + code * 8); }
    function draw() {
      const [a, b] = shotGlyphs(masks, g(under[0]), g(under[1]), p * 16);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 256, 128);
      [a, b].forEach((gl, k) => {
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          ctx.fillStyle = gl[y] & (0x80 >> x) ? '#000' : PAL[7];
          ctx.fillRect(k * 128 + x * 15 + 4, y * 15 + 4, 14, 14);
        }
      });
      $('shotPosLab').textContent = p + ' of 7';
      const m1 = Array.from(masks.subarray(p * 16, p * 16 + 8)), m2 = Array.from(masks.subarray(p * 16 + 8, p * 16 + 16));
      $('shotOut').innerHTML = 'masks ' + hex(0xFF70 + p * 16, 4) + ': ' + m1.map(v => hex(v).slice(1)).join(' ') + '<br>' +
        '      ' + hex(0xFF78 + p * 16, 4) + ': ' + m2.map(v => hex(v).slice(1)).join(' ') + '<br>glyphs underneath ' + hex(under[0]) + ', ' + hex(under[1]);
    }
    $('shotPos').oninput = e => { p = +e.target.value; draw(); };
    document.querySelectorAll('[data-under]').forEach(btn => btn.onclick = () => {
      const u = btn.dataset.under; under = [parseInt(u.slice(0, 2), 16), parseInt(u.slice(2), 16)];
      document.querySelectorAll('[data-under]').forEach(x => x.classList.toggle('on', x === btn)); draw();
    });
    draw();
  }

  /* the game's font, for the shop's digits and the banners */
  function fontGlyph(ram, ctx, code, px, py, s, cols) {
    const o = 0xFC60 + 20 * code;
    for (let y = 0; y < 10; y++) {
      const v = (ram[o + 2 * y] << 8 | ram[o + 2 * y + 1]) >> 4;
      for (let x = 0; x < 6; x++) {
        const c = (v >> (10 - 2 * x)) & 3;
        if (c) { ctx.fillStyle = cols[c]; ctx.fillRect(px + x * 2 * s, py + y * s, 2 * s, s); }
      }
    }
  }
  const BANNER_COLS = [null, PAL[1], PAL[12], PAL[11]];

  /* 05 shop */
  function shopWidget(ram) {
    const ctx = $('shopCv').getContext('2d');
    const WEAP = ['speed', 'fire rate', 'extra weapon', 'double laser', 'orbiter', 'slow-down', 'shield'];
    let credits = 3, bought = false, points = 0, blink = -1, blinkN = 0, lost = false;
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 560, 64);
      for (let k = 1; k <= 7; k++) {
        const x = (k - 1) * 80 + 8, afford = k <= credits && !bought;
        const on = !(blink === k && blinkN % 2);
        ctx.fillStyle = PAL[afford ? 14 : 12]; if (on) ctx.fillRect(x, 8, 64, 48);
        fontGlyph(ram, ctx, 0x1D + k, x + 14, 12, 3, [null, '#000', '#000', '#000']);
      }
    }
    function credBtns() {
      $('credBtns').innerHTML = '';
      for (let c = 0; c <= 7; c++) {
        const b = document.createElement('button'); b.textContent = c; b.className = c === credits ? 'on' : '';
        b.onclick = () => { credits = c; bought = false; lost = false; points = 0; credBtns(); draw(); $('shopOut').textContent = 'Click an icon to fly into it.'; };
        $('credBtns').appendChild(b);
      }
    }
    $('shopCv').onclick = e => {
      const r = e.target.getBoundingClientRect(), x = (e.clientX - r.left) * 560 / r.width;
      const k = Math.floor(x / 80) + 1; if (k < 1 || k > 7) return;
      const res = shopTouch(k, credits, true, bought);
      if (res.hit) {
        $('shopOut').textContent = 'Icon ' + k + ': ' + (bought ? 'a second icon in the same shop' : 'costs ' + k + ', only ' + credits + ' credit' + (credits === 1 ? '' : 's')) + '. The ship is hit and a life is lost.';
      } else {
        bought = true; points = res.change * 100;
        $('shopOut').textContent = 'Icon ' + k + ' (' + WEAP[k - 1] + ') bought for ' + k + '. ' + res.change + ' credit' + (res.change === 1 ? '' : 's') + ' left over: +' + points + ' points, credits now 0. The icon blinks 14 times, then the ' + WEAP[k - 1] + ' takes effect.';
        blink = k; blinkN = 0;
        const t = setInterval(() => { blinkN++; draw(); if (blinkN >= 28) { clearInterval(t); blink = -1; credits = 0; credBtns(); draw(); } }, 160);
      }
      draw();
    };
    $('shopNew').onclick = () => { bought = false; draw(); $('shopOut').textContent = 'A new shop: one purchase allowed.'; };
    credBtns(); draw();
  }

  /* 06 stages */
  function stageWidget(ram) {
    const ctx = $('bannerCv').getContext('2d');
    let stage = 1, pass = 0;
    const strip = $('stageStrip');
    for (let s = 0; s < 32; s++) {
      const b = document.createElement('button'); b.textContent = s + 1;
      if (stageInfo(ram, s, 0).hazards) b.classList.add('hz');
      b.onclick = () => { stage = s; draw(); };
      strip.appendChild(b);
    }
    function draw() {
      const I = stageInfo(ram, stage, pass);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 400, 200);
      const lines = I.lines.map(l => stageWordCodes(ram, l));
      const st = stageWordCodes(ram, 0); st[6] = 0x1D + ((stage + 1) / 10 | 0); st[7] = 0x1D + (stage + 1) % 10;
      lines.push(st);
      lines.forEach((codes, r) => {
        const n = codes.length - codes.slice().reverse().findIndex(c => c !== 0x1C);
        const used = codes.slice(0, Math.min(8, n)), x0 = (400 - used.length * 12 * 3.4) / 2 + 2;
        used.forEach((c, i) => fontGlyph(ram, ctx, c, x0 + i * 12 * 3.4, 18 + r * 42, 3.4, BANNER_COLS));
      });
      strip.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === stage));
      const words = I.lines.map(l => stageWordText(ram, l)).join(' ');
      $('stageOut').innerHTML = `Stage ${stage + 1}: ${words}<br>` +
        `banner bytes ${hex(0xF880 + 2 * stage, 4)}: ${hex(ram[0xF880 + 2 * stage]).slice(1)} ${hex(ram[0xF880 + 2 * stage + 1]).slice(1)} → words ${I.lines.join(', ')}<br>` +
        (I.hazards ? `scenery rows: yes, colours ${I.hazardColours.join(' and ')} (${hex(0xF900 + 4 * stage, 4)}: ${I.hazardBytes.map(v => hex(v).slice(1)).join(' ')})` : 'scenery rows: none') + '<br>' +
        `enemy fire rate ${I.rate} (lower fires sooner), fire budget ${I.budget}`;
    }
    document.querySelectorAll('[data-pass]').forEach(b => b.onclick = () => {
      pass = +b.dataset.pass; document.querySelectorAll('[data-pass]').forEach(x => x.classList.toggle('on', x === b)); draw();
    });
    draw();
  }

  /* the 32 stages as a table, by pass */
  function stageTable(ram) {
    let pass = 0;
    function draw() {
      let h = '<tr><th>Stage</th><th>Banner</th><th>Scenery rows</th><th>Fire rate</th><th>Fire budget</th></tr>';
      for (let s = 0; s < 32; s++) {
        const I = stageInfo(ram, s, pass);
        const sw = c => `<span class="sw" style="background:${PAL[c]}"></span>`;
        h += `<tr><td>${s + 1}</td><td>${I.lines.map(l => stageWordText(ram, l)).join(' ')}</td>` +
          `<td>${I.hazards ? sw(I.hazardColours[0]) + sw(I.hazardColours[1]) + ' yes' : '-'}</td><td>${I.rate}</td><td>${I.budget}</td></tr>`;
      }
      $('stageTable').innerHTML = h;
    }
    document.querySelectorAll('[data-tpass]').forEach(b => b.onclick = () => {
      pass = +b.dataset.tpass; document.querySelectorAll('[data-tpass]').forEach(x => x.classList.toggle('on', x === b)); draw();
    });
    draw();
  }

  const need = ['music', 'stageOut', 'stageTable', 'shopOut', 'shotOut', 'starLab'].filter(id => $(id));
  if (!need.length) return;
  if (!window.C64) {
    need.forEach(id => { $(id).innerHTML = '<span class="msg">' + needSite + '</span>'; });
    return;
  }
  C64.load('listing.json').then(G => {
    const ram = G.ram;
    if ($('music')) mountMusic($('music'), ram);
    if ($('starCv')) starsWidget(ram);
    if ($('shotCv')) shotWidget(ram);
    if ($('shopCv')) shopWidget(ram);
    if ($('bannerCv')) stageWidget(ram);
    if ($('stageTable')) stageTable(ram);
  });
})();
