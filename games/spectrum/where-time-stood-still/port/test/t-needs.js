'use strict';
// The needs and the conversation window alone against the game's, as play calls them; then every
// pass of the needs with need bytes near their limits, every message from every speaker, and the
// nearest point of a route from places all over the world.
const { check, prefetch, entries } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
const MIX = { play: 'mix', most: 148, passes: 80 };
const t = o => { f += check(Object.assign({ cases: 200, outs: [] }, MIX, o)).fails ? 1 : 0; };
const NAMES = ['needs_pass', 'need_up', 'need_down', 'runner_noise', 'thirst_starve', 'needs_check', 'leave_party',
  'next_message', 'show_message', 'print_letter', 'code_he_said', 'code_name', 'code_exclamation', 'code_leader',
  'new_line', 'new_line_back', 'or_letter_row', 'message_frame', 'nearest_route', 'near_leader'];
const ENTRIES = [0xD909, 0xE253];
const OUTS = { need_down: ['b'], nearest_route: ['de'], near_leader: ['zf'] };
prefetch(NAMES.concat(ENTRIES), MIX);
for (const name of NAMES) t({ name, outs: OUTS[name] || [] });
for (const entry of ENTRIES) t({ entry, outs: entry === 0xE253 ? ['de'] : [] });

const L = labels();
const at = name => entries(L.byName.get(name).a, L.byName.get(name).bank, MIX);
// a bank-3 byte, in the bank and in the 64K while bank 3 is paged in
const put = (c, a, v) => { c.M[a] = v; if (a >= 0xC000) c.banks[3][a - 0xC000] = v; };
// need bytes near where the limits make them complain or rest
const near = (c, rnd, t) => {
  for (const k of [1, 2, 3, 6]) {
    const lim = c.banks[3][0xD5E3 + t * 8 + k - 0xC000];
    const v = [0, 1, 2, (lim + 0x21) & 255, (lim + 0x11) & 255, (lim - 1) & 255, (lim - 3) & 255, (lim - 0x21) & 255, rnd(256)][rnd(9)];
    put(c, 0xD5C3 + t * 8 + k, v);
  }
};
// every pass of the needs, with each of the party in any state and action
t({ name: 'needs_pass', cases0: at('needs_pass'), cases: 400, setup: (c, rnd) => {
  c.M[0x8D1C] &= 0xE0;
  for (let a = 0x8300; a < 0x8400; a += 0x20) {
    if (c.M[a] >= 4) continue;
    near(c, rnd, c.M[a]);
    c.M[a + 1] = [0, 1, 2, 8, 0x48][rnd(5)];
    c.M[a + 0x0C] = [0, 0x0A, 1, 0x82][rnd(4)];
    c.M[a + 0x0D] = rnd(16);
  }
} });
// the check of each of the party, and the runners
const checks = at('needs_check');
t({ name: 'needs_check', cases0: checks, cases: 400, setup: (c, rnd) => {
  const a = c.regs.h << 8 | c.regs.l;
  if (c.M[a] < 4) near(c, rnd, c.M[a]);
  else if (rnd(2)) c.M[a] = 0x27 + rnd(7);
  c.M[a + 1] = rnd(3);
  c.M[a + 0x0C] = rnd(2) ? rnd(5) : 0x80 | rnd(5);
  c.M[a + 0x0D] = rnd(16);
  c.M[0x8D1C] = rnd(256);
} });
t({ name: 'thirst_starve', cases0: at('needs_pass'), cases: 200, setup: (c, rnd) => {
  c.M[0x8D1C] &= 0xE0;
  for (const a of [0xD5C4, 0xD5C5, 0xD5C6]) put(c, a, rnd(2) ? rnd(4) : rnd(256));
} });
// every message from every speaker, with any of the characters named in it
const shown = at('next_message');
t({ name: 'next_message', cases0: shown, cases: 600, setup: (c, rnd) => {
  c.M[0x8D25] = 0;
  c.M[0x8D28] = rnd(37); c.M[0x8D29] = rnd(3) ? rnd(4) : rnd(8);
  c.M[0x8D39] = 0x2A + 2 * rnd(3); c.M[0x8D3A] = 0x8D;
  c.M[0x8D0C] = rnd(4); c.M[0x8D0A] = rnd(4);
  // only the party have exclamations ($F8): another speaker's runs on through memory
  let a = c.M[0x7B7D + 2 * c.M[0x8D28]] | c.M[0x7B7E + 2 * c.M[0x8D28]] << 8;
  while (c.M[a] !== 0xFF) if (c.M[a++] === 0xF8 && c.M[0x8D29] >= 4) return false;
} });
// the nearest point from places all over the world
t({ entry: 0xE253, cases0: at('leave_party').concat(shown).slice(0, 50), cases: 300, outs: ['de'], setup: (c, rnd) => {
  c.regs.a = rnd(16);
  const a = 0x8D4D + rnd(0x100);
  c.regs.h = a >> 8; c.regs.l = a & 255;
} });
process.exitCode = f ? 1 : 0;
