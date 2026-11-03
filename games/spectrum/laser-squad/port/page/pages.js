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
root.LSPages = { M, P, data, ORDER, TITLES, PAL, RGB, load, inPlay, image, view, map, name, title, hex, $, get loaded() { return loaded; } };
})(typeof window !== 'undefined' ? window : globalThis);
