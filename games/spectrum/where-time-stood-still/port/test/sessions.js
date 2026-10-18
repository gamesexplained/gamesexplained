'use strict';
// Moments of play for the port's tests, saved in work/states (gitignored, as every state is): the
// game run from the hand-over through the control selection into play, then with input made up
// pass by pass from a seed, saving the machine at the start of a pass every `every` passes. The
// input walks the leader about with the stick, fires, opens the menus with SPACE and moves the
// pointer and fires in them. Prints which of the game's routines the sessions ran, and how often.
//   node sessions.js [passes] [seeds] [every]
const lib = require('./lib.js');
const fs = require('fs'), path = require('path');

// The input for pass n of a session, from rnd, set on the machine: the stick (m.joy) and SPACE.
// Out of the menus the leader walks, a few passes or a long way in one direction, now and then
// with fire, and SPACE opens menu 1 now and then. In a menu fully open ($8D22: 3 menu 1, $18 menu
// 2) the pointer ($8D23 across, $8D24 down) is steered to an icon picked at random from the open
// window's records (menu 1's eight at $D088, menu 2's ten at $D0B0: picture, column, row, mask,
// action) and fire pressed on it, as menu_fire ($CAF4) tests the pointer; quit (action 5) now and
// then, new game (8) seldom.
function player(rnd) {
  const J = lib.JOY;
  let joy = 0, until = 0, space = 0, target = null, fire = 0, inMenu = 0;
  const dirs = [0, J.UP, J.DOWN, J.LEFT, J.RIGHT, J.UP | J.LEFT, J.UP | J.RIGHT, J.DOWN | J.LEFT, J.DOWN | J.RIGHT];
  const bank3 = m => m.bank(3);
  return (n, m) => {
    m.releaseAll();
    const menu = m.ram[0x8D22];
    if (menu === 0) {
      inMenu = 0; target = null;
      if (space > 0) { space--; m.press('SPACE'); }
      else if (rnd(150) === 0) { space = 1; m.press('SPACE'); }
      if (n >= until) {
        joy = dirs[rnd(dirs.length)];
        if (rnd(5) === 0) joy |= J.FIRE;
        until = n + 1 + (rnd(3) ? rnd(12) : 40 + rnd(300));
      }
      m.joy = joy;
      return;
    }
    const open = menu & 0x1B;
    m.joy = 0;
    if (open !== 3 && open !== 0x18) return;
    if (++inMenu > 400) target = null;
    const B = bank3(m), recs = open === 3 ? [0xD088, 8] : [0xD0B0, 10];
    if (fire > 0) { fire--; m.joy = J.FIRE; return; }
    if (!target) {
      const icons = [];
      for (let i = 0; i < recs[1]; i++) {
        const k = recs[0] + 5 * i - 0xC000;
        const ic = { col: B[k + 1], row: B[k + 2], mask: B[k + 3], act: B[k + 4] };
        if (ic.act === 8 && rnd(8)) continue;
        if (ic.act === 5 && rnd(3)) continue;
        icons.push(ic);
      }
      target = inMenu > 400 ? icons.find(i => i.act === 5) || icons[0] : icons[rnd(icons.length)];
      if (inMenu > 400) inMenu = 0;
    }
    const tx = target.col * 8 + 8, ty = target.row + 4, x = m.ram[0x8D23], y = m.ram[0x8D24];
    let j = 0;
    if (x < tx - 3) j |= J.RIGHT; else if (x > tx + 3) j |= J.LEFT;
    if (y < ty - 3) j |= J.DOWN; else if (y > ty + 3) j |= J.UP;
    if (j === 0 || rnd(40) === 0) { fire = rnd(3); m.joy = J.FIRE; target = null; return; }
    m.joy = j;
  };
}

// The routines' entries, by bank: [address, name, bank or -1 for $4000-$BFFF].
function routines() {
  const out = [];
  for (const [part, bank] of [['main', 0], ['bank-03', 3]]) {
    const L = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'parts', part, 'listing.json'), 'utf8'));
    for (const r of L.records) if (r.t === 'code' && r.l) out.push([r.a, r.l, r.a < 0xC000 ? -1 : bank]);
  }
  return out;
}
function counting(m) {
  const counts = new Map();
  for (const [a, name, bank] of routines()) {
    const prev = m.hooks[a];
    m.hooks[a] = mm => {
      if (bank < 0 || (mm.paging & 7) === bank) counts.set(name, (counts.get(name) || 0) + 1);
      return prev ? prev(mm) : false;
    };
  }
  return counts;
}

function session(seed, passes, every, choice, counts) {
  const m = lib.boot();
  const c = counting(m);
  lib.toPlay(m, choice);
  const input = player(lib.makeRnd(seed));
  const name = n => `s${seed}-${choice}-${String(n).padStart(5, '0')}`;
  let n = 0;
  lib.writeState(name(0), m, { seed, choice, pass: 0 });
  // a wait with no pass (the pause): fire tapped now and then, as the input routine reads it
  let last = m.frames, save = false;
  m.onPass = mm => { n++; last = mm.frames; input(n, mm); return (save = n % every === 0); };
  while (n < passes) {
    m.runFrames(1);
    if (save) { save = false; lib.writeState(name(n), m, { seed, choice, pass: n }); }
    const idle = m.frames - last;
    if (idle > 4000) throw new Error('session ' + seed + ': no pass in 4000 frames after pass ' + n);
    if (idle > 50) m.joy = idle % 40 < 4 ? lib.JOY.FIRE : 0;
  }
  m.onPass = null;
  for (const [k, v] of c) counts.set(k, (counts.get(k) || 0) + v);
  return m;
}

if (require.main === module) {
  const passes = +(process.argv[2] || 1000), seeds = +(process.argv[3] || 4), every = +(process.argv[4] || 50);
  const counts = new Map();
  const choices = ['kempston', 'cursor', 'keys', 'sinclair'];
  for (let s = 1; s <= seeds; s++) {
    const t = Date.now();
    const m = session(s, passes, every, choices[(s - 1) % choices.length], counts);
    console.log('seed ' + s + ': ' + passes + ' passes in ' + m.frames + ' frames, ' + (Date.now() - t) + ' ms');
  }
  const all = routines().map(r => r[1]);
  const never = all.filter(k => !counts.has(k));
  console.log(counts.size + ' routines ran; never: ' + never.join(' '));
}

module.exports = { player, session, routines, counting };
