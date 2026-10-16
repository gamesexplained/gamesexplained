'use strict';
// The 3D view's routines alone against the game's (check.js): polygons, spans and 2D objects at
// random places in and around the window, points in front of and behind the viewer, and the
// draw list and camera on the moments as they are.
const { check } = require('./check.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 1500, outs: [] }, o)).fails ? 1 : 0; };
const w16 = (M, a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
const colours = (M, rnd) => {
  M[0x3D] = rnd(256); M[0x3E] = rnd(256); M[0x17] = [0xFF, 0x0F, 0xF0, rnd(256)][rnd(4)]; M[0x18] = rnd(3) ? 0 : rnd(256);
  M[0x3A] = rnd(2) ? 0x80 : 0;
};
// a coordinate mostly inside the window, sometimes just outside or far off
const coord = (rnd, size) => (rnd(6) ? rnd(size + 1) : rnd(2) ? size + 1 + rnd(40) : -1 - rnd(rnd(2) ? 40 : 3000)) & 0xFFFF;
const point2d = (M, rnd) => { w16(M, 0x51, coord(rnd, M[0x41])); w16(M, 0x53, coord(rnd, M[0x42])); };
const poly = (M, rnd) => {
  const n = rnd(10) ? 2 + rnd(7) : rnd(11);
  M[0x55] = n;
  for (let i = 0; i < Math.min(n, 8); i++) { w16(M, 0xFD00 + 4 * i, coord(rnd, M[0x41])); w16(M, 0xFD02 + 4 * i, coord(rnd, M[0x42])); }
};
// a log-form point for $FB00: x and y within a few doublings of z, z in front (negative) mostly
const num = (M, a, rnd, w, sign) => { M[a] = rnd(256); M[a + 1] = w & 255; M[a + 2] = sign; };
const point3d = (M, a, rnd) => {
  const z = 2 + rnd(10);
  num(M, a, rnd, z + rnd(7) - 4, rnd(2) ? 0xFF : 0);
  num(M, a + 3, rnd, z + rnd(7) - 4, rnd(2) ? 0xFF : 0);
  num(M, a + 6, rnd, z, rnd(4) ? 0xFF : 0);
};

t({ name: 'fill_polygon', setup: (M, c, rnd) => { colours(M, rnd); poly(M, rnd); } });
t({ name: 'span', setup: (M, c, rnd) => { colours(M, rnd); const a = rnd(M[0x41] + 1); M[0x45] = a; return { x: a + rnd(M[0x41] + 1 - a), y: rnd(M[0x42] + 1) }; } });
// a span's left end is never right of its right end (the callers' circles and fills)
t({ name: 'span_clipped', setup: (M, c, rnd) => {
  colours(M, rnd);
  let a = coord(rnd, M[0x41]) << 16 >> 16, b = coord(rnd, M[0x41]) << 16 >> 16;
  if (a > b) [a, b] = [b, a];
  w16(M, 0x47, a); w16(M, 0x49, b); w16(M, 0x4B, coord(rnd, M[0x42]));
} });
for (const name of ['draw_disc', 'draw_ring', 'draw_ragged', 'draw_burst', 'draw_annulus', 'draw_sparks', 'draw_flicker'])
  t({ name, cases: 600, setup: (M, c, rnd) => { colours(M, rnd); point2d(M, rnd); M[0x4D] = rnd(3) ? rnd(60) : rnd(256); M[0x99] = rnd(0x40); } });
t({ name: 'spray_triangles', cases: 600, setup: (M, c, rnd) => { colours(M, rnd); point2d(M, rnd); return { a: rnd(80), x: rnd(3), y: 1 + rnd(8) }; } });
t({ name: 'draw_bar', setup: (M, c, rnd) => { colours(M, rnd); const x = rnd(M[0x41]); return { x, a: rnd(M[0x41] - x + 1), y: rnd(M[0x42] - 8) }; } });
t({ name: 'set_window', setup: (M, c, rnd) => { M[0x41] = rnd(256); M[0x42] = rnd(200); return { a: rnd(2), x: rnd(256), y: rnd(200) }; } });
t({ name: 'window_full' }); t({ name: 'window_right' });
t({ name: 'set_projection', setup: (M, c, rnd) => { M[0x5F] = rnd(256); M[0x60] = (rnd(8) - 4) & 255; M[0x41] = 1 + rnd(255); M[0x42] = 1 + rnd(199); }, outs: ['a', 'x', 'y'] });
t({ name: 'log_hypot1', setup: (M, c, rnd) => { M[0x5F] = rnd(256); M[0x60] = rnd(256); }, outs: ['a', 'x', 'y'] });
t({ name: 'set_colour', setup: (M, c, rnd) => ({ x: rnd(256) }) });
t({ name: 'set_flash_colour', setup: (M, c, rnd) => { M[0x3A] = rnd(2) * 0x80; } });
t({ name: 'project', setup: (M, c, rnd) => { point3d(M, 0xC100, rnd); w16(M, 0x74, 0xC100); } });
t({ name: 'flip_buffers', cases: 200, setup: (M, c, rnd) => { M[0x3A] = rnd(2) * 0x80; } });
for (const name of ['view_clear_c000', 'view_clear_4000', 'tac_fill', 'tac_copy', 'copy_to_bank1'])
  t({ name, cases: 100, setup: (M, c, rnd) => { M[0x3B] = rnd(256); } });
// clipping a polygon of the model's points against the view's wedge
t({ name: 'draw_polygon', cases: 1500, setup: (M, c, rnd) => {
  colours(M, rnd);
  for (let i = 0; i < 0x1C; i++) point3d(M, 0xFB00 + 9 * i, rnd);
  const n = 3 + rnd(6), base = 0xC200;
  // a polygon list of one polygon at $C200: vertex counts, vertex numbers, normals, colours
  for (let i = 0; i < n; i++) M[0xC240 + i] = rnd(0x1C);
  M[0xC200] = n; M[0xC210] = 0; M[0xC220] = rnd(256); M[0xC230] = rnd(4) ? rnd(0x40) : 0xFF;
  w16(M, 0xB8, base); w16(M, 0xB6, 0xC240); w16(M, 0xB0, 0xC210); w16(M, 0xB2, 0xC230); w16(M, 0xB4, 0xC230);
  M[0xFA36] = rnd(256);
  for (let i = 0; i < 0x1C; i++) {
    // project the points in front, as place_points does
    const z = M[0xFB08 + 9 * i];
    if (z & 0x80) { for (let k = 0; k < 4; k++) M[0xFC20 + 4 * i + k] = rnd(256); }
  }
  return { y: 0 };
} });
t({ name: 'plane_side', setup: (M, c, rnd) => { for (let i = 0; i < 0x1C; i++) point3d(M, 0xFB00 + 9 * i, rnd); M[0x86] = rnd(256); M[0xFD40] = rnd(0x1C); return { y: 0 }; } });
t({ name: 'intersect_core', setup: (M, c, rnd) => { point3d(M, 0xC100, rnd); point3d(M, 0xC110, rnd); w16(M, 0x74, 0xC100); w16(M, 0x76, 0xC110); M[0x68] = 0; M[0x69] = 2; M[0x6A] = rnd(2) * 0xFF; }, outs: ['a'] });
// the draw list, the objects and the camera on the moments as they are, the camera moved
t({ name: 'build_draw_list', cases: 300, setup: (M, c, rnd) => { colours(M, rnd); for (let i = 0; i < 9; i++) if (rnd(2)) M[0x065D + i] = rnd(256); } });
t({ name: 'update_camera', cases: 600, setup: (M, c, rnd) => { M[0x0D3C] = rnd(3); for (let i = 0; i < 9; i++) M[0x668B + i] = M[0x065D + i] ^ (rnd(3) ? 0 : rnd(256)); } });
t({ name: 'place_camera', cases: 600 });
t({ name: 'speed_of', setup: (M, c, rnd) => ({ y: rnd(20) }), outs: ['a'] });
t({ name: 'screen_size', setup: (M, c, rnd) => { M[0x5F] = rnd(256); M[0x60] = rnd(256); }, outs: ['a'] });
process.exitCode = f ? 1 : 0;
