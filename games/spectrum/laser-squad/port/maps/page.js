// The Maps tab (../../levels.html): each scenario's whole map, drawn by the Play tab's port of
// drawView view by view on the scenario as the tape loads it (page/pages.js), with the patches the
// units that arrive by themselves come on in; and the scenario's units and levels, read from its
// block where the engine reads them: the units' records at $D39F (the side in $25, the turn and the
// patch to arrive in from $1C), the flags at $B6E4 (bit 2: placed by its side's player), the modes
// each unit plays in at $B670 (bit 0 two players, bit k level k: gameMode, $A2BA), and for each
// level the computer's skill ($B655) and the first side's credits ($B6FA) (chooseGame, $A211).
(function () {
'use strict';
const L = LSPages, M = L.M, P = L.P, $ = L.$, hex = L.hex;
const box = $('mp-scen'), cv = $('mp-map'), g = cv.getContext('2d'), out = $('mp-out'), fire = $('mp-fire');
const K = cv.width / 80;
let id = L.ORDER[0], plan = false;
const maps = {};

function units() {
  L.load(id);
  const list = [];
  for (let k = 0; k < 20; k++) {
    const u = 0xD39F + 40 * k, fl = M[0xB6E4 + k];
    list.push({ code: 0x8C + k, name: L.title(L.name(0x8C + k)), side: M[u + 0x25] & 1, kind: M[u + 4],
      placed: !!(fl & 4), turn: M[u + 0x1C], r0: M[u + 0x1D], rows: M[u + 0x1E], c0: M[u + 0x1F], cols: M[u + 0x20],
      modes: M[0xB670 + k] });
  }
  return list;
}
function levels() {
  const n = M[0xB684], out = [];
  for (let k = 0; k < n; k++) out.push({ level: k + 1, skill: M[0xB655 + k], credits: M[0xB6FA + k] });
  return out;
}
const plays = (u, n) => {
  const w = [];
  if (u.modes & 1) w.push('two players');
  const lv = []; for (let k = 1; k <= n; k++) if (u.modes & (1 << k)) lv.push(k);
  if (lv.length === n) w.push('every level');
  else if (lv.length) w.push((lv.length > 1 ? 'levels ' : 'level ') + lv.join(', '));
  return w.length ? w.join('; ') : 'never';
};
const span = (w, a, n) => n > 1 ? w + 's ' + a + '–' + (a + n - 1) : w + ' ' + a;
const patch = u => 'turn ' + u.turn + ', ' + span('row', u.r0, u.rows) + ', ' + span('column', u.c0, u.cols);
// a unit its player places comes on at a square of its side's for placing; the computer places
// none of its units (placeUnits is not called for its side), so its units all arrive in their
// patches (arrivals, $A2EE)
const enters = u => u.placed ? (u.side && u.rows && u.cols ? 'placed by its player; against the computer, arrives in ' + patch(u) : 'placed by its player')
  : u.rows && u.cols ? 'arrives in ' + patch(u) : 'never';
const arrives = u => (!u.placed || u.side) && u.rows && u.cols;
function draw(U) {
  const key = id + (plan ? ':plan' : '');
  if (!maps[key]) maps[key] = L.map(id, plan);
  g.imageSmoothingEnabled = false;
  g.drawImage(maps[key], 0, 0, cv.width, cv.height);
  // the patches the units that arrive by themselves come on in
  g.lineWidth = 4;
  const seen = new Set();
  for (const u of U) {
    if (!arrives(u)) continue;
    const k = u.r0 + ',' + u.c0 + ',' + u.rows + ',' + u.cols;
    if (seen.has(k)) continue; seen.add(k);
    g.fillStyle = u.side ? 'rgba(255,80,80,.35)' : 'rgba(64,192,255,.35)';
    g.fillRect(u.c0 * K, u.r0 * K, u.cols * K, u.rows * K);
    g.strokeStyle = u.side ? '#ff5050' : '#40c0ff';
    g.strokeRect(u.c0 * K + 2, u.r0 * K + 2, u.cols * K - 4, u.rows * K - 4);
  }
}
function table(U) {
  const n = M[0xB684];
  const rows = s => U.filter(u => u.side === s).map(u => '<tr><td>' + u.name + '</td><td>' + enters(u) + '</td><td>' + plays(u, n) + '</td></tr>').join('');
  $('mp-units').innerHTML = [0, 1].map(s => '<h3>' + (s ? 'The second side' : 'The first side') + (s ? ' (the computer\'s, with one player)' : '') + '</h3>' +
    '<table><tr><th>Unit</th><th>Comes on</th><th>Plays in</th></tr>' + rows(s) + '</table>').join('');
  $('mp-levels').innerHTML = '<table><tr><th>Level</th><th>The computer\'s skill</th><th>The first side\'s credits</th><th>The computer\'s units</th></tr>' +
    levels().map(l => '<tr><td>' + l.level + '</td><td>' + l.skill + '</td><td>' + l.credits + '</td><td>' + U.filter(u => u.side && u.modes & (1 << l.level)).length + '</td></tr>').join('') +
    '</table><p class="cap">Two players: the first side has ' + M[0xB6F8] + ' credits and the second ' + M[0xB6F9] + ', with ' +
    U.filter(u => u.side && u.modes & 1).length + ' units on the second side.</p>';
}
let U = [];
function show() {
  U = units();
  draw(U);
  table(U);
  for (const b of box.children) b.setAttribute('aria-pressed', b.dataset.id === id);
  $('mp-title').textContent = L.TITLES[id];
  out.textContent = 'Point at a square.';
}
for (const s of L.ORDER) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'hw-btn'; b.dataset.id = s; b.textContent = L.TITLES[s];
  b.addEventListener('click', () => { id = s; show(); });
  box.appendChild(b);
}
fire.addEventListener('click', () => { plan = !plan; fire.setAttribute('aria-pressed', plan); draw(U); });
const point = e => {
  const b = cv.getBoundingClientRect();
  const c = Math.floor((e.clientX - b.left) / b.width * 80), r = Math.floor((e.clientY - b.top) / b.height * 50);
  if (r < 0 || r > 49 || c < 0 || c > 79) return;
  L.load(id);
  const code = M[0xD6BF + 80 * r + c], nm = L.name(code);
  const here = U.filter(u => arrives(u) && r >= u.r0 && r < u.r0 + u.rows && c >= u.c0 && c < u.c0 + u.cols);
  out.innerHTML = '<b>' + (nm ? L.title(nm) : hex(code)) + '</b>, row ' + r + ', column ' + c + ' (map byte <code>' + hex(code) + '</code>)' +
    (code === M[0xB65E] || code === M[0xB661] ? ', a square for placing' : '') +
    (here.length ? '. Arriving here: ' + here.map(u => u.name + ' in turn ' + u.turn).join(', ') + '.' : '.');
};
// a pointer over the map, or a tap on it
cv.addEventListener('pointermove', point);
cv.addEventListener('pointerdown', point);
show();
})();
