'use strict';
// Navigation alone against the game's (check.js), on the moments of the chart (gen-states.js's
// nav set): the clock, the chart's window and drawing with the map's entries moved and shuffled,
// the course and the autopilot's steps, the encounters, QUERY's lists, and Navigation Control
// whole, chosen through the keyboard buffer (no interrupt runs in a check, so the keys are there
// from the start, and the stick is left alone).
const { check } = require('./check.js');
let f = 0;
// node t-nav.js [names]: those checks only
const ONLY = process.argv.slice(2);
const t = o => {
  if (ONLY.length && !ONLY.includes(o.name)) return;
  f += check(Object.assign({ cases: 600, outs: ['a', 'x', 'y'], moments: 'nav' }, o)).fails ? 1 : 0;
};
const pick = (rnd, a) => a[rnd(a.length)];
const KEY = { RETURN: 0x0D, SPACE: 0x20, W: 0x57, A: 0x41, D: 0x44, X: 0x58, Q: 0x51, E: 0x45, Z: 0x5A, C: 0x43 };
const DIRS = ['W', 'A', 'D', 'X', 'Q', 'E', 'Z', 'C'];
// keys waiting in the buffer, and the stick still
const keys = (M, c, list) => {
  M[0x03] = list.length;
  list.forEach((k, i) => { M[0x05 + i] = KEY[k]; });
  c.game.joy = 0x1F;
};
const near = (rnd, v) => (v + rnd(5) - 2) & 31;
// the cursor about the chart, now and then at its edges
const cursor = (M, rnd) => {
  M[0xC6] = pick(rnd, [rnd(32), rnd(32), 0, 31, near(rnd, M[0x5510])]);
  M[0xC7] = pick(rnd, [rnd(32), rnd(32), 0, 31, near(rnd, M[0x5530])]);
};
// the map's entries moved about, given tiles, headings, kinds of motion (1-4: the game has no
// routine for 5-7) and types, some taken off the map
const entries = (M, rnd) => {
  for (let e = 0; e < 32; e++) {
    if (rnd(3)) continue;
    if (rnd(6) === 0) { M[0x5510 + e] = M[0x5530 + e] = 0xFF; continue; }
    M[0x5510 + e] = rnd(4) ? near(rnd, M[0xC6]) : rnd(32);
    M[0x5530 + e] = rnd(4) ? near(rnd, M[0xC7]) : rnd(32);
    M[0x5550 + e] = rnd(5) | (rnd(4) << 3) | (rnd(3) ? 0 : 0x20);
    M[0x5570 + e] = pick(rnd, [rnd(0x80), 0x6C + rnd(4), 0x0C, 0x72, 0xFF]);
    M[0x5590 + e] = pick(rnd, [rnd(0x14), 0x64, 0x13, 0xFF, 0]);
    if (rnd(2)) { M[0x55D0 + 2 * e] = rnd(256); M[0x55D1 + 2 * e] = pick(rnd, [0xFF, 0xCF]); }
  }
};
// a destination near the ship, or none
const dest = (M, rnd) => {
  if (rnd(5) === 0) { M[0x072C] = 0xFF; return; }
  M[0x072C] = pick(rnd, [near(rnd, M[0x5510]), rnd(32)]);
  M[0x072D] = pick(rnd, [near(rnd, M[0x5530]), rnd(32)]);
};
const clock = (M, rnd) => {
  M[0x0720] = pick(rnd, [rnd(24), 23, 22]);
  M[0x0722] = pick(rnd, [1 + rnd(12), 12, 2, rnd(16)]);
  M[0x0721] = pick(rnd, [1 + rnd(31), M[0x20AF + (M[0x0722] & 15)], 31]);
  M[0x0723] = pick(rnd, [rnd(100), 99]);
  M[0x0724] = rnd(256); M[0x0725] = rnd(4);
};
// the system's encounter weights and the player's rank
const odds = (M, rnd) => {
  M[0x077C] = pick(rnd, [rnd(256), rnd(40), 0, 0xFF]);
  for (let k = 0; k < 5; k++) M[0x077D + k] = rnd(3) ? rnd(40) : 0;
  M[0x0C79] = rnd(16);
  M[0x073D] = rnd(3) ? 0 : 1;
};
const hold = (M, rnd) => {
  M[0x0777] = 1 + rnd(8);
  for (let k = 0; k < 8; k++) M[0x0767 + k] = rnd(3) ? rnd(0x14) : 0xFF;
};
// the course plotted as plot_course leaves it, or any list
const course = (M, rnd) => {
  for (let k = 0; k < 0x40; k++) M[0xFC00 + k] = 0xFF;
  const n = rnd(12);
  let x = M[0xC6], y = M[0xC7];
  for (let k = 0; k < n; k++) { x = near(rnd, x); y = near(rnd, y); M[0xFC00 + k] = x; M[0xFC20 + k] = y; }
};

