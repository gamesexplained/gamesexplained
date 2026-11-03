// The How it works tab (../../index.html): its widgets run the Play tab's port, checked against the
// game's own code (port/test), on the memory the page carries (page/pages.js). The view is the
// port's drawView; the sound effects are sound's writes to port $FE at the T-states its loops
// take, played by the site's model of the beeper (site/lib/ay.js); a blast is the port's explode,
// run whole, with the table of strengths it fills caught as it starts on the squares; a route is
// the scenario's own findRoute (g-ai.js), run on its waypoints, links and areas.
(function () {
'use strict';
const L = LSPages, M = L.M, P = L.P, $ = L.$, hex = L.hex;
const SQ = 16;                                  // a square: a tile of 16 by 16 pixels
const scenarioPicker = (sel, value) => {
  for (const id of L.ORDER) { const o = document.createElement('option'); o.value = id; o.textContent = L.TITLES[id]; sel.appendChild(o); }
  sel.value = value || L.ORDER[0];
};
const COLOUR = ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white'];
const colours = at => COLOUR[at & 7] + ' on ' + COLOUR[(at >> 3) & 7] + (at & 0x40 ? ', bright' : '');
// what a map byte is: terrain below $6E, an object to $8B, a unit from $8C
const what = code => code >= 0x8C ? 'a unit' : code >= 0x6E ? 'an object' : 'terrain';

// ---- 1. The view: drawView on the scenario's map, from any corner the game lets it reach
(function () {
  const sel = $('hw-scen'), cv = $('hw-view'), g = cv.getContext('2d'), out = $('hw-view-out'), fire = $('hw-fire');
  let id = L.ORDER[0], row = 0, col = 0, fireMode = false;
  scenarioPicker(sel);
  function start() {
    // where the game puts the view first in a two-player game: on the first side's squares for
    // placing (the first map square that is one of them, $B65E)
    L.load(id);
    const code = M[0xB65E];
    let at = 0;
    for (let a = 0; a < 4000; a++) if (M[0xD6BF + a] === code) { at = a; break; }
    row = Math.max(0, Math.min(39, Math.floor(at / 80) - 5));
    col = Math.max(0, Math.min(69, at % 80 - 5));
  }
  function draw() {
    L.load(id);
    if (fireMode) P.setw(0xB716, 0xE79F);
    g.putImageData(L.view(row, col), 0, 0);
    $('hw-view-at').textContent = 'Rows ' + row + ' to ' + (row + 10) + ', columns ' + col + ' to ' + (col + 10);
  }
  function show(x, y) {
    const r = row + Math.floor(y / SQ), c = col + Math.floor(x / SQ);
    L.load(id);
    if (fireMode) P.setw(0xB716, 0xE79F);
    const code = M[0xD6BF + 80 * r + c], t = P.w(0xB716) + 2 * code;
    const nm = L.name(code);
    out.innerHTML = '<b>' + (nm ? L.title(nm) : 'No name') + '</b>, row ' + r + ', column ' + c + ': map byte <code>' + hex(code) +
      '</code>, ' + what(code) + '; drawn as tile <code>' + hex(M[t + 1]) + '</code> in ' + colours(M[t]) + '.';
  }
  const move = (dr, dc) => { row = Math.max(0, Math.min(39, row + dr)); col = Math.max(0, Math.min(69, col + dc)); draw(); };
  sel.addEventListener('change', () => { id = sel.value; start(); draw(); out.textContent = 'Point at a square.'; });
  fire.addEventListener('click', () => { fireMode = !fireMode; fire.setAttribute('aria-pressed', fireMode); draw(); });
  for (const b of document.querySelectorAll('#hw-pad button[data-d]')) {
    const [dr, dc] = b.dataset.d.split(',').map(Number);
    b.addEventListener('click', () => move(dr, dc));
  }
  const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { p: at(e), row, col }; cv.setPointerCapture(e.pointerId); show(...at(e)); });
  cv.addEventListener('pointermove', e => {
    const p = at(e);
    if (!drag) { show(...p); return; }
    const nr = Math.max(0, Math.min(39, drag.row - Math.round((p[1] - drag.p[1]) / SQ)));
    const nc = Math.max(0, Math.min(69, drag.col - Math.round((p[0] - drag.p[0]) / SQ)));
    if (nr !== row || nc !== col) { row = nr; col = nc; draw(); }
  });
  cv.addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('keydown', e => {
    const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (d) { e.preventDefault(); move(...d); }
  });
  start(); draw();
})();

