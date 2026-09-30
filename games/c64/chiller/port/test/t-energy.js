'use strict';
// The energy group checked against the game's own code: node games/c64/chiller/port/test/t-energy.js
const { check } = require('./lib.js');
const groups = ['energy'];

// The states around the real ones: the energy bar, the score, the counters and timers.
const pick = (rnd, list) => list[rnd(list.length)];
const small = rnd => pick(rnd, [1, 1, 2, 3, rnd(256)]);
function bar(M, rnd) {
  if (rnd(6) === 0) return;                 // as the state has it
  const n = rnd(35);
  for (let i = 0; i < 0x21; i++) M[0x042E + i] = i < n ? 0xA9 : i === n ? 0xA1 + rnd(8) : 0xA1;
}
function digits(M, rnd, at) {
  for (let i = 0; i < 6; i++) M[at + i] = rnd(3) ? 0xB9 : 0xB0 + rnd(10);
  if (rnd(4) === 0) for (let i = 0; i < 6; i++) M[at + i] = pick(rnd, [0xB0, 0xB9]);
}
function level(M, rnd) {
  const p = M[0x11] | (M[0x12] << 8);
  if (rnd(3)) M[(p + 0x73) & 0xFFFF] = pick(rnd, [0, 2, 4, 6, 8, 0x0A, 0x0C, 0x0E, 0x10, 0x12]);
}
// (zp $FB) pointing at a screen row, as try_move leaves it
function probe(M, rnd) {
  const cell = 0x0400 + rnd(22) * 40 + rnd(40);
  M[0xFB] = cell & 0xFF; M[0xFC] = cell >> 8;
}
function energyState(M, chips, rnd) {
  bar(M, rnd);
  digits(M, rnd, 0x0406);
  M[0x0430] = rnd(2) ? 0xA9 : 0xA1 + rnd(8);
  M[0x450C] = pick(rnd, [2, 4, rnd(256)]);
  M[0x5A0D] = pick(rnd, [0, 0, 1, 5, 255]);
  M[0x5A0E] = small(rnd);
  M[0x5A11] = pick(rnd, [0, 0, 1, 5, 255]);
  M[0x5A12] = small(rnd);
  M[0x72B9] = small(rnd);
  M[0xC19C] = rnd(2) ? 0 : 1 + rnd(3);
  M[0x5A00] = rnd(2); M[0x5A01] = pick(rnd, [0, 1, 0xFF]);
  M[0xC1ED] = pick(rnd, [0, 1, 0xFF]);
  M[0x5A09] = small(rnd); M[0x5A0A] = small(rnd); M[0x5A0B] = small(rnd);
  M[0x4503] = rnd(4) ? 1 : 0;
  M[0x5A06] = rnd(2); M[0x5A08] = rnd(2);
  M[0xC5] = rnd(2) ? 0x37 : 0x40;
  chips.game.joy = rnd(2) ? 0x1F : 0x0F;
  M[0x02FF] = 1;                            // card_wait (in next_screen) ends at once: its interrupt does not run here
  chips.raster = 16;                        // wait_line16, run as the game's code on the port's side
  level(M, rnd);
}

