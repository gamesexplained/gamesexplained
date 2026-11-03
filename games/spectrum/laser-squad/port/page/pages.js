// What the How it works, Maps and Discoveries tabs share (scripts/build-pages.js puts it in each):
// the game's memory as the Play tab carries it (scripts/pack-data.js: the engine's data and each
// scenario's block, the code left out), the port on it (src/), and the screen as the ULA shows it.
// Every picture is the port's own drawing on that memory; every name is the scenario's own message,
// printed by the port's printMessage with its characters caught instead of drawn.
//   LSPages.load(id)          the scenario's block put at $B621 and its routines in P; the game's
//                             memory as the tape leaves it
//   LSPages.image(x, y, w, h) that part of the screen, in pixels, as an ImageData
//   LSPages.view(row, col)    the port's drawView of the 11 x 11 squares from (row, col): the screen's
//                             176 x 176 pixels from (8, 8)
//   LSPages.map(id, fire)     the scenario's whole map, 80 x 50 squares of 16 pixels, as drawn by
//                             drawView view by view, through the table of squares for fire mode
//                             ($E79F) when fire is set; a canvas
//   LSPages.tile(a, colours)  the scenario's tile a, 16 x 16 pixels, drawn by the port's drawTile
//   LSPages.film(run)         what run() shows on the view, a picture a frame, and its sound
//   LSPages.play(film, show, done, quiet)  that film played at the game's pace, with its sound
//   LSPages.plan()            the computer player's map of the scenario loaded: waypoints, areas,
//                             links, the second side's orders, and its findRoute between two
//                             waypoints
//   LSPages.name(code)        the scenario's name for the map's byte code: its message of that number
(function (root) {
'use strict';
const $ = id => document.getElementById(id);
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const PAL = ['#000000', '#0000d7', '#d70000', '#d700d7', '#00d700', '#00d7d7', '#d7d700', '#d7d7d7',
  '#000000', '#0000ff', '#ff0000', '#ff00ff', '#00ff00', '#00ffff', '#ffff00', '#ffffff'];
const RGB = PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
const TITLES = { 'assassins': 'The Assassins', 'moonbase-assault': 'Moonbase Assault',
  'rescue-from-the-mines': 'Rescue from the Mines', 'cyber-hordes': 'The Cyber Hordes', 'paradise-valley': 'Paradise Valley' };

const data = JSON.parse($('ls-data').textContent);
const M = new Uint8Array(65536);
const ENGINE = b64(data.ram);
const BLOCKS = {};
const ORDER = [];
for (const [num, s] of Object.entries(data.scenarios)) {
  BLOCKS[s.name] = b64(s.bytes);
  ORDER.push(s.name);
}
ORDER.sort((a, b) => data.scenarios[Object.keys(data.scenarios).find(k => data.scenarios[k].name === a)].flag -
  data.scenarios[Object.keys(data.scenarios).find(k => data.scenarios[k].name === b)].flag);
const P = LSPort.makePort(M, { in: () => 0xFF, out() {}, r: () => 0, irqByte: a => M[a], tape: null });
P.T = 0;

let loaded = null;
function load(id) {
  M.fill(0);
  M.set(ENGINE, data.from || 0x4000);
  M.set(BLOCKS[id], 0xB621);
  P.useScenario(id);
  loaded = id;
  return P;
}
// the map as play starts, after load(id): each side's squares for placing put back to the floor
// under them (clearDeploy, $A474, run for each side as the game runs it after each side places its
// units), and the table of units at $5C50 made from the map (tableUnits, $7488), which has no unit
// on it yet. Without the table, a routine that puts the units back on the map (showAllUnits)
// would put all twenty at row 0, column 0.
function inPlay() {
  for (const side of [0, 1]) { M[0xB712] = side; P.clearDeploy(); }
  M[0xB712] = 0;
  P.tableUnits();
}
// the screen's pixels from (x, y), w by h, in its colours (no flash)
function image(x, y, w, h) {
  const img = new ImageData(w, h);
  for (let j = 0; j < h; j++) {
    const sy = y + j;
    for (let i = 0; i < w; i++) {
      const sx = x + i;
      const a = 0x4000 | ((sy & 0xC0) << 5) | ((sy & 7) << 8) | ((sy & 0x38) << 2) | (sx >> 3);
      const at = M[0x5800 + (sy >> 3) * 32 + (sx >> 3)], bit = (M[a] >> (7 - (sx & 7))) & 1;
      const br = at & 0x40 ? 8 : 0, c = RGB[bit ? (at & 7) + br : ((at >> 3) & 7) + br];
      const k = (j * w + i) * 4;
      img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
    }
  }
  return img;
}
function view(row, col) {
  M[P.V.VIEW_ROW] = row; M[P.V.VIEW_COL] = col;
  P.drawView();
  return image(8, 8, 176, 176);
}
// the whole map: drawView at views 11 squares apart, the last row and column of views against the
// map's far edges (rows 39, columns 69, as far as the game lets the view go)
const ROWS = 50, COLS = 80;
function map(id, fire) {
  load(id);
  if (fire) P.setw(0xB716, 0xE79F);
  const cv = document.createElement('canvas');
  cv.width = COLS * 16; cv.height = ROWS * 16;
  const g = cv.getContext('2d');
  const starts = (n, last) => { const s = []; for (let v = 0; v < n; v += 11) s.push(Math.min(v, last)); return s; };
  for (const r of starts(ROWS, ROWS - 11)) for (const c of starts(COLS, COLS - 11)) g.putImageData(view(r, c), c * 16, r * 16);
  return cv;
}
// tile a of the scenario loaded in the colours at: the port's drawTile at the view's first square
// (character row and column 1), as its 16 x 16 pixels
function tile(a, at) {
  M[P.V.PRINT_ROW] = 1; M[P.V.PRINT_COL] = 1; M[P.V.ATTR] = at;
  P.drawTile({ a });
  return image(8, 8, 16, 16);
}
// The computer player's map of the scenario loaded, from its own copy's tables (g-ai.js, TABLES):
// the waypoints (POINTS, a row and a column each, NPOINTS of them), the areas (AREAS, five bytes:
// the first row, the row after the last, the first column, the column after the last, the
// number; $FF after the last), each waypoint's links as nextLink walks them (LINKS: each list its
// length with bit 7 set, then two bytes a link, the waypoint and the cost), and the second side's
// units: each one's orders (ORDERS + 10 x its $1A: the waypoints it walks round from byte 1 to a
// 0, the flags at 8, the row of VALUES at 9), or for The Cyber Hordes' units from $9C the
// terminal it goes for first ($1A of TERMINALS, three bytes each: the row, the column and the
// waypoint).
function plan() {
  const t = root.LSGroups.ai.TABLES[loaded];
  const n = M[t.NPOINTS], pts = [], areas = [], links = [], units = [];
  for (let k = 1; k <= n; k++) { const a = t.POINTS + 2 * (k - 1); pts[k] = [M[a], M[a + 1]]; }
  for (let hl = t.AREAS; ; hl += 5) { areas.push([...M.slice(hl, hl + 5)]); if (M[hl + 5] === 0xFF) break; }
  for (let z = 1; z <= n; z++) {
    let hl = t.LINKS;
    for (let b = z; b; b--) hl += M[hl] & 0x7F;
    for (let e = hl + 1; !(M[e] & 0x80); e += 2) links.push([z, M[e], M[e + 1]]);
  }
  const terminals = [];
  if (t.TERMINALS) for (let k = 0; k < 7; k++) { const a = t.TERMINALS + 3 * k; terminals.push([M[a], M[a + 1], M[a + 2]]); }
  for (let k = 0; k < 20; k++) {
    const u = 0xD39F + 40 * k, code = 0x8C + k;
    if (!(M[u + 0x25] & 1)) continue;
    const alien = !!t.aliens && code >= 0x9C;
    const o = t.ORDERS + 10 * M[u + 0x1A];
    const way = [];
    if (!alien) for (let i = 1; i < 8 && M[o + i]; i++) way.push(M[o + i]);
    units.push({ k, code, alien, terminal: alien ? M[u + 0x1A] : -1, orders: alien ? -1 : M[u + 0x1A],
      way, flags: alien ? 0 : M[o + 8], values: alien ? -1 : M[o + 9] });
  }
  // the value of each area to a unit of VALUES row v, as chooseTarget reads it (32 a row; 0
  // leaves an enemy there out)
  const value = (v, area) => (t.VALUES === undefined ? -1 : M[t.VALUES + 32 * v + area - 1 & 0xFFFF]);
  // the route the computer finds from waypoint a to waypoint b: its own findRoute, run on FROM and
  // TO, the waypoints it leaves at $5CF0 (ten at most, a first); null when it finds none cheaper
  // than the bound it starts from
  const route = (a, b) => {
    M.fill(0xFF, 0x5CF0, 0x5CFA);
    M[t.FROM] = a; M[t.TO] = b;
    P.SC[loaded].ai.findRoute();
    if (M[0x5CF0] !== a) return null;
    const r = [];
    for (let k = 0; k < 10 && M[0x5CF0 + k] !== 0xFF; k++) r.push(M[0x5CF0 + k]);
    return r;
  };
  return { t, n, pts, areas, links, units, terminals, value, route };
}
// A film of what a routine shows on the view: run() runs it (a generator is run to its end), and
// each time the port's clock (P.T, which P.spend moves on) passes a frame of a 48K's time, 69,888
// T-states, the view's 176 x 176 pixels are taken; its writes to the beeper (port $FE, bit 4) are
// caught with their T-states. { frames: [{ t, img }], edges: [[t, level]], T }, from the start.
const FRAME = 69888;
function film(run) {
  const frames = [], edges = [], spend = P.spend, out = P.io.out, t0 = P.T;
  let last = -FRAME;
  const snap = () => { frames.push({ t: P.T - t0, img: image(8, 8, 176, 176) }); last = P.T - t0; };
  P.spend = n => { if (P.T - t0 - last >= FRAME) snap(); spend(n); };
  P.io.out = (port, v, t) => { if ((port & 255) === 0xFE) edges.push([(t === undefined ? P.T : t) - t0, v >> 4 & 1]); };
  try { const r = run(); if (r && typeof r.next === 'function') for (let n = 0; n < 1e6 && !r.next().done; n++); }
  finally { P.spend = spend; P.io.out = out; }
  snap();
  return { frames, edges, T: P.T - t0 };
}
// The beeper's clicks played by the site's model of it (site/lib/ay.js), from now: each frame's
// edges at their place in it. A promise; a page without the model, or without sound, plays nothing.
let host = null;
async function beep(edges) {
  if (!edges.length || typeof root.SpectrumAY === 'undefined') return false;
  if (!host) host = await root.SpectrumAY.host({ gain: 0.5, most: 1000 });
  await host.ctx.resume();
  const SCALE = 70908 / FRAME, frames = [];
  for (const [t, v] of edges) {
    const k = Math.floor(t / FRAME);
    while (frames.length <= k) frames.push([]);
    frames[k].push(Math.round((t - k * FRAME) * SCALE), 16, v);
  }
  frames.push([0, 16, 0]);
  host.push(frames);
  return true;
}
// A film played at the game's own pace, with its sound unless quiet (a browser plays none before
// the reader has pressed something): show(img) for each frame as its time comes, done() after the
// last. Returns stop(), which ends it where it is.
function play(f, show, done, quiet) {
  let raf = 0, shown = -1;
  const start = performance.now();
  if (!quiet) beep(f.edges).catch(() => {});
  const tick = now => {
    const t = (now - start) * 3500;               // T-states at 3.5 MHz, from milliseconds
    let i = shown < 0 ? 0 : shown;
    while (i + 1 < f.frames.length && f.frames[i + 1].t <= t) i++;
    if (i !== shown) { shown = i; show(f.frames[i].img, i); }
    if (i + 1 < f.frames.length || t < f.T) raf = requestAnimationFrame(tick);
    else if (done) done();
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

// the scenario's name for the map's byte code, as scenarioText ($68A3) prints it (message code + 1
// of its list): printMessage's characters caught, the space after each word, and a new line, which
// the game breaks a long word with after its hyphen, joined up
function name(code) {
  const keep = { putChar: P.putChar, newLine: P.newLine, advance: P.advance };
  const out = [];
  P.setw(0x5D1F, P.w(0xB722)); P.setw(0x5D07, P.w(0xB724));
  M[0x5D09] = 0;
  P.putChar = r => { out.push(String.fromCharCode(r.a)); return {}; };
  P.advance = () => { out.push(' '); return {}; };
  P.newLine = () => { out.push('\n'); return {}; };
  try { P.printMessage({ a: code + 1 & 255 }); } catch (e) { return ''; } finally { Object.assign(P, keep); }
  return out.join('').replace(/\s+/g, ' ').replace(/- /g, '-').trim();
}
// a name as a title: "CORPORAL JONLAN" as "Corporal Jonlan"
const title = s => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, p, c) => p + c.toUpperCase());
const hex = (v, n) => '$' + v.toString(16).toUpperCase().padStart(n || 2, '0');
root.LSPages = { M, P, data, ORDER, TITLES, PAL, RGB, FRAME, load, inPlay, image, view, map, tile, plan, film, beep, play, name, title, hex, $, get loaded() { return loaded; } };
})(typeof window !== 'undefined' ? window : globalThis);