// ---- 2. The sound effects: sound(A), its writes to the beeper caught with their T-states
(function () {
  const box = $('hw-fx'), cv = $('hw-wave'), g = cv.getContext('2d'), out = $('hw-fx-out');
  const FRAME = 69888;                       // a 48K's frame, in T-states
  // what plays each effect, from the code (the listing's soundEffects, $B531)
  const USE = ['a key or fire answered, at the menus and the waits', 'the mark moved in a list, and an object sold',
    'a choice taken from a list, and an object bought', 'a step, a blow in close combat and a unit hit by a shot',
    'an action finished', 'a menu line chosen', 'a unit placed', 'an enemy coming into sight',
    'the sparks where a shot lands', 'a blow, a hit, and an explosion', 'a death: the body spinning and falling',
    'a refusal: a message in the panel, and the shop saying no', 'a death: the first sound'];
  function record(n) {
    L.load(L.loaded || L.ORDER[0]);
    const edges = [], keep = P.io.out;
    P.io.out = (port, v, t) => { if ((port & 255) === 0xFE) edges.push([t, (v >> 4) & 1]); };
    P.T = 0;
    try { P.sound({ a: n }); } finally { P.io.out = keep; }
    return { edges, T: P.T };
  }
  const fx = [];
  for (let n = 0; n < 13; n++) {
    const r = record(n);
    fx.push(Object.assign(r, { n }));
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.n = n;
    b.innerHTML = '<span>' + n + ' · ' + (r.T / 3500).toFixed(0) + ' ms</span>' + USE[n].split(',')[0].split(':')[0].replace(/^./, c => c.toUpperCase());
    box.appendChild(b);
  }
  function draw(f) {
    const W = cv.width, H = cv.height;
    g.fillStyle = '#f1efea'; g.fillRect(0, 0, W, H);
    if (!f || !f.edges.length) return;
    g.strokeStyle = '#2f3136'; g.lineWidth = 1.5; g.beginPath();
    const X = t => 8 + (W - 16) * t / f.T, Y = v => v ? 14 : H - 14;
    let lv = 0; g.moveTo(X(0), Y(0));
    for (const [t, v] of f.edges) { g.lineTo(X(t), Y(lv)); g.lineTo(X(t), Y(v)); lv = v; }
    g.lineTo(X(f.T), Y(lv)); g.stroke();
  }
  let host = null;
  box.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const f = fx[+b.dataset.n];
    for (const x of box.children) x.setAttribute('aria-pressed', x === b);
    draw(f);
    const t = M.slice(0xB531 + 10 * f.n, 0xB531 + 10 * f.n + 10);
    out.innerHTML = '<b>Effect ' + f.n + '</b> plays for ' + USE[f.n] + '. Its ten bytes at <code>' + hex(0xB531 + 10 * f.n, 4) + '</code>: ' +
      (t[0] || 256) + ' times, ' + (t[1] || 256) + ' pass' + (t[1] === 1 ? '' : 'es') + ' each, four tones of pitch ' +
      [3, 5, 7, 9].map(k => t[k] || 256).join(', ') + '. ' + f.edges.length.toLocaleString('en-GB') + ' clicks of the speaker in ' +
      f.T.toLocaleString('en-GB') + ' T-states, ' + (f.T / 3500).toFixed(0) + ' ms with the game waiting.';
    if (typeof SpectrumAY === 'undefined') { out.innerHTML += ' The site\'s sound script (lib/ay.js) is missing, so it cannot be heard here.'; return; }
    try { if (!host) host = await SpectrumAY.host({ gain: 0.5, most: 1000 }); await host.ctx.resume(); }
    catch (err) { out.innerHTML += ' No sound: ' + err.message; return; }
    const SCALE = 70908 / FRAME, frames = [];
    for (const [t, v] of f.edges) {
      const k = Math.floor(t / FRAME);
      while (frames.length <= k) frames.push([]);
      frames[k].push(Math.round((t - k * FRAME) * SCALE), 16, v);
    }
    frames.push([0, 16, 0]);
    host.push(frames);
  });
  draw(null);
})();

