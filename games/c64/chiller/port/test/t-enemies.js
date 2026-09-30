'use strict';
// The enemies group (src/g-enemies.js) against the game's own code, routine by routine.
// node games/c64/chiller/port/test/t-enemies.js
const { check } = require('./lib.js');
const G = ['enemies'];
const pick = (rnd, list) => list[rnd(list.length)];

// A sprite (0-7) somewhere on the screen, often at an edge move_sprite stops at.
function place(M, chips, rnd, s) {
  const v = chips.vic;
  v[s * 2 + 1] = rnd(2) ? pick(rnd, [0x32, 0x33, 0xE2, 0xE3, 0x31, 0xE4]) : rnd(256);
  const msb = rnd(2);
  v[s * 2] = rnd(2) ? (msb ? pick(rnd, [0x4E, 0x4F, 0x50]) : pick(rnd, [7, 8, 9])) : rnd(256);
  v[0x10] = (v[0x10] & ~(1 << s)) | (msb << s);
}
function placeAll(M, chips, rnd) { for (let s = 0; s < 8; s++) if (rnd(2)) place(M, chips, rnd, s); }
// Random numbers: random's index and the byte at $A2 it EORs with.
function roll(M, rnd) { M[0xCF14] = rnd(256); M[0xA2] = rnd(256); }
// The enemies' sprites on or off, the boy's usually on.
function sprites(chips, rnd) { chips.vic[0x15] = rnd(256) | (rnd(4) ? 1 : 0); }
// A slot's path block: X, Y, MSB bit and the two counts, small or zero.
function path(M, rnd, slot) {
  const o = M[0xCF0D + slot];
  if (rnd(2)) M[0x4519 + o] = rnd(256);
  if (rnd(2)) M[0x451A + o] = rnd(256);
  if (rnd(3) === 0) M[0x451B + o] = pick(rnd, [0, 1 << (slot + 2)]);
  if (rnd(2)) M[0x451C + o] = pick(rnd, [0, 0, 1, 2, 5, 16, rnd(256)]);
  if (rnd(2)) M[0x451D + o] = pick(rnd, [0, 0, 1, 2, 5, 16, rnd(256)]);
}

check({ name: 'screen_exit', groups: G, cases: 2000, range: [0x2ED0, 0x2EDA] });

check({ name: 'set_enemy_colour', groups: G, cases: 2000, range: [0x2F38, 0x2F4C],
  setup: (M, chips, rnd) => ({ a: rnd(256), x: rnd(5) }) });

check({ name: 's_2F47', groups: G, cases: 2000, range: [0x2F47, 0x2F4C],
  setup: (M, chips, rnd) => { const x = rnd(5); M[0xFB] = M[0x575E + x]; M[0xFC] = M[0xCF24 + x]; return { x, y: rnd(64) }; } });

check({ name: 'respawn_timer', groups: G, cases: 3000, range: [0x2FB2, 0x2FFA],
  setup: (M, chips, rnd) => {
    M[0xCF75] = rnd(3) ? 0xFE : rnd(256);
    sprites(chips, rnd); roll(M, rnd); placeAll(M, chips, rnd);
    for (let x = 0; x < 5; x++) {
      if (rnd(2)) M[0xCF76 + x] = pick(rnd, [0, 1, 0xC8]);
      if (rnd(2)) M[0x45E2 + x] = rnd(256);
      path(M, rnd, x);
    }
  } });

check({ name: 'mark_moving', groups: G, cases: 2000, range: [0x5662, 0x566C], setup: (M, c, rnd) => ({ a: rnd(5) }) });
check({ name: 'enemy_lives_reset', groups: G, cases: 2000, range: [0x566D, 0x5680] });
check({ name: 'enemy_lives', groups: G, cases: 2000, range: [0x56BC, 0x56BF] });

check({ name: 'speed_up', groups: G, cases: 3000, range: [0x5681, 0x56B1],
  setup: (M, chips, rnd) => {
    for (let x = 0; x < 5; x++) {
      M[0xCF9C + x] = pick(rnd, [1, 2, 3, 4, 8, 0x23, 0x26, rnd(256)]);
      if (rnd(3) === 0) M[0x34E8 + x] = M[0xCF9C + x];
      M[0x54E5 + x] = pick(rnd, [0, 1, 2, 3, 4, 8, rnd(256)]);
    }
  } });

check({ name: 'set_enemy_speed', groups: G, cases: 2000, range: [0x56B2, 0x56BB], setup: (M, c, rnd) => ({ a: rnd(256), x: rnd(5) }) });