// ---- the clock
t({ name: 'advance_clock', setup: (M, c, rnd) => { clock(M, rnd); return { a: pick(rnd, [0, 1, 5, 7, 14, 28, rnd(256)]) }; } });
t({ name: 'next_day', setup: (M, c, rnd) => { clock(M, rnd); } });
t({ name: 'print_date', setup: (M, c, rnd) => { clock(M, rnd); M[0x4F] = 0x1C; M[0x50] = 0x2F; } });
t({ name: 'print_time', setup: (M, c, rnd) => { clock(M, rnd); M[0x4F] = 0x1C; M[0x50] = 0x38; } });

// ---- the chart's window
t({ name: 'in_chart_window', setup: (M, c, rnd) => { M[0x51] = rnd(32); M[0x53] = rnd(32); return { x: pick(rnd, [rnd(32), rnd(256)]), y: pick(rnd, [rnd(32), rnd(256)]) }; }, outs: ['a', 'x', 'y', 'c'] });
t({ name: 'chart_cell_index', setup: (M, c, rnd) => ({ x: (rnd(11) - 5) & 255, y: (rnd(9) - 4) & 255 }) });
t({ name: 'sector_kind', setup: (M, c, rnd) => ({ x: pick(rnd, [rnd(32), rnd(256)]), y: pick(rnd, [rnd(32), rnd(256)]) }) });
t({ name: 'sector_entries', setup: (M, c, rnd) => { cursor(M, rnd); entries(M, rnd); return { x: M[0xC6], y: M[0xC7] }; } });
t({ name: 'fill_chart_window', setup: (M, c, rnd) => ({ a: pick(rnd, [5, 0x2C, rnd(256)]), x: pick(rnd, [rnd(32), 0, 31, rnd(256)]), y: pick(rnd, [rnd(32), 0, 31, rnd(256)]) }) });
t({ name: 'draw_map_objects', setup: (M, c, rnd) => { cursor(M, rnd); entries(M, rnd); M[0x5E] = rnd(256); return { x: M[0xC6], y: M[0xC7] }; } });
t({ name: 'animate_chart', setup: (M, c, rnd) => { M[0x5E] = rnd(256); for (let k = 0; k < 99; k++) if (rnd(4) === 0) M[0xFA00 + k] = rnd(256); } });
t({ name: 'plot_course', setup: (M, c, rnd) => { dest(M, rnd); if (rnd(4) === 0) { M[0x5510] = rnd(256); M[0x5530] = rnd(256); } } });
t({ name: 'draw_course', setup: (M, c, rnd) => { cursor(M, rnd); course(M, rnd); for (let k = 0; k < 99; k++) if (rnd(3) === 0) M[0xFA00 + k] = 0x7D; } });
const chartAt = (M, rnd) => {
  M[0x0D30] = pick(rnd, [3, rnd(19)]); M[0x0D31] = pick(rnd, [0xB7, 0x90 + rnd(0x37)]);
  M[0x0D32] = pick(rnd, [0, rnd(16)]); M[0x0D2F] = pick(rnd, [0, 1, 0xFF]);
};
t({ name: 'draw_chart', cases: 300, setup: (M, c, rnd) => { chartAt(M, rnd); for (let k = 0; k < 99; k++) if (rnd(4) === 0) M[0xFA00 + k] = rnd(256); } });
t({ name: 'draw_brackets', setup: (M, c, rnd) => { chartAt(M, rnd); } });
t({ name: 'move_cursor', setup: (M, c, rnd) => { cursor(M, rnd); return { x: pick(rnd, [0, 1, 0xFF]), y: pick(rnd, [0, 1, 0xFF]), c: 0 }; }, outs: ['a', 'x', 'y', 'c'] });
t({ name: 'set_ship_heading', setup: (M, c, rnd) => ({ a: rnd(32), x: pick(rnd, [0, 1, 0xFF]), y: pick(rnd, [0, 1, 0xFF]) }) });
t({ name: 'nav_menu_colour', setup: (M, c, rnd) => ({ x: pick(rnd, [0, 1, 2, 0x80, rnd(256)]) }) });
t({ name: 'clear_view', cases: 100, outs: ['y'] });
t({ name: 'fill_window', cases: 200, setup: (M, c, rnd) => {
  M[0x41] = 1 + rnd(0x9F); M[0x42] = rnd(0xC7);
  M[0x0D02] = 0; M[0x3A] = rnd(2) ? 0x80 : 0;
}, outs: ['y'] });