// ---- 3. A blast: explode on the map, the strength that reached each square, and what broke
(function () {
  const sel = $('hw-bscen'), cv = $('hw-blast'), g = cv.getContext('2d'), out = $('hw-blast-out'), kinds = $('hw-kinds');
  const SCALE = cv.width / 176;
  let id = 'assassins', after = null, strength = 0, kindName = '', viewAt = null, table = null;
  scenarioPicker(sel, id);
  // the scenario's objects that explode: a weapon whose shot explodes (bit 2 of its kind's $00) or
  // one that is primed and thrown (bit 3); the strength is the kind's $0F
  function explosives() {
    L.load(id);
    const base = P.w(0xB728), list = [];
    for (let k = 0; k < 0x1E; k++) {
      const a = base + 20 * k;
      if (M[a] & 0x0C && M[a + 0x0F]) list.push({ name: L.title(L.name(0x6E + k)), s: M[a + 0x0F] });
    }
    return list;
  }
  function pickKinds() {
    kinds.textContent = '';
    for (const k of explosives()) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hw-btn'; b.textContent = k.name + ' · ' + k.s;
      b.addEventListener('click', () => { strength = k.s; kindName = k.name; for (const x of kinds.children) x.setAttribute('aria-pressed', x === b); });
      kinds.appendChild(b);
    }
    kinds.firstChild.click();
  }
  function reset() {
    L.load(id);
    // the view where the game shows the first side's squares for placing, on the map as play starts
    const code = M[0xB65E];
    let at = 0;
    for (let a = 0; a < 4000; a++) if (M[0xD6BF + a] === code) { at = a; break; }
    viewAt = [Math.max(0, Math.min(39, Math.floor(at / 80) - 5)), Math.max(0, Math.min(69, at % 80 - 5))];
    L.inPlay();
    after = M.slice();
    table = null;
    draw();
    out.textContent = 'Pick what goes off, then a square.';
  }
  function draw() {
    M.set(after);
    P.useScenario(id);
    const img = L.view(viewAt[0], viewAt[1]);
    // the screen at twice its size, so the numbers can be read
    const tmp = document.createElement('canvas'); tmp.width = 176; tmp.height = 176;
    tmp.getContext('2d').putImageData(img, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(tmp, 0, 0, cv.width, cv.height);
    if (!table) return;
    g.font = 'bold ' + Math.round(7 * SCALE) + 'px "IBM Plex Mono", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let r = 0; r < 11; r++) for (let c = 0; c < 11; c++) {
      const v = table.t[11 * r + c];
      const mr = table.r0 + r, mc = table.c0 + c;
      if (mr > table.r1 || mc > table.c1 || !v) continue;
      const x = (mc - viewAt[1]) * SQ * SCALE, y = (mr - viewAt[0]) * SQ * SCALE;
      if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) continue;
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x + 1, y + 1, SQ * SCALE - 2, SQ * SCALE - 2);
      g.fillStyle = v >= strength ? '#ffff00' : '#ffffff';
      g.fillText(v, x + SQ * SCALE / 2, y + SQ * SCALE / 2 + 1);
    }
  }
  function blast(r, c) {
    M.set(after);
    P.useScenario(id);
    M[0x968E] = strength; M[0x9694] = r; M[0x9695] = c;
    M[0x5DF7] = 0;                       // a player's turn
    // as the game sets off a primed grenade (fuses, $9C8B): the list of fires cleared, the blast,
    // then the fires it lit, each a blast of its own. The table, the box and the view are caught at
    // the first square's blow; the game's test for its end, which follows each blast, is left out:
    // the page has no game to end
    const keepCell = P.cellDamage, keepEnd = P.checkEnd;
    let caught = null;
    P.cellDamage = () => {
      if (!caught) caught = { t: M.slice(0x5B00, 0x5B79), r0: M[0x9690], r1: M[0x9691], c0: M[0x9692], c1: M[0x9693], view: [M[P.V.VIEW_ROW], M[P.V.VIEW_COL]] };
      return keepCell();
    };
    P.checkEnd = function* () { return {}; };
    const before = M.slice(0xD6BF, 0xD6BF + 4000);
    let fires = 0;
    try {
      P.clearFires();
      for (const g of [P.explode({}), (function* () { const keep = P.explode; P.explode = function* (r) { fires++; return yield* keep(r); }; try { return yield* P.spreadFires({}); } finally { P.explode = keep; } })()]) {
        for (let n = 0; n < 1e5 && !g.next().done; n++);
      }
    } catch (e) { out.textContent = 'The blast stopped: ' + e.message; }
    finally { P.cellDamage = keepCell; P.checkEnd = keepEnd; }
    if (caught) { table = caught; viewAt = caught.view; }
    // what the blast broke
    const broke = new Map();
    for (let a = 0; a < 4000; a++) {
      if (before[a] === M[0xD6BF + a]) continue;
      const nm = v => { const n = L.name(v); return n ? L.title(n) : hex(v) + ' (no name)'; };
      const k = nm(before[a]) + ' to ' + nm(M[0xD6BF + a]);
      broke.set(k, (broke.get(k) || 0) + 1);
    }
    after = M.slice();
    draw();
    out.innerHTML = '<b>' + kindName + '</b>, strength ' + strength + ', at row ' + r + ', column ' + c + '. ' +
      (broke.size ? 'Broken: ' + [...broke].map(([k, n]) => (n > 1 ? n + ' × ' : '') + k).join('; ') + '.' : 'Nothing broke.') +
      (fires ? ' ' + fires + (fires > 1 ? ' fires' : ' fire') + ' went off after it.' : '');
  }
  cv.addEventListener('click', e => {
    const b = cv.getBoundingClientRect();
    const x = (e.clientX - b.left) * cv.width / b.width / SCALE, y = (e.clientY - b.top) * cv.height / b.height / SCALE;
    blast(viewAt[0] + Math.floor(y / SQ), viewAt[1] + Math.floor(x / SQ));
  });
  sel.addEventListener('change', () => { id = sel.value; pickKinds(); reset(); });
  $('hw-blast-reset').addEventListener('click', reset);
  pickKinds(); reset();
})();

