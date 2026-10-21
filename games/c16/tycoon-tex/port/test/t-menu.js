'use strict';
// The menu and the high scores, against the game's (lib.js). menu itself, which waits on the
// interrupt's controls, is held to the game's in the lockstep.
const { check } = require('./lib.js');
const { Z, T } = globalThis.TexPort;
const score = (M, rnd) => {
  const v = String([0, 99, 250, 260, 1000, 3000, 4999, 5000, 5001, 9970, 99999][rnd(11)]).padStart(6, '0');
  for (let i = 0; i < 6; i++) M[0x261F + i] = v.charCodeAt(i);
};
check({ name: 'check_hiscore', cases: 400, setup: (M, rnd) => { score(M, rnd); M[Z.ctl_fire] = 0x80; } });
check({ name: 'enter_hiscore', cases: 300, setup: (M, rnd) => {
  score(M, rnd); M[Z.hiscore_rank] = rnd(8); M[Z.ctl_fire] = 0x80;
} });
check({ name: 'colour_name_cursor', setup: (M, rnd) => {
  const c = 0x0A13 + 0x28 * rnd(8); M[Z.name_colour_cell] = c & 0xFF; M[Z.name_colour_cell + 1] = c >> 8; M[Z.name_cursor] = rnd(7);
} });
check({ name: 'draw_hiscores', cases: 1000, chip: (a, rnd) => (a === 0xFF00 ? (rnd(3) ? rnd(256) & 0xF8 : rnd(256)) : rnd(256)) });
check({ name: 'draw_menu', setup: (M, rnd) => { M[T.menu_item] = rnd(5); } });
const menu = (M, rnd) => {
  M[T.menu_item] = rnd(5); M[T.lives_setting] = 1 + rnd(6); M[T.sound_on] = rnd(2); M[T.difficulty] = rnd(3);
  for (const n of ['ctl_fire', 'ctl_up', 'ctl_down']) M[Z[n]] = rnd(2) ? 0x80 : 0;
};
check({ name: 'menu_input', cases: 3000, setup: menu });
check({ name: 'menu_choose', cases: 3000, setup: menu });
check({ name: 'draw_menu_frame' });
check({ name: 'show_logo_chars' });