// ---- the map's entries and the system's map
t({ name: 'move_map_objects', setup: (M, c, rnd) => { cursor(M, rnd); entries(M, rnd); } });
t({ name: 'place_orbiting_objects', setup: (M, c, rnd) => { cursor(M, rnd); entries(M, rnd); M[0x5610] = rnd(256); M[0x5611] = rnd(256); } });
t({ name: 'motion_wander', setup: (M, c, rnd) => { entries(M, rnd); M[0x9E] = rnd(32); } });
t({ name: 'motion_small_orbit', setup: (M, c, rnd) => { entries(M, rnd); M[0x5610] = rnd(256); M[0x0724] = rnd(256); return { x: rnd(32) }; } });
t({ name: 'motion_large_orbit', setup: (M, c, rnd) => { entries(M, rnd); M[0x5611] = rnd(256); M[0x0724] = rnd(256); return { x: rnd(32) }; } });
t({ name: 'load_system_map', cases: 60, setup: (M, c, rnd) => { M[0x071D] = pick(rnd, [0, 1, 2, 3, 4, 5, 6, 7, 9]); M[0x0724] = rnd(256); } });
t({ name: 'load_nav_tiles', cases: 20 });

// ---- HELM's steps
t({ name: 'step_hours', setup: (M, c, rnd) => { M[0x0409] = rnd(8); return { a: pick(rnd, [0, 1, 0xFF]), x: rnd(32), y: rnd(32) }; } });
t({ name: 'daily_repair', setup: (M, c, rnd) => { M[0x0740] = rnd(2); M[0x0409] = rnd(64); } });
t({ name: 'helm_hazard_check', setup: (M, c, rnd) => {
  cursor(M, rnd); entries(M, rnd); hold(M, rnd);
  M[0x5510] = M[0xC6]; M[0x5530] = M[0xC7];
  return { a: pick(rnd, [5, 7, 10, 14, 20, 28, rnd(256)]) };
} });
t({ name: 'encounter_roll', setup: (M, c, rnd) => { odds(M, rnd); return { a: pick(rnd, [5, 7, 10, 14, 20, 28, rnd(256)]) }; } });
t({ name: 'encounter_hostile', setup: (M, c, rnd) => {
  odds(M, rnd);
  for (let k = 0; k < 3; k++) { M[0x0D04 + k] = rnd(3) ? rnd(13) : 0xFF; M[0x97 + k] = rnd(4) ? rnd(6) : 0xFF; }
  M[0x072E + rnd(6)] = pick(rnd, [0, 1, 2, 0xFE, 0xFF]);
} });
t({ name: 'cargo_remove', setup: (M, c, rnd) => { hold(M, rnd); return { a: rnd(0x16) }; }, outs: ['a', 'x', 'y', 'z'] });

// ---- QUERY's lists, into the buffer at $FA00
const buffer = (M, rnd) => {
  M[0x78] = 0; M[0x79] = 0xFA; M[0xFA00] = 0;
  const n = rnd(4);
  for (let k = 0; k < n; k++) M[0xFA00 + k] = 0x41 + rnd(26);
  if (n && rnd(2)) { M[0xFA00 + n] = 0x2C; M[0xFA01 + n] = 0x20; M[0xFA02 + n] = 0; } else M[0xFA00 + n] = 0;
  M[0xA8] = rnd(3);
};
t({ name: 'query_end_list', setup: (M, c, rnd) => { buffer(M, rnd); } });
t({ name: 'query_name', setup: (M, c, rnd) => { buffer(M, rnd); return { a: pick(rnd, [rnd(0x14), 0x64]) }; } });