// ---- 4. The computer's routes: findRoute between two of the scenario's waypoints
(function () {
  const sel = $('hw-rscen'), cv = $('hw-route'), g = cv.getContext('2d'), out = $('hw-route-out');
  const T = LSGroups.ai.TABLES;
  const K = cv.width / 80;                     // pixels to a square
  let id = 'assassins', from = 0, to = 0, route = null, maps = {};
  scenarioPicker(sel, id);
  function info() {
    const t = T[id];
    L.load(id);
    const n = M[t.NPOINTS], pts = [], areas = [], links = [];
    for (let k = 1; k <= n; k++) { const a = t.POINTS + 2 * (k - 1); pts[k] = [M[a], M[a + 1]]; }
    for (let hl = t.AREAS; ; hl += 5) { areas.push([...M.slice(hl, hl + 5)]); if (M[hl + 5] === 0xFF) break; }
    // each waypoint's links, as nextLink walks them: the lists from LINKS, each its length (bit 7
    // set) and then two bytes a link, the waypoint and the cost
    for (let z = 1; z <= n; z++) {
      let hl = t.LINKS;
      for (let b = z; b; b--) hl += M[hl] & 0x7F;
      for (let e = hl + 1; !(M[e] & 0x80); e += 2) links.push([z, M[e], M[e + 1]]);
    }
    return { t, n, pts, areas, links };
  }
  let I = null;
  function background() {
    if (!maps[id]) maps[id] = L.map(id, false);
    return maps[id];
  }
  function draw() {
    g.imageSmoothingEnabled = true;
    g.drawImage(background(), 0, 0, cv.width, cv.height);
    g.fillStyle = 'rgba(35,38,45,.45)'; g.fillRect(0, 0, cv.width, cv.height);
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(255,255,255,.55)';
    for (const [r0, r1, c0, c1] of I.areas) g.strokeRect(c0 * K + .5, r0 * K + .5, (c1 - c0) * K - 1, (r1 - r0) * K - 1);
    g.strokeStyle = 'rgba(0,255,255,.45)';
    g.beginPath();
    for (const [a, b] of I.links) { const p = I.pts[a], q = I.pts[b]; if (!p || !q) continue; g.moveTo((p[1] + .5) * K, (p[0] + .5) * K); g.lineTo((q[1] + .5) * K, (q[0] + .5) * K); }
    g.stroke();
    if (route && route.length > 1) {
      g.strokeStyle = '#ffff00'; g.lineWidth = 3; g.beginPath();
      route.forEach((z, k) => { const p = I.pts[z]; if (k) g.lineTo((p[1] + .5) * K, (p[0] + .5) * K); else g.moveTo((p[1] + .5) * K, (p[0] + .5) * K); });
      g.stroke();
    }
    for (let z = 1; z <= I.n; z++) {
      const p = I.pts[z];
      g.fillStyle = z === from ? '#00ff00' : z === to ? '#ff4040' : '#ffffff';
      g.beginPath(); g.arc((p[1] + .5) * K, (p[0] + .5) * K, z === from || z === to ? 5 : 3, 0, 7); g.fill();
    }
  }
  function search() {
    const t = I.t, R = P.SC[id].ai;
    L.load(id);
    M.fill(0xFF, 0x5CF0, 0x5CFA);
    M[t.FROM] = from; M[t.TO] = to;
    R.pointAt({ a: from }); const aa = R.areaAt().a;
    R.pointAt({ a: to }); const ab = R.areaAt().a;
    R.findRoute();
    const got = [...M.slice(0x5CF0, 0x5CFA)].filter(z => z !== 0xFF);
    const lim = t.depthMax ? ' It tries no route of more than ' + t.depthMax + ' links.' : ' It tries routes of any length.';
    if (!got.length || got[0] !== from) {
      route = null;
      out.innerHTML = 'From waypoint ' + from + ' (area ' + aa + ') to waypoint ' + to + ' (area ' + ab + '): <b>no route kept</b>. ' +
        'findRoute keeps only a route cheaper than its starting bound, ' + (aa === ab ? '25, as the two are in the same area' : M[t.BEST] + ', the cost between the two areas in the scenario\'s table') + ', and found none.' + lim;
    } else {
      route = got;
      out.innerHTML = 'From waypoint ' + from + ' (area ' + aa + ') to waypoint ' + to + ' (area ' + ab + '): ' +
        (got[got.length - 1] === to ? '<b>' + got.join(' → ') + '</b>, cost ' + M[t.BEST] + '.'
          : 'the first ten waypoints of a route of cost ' + M[t.BEST] + ', <b>' + got.join(' → ') + '</b>, the most the game keeps of a route.') + lim;
    }
    draw();
  }
  function pick(e) {
    const b = cv.getBoundingClientRect();
    const x = (e.clientX - b.left) * cv.width / b.width, y = (e.clientY - b.top) * cv.height / b.height;
    let best = 0, d = 1e9;
    for (let z = 1; z <= I.n; z++) { const p = I.pts[z], dd = ((p[1] + .5) * K - x) ** 2 + ((p[0] + .5) * K - y) ** 2; if (dd < d) { d = dd; best = z; } }
    if (!from || to) { from = best; to = 0; route = null; out.textContent = 'Waypoint ' + from + '. Now pick where to go.'; draw(); }
    else if (best !== from) { to = best; search(); }
  }
  function start() {
    I = info(); from = to = 0; route = null; draw();
    out.textContent = I.n + ' waypoints, ' + I.links.length + ' links and ' + I.areas.length + ' areas. Pick a waypoint to start from.';
  }
  cv.addEventListener('click', pick);
  sel.addEventListener('change', () => { id = sel.value; start(); });
  start();
})();
})();