for (const name of ['j_570A', 'j_5716'])
  check({ name, groups: G, cases: 2000, range: name === 'j_570A' ? [0x570A, 0x5715] : [0x5716, 0x571E],
    setup: (M, chips, rnd) => { const x = rnd(5); M[0xFB] = M[0x575E + x]; M[0xFC] = M[0xCF24 + x]; return { a: rnd(256), x, y: rnd(64) }; } });

// The extra enemy's state: its timer near its period, its direction, sprite 7 near an edge.
function extra(M, chips, rnd) {
  M[0x4554] = pick(rnd, [0x10, 1, 2]);
  M[0xCF45] = rnd(2) ? (M[0x4554] - 1) & 255 : rnd(256);
  M[0xCF44] = rnd(5);
  place(M, chips, rnd, 7);
}

check({ name: 'launch_extra', groups: G, cases: 3000, range: [0xC000, 0xC010],
  setup: (M, chips, rnd) => {
    sprites(chips, rnd); extra(M, chips, rnd); placeAll(M, chips, rnd);
    const x = rnd(5);
    M[0xCF4F + x] = rnd(2);
    M[0x454E + x] = rnd(5);
    return { x };
  } });

check({ name: 'scroll_timer', groups: G, cases: 2000, range: [0xC011, 0xC031],
  setup: (M, chips, rnd) => {
    M[0x4555] = rnd(4) ? rnd(256) : 0xFF;
    M[0xCF43] = pick(rnd, [1, 1, 2, 8, 9, 0x10, 0x11, rnd(256)]);
    place(M, chips, rnd, 0);
  } });

check({ name: 'spawn_enemy', groups: G, cases: 3000, range: [0xC0E4, 0xC0FF],
  setup: (M, chips, rnd) => { const a = rnd(5); roll(M, rnd); path(M, rnd, a); sprites(chips, rnd); return { a }; } });

check({ name: 'j_C144', groups: G, cases: 2000, range: [0xC144, 0xC14F], setup: (M, c, rnd) => ({ a: rnd(256) }) });

check({ name: 'scroll_left', groups: G, cases: 2000, range: [0xC412, 0xC46A] });
check({ name: 'scroll_wait', groups: G, cases: 2000, range: [0xC46B, 0xC477] });
check({ name: 'scroll_rows', groups: G, cases: 2000, range: [0xC47F, 0xC4CA] });

check({ name: 'sprite1_hit_scenery', groups: G, cases: 2000, range: [0xC4FB, 0xC524],
  setup: (M, chips, rnd) => { M[0xC544] = rnd(6); sprites(chips, rnd); return { a: rnd(2) ? 1 : rnd(256) }; } });

check({ name: 'scroll_nudge', groups: G, cases: 2000, range: [0xC525, 0xC53B], outs: ['a', 'x', 'y', 'z'],
  setup: (M, chips, rnd) => { M[0xCF43] = rnd(2) ? rnd(32) * 8 : rnd(256); place(M, chips, rnd, 0); } });

check({ name: 'enemy_dying', groups: G, cases: 3000, range: [0xC607, 0xC645],
  setup: (M, chips, rnd) => {
    const x = rnd(5);
    M[0xCF82 + x] = pick(rnd, [1, 1, 2, rnd(256)]);
    M[0xCF54 + x] = pick(rnd, [1, 1, 2, rnd(256)]);
    M[0x07FA + x] = pick(rnd, [0xFB, 0xFB, 0xFA, rnd(256)]);
    sprites(chips, rnd);
    return { x };
  } });

check({ name: 'random', groups: G, cases: 2000, range: [0xC9F1, 0xC9FF], setup: (M, c, rnd) => { roll(M, rnd); } });

check({ name: 'enemy_move_if_on', groups: G, cases: 3000, range: [0xCA64, 0xCA6F],
  setup: (M, chips, rnd) => { sprites(chips, rnd); placeAll(M, chips, rnd); return { x: 2 + rnd(5), y: rnd(4) }; } });

check({ name: 'new_life', groups: G, cases: 2000, range: [0xCAED, 0xCAF8] });
check({ name: 'j_CAF9', groups: G, cases: 2000, range: [0xCAF9, 0xCAFE],
  setup: (M, c, rnd) => { M[0x041A] = pick(rnd, [0xB1, 0xB2, rnd(256)]); return { y: rnd(256) }; } });
check({ name: 'lose_life', groups: G, cases: 2000, range: [0xCEDA, 0xCEED],
  setup: (M, c, rnd) => { M[0x041A] = pick(rnd, [0xB1, 0xB2, rnd(256)]); } });

check({ name: 'enemy_to_path', groups: G, cases: 3000, range: [0xCB24, 0xCC0D],
  setup: (M, chips, rnd) => { const a = rnd(5); roll(M, rnd); path(M, rnd, a); return { a }; } });

