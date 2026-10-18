'use strict';
// The vector and orientation routines alone against the game's (check.js), on random vectors in
// log form and positions at $C100-$C1FF.
const { check } = require('./check.js');
const A = 0xC100, B = 0xC120, D = 0xC140;
const num = (M, a, rnd) => { M[a] = rnd(256); M[a + 1] = rnd(4) ? (rnd(16) - 8) & 255 : rnd(256); M[a + 2] = [0, 0xFF, rnd(256)][rnd(3)]; };
const vecs = (M, c, rnd, alias) => {
  for (let i = 0; i < 0x60; i += 3) num(M, A + i, rnd);
  for (let i = 0; i < 0x60; i++) if (rnd(4) === 0) M[A + i] = rnd(256);
  const pick = () => [A, B, D, A + 9, B + 9][rnd(alias ? 5 : 3)];
  const p = [A, B, D];
  if (alias && rnd(3) === 0) p[2] = pick();
  M[0x74] = p[0] & 255; M[0x75] = p[0] >> 8; M[0x76] = p[1] & 255; M[0x77] = p[1] >> 8; M[0x78] = p[2] & 255; M[0x79] = p[2] >> 8;
  for (let a = 0x5F; a <= 0x67; a++) M[a] = rnd(256);
  num(M, 0x5F, rnd);
};
let f = 0;
const t = (name, outs, extra) => { f += check(Object.assign({ name, cases: 1500, setup: (M, c, rnd) => { vecs(M, c, rnd, true); if (extra) return extra(M, c, rnd); }, outs }, {})).fails ? 1 : 0; };
for (const n of ['vec_dot', 'vec_length', 'vec_cross', 'vec_scale_signed', 'vec_scale', 'vec_div_signed', 'vec_div', 'vec_normalise',
  'vec_add_log', 'vec_sub_log', 'vec_axpy', 'vec_add_lin', 'vec_sub_lin', 'vec_neg_lin', 'vec_sub_to_log', 'vec_log_to_lin',
  'vec_lin_to_log', 'copy9', 'copy9_from_0DAB', 'copy_identity', 'mat_times_vec', 'mat_times_mat', 'mat_transpose',
  'mat_orthonormal', 'vec_times_rows', 'turn_pair', 'turn_by_rates', 'vec_angles', 'vec_length_store', 'arctan_log',
  'arctan2_log', 'arcsin_units', 'arcsin_rad', 'arctan_rad', 'arccos_units', 'units_to_radians']) t(n, ['y']);
f += check({ name: 'arccos_rad', entry: 0x997B, cases: 1500, setup: (M, c, rnd) => { vecs(M, c, rnd, true); }, outs: ['y'] }).fails ? 1 : 0;
process.exitCode = f ? 1 : 0;
