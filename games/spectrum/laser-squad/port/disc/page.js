// The Discoveries tab (../../discoveries.html): its one widget runs the Play tab's port on the
// memory the page carries (page/pages.js). The Water Dwellers' charge is Paradise Valley's own
// aiCanGo (g-ai.js), run on a Water Dweller and three of the player's units placed by the reader:
// the units in its sight listed from $5B97 as findSeen lists them (row, column, code), the column
// the last measure left at $A54C set by the mark on the top edge, and the enemy it runs at read
// from CHARGE. The one it means is the same distance ($A550) measured from its own square.
(function () {
'use strict';
const L = LSPages, M = L.M, P = L.P, $ = L.$;
const ID = 'paradise-valley', ROWS = 34, COLS = 80;
const cv = $('dc-charge'), g = cv.getContext('2d'), out = $('dc-charge-out');
const K = cv.width / COLS;                     // pixels to a square; row -1 is the strip on top
const T = LSGroups.ai.TABLES[ID];
const DWELLER = 12;                            // the first Water Dweller, unit $98
// the pieces: the Water Dweller and three of the first side's units, and the column left over
const pieces = [
  { name: 'W', row: 20, col: 62, unit: DWELLER },
  { name: 'A', row: 24, col: 50, unit: 0 },
  { name: 'B', row: 6, col: 66, unit: 1 },
  { name: 'C', row: 14, col: 75, unit: 2 },
];
let leftover = 66, drag = null, map = null;

// the distance as the game measures it, from (r0, c0) to (r1, c1): its own routine at $A550
function distance(r0, c0, r1, c1) {
  M[0xA54B] = r0 & 255; M[0xA54C] = c0; M[0xA54D] = r1; M[0xA54E] = c1;
  return P.distance().a;
}
function run() {
  L.load(ID);
  const w = pieces[0], ix = 0xD39F + 40 * w.unit;
  M[0x5D24] = w.row; M[0x5D25] = w.col;
  M[ix + 6] = 20; M[ix + 8] = M[ix + 7] || 1; M[T.RESERVE] = 0;
  M[0x5D59] = 1;                               // enemies in sight
  P.setw(T.ORDER, T.ORDERS + 10 * M[ix + 0x1A]);
  M.fill(0xFF, 0x5B97, 0x5BD1);
  pieces.slice(1).forEach((p, i) => { const a = 0x5B97 + 3 * i; M[a] = p.row; M[a + 1] = p.col; M[a + 2] = 0x8C + p.unit; });
  M[0xA54C] = leftover;                        // the column the last measure left
  P.SC[ID].ai.aiCanGo({ ix });
  const runs = pieces.find(p => p !== w && 0x8C + p.unit === M[T.CHARGE]);
  // the one it means: the nearest to its own square, the first of any equal, as the loop keeps them
  let means = null, best = 256;
  for (const p of pieces.slice(1)) { const d = distance(w.row, w.col, p.row, p.col); if (d < best) { best = d; means = p; } }
  return { runs, means };
}
const centre = (r, c) => [(c + .5) * K, (r + 1.5) * K];
function arrow(x0, y0, x1, y1, colour, width, dash) {
  g.strokeStyle = colour; g.fillStyle = colour; g.lineWidth = width; g.setLineDash(dash || []);
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]);
  const a = Math.atan2(y1 - y0, x1 - x0), s = 12, bx = x1 - 11 * Math.cos(a), by = y1 - 11 * Math.sin(a);
  g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - s * Math.cos(a - .45), by - s * Math.sin(a - .45));
  g.lineTo(bx - s * Math.cos(a + .45), by - s * Math.sin(a + .45)); g.closePath(); g.fill();
}
function draw() {
  if (!map) map = L.map(ID, false);
  const { runs, means } = run();
  g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  g.imageSmoothingEnabled = false;
  g.drawImage(map, 0, 0, COLS * 16, ROWS * 16, 0, K, cv.width, ROWS * K);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, K, cv.width, ROWS * K);
  // row -1, where the game measures from
  g.fillStyle = '#2a1416'; g.fillRect(0, 0, cv.width, K);
  g.fillStyle = '#ff9a9a'; g.font = '11px "IBM Plex Mono", monospace'; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillText(leftover > 40 ? 'row −1 (255)' : '', 6, K / 2);
  if (leftover <= 40) { g.textAlign = 'right'; g.fillText('row −1 (255)', cv.width - 6, K / 2); }
  const [mx, my] = centre(-1, leftover);
  const w = pieces[0], [wx, wy] = centre(w.row, w.col);
  if (means && runs && means !== runs) arrow(wx, wy, ...centre(means.row, means.col), '#7dff8a', 2.5, [7, 5]);
  if (runs) {
    g.strokeStyle = '#ff5050'; g.lineWidth = 2; g.setLineDash([3, 4]);
    g.beginPath(); g.moveTo(mx, my); g.lineTo(...centre(runs.row, runs.col)); g.stroke(); g.setLineDash([]);
    arrow(wx, wy, ...centre(runs.row, runs.col), '#ffff00', 4);
  }
  // the mark: the column the last measure left
  g.fillStyle = '#ff5050';
  g.beginPath(); g.moveTo(mx, my + K / 2); g.lineTo(mx - K * .6, my - K / 2); g.lineTo(mx + K * .6, my - K / 2); g.closePath(); g.fill();
  for (const p of pieces) {
    const [x, y] = centre(p.row, p.col);
    g.fillStyle = p === w ? '#00d7d7' : '#ffffff'; g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, K * .8, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#000'; g.font = 'bold ' + Math.round(K * .95) + 'px "IBM Plex Mono", monospace'; g.textAlign = 'center';
    g.fillText(p.name, x, y + 1);
  }
  const d = (p, r, c) => distance(r, c, p.row, p.col);
  if (!runs || !means) { out.textContent = ''; return; }
  out.innerHTML = runs === means
    ? 'The Water Dweller runs at <b>' + runs.name + '</b>, which is also the nearest to it (' + d(runs, w.row, w.col) + '). Move a unit, or the red mark, until they differ.'
    : 'The Water Dweller means to run at <b>' + means.name + '</b>, the nearest to it (' + d(means, w.row, w.col) + '). It runs at <b>' + runs.name +
      '</b>, ' + d(runs, w.row, w.col) + ' from it but ' + d(runs, -1, leftover) + ' from row −1, column ' + leftover + ', where ' + means.name + ' is ' + d(means, -1, leftover) + '.';
}
const at = e => {
  const b = cv.getBoundingClientRect();
  return [Math.floor((e.clientY - b.top) / b.height * cv.height / K) - 1, Math.floor((e.clientX - b.left) / b.width * cv.width / K)];
};
cv.addEventListener('pointerdown', e => {
  const [r, c] = at(e);
  let best = null, bd = 9;
  for (const p of pieces) { const dd = (p.row - r) ** 2 + (p.col - c) ** 2; if (dd < bd) { bd = dd; best = p; } }
  drag = r < 0 || (!best && r < 2) ? 'mark' : best;
  if (!drag) return;
  cv.setPointerCapture(e.pointerId);
  cv.style.cursor = 'grabbing';
});
cv.addEventListener('pointermove', e => {
  if (!drag) return;
  const [r, c] = at(e);
  const col = Math.max(0, Math.min(COLS - 1, c));
  if (drag === 'mark') { if (col !== leftover) { leftover = col; draw(); } return; }
  const row = Math.max(0, Math.min(ROWS - 1, r));
  if (pieces.some(p => p !== drag && p.row === row && p.col === col)) return;
  if (row !== drag.row || col !== drag.col) { drag.row = row; drag.col = col; draw(); }
});
for (const t of ['pointerup', 'pointercancel']) cv.addEventListener(t, () => { drag = null; cv.style.cursor = 'grab'; });
draw();
})();
