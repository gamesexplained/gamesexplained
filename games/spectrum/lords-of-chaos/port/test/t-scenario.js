'use strict';
// Each scenario's own routines (g-scenario.js) checked against the game's own on the moments it
// calls them, and at random.
const fs = require('fs'), path = require('path');
const { check, prefetch } = require('./check.js');
const lib = require('./lib.js');
// the bytes the scenario's file loads at $D0C8-$D207 (the start-up's tables) and $FE00-$FFFF
function original(part) {
  const recs = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'parts', 'scenario-' + part, 'listing.json'), 'utf8')).records;
  const out = [];
  for (const r of recs) for (let i = 0; i < (r.b || []).length; i++) {
    const a = r.a + i;
    if ((a >= 0xD0C8 && a < 0xD208) || a >= 0xFE00) out.push([a, r.b[i]]);
  }
  return out;
}
const common = {
  hook_classify_step: [], hook_after_step: [], hook_use_square: [], hook_turn_start: [], hook_select_menu: [], hook_read: [],
  keep_out_hazards: [], friend_near: ['zf'], computer_shield: [], computer_bolt: [], interrupt_jump: [],
};
const own = {
  1: { computer_area_spell: [] },
  2: { computer_area_spell: [], lava_burns: [], dungeon_thing_hides: ['zf'] },
  3: { offer_read: [], read_scroll: [], floor_traps: [], deadly_floors: [] },
};
let fails = 0;
for (const part of [1, 2, 3]) {
  const outs = Object.assign({}, common, own[part]);
  const R = Object.keys(outs);
  const O = { part, states: 's' + part + '-', per: 4, frames: 3000 };
  prefetch(R, O);
  console.log('scenario ' + part);
  for (const n of R) fails += check(Object.assign({ name: n, outs: outs[n], cases: 200 }, O)).fails;
  // the start: the object table emptied and filled, and objects scattered, on a moment of play's
  // memory with the start-up's code and tables put back from the listing (in play the interrupt's
  // vector table and the computer's working storage cover them)
  const at = Object.assign({}, O, { from: 'move_cursor', frames: 1500 });
  const orig = original(part);
  const back = c => { for (const [a, v] of orig) c.M[a] = v; };
  fails += check(Object.assign({ name: 'start_hook', outs: [], cases: 20, seed: 40 + part, setup: c => { back(c); } }, at)).fails;
  fails += check(Object.assign({ name: 'place_object', outs: [], cases: 200, seed: 50 + part,
    setup: (c, rnd) => { back(c); c.regs.a = rnd(10); c.M[0xFF88] = rnd(36); c.M[0xFF89] = rnd(36); c.M[0xFE02] = rnd(2); } }, at)).fails;
  fails += check(Object.assign({ name: 'scatter_objects', outs: [], cases: 30, seed: 60 + part, setup: c => { back(c); } }, at)).fails;
}
process.exitCode = fails ? 1 : 0;
