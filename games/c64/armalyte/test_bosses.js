#!/usr/bin/env node
// The boss viewer's fight (createBossFight, bosses.html) against the engine's own boss routines on
// the committed listings in the kit's 6502. For each of the fourteen bosses, boss_start ($AC95)
// fills the objects on both sides from the level's table; then each frame the simulator runs the
// main loop's share in its order, shots_offscreen ($A7E2), boss_spawn ($AD89), objects_init_new
// ($E3AA), shots_hit_scenery ($A8DB), enemies_space_out ($AA64, not in the end sequence),
// objects_timers ($A845), choose_target ($A79E), enemies_fire ($A664), then enemies_follow_paths
// ($EE8D) on one frame and objects_animate ($F022) with p1_collect_pod ($9A94) or p2_collect_pod
// ($9B92) on the next, objects_window ($E474) while the scroll is stopped, and the next frame's
// objects_move ($F64F) and objects_sort ($F4C8); the port runs step(). Every object's twenty
// table bytes, its y and the sorted list must then be the same, with the shot count, guards,
// spawn counters, target and the end sequence's count. Four runs a boss: with no scenery; with
// scenery for the shots to hit (solid rows at the top and bottom, and scattered cells); with the
// scroll still moving for its first 199 frames, as the bosses at a map's end start; and with the
// time running out (level_end, $AC20, called where the script calls it, after boss_spawn), on to
// the end sequence ($AE62) at the map's end or the bursts' end elsewhere. The two ships stay
// where a level starts them.
//   node games/c64/armalyte/test_bosses.js [frames]   (default 3000 a run)
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = C64Cpu;
const { createBossFight } = g.run('bosses.html', 'createBossFight');
const E = g.listing('parts/engine/listing.json').ram;
const FRAMES = +process.argv[2] || 3000;
const hex = (v, n) => '$' + v.toString(16).toUpperCase().padStart(n || 2, '0');
const T = [['x', 0xFD00], ['col', 0xFD14], ['frame', 0xFD28], ['xhi', 0xFD3C], ['st', 0xFD50], ['yh', 0xFD64], ['ys', 0xFD78],
           ['xs', 0xFD8C], ['dly', 0xFDA0], ['type', 0xFDB4], ['path', 0xFDC8], ['first', 0xFE90], ['last', 0xFEA4],
           ['fdel', 0xFEB8], ['fdelr', 0xFECC], ['hp', 0xFEE0], ['pp', 0xFEF4], ['dir', 0xFF08], ['nw', 0xFF1C],
           ['xh', 0xFF58], ['anim', 0xFF6C], ['fire', 0xFF80], ['mode', 0xFF94], ['grp', 0xFFD0], ['y', 0xD8], ['sorted', 0xEC]];
const FLAGS = new Set(['fire', 'anim', 'xh', 'yh', 'dir', 'pp', 'nw']);   // only zero or not is used
const S = [['g6B', 0x6B], ['g86', 0x86], ['g97', 0x97], ['g98', 0x98], ['g7A', 0x7A], ['f68', 0x68], ['gAD', 0xAD]];
const SHIPS = [{ x: 0x54, y: 0x74 }, { x: 0x54, y: 0x8C }];
let bad = 0;