// A slot about to take a path step: its direction, its sprite near an edge, its turn count and
// script position (sometimes on the script's $FF).
function stepSlot(M, chips, rnd, s) {
  M[0xCF15 + s] = rnd(4);
  place(M, chips, rnd, s + 2);
  M[0x4538 + s] = rnd(2) ? 0 : rnd(256);
  M[0xCF1A + s] = rnd(2) ? 7 : rnd(8);
  M[0x453D + s] = rnd(3) ? 0 : rnd(256);
  M[0xCF29 + s] = rnd(40);
  if (rnd(4) === 0) {
    const p = M[0x575E + s] | (M[0xCF24 + s] << 8);
    M[(p + M[0xCF29 + s]) & 0xFFFF] = 0xFF;
  }
}

check({ name: 'path_step', groups: G, cases: 4000, range: [0xCC12, 0xCCA6],
  setup: (M, chips, rnd) => { const a = rnd(5); sprites(chips, rnd); roll(M, rnd); stepSlot(M, chips, rnd, a); return { a }; } });

check({ name: 'enemy_move', groups: G, cases: 4000, range: [0xCCAB, 0xCCF2],
  setup: (M, chips, rnd) => {
    const x = rnd(5), f = rnd(5);
    sprites(chips, rnd); roll(M, rnd); stepSlot(M, chips, rnd, x);
    if (rnd(2)) M[0xCF2E + x] = (M[0xCF9C + x] - 1) & 255;
    if (rnd(2)) M[0xCF97 + x] = 0x0F;
    M[0xCEFF] = f;
    if (rnd(2)) M[0xCF33 + f] = (M[0x54E5 + f] - 1) & 255;
    if (rnd(2)) M[0x07FA + f] = M[0xCF38 + f];
    return { x };
  } });

check({ name: 'extra_enemy', groups: G, cases: 4000, range: [0xCCF5, 0xCD16],
  setup: (M, chips, rnd) => {
    sprites(chips, rnd); roll(M, rnd); extra(M, chips, rnd); placeAll(M, chips, rnd);
    M[0x4553] = pick(rnd, [0x10, 0x7F, 0x80, rnd(256)]);
    for (let x = 0; x < 5; x++) { M[0xCF4F + x] = rnd(4) ? 0 : 1; M[0x454E + x] = rnd(5); }
  } });

check({ name: 'extra_launch', groups: G, cases: 3000, range: [0xCD17, 0xCD54],
  setup: (M, chips, rnd) => { sprites(chips, rnd); extra(M, chips, rnd); placeAll(M, chips, rnd); return { a: rnd(5), x: rnd(5) }; } });

check({ name: 'extra_move', groups: G, cases: 3000, range: [0xCD55, 0xCD79],
  setup: (M, chips, rnd) => { sprites(chips, rnd); extra(M, chips, rnd); } });

check({ name: 'extra_roll', groups: G, cases: 2000, range: [0xCD7B, 0xCD96], setup: (M, c, rnd) => { roll(M, rnd); } });

check({ name: 'girl_touch', groups: G, cases: 3000, range: [0xCD9D, 0xCDC3],
  setup: (M, chips, rnd) => { M[0xFD] = rnd(256) & pick(rnd, [0xFF, 0x83, 0x03, 0x02]); } });

check({ name: 'enemy_step', groups: G, cases: 3000, range: [0xCDE9, 0xCDF6],
  setup: (M, chips, rnd) => {
    const a = rnd(5);
    M[0xCF4F + a] = rnd(2);
    sprites(chips, rnd); roll(M, rnd); stepSlot(M, chips, rnd, a);
    if (rnd(2)) M[0xCF2E + a] = (M[0xCF9C + a] - 1) & 255;
    M[0xCF82 + a] = pick(rnd, [1, 2]);
    return { a };
  } });

check({ name: 'j_CDFA', groups: G, cases: 2000, range: [0xCDFA, 0xCE01],
  setup: (M, chips, rnd) => { const x = rnd(5); M[0xCF4F + x] = pick(rnd, [0, 1, 2]); return { x }; } });

check({ name: 'sprite_touch', groups: G, cases: 4000, range: [0xCE87, 0xCECC],
  setup: (M, chips, rnd) => {
    let v = rnd(2) ? rnd(256) : (1 | (1 << (2 + rnd(6))));
    if (rnd(4) === 0) v |= 2;
    chips.vic[0x1E] = v;
  } });

check({ name: 'enemy_gone', groups: G, cases: 2000, range: [0xCEEE, 0xCEF4], setup: (M, c, rnd) => ({ x: rnd(5) }) });
check({ name: 'j_CEF6', groups: G, cases: 2000, range: [0xCEF6, 0xCEFE], setup: (M, c, rnd) => ({ a: rnd(256) }) });
