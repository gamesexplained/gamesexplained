'use strict';
// The KERNAL's routines the game's save and load call, served on the game's side as the port's
// own serve them (src/g-save.js): the snapshots hold no ROMs. file() gives the bytes a load finds,
// their address first, or null for no file; saved(name, bytes) takes what a save writes, "@0:"
// left off the name. The hooks go in a machine's or a simulator's hooks, by address.
function kernalHooks(file, saved) {
  const hooks = {};
  const name = c => { let s = ''; const a = c.m[0xBB] | c.m[0xBC] << 8; for (let i = 0; i < c.m[0xB7]; i++) s += String.fromCharCode(c.m[(a + i) & 0xFFFF]); return s; };
  hooks[0xFFF0] = c => { if (!c.c) { c.m[0xD6] = c.x; c.m[0xD3] = c.y; } c.rts(); };
  hooks[0xFFBA] = c => { c.m[0xB8] = c.a; c.m[0xBA] = c.x; c.m[0xB9] = c.y; c.rts(); };
  hooks[0xFFBD] = c => { c.m[0xB7] = c.a; c.m[0xBB] = c.x; c.m[0xBC] = c.y; c.rts(); };
  hooks[0xFFD5] = c => {
    const b = file(name(c));
    if (!b) { c.m[0x90] = 0x42; c.a = 4; c.c = 1; c.rts(); return; }
    const start = c.m[0xB9] ? b[0] | b[1] << 8 : c.x | c.y << 8;
    for (let i = 2; i < b.length; i++) c.m[(start + i - 2) & 0xFFFF] = b[i];
    const end = (start + b.length - 2) & 0xFFFF;
    c.m[0xC3] = start & 255; c.m[0xC4] = start >> 8; c.m[0xAE] = end & 255; c.m[0xAF] = end >> 8;
    c.m[0x90] = 0x40; c.x = end & 255; c.y = end >> 8; c.c = 0; c.rts();
  };
  hooks[0xFFD8] = c => {
    const start = c.m[c.a] | c.m[(c.a + 1) & 255] << 8, end = c.x | c.y << 8;
    const out = new Uint8Array(Math.max(0, end - start) + 2);
    out[0] = start & 255; out[1] = start >> 8;
    for (let a = start; a < end; a++) out[a - start + 2] = c.m[a];
    saved(name(c).replace(/^@?\d?:/, ''), out);
    c.m[0x90] = 0; c.c = 0; c.rts();
  };
  // the KERNAL's vectors put back from its ROM: there is no ROM on either side
  hooks[0x0634] = c => { c.pc = 0x063F; };
  return hooks;
}
module.exports = { kernalHooks };