const tests = [
  ['s_5733', [0x5733, 0x5749]],
  ['show_press_ctrl', [0x5736, 0x5749]],
  ['show_game_over', [0xCFC0, 0xCFDF]],
  ['to_switch_allowed', [0x5768, 0x576A], (M, c, rnd) => { energyState(M, c, rnd); }],
  ['switch_allowed', [0x7280, 0x728B], (M, c, rnd) => { energyState(M, c, rnd); }],
  ['player_swap', [0x576B, 0x57F6], (M, c, rnd) => { energyState(M, c, rnd); }],
  ['boy_first', [0x5D60, 0x5D68], (M, c, rnd) => { energyState(M, c, rnd); }],
  ['player_step', [0x5800, 0x5838], (M, c, rnd) => { energyState(M, c, rnd); }],
  ['switch_request', [0x58B3, 0x58E5], (M, c, rnd) => { energyState(M, c, rnd); }],
  ['swap_sprites', [0x58E6, 0x5960], (M, c, rnd) => {
    for (const r of [0, 1, 2, 3]) c.vic[r] = rnd(256);
    c.vic[0x10] = rnd(256); M[0x07F8] = rnd(256); M[0x07F9] = rnd(256);
  }, [0x58E6, 0x58FC, 0x5919, 0x5960]],
  ['reset_players', [0x5900, 0x5916]],
  ['bar_speed', [0x5961, 0x597D], (M, c, rnd) => { energyState(M, c, rnd); }, [0x5961, 0x597D, 0x5A88, 0x5A97]],
  ['find_bar_end', [0x5998, 0x59A2], (M, c, rnd) => { bar(M, rnd); }],
  ['energy_down', [0x59A3, 0x59C2], (M, c, rnd) => { energyState(M, c, rnd); }],
  ['energy_up', [0x59C3, 0x59E2], (M, c, rnd) => { energyState(M, c, rnd); }],
  ['drain_step', [0x59E6, 0x59FB], (M, c, rnd) => { energyState(M, c, rnd); }],
  ['walk_drain', [0x5A20, 0x5A3C], (M, c, rnd) => { energyState(M, c, rnd); }],
  ['out_of_energy', [0x5A70, 0x5A84]],
  ['tile_touch_a', [0x5A9A, 0x5AC6], (M, c, rnd) => {
    energyState(M, c, rnd); probe(M, rnd);
    const a = rnd(5) ? 0x2A + rnd(0x2A) : rnd(256), y = rnd(3) ? 0x50 : rnd(256);
    M[0x5A0F] = small(rnd);
    M[((M[0xFB] | M[0xFC] << 8) + y) & 0xFFFF] = rnd(2) ? a : 0x4D + rnd(7);
    return { a, y };
  }],
  ['tile_touch_b', [0x5AC7, 0x5AFD], (M, c, rnd) => {
    energyState(M, c, rnd); probe(M, rnd);
    const a = rnd(2) ? pick(rnd, [0x54, 0x55, 0x56, 0x57]) : rnd(3) ? 0x58 + rnd(0x20) : rnd(256), y = rnd(3) ? 0x50 : rnd(0x60);
    M[0x5A14] = small(rnd);
    M[0x5A15] = small(rnd);
    const at = ((M[0xFB] | M[0xFC] << 8) + y) & 0xFFFF;
    if (at >= 0x0400 && at < 0x0800) c.colour[at - 0x0400] = rnd(16);
    M[0x5A13] = rnd(256);
    return { a, y };
  }, [0x5AC7, 0x5AFD, 0x5B57, 0x5B5D, 0x5B89, 0x5BAF]],
  ['j_5B8D', [0x5B8D, 0x5B94], (M, c, rnd) => ({ y: rnd(2) ? 0x50 : rnd(256) })],
  ['energy_tick', [0x5B00, 0x5B17], (M, c, rnd) => { energyState(M, c, rnd); }],
  ['energy_add_slow', [0x5B18, 0x5B28], (M, c, rnd) => {
    M[0x5A0D] = pick(rnd, [0, 5, 0xF0, 0xFF, rnd(256)]); return { x: pick(rnd, [0, 1, 2, 0x18, rnd(256)]) };
  }],
  ['poison_tick', [0x5B2C, 0x5B41], (M, c, rnd) => { energyState(M, c, rnd); }],
  ['poison_add', [0x5B44, 0x5B54], (M, c, rnd) => {
    M[0x5A11] = pick(rnd, [0, 5, 0xF0, 0xFF, rnd(256)]); return { x: pick(rnd, [0, 1, 2, 0x19, rnd(256)]) };
  }],
  ['cross_count', [0x5B5E, 0x5B88], (M, c, rnd) => {
    energyState(M, c, rnd);
    M[0x041C] = rnd(2) ? 0xB9 : 0xB0 + rnd(10); M[0x041D] = rnd(2) ? 0xB9 : 0xB0 + rnd(10);
    M[0x5A15] = pick(rnd, [1, 2, 5]);
  }],
  ['crosses_left', [0x7F00, 0x7F1B], (M, c, rnd) => { energyState(M, c, rnd); M[0x5A15] = pick(rnd, [1, 2, 5]); }],
  ['cross_touch', [0x7F50, 0x7F79], (M, c, rnd) => {
    energyState(M, c, rnd); probe(M, rnd);
    const y = rnd(3) ? 0x50 : rnd(0x60);
    const at = ((M[0xFB] | M[0xFC] << 8) + y) & 0xFFFF;
    if (at >= 0x0400 && at < 0x0800) c.colour[at - 0x0400] = rnd(16);
    M[0x5A15] = pick(rnd, [1, 2, 5]);
    return { y };
  }],
  ['flash_border', [0x72BA, 0x72DD], (M, c, rnd) => { energyState(M, c, rnd); c.raster = rnd(312); c.vic[0x20] = rnd(256); }],
  ['check_hiscore', [0x7780, 0x77B2], (M, c, rnd) => {
    digits(M, rnd, 0x0406);
    if (rnd(3)) for (let i = 0; i < 6; i++) M[0x8422 + i] = M[0x0406 + i];
    const k = rnd(7); if (k < 6) M[0x8422 + k] = 0xB0 + rnd(10);
    return { x: rnd(4) ? 0 : rnd(6) };
  }],
  ['score_inc', [0xCE11, 0xCE27], (M, c, rnd) => { digits(M, rnd, 0x0406); }],
  ['score_dec', [0xCE28, 0xCE41], (M, c, rnd) => {
    for (let i = 0; i < 6; i++) M[0x0406 + i] = rnd(2) ? 0xB0 : 0xB0 + rnd(10);
  }],
  ['add_score', [0xCE42, 0xCE6A], (M, c, rnd) => {
    digits(M, rnd, 0x0406);
    M[0xCF5A] = pick(rnd, [0, 1, 10, 100, rnd(256)]); M[0xCF5B] = pick(rnd, [0, 0, 1, 2]);
    M[0xCF5C] = rnd(3) ? 0x11 : 0x28;
  }],
  ['add_score_for', [0xCE6B, 0xCE83], (M, c, rnd) => { digits(M, rnd, 0x0406); M[0xCF4E] = rnd(5); }],
  ['s_CE6E', [0xCE6E, 0xCE83], (M, c, rnd) => { digits(M, rnd, 0x0406); return { x: rnd(5) }; }],
];

const only = process.argv[2];
let bad = 0;
for (const [name, range, setup, ranges] of tests) {
  if (only && name !== only) continue;
  const r = check({ name, groups, cases: 3000, setup: setup || null, range });
  if (ranges) for (let i = 0; i < ranges.length; i += 2) {
    let lines = 0, hit = 0;
    const L = require('./lib.js').LISTING.records.filter(x => x.t === 'code' && x.a >= ranges[i] && x.a <= ranges[i + 1]);
    for (const x of L) { lines++; if (r.reached[x.a]) hit++; }
    console.log('       ' + hit + '/' + lines + ' instructions of $' + ranges[i].toString(16).toUpperCase() + '-$' + ranges[i + 1].toString(16).toUpperCase() + ' reached');
  }
  bad += r.fails;
}
process.exitCode = bad ? 1 : 0;
