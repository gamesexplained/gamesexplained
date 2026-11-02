'use strict';
// The 3D view (g-view.js) checked against the game's own on the moments it is called.
const { check, prefetch } = require('./check.js');
const R = process.env.R ? process.env.R.split(',') : ['clip_classify', 'project_vertices', 'face_side', 'rotate_vertices', 'transform_vertices', 'clip_edge',
  'clip_polygon', 'prepare_polygon', 'prepare_line', 'fill_face', 'draw_face_list', 'clip_face_list', 'draw_cuboid', 'draw_pyramid',
  'draw_polygon', 'draw_rectangle', 'draw_sensor', 'sort_faces', 'draw_faces', 'mul_matrix', 'make_view_matrix', 'make_multipliers',
  'bound_view_box', 'draw_object_list', 'draw_view'];
const OUTS = { clip_classify: ['a'], face_side: ['a'], prepare_polygon: ['ix'], prepare_line: ['ix'] };
prefetch(R, { per: +(process.env.PER || 3), most: +(process.env.MOST || 30) });
let fails = 0;
for (const n of R) fails += check({ name: n, outs: OUTS[n] || [], cases: +(process.env.CASES || 200), per: +(process.env.PER || 3), most: +(process.env.MOST || 30) }).fails;
process.exitCode = fails ? 1 : 0;