function run(level, which, opts) {
  const L = g.listing('parts/level-' + level + '/listing.json').ram;
  const m = E.slice();
  for (const [a, b] of [[0x0200, 0x7000], [0x9700, 0x9900], [0xD000, 0xD700]]) m.set(L.slice(a, b), a);
  m.fill(0, 0, 0x100); m.fill(0xFF, 0x100, 0x200); m.fill(0, 0xFD00, 0xFFF8);
  const screen = new Uint8Array(1000);
  for (let i = 0; i < 1000; i++) {
    const row = i / 40 | 0, col = i % 40;
    screen[i] = opts.scenery && (row < 3 || row > 21 || (row * 7 + col * 13) % 11 === 0) ? 0x40 + (i & 0x3F) : 0x20;
  }
  m.set(screen, 0x7000); m.set(screen, 0x7400);
  for (let p = 0; p < 0x50; p++) { const a = 0x052C + 0x30 * p; m[0x8500 + p] = a & 255; m[0x8550 + p] = a >> 8; }   // paths_table_build ($EF37)
  m[0x01] = 0x35;
  m[0x02] = SHIPS[0].x; m[0x04] = SHIPS[0].y; m[0x03] = SHIPS[1].x; m[0x05] = SHIPS[1].y;
  m[0xB00D] = 3; m[0xB00E] = 4; m[0x56] = 0xFF;                         // player 1 in play, the drone beside it
  m[0x6A] = opts.speed; m[0x52] = opts.glide ? 0 : 1; m[0x68] = opts.f68 || 0; m[0x6D] = which;
  m[0x21] = which === 1 ? 0 : 1;                                        // the map's end, or not
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: { read() { return 0; }, write() {} } });
  const call = a => cpu.call(a, { sp: 0x14 });
  call(0xF489); call(0xEF67); call(0xEFBF);              // the row and column tables
  call(0xAC95);                                          // boss_start
  call(0xF64F); call(0xF4C8);
  const port = createBossFight(L, which, { speed: opts.speed, stopped: !opts.glide, f68: opts.f68 || 0, screen: opts.scenery ? screen : null });
  port.begin();
  const label = 'level ' + level + (which === 1 ? ' end' : ' mid') + ', ' + opts.name;
  let diffs = 0, f = 0, burst = 0;
  const cmp = (name, a, b) => { if (a !== b && diffs++ < 4) console.log('FAIL ' + label + ', frame ' + f + ': ' + name + ' engine ' + hex(a) + ' port ' + hex(b)); };
  const end = opts.end || -1, last = opts.end ? opts.end + 160 : FRAMES;
  for (; f < last && !diffs && m[0xAD] !== 1; f++) {
    if (f === opts.glide) { m[0x52] = 1; port.g52 = 1; }
    if (m[0xAD]) call(0xAE62);
    call(0xA7E2); call(0xAD89);
    if (f === end) { call(0xAC20); if (which === 2) m[0x52] = 0; }
    call(0xE3AA); call(0xA8DB);
    if (!m[0xAD]) call(0xAA64);
    call(0xA845); call(0xA79E); call(0xA664);
    if (!m[0x68]) call(0xEE8D); else { call(0xF022); m[0x76] ^= 1; call(m[0x76] ? 0x9906 : 0x9909); }
    if (m[0x52]) call(0xE474);
    m[0x68] ^= 1; call(0xF64F); call(0xF4C8);
    port.step(f === end ? which === 1 : undefined);
    if (port.st[16] === 2 && port.type[16] === 2) burst = 1;
    for (const [n, a] of T) for (let i = 0; i < 20; i++) {
      const pv = port[n][i], sv = m[a + i];
      cmp(n + '[' + i + ']', FLAGS.has(n) ? +!!sv : sv, FLAGS.has(n) ? +!!pv : pv);
    }
    for (let i = 0; i < 16; i++) { cmp('step timer[' + i + ']', m[0xFDDC + i], port.stp[i]); cmp('path place[' + i + ']', m[0xC4 + i], port.pos[i]); }
    for (const [n, a] of S) cmp(n, m[a], port[n]);
    cmp('$52', m[0x52], port.g52);
  }
  if (opts.end && which === 1 && !burst) { diffs++; console.log('FAIL ' + label + ': the core never broke up'); }
  if (opts.end && Array.from(port.st).some(v => v)) { diffs++; console.log('FAIL ' + label + ': objects still live at the end'); }
  console.log((diffs ? 'FAIL ' : 'ok   ') + label + ': ' + f + ' frames' + (diffs ? '' : ', every table the same'));
  bad += diffs ? 1 : 0;
}

const BOSSES = [[1, 2], [1, 1], [2, 2], [2, 1], [3, 2], [3, 1], [4, 2], [4, 1], [5, 1], [6, 2], [6, 1], [7, 1], [8, 2], [8, 1]];
for (const [lv, w] of BOSSES) {
  run(lv, w, { name: 'no scenery', speed: 2 });
  run(lv, w, { name: 'scenery', speed: 3, scenery: true, f68: 1 });
  run(lv, w, { name: 'scroll stopping at 199', speed: 4, scenery: true, glide: 199 });
  run(lv, w, { name: 'time up at ' + (900 + 37 * lv), speed: 5, scenery: true, end: 900 + 37 * lv });
}
console.log(bad ? bad + ' runs differ' : 'every run the same');
process.exit(bad ? 1 : 0);
