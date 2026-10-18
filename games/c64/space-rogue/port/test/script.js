'use strict';
// The waits of a routine checked alone (check.js), scripted the same on both sides: the game's
// wait_key ($A431) is an RTS and the port's returns at once, as no interrupt fills the keyboard
// buffer in a check; player_destroyed ($1B90) an RTS on both; a menu's choice (menu_select,
// $99F2) comes from a list at $0381, counted at $0380, by a stub at $0340 in the game and by the
// same reads in the port, so that each menu takes the next choice; and keys are put in the
// keyboard buffer ($03 its count, $05 on).
//   script(M, choices, keys) in a check's setup, scripted(P) in its onPort
// The stubs. A menu's choice: the next of the list, or the menu's last item ($8B less one) for
// one past its end; the list's last choice is kept once it is reached.
//   LDY $0380; LDA $0381,Y; CMP $8B; BCC +5; LDA $8B; SEC; SBC #1; STA $8C; CPY #$7D; BCS +3;
//   INC $0380; TAY; RTS
const STUB = [0xAC, 0x80, 0x03, 0xB9, 0x81, 0x03, 0xC5, 0x8B, 0x90, 0x05, 0xA5, 0x8B, 0x38, 0xE9, 0x01,
  0x85, 0x8C, 0xC0, 0x7D, 0xB0, 0x03, 0xEE, 0x80, 0x03, 0xA8, 0x60];
const LAST = 0x7D;
// a routine that drops its caller's return (up) called from JSR it; RTS at $0360
const CALLER = 0x0360;
function script(M, choices, keys = []) {
  M.set(STUB, 0x0340);
  M[0x99F2] = 0x4C; M[0x99F3] = 0x40; M[0x99F4] = 0x03;
  M[0xA431] = 0x60;
  M[0x1B90] = 0x60;
  M[0x0380] = 0;
  for (let i = 0; i < LAST; i++) M[0x0381 + i] = choices[Math.min(i, choices.length - 1)];
  M[0x03] = keys.length;
  keys.forEach((k, i) => { M[0x05 + i] = k; });
}
function scripted(P) {
  const M = P.M;
  P.wait_key = function* (r) { return r; };
  P.player_destroyed = () => ({});
  P.menu_select = function* (r) {
    const i = M[0x0380];
    let a = M[0x0381 + i];
    if (a >= M[0x8B]) a = (M[0x8B] - 1) & 255;
    M[0x8C] = a;
    const c = i >= LAST ? 1 : 0;
    if (!c) M[0x0380] = i + 1;
    return { a, x: r.x, y: a, c, n: a >> 7, z: a ? 0 : 1 };
  };
}
// COVER=1: the routines of a source file (src/<file>) that no check reached, from cover(P) in
// each check's onPort and covered() at the end
const COVER = process.env.COVER ? new Map() : null;
function cover(P, file) {
  if (!COVER) return;
  const src = require('fs').readFileSync(require('path').join(__dirname, '../src', file), 'utf8');
  for (const [, k] of src.matchAll(/^  P\.([a-z_0-9]+) = /gm)) {
    const f = P[k];
    if (!COVER.has(k)) COVER.set(k, 0);
    P[k] = f.constructor.name === 'GeneratorFunction'
      ? function* (...a) { COVER.set(k, COVER.get(k) + 1); return yield* f.apply(this, a); }
      : function (...a) { COVER.set(k, COVER.get(k) + 1); return f.apply(this, a); };
  }
}
const covered = () => { if (COVER) console.log('never reached: ' + [...COVER].filter(([, n]) => !n).map(([k]) => k).join(' ')); };
// a few choices at random below most, then fill (past the end of any menu: its last item, DONE)
const choices = (rnd, fill = 0xFF, most = 8) => { const a = []; for (let i = rnd(10); i; i--) a.push(rnd(most)); a.push(fill); return a; };

module.exports = { script, scripted, choices, cover, covered, CALLER };