// ---- the routines that wait, with what they wait for in the buffer
t({ name: 'nav_cursor_info', setup: (M, c, rnd) => { cursor(M, rnd); entries(M, rnd); } });
t({ name: 'draw_chart_cursor', cases: 300, setup: (M, c, rnd) => {
  cursor(M, rnd); entries(M, rnd); course(M, rnd);
  c.game.joy = rnd(4) ? 0x1F : 0x0F;
}, maxSteps: 2e7 });
t({ name: 'helm_encounter', cases: 200, setup: (M, c, rnd) => {
  odds(M, rnd); M[0xA8] = pick(rnd, [5, 7, 14, 28]); M[0xAB] = 0;
  keys(M, c, rnd(3) ? [] : ['SPACE']);
  if (rnd(4) === 0) c.game.joy = 0x0F;
}, maxSteps: 2e7 });
t({ name: 'helm_step_time', cases: 120, setup: (M, c, rnd) => {
  cursor(M, rnd); entries(M, rnd); clock(M, rnd); odds(M, rnd); hold(M, rnd); course(M, rnd);
  M[0x0409] = rnd(2) ? 0 : rnd(8); M[0x0740] = rnd(2);
  keys(M, c, rnd(3) ? [] : ['SPACE']);
  return { a: rnd(2), x: M[0xC6], y: M[0xC7] };
}, maxSteps: 2e8 });
t({ name: 'nav_helm', cases: 60, setup: (M, c, rnd) => {
  entries(M, rnd); clock(M, rnd); odds(M, rnd); hold(M, rnd);
  M[0x072C] = near(rnd, M[0x5510]); M[0x072D] = near(rnd, M[0x5530]);
  P_plot(M);
  keys(M, c, rnd(4) ? [] : ['SPACE']);
}, maxSteps: 4e8 });
// plot_course as the game does it, so that HELM has a course to fly
function P_plot(M) {
  for (let y = 0x1F; y >= 0; y--) M[0xFC00 + y] = 0xFF;
  let x = M[0x5510], y = M[0x5530];
  for (let k = 0; k < 0x20; k++) {
    const dx = M[0x072C] === x ? 0 : M[0x072C] > x ? 1 : -1, dy = M[0x072D] === y ? 0 : M[0x072D] > y ? 1 : -1;
    if (!dx && !dy) break;
    x += dx; y += dy; M[0xFC00 + k] = x; M[0xFC20 + k] = y;
  }
}
t({ name: 'nav_scan', cases: 120, setup: (M, c, rnd) => {
  entries(M, rnd);
  const list = [];
  for (let i = 0, n = rnd(6); i < n; i++) list.push(pick(rnd, DIRS));
  keys(M, c, list.concat([pick(rnd, ['RETURN', 'SPACE'])]));
}, maxSteps: 1e8 });
t({ name: 'nav_chart', cases: 120, setup: (M, c, rnd) => {
  entries(M, rnd);
  const list = [];
  for (let i = 0, n = rnd(6); i < n; i++) list.push(pick(rnd, DIRS));
  keys(M, c, list.concat([pick(rnd, ['RETURN', 'SPACE'])]));
}, maxSteps: 1e8 });
// QUERY, with the wait for a key at its end an RTS in the game and a return in the port
t({ name: 'nav_query', cases: 200, setup: (M, c, rnd) => {
  cursor(M, rnd); entries(M, rnd);
  M[0xC8] = rnd(2);
  for (let k = 0; k < 3; k++) M[0x0D04 + k] = rnd(2) ? rnd(13) : 0xFF;
  if (rnd(2)) { M[0x5510] = M[0xC6]; M[0x5530] = M[0xC7]; }
  M[0xA431] = 0x60;
}, onPort: P => { P.wait_key = function* (r) { return r; }; }, maxSteps: 1e8 });
// Navigation Control whole: straight to COCKPIT, or first a course on the chart, or a scan, or a
// course and a HELM step (stopped by the Space waiting, in a system with no encounters), which
// COCKPIT then sets up as the ship's sector
const COCKPIT = ['X', 'X', 'X', 'X', 'X', 'RETURN'];
t({ name: 'navigation', cases: 80, setup: (M, c, rnd) => {
  const list = [];
  const way = rnd(4);
  if (way === 1) list.push('RETURN');
  if (way === 2) list.push('X', 'X', 'X', 'X', 'RETURN');
  if (way === 1 || way === 2) { for (let i = 0, n = rnd(4); i < n; i++) list.push(pick(rnd, DIRS)); list.push('RETURN'); }
  if (way === 3) {
    list.push('RETURN', pick(rnd, DIRS), 'RETURN', 'X', 'RETURN', 'SPACE');
    M[0x077C] = 0; for (let k = 0; k < 5; k++) M[0x5612 + k] = 0;
  }
  keys(M, c, list.concat(COCKPIT));
}, maxSteps: 4e8 });

process.exitCode = f ? 1 : 0;
