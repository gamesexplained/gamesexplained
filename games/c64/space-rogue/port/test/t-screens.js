'use strict';
// The title's, the intro's and the ending's routines alone against the game's (check.js), each
// in its own program on its own moments (the -00 of each is the program's start, before its files
// are in, and left out). The library's routines are checked in each program, as each carries its
// own copy at its own addresses. The routines that wait for a key (wait_key, pause, play_effect,
// get_key_cursor and their callers) and the two that take their argument from the stack
// (load_inline, print_inline) are the lockstep's (test/lockstep.js, with o.program).
const { check } = require('./check.js');
const { labels } = require('./standin.js');
let f = 0;
// node t-screens.js [names]: those checks only, in every program that has them
const ONLY = process.argv.slice(2);
const pick = (rnd, a) => a[rnd(a.length)];
const KEYS = ['A', 'N', 'O', 'W', 'Z', '1', '3', 'SPACE', 'RETURN', 'LSHIFT', 'RSHIFT', 'CTRL', 'DEL', 'LEFT'];
const w16 = (M, a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
for (const program of ['title', 'intro', 'ending']) {
  // a library routine the program's copy leaves out (the title has no wipes) is not checked there;
  // the title's show_4000 and show_drawn are entries inside show_c000's BIT instructions, with no
  // label of their own in its listing
  const has = labels([program]), copies = { title: 0, intro: 0x47B4, ending: 0x47BF }[program];
  const inside = { show_4000: 0x2861, show_drawn: 0x2864 };
  console.log('-- ' + program);
  const t = o => {
    const entry = has.has(o.name) ? has.get(o.name) : inside[o.name] !== undefined ? inside[o.name] + copies : undefined;
    if ((ONLY.length && !ONLY.includes(o.name)) || entry === undefined) return;
    f += check(Object.assign({ entry, cases: 40, outs: ['a', 'x', 'y'], maxSteps: 4e7, program, parts: [program], moments: program,
      states: st => !/-00\.json$/.test(st.name) }, o)).fails ? 1 : 0;
  };
  const both = program !== 'title';
  // the loader's run of the library, where the keyboard's state is, from the title's addresses
  const o = { title: 0, intro: 0x47F6, ending: 0x4801 }[program];
  // the cursor somewhere in a window, in either buffer
  const cursor = (M, rnd) => {
    M[0x22] = rnd(20); M[0x23] = M[0x22] + rnd(40 - M[0x22]);
    M[0x21] = M[0x22] + rnd(M[0x23] - M[0x22] + 2); M[0x20] = rnd(25); M[0x1E] = pick(rnd, [0x40, 0xC0]);
  };
  // rows x to y (1-24) of a window, and its right edge
  const rows = (M, rnd) => { const x = 1 + rnd(20), y = x + rnd(25 - x); M[0x23] = 0x10 + rnd(0x17); M[0x22] = rnd(4); M[0x1E] = pick(rnd, [0x40, 0xC0]); return { x, y }; };
  const pictures = { title: [0x30, 0xAC, 0xB7], intro: [0xB7, 0x84, 0x92, 0xA1], ending: [0x84, 0x92, 0xA1] }[program];

  // ---- the library
  t({ name: 'print_char', cases: 300, setup: (M, c, rnd) => { cursor(M, rnd); return { a: pick(rnd, [0x0D, 0x08, 0x7F, 0x8D, 0x20 + rnd(0x60), 0xA0 + rnd(0x5F)]) }; } });
  t({ name: 'new_line', cases: 100, setup: (M, c, rnd) => { cursor(M, rnd); if (rnd(2)) M[0x20] = 0x18; } });
  t({ name: 'rub_out', cases: 100, setup: (M, c, rnd) => { cursor(M, rnd); } });
  t({ name: 'unpack_picture', cases: 30, setup: (M, c, rnd) => { M[0x1E] = pick(rnd, [0x40, 0xC0]); return { a: pick(rnd, pictures) }; } });
  for (const name of ['colours_to_ram', 'copy_shown', 'copy_shown_colours', 'copy_4000_to_c000', 'copy_c000_to_4000', 'white_colours',
    'build_line_table', 'bitmap_mode', 'show_drawn', 'show_drawn_colours', 'show_4000_colours', 'clear_drawing', 'clear_4000']) {
    t({ name, cases: 12, setup: (M, c, rnd) => { M[0x1E] = pick(rnd, [0x40, 0xC0]); M[0x3A] = pick(rnd, [0x40, 0xC0]); } });
  }
  t({ name: 'column_offset_of', cases: 200, outs: ['a', 'c'], setup: (M, c, rnd) => ({ a: rnd(256) }) });
  t({ name: 'row_address', cases: 200, outs: ['a', 'x', 'y', 'c'], setup: (M, c, rnd) => { M[0x1E] = pick(rnd, [0x40, 0xC0]); return { a: rnd(256) }; } });
  t({ name: 'put_matrix_block', cases: 100, setup: (M, c, rnd) => {
    w16(M, 0x10, 0x8000 + rnd(0x2000)); M[0x14] = 1 + rnd(40); M[0x15] = 1 + rnd(25); M[0x66] = M[0x14] + rnd(10); M[0x1E] = pick(rnd, [0x40, 0xC0, 0]);
    return { x: rnd(40), y: rnd(25) };
  } });
  t({ name: 'dissolve_in', cases: 6, setup: (M, c, rnd) => { M[0x3A] = pick(rnd, [0x40, 0xC0]); } });
  t({ name: 'dissolve_out', cases: 6, setup: (M, c, rnd) => { M[0x3A] = pick(rnd, [0x40, 0xC0]); } });
  if (both) {
    for (const name of ['wipe_left', 'wipe_right', 'scroll_up', 'scroll_down']) t({ name, cases: 25, setup: (M, c, rnd) => rows(M, rnd) });
    t({ name: 'clear_line', cases: 100, setup: (M, c, rnd) => { M[0x22] = rnd(10); M[0x23] = 0x10 + rnd(0x17); M[0x1E] = pick(rnd, [0x40, 0xC0]); return { x: rnd(25) }; } });
  }
  // the interrupt's routines, with the I/O in as the interrupt has it; irq_body itself ends in an
  // RTI, and the lockstep runs it at every interrupt. The interrupt puts back the registers
  // sound_frame leaves.
  t({ name: 'sound_init', cases: 20, port: 0x36 });
  t({ name: 'start_effect', cases: 100, port: 0x36, setup: (M, c, rnd) => ({ a: rnd(5) }) });
  t({ name: 'sound_frame', cases: 300, port: 0x36, outs: [], setup: (M, c, rnd) => {
    if (rnd(2)) { M[0x8B] = rnd(8); M[0x8C] = rnd(2) ? 0 : 0x80; }
    M[0x71] = rnd(2) ? 0 : rnd(256); M[0x76] = rnd(256); w16(M, 0x72, rnd(0x4000)); w16(M, 0x74, rnd(0x4000));
  } });
  t({ name: 'scan_keys', cases: 300, outs: ['a', 'x', 'y', 'c'], port: 0x36, setup: (M, c, rnd) => {
    c.game.keys = new Set(rnd(4) ? [pick(rnd, KEYS)].concat(rnd(3) ? [] : [pick(rnd, KEYS)]) : []);
    M[0x2333 + o] = rnd(4) ? rnd(64) : 0xFF; M[0x2334 + o] = rnd(0x1F); M[0x2335 + o] = 1 + rnd(6);
  } });

  // ---- the title's own
  if (program === 'title') {
    // the scenery, the legs, the ship and the dust at lines a little above the screen to below it
    const places = (M, rnd) => { for (let a = 0x40; a < 0x4C; a += 2) w16(M, a, (pick(rnd, [-60, -8, 0, 40, 120, 190, 230]) + rnd(16)) & 0xFFFF); M[0x4C] = rnd(8); };
    for (const name of ['frame_still', 'frame_dust', 'frame_logo', 'draw_scenery', 'draw_legs', 'draw_ship', 'draw_dust_small', 'draw_dust_big']) {
      t({ name, cases: 20, setup: (M, c, rnd) => { places(M, rnd); M[0x1E] = pick(rnd, [0x40, 0xC0]); } });
    }
    t({ name: 'key_waiting', cases: 50, outs: ['a', 'z'], setup: (M, c, rnd) => { M[0x3C] = rnd(2) ? 0xFF : rnd(128); } });
  }

  // ---- the intro's own
  if (program === 'intro') {
    // the question is (frame count AND 31) + 1: past the 32nd record the walk can meet a page with no
    // zero, where the game's Y goes round for ever
    t({ name: 'find_question', cases: 100, setup: (M, c, rnd) => ({ a: 1 + rnd(32) }) });
    t({ name: 'print_number', cases: 200, setup: (M, c, rnd) => { cursor(M, rnd); return { a: rnd(2) ? rnd(100) : rnd(256) }; } });
    t({ name: 'print_ordinal', cases: 100, setup: (M, c, rnd) => { cursor(M, rnd); return { a: 1 + rnd(10) }; } });
    t({ name: 'print_text', cases: 50, setup: (M, c, rnd) => { cursor(M, rnd); w16(M, 0x27, pick(rnd, [0x7687, 0x768D, 0x78F0, 0x7937, 0x79AA])); } });
    t({ name: 'divide', cases: 300, outs: ['a', 'y'], setup: (M, c, rnd) => ({ a: rnd(256), x: rnd(2) }) });
    t({ name: 'put_digit', cases: 50, setup: (M, c, rnd) => { w16(M, 0x27, 0x7585 + rnd(2)); return { a: rnd(10) }; } });
    t({ name: 'line_key', cases: 300, setup: (M, c, rnd) => {
      cursor(M, rnd); M[0x29] = pick(rnd, [0x0B, 0x10]); M[0x24] = rnd(M[0x29] + 1);
      return { a: pick(rnd, [0x08, 0x7F, 0x20 + rnd(0x5F)]) };
    } });
  }
}
process.exitCode = f ? 1 : 0;
