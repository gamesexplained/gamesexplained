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

// ---- The computer's plan: the scenario's areas, waypoints and links as its own copy of the
// computer player keeps them (LSPages.plan), and each of the second side's units with its orders:
// the waypoints it walks round, what its flags make it do (unitMove, aiStep, aiCanGo in g-ai.js),
// and how much an enemy is worth to it in each area (its row of VALUES, which chooseTarget adds to
// an enemy's score; 0 scores the enemy nothing)
const ai = (function () {
  const cv = $('mp-plan'), g = cv.getContext('2d'), box = $('mp-plan-units'), out = $('mp-plan-out');
  const PK = cv.width / 80;
  const HUE = ['#ffff00', '#ff8040', '#ff40ff', '#40ff80', '#40c0ff', '#ffffff', '#ffa0a0', '#a0ffa0', '#a0a0ff', '#ffd040', '#40ffff', '#ff4080'];
  let I = null, pick = -1, U2 = [];
  const centre = p => [(p[1] + .5) * PK, (p[0] + .5) * PK];
  function arrow(x0, y0, x1, y1) {
    const a = Math.atan2(y1 - y0, x1 - x0), mx = (x0 + x1) / 2, my = (y0 + y1) / 2, s = 9;
    g.beginPath(); g.moveTo(mx + s * Math.cos(a), my + s * Math.sin(a));
    g.lineTo(mx + s * Math.cos(a + 2.5), my + s * Math.sin(a + 2.5));
    g.lineTo(mx + s * Math.cos(a - 2.5), my + s * Math.sin(a - 2.5)); g.closePath(); g.fill();
  }
  // the unit's round as the computer walks it: from each waypoint of its orders to the next (the
  // last back to the first), along the route its own findRoute gives, ten waypoints at a time, as
  // moveOn asks for it again from where each route ends; null for a leg with no route
  function legs(u) {
    const out = [];
    if (u.way.length < 2) return out;
    for (let i = 0; i < u.way.length; i++) {
      const a = u.way[i], b = u.way[(i + 1) % u.way.length];
      if (a === b) continue;
      const path = [a];
      let at = a;
      for (let n = 0; n < 8 && at !== b; n++) {
        const r = I.route(at, b);
        if (!r || r.length < 2) break;
        path.push(...r.slice(1));
        at = r[r.length - 1];
      }
      out.push({ a, b, path: at === b ? path : null });
    }
    return out;
  }
  function loop(u, colour, width) {
    g.strokeStyle = colour; g.fillStyle = colour; g.lineWidth = width;
    for (const l of u.legs) {
      if (!l.path) {
        g.save(); g.setLineDash([10, 8]); g.strokeStyle = '#ff5050'; g.fillStyle = '#ff5050';
        g.beginPath(); g.moveTo(...centre(I.pts[l.a])); g.lineTo(...centre(I.pts[l.b])); g.stroke();
        arrow(...centre(I.pts[l.a]), ...centre(I.pts[l.b]));
        g.restore();
        continue;
      }
      const p = l.path.map(z => centre(I.pts[z]));
      g.beginPath();
      p.forEach(([x, y], i) => { if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      g.stroke();
      const m = Math.max(0, (p.length >> 1) - 1);
      arrow(...p[m], ...p[m + 1]);
    }
  }
  function draw() {
    const key = id;
    if (!maps[key]) maps[key] = L.map(id, false);
    g.imageSmoothingEnabled = true;
    g.drawImage(maps[key], 0, 0, cv.width, cv.height);
    g.fillStyle = 'rgba(14,16,20,.72)'; g.fillRect(0, 0, cv.width, cv.height);
    const sel = pick >= 0 ? U2[pick] : null;
    // the areas, shaded by what an enemy in each is worth to the unit picked
    let top = 1;
    if (sel && I.t.VALUES !== undefined) for (const a of I.areas) top = Math.max(top, I.value(sel.values, a[4]));
    g.font = 'bold 20px "IBM Plex Mono", monospace'; g.textAlign = 'left'; g.textBaseline = 'top';
    for (const [r0, r1, c0, c1, n] of I.areas) {
      if (sel && I.t.VALUES !== undefined) {
        const v = I.value(sel.values, n);
        if (v > 0) { g.fillStyle = 'rgba(255,200,0,' + (0.15 + 0.5 * v / top).toFixed(2) + ')'; g.fillRect(c0 * PK, r0 * PK, (c1 - c0) * PK, (r1 - r0) * PK); }
      }
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1;
      g.strokeRect(c0 * PK + .5, r0 * PK + .5, (c1 - c0) * PK - 1, (r1 - r0) * PK - 1);
      g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText(String(n), c0 * PK + 4, r0 * PK + 3);
    }
    // the links between waypoints
    g.strokeStyle = 'rgba(0,255,255,.35)'; g.lineWidth = 1.5; g.beginPath();
    for (const [a, b] of I.links) { const p = I.pts[a], q = I.pts[b]; if (!p || !q) continue; g.moveTo(...centre(p)); g.lineTo(...centre(q)); }
    g.stroke();
    // the units' rounds: all faint, the one picked bold
    if (!sel) { g.globalAlpha = .8; U2.forEach((u, i) => loop(u, HUE[i % HUE.length], 2.5)); g.globalAlpha = 1; }
    if (sel) {
      const r = U.find(x => x.code === sel.code);
      if (r && r.rows && r.cols) { g.fillStyle = 'rgba(255,80,80,.35)'; g.fillRect(r.c0 * PK, r.r0 * PK, r.cols * PK, r.rows * PK); g.strokeStyle = '#ff5050'; g.lineWidth = 4; g.strokeRect(r.c0 * PK + 2, r.r0 * PK + 2, r.cols * PK - 4, r.rows * PK - 4); }
      loop(sel, '#ffff00', 5);
    }
    // the terminals of The Cyber Hordes
    for (const [r, c, z] of I.terminals) {
      g.strokeStyle = '#ff40ff'; g.lineWidth = 3; g.strokeRect(c * PK + 1, r * PK + 1, PK - 2, PK - 2);
    }
    // the waypoints, numbered
    g.textAlign = 'center'; g.textBaseline = 'bottom'; g.font = 'bold 16px "IBM Plex Mono", monospace'; g.lineJoin = 'round';
    const on = new Set(sel ? sel.way : []);
    for (let z = 1; z <= I.n; z++) {
      const [x, y] = centre(I.pts[z]);
      g.fillStyle = on.has(z) ? '#ffff00' : '#ffffff';
      g.beginPath(); g.arc(x, y, on.has(z) ? 6 : 3.5, 0, 7); g.fill();
      if (on.has(z) || !sel) { g.strokeStyle = '#000'; g.lineWidth = 4; g.strokeText(String(z), x, y - 6); g.fillStyle = on.has(z) ? '#ffff00' : '#ffffff'; g.fillText(String(z), x, y - 6); }
    }
  }
  // what the orders' flags (byte 8) make the unit do: unitMove's choice between hunting and its
  // orders (bit 3), the reserve walk sets (bits 0 and 1, $B714 once an enemy or a shot is seen),
  // aiStep's aiDanger (bit 2), and with charge, aiCanGo and peek (bit 4)
  const FLAGS = u => {
    const w = [];
    if (u.flags & 8) w.push('With no enemy in sight it walks its orders, and never sets off after one it saw before.');
    else w.push('With no enemy in sight it scores every enemy it knows of, by what it carries' + (I.t.VALUES !== undefined ? ', the area it stands in' : '') +
      ', how near it is and how lately it was seen, and goes after the best by the cheapest route between waypoints; with none seen lately, it walks its orders.');
    if (u.flags & 0x10 && I.t.charge) w.push('An enemy in sight it runs at without stopping to fire, and fights it hand to hand.');
    if (u.flags & 1) w.push('Walking its orders, it spends all its points.');
    else if (u.flags & 2) w.push('Walking its orders, it keeps half its points to fire in the other side\'s turn.');
    else w.push('Walking its orders, it keeps half its points to fire in the other side\'s turn once the computer has seen an enemy or a shot.');
    if (u.flags & 4) w.push('It never steps where an enemy that can still fire would see it.');
    return w.join(' ');
  };
  function describe(u) {
    const nm = u.label;
    const lv = []; for (let k = 1; k <= M[0xB684]; k++) if (M[0xB670 + u.k] & 1 << k) lv.push(k);
    const at = ' It plays at ' + (lv.length === M[0xB684] ? 'every level' : (lv.length > 1 ? 'levels ' : 'level ') + runs(lv)) + '.';
    if (u.alien) {
      const t = I.terminals[u.terminal];
      return '<b>' + nm + '</b> has no orders. It walks to terminal ' + (u.terminal + 1) + (t ? ' (row ' + t[0] + ', column ' + t[1] + ')' : '') +
        ', shooting any terminal it has a clear line to on the way, and fires at an enemy it sees instead. Once there, or when that terminal is gone, it picks one of the seven at random.' + at;
    }
    const way = u.way.length ? 'walks round waypoints <b>' + u.way.join(' → ') + '</b>' + (u.way.length > 1 ? ' and back to ' + u.way[0] : '') : 'has no waypoints to walk to';
    let v = '';
    if (I.t.VALUES !== undefined) {
      const zero = [...new Set(I.areas.filter(a => !I.value(u.values, a[4])).map(a => a[4]))];
      v = ' An enemy is worth more to it in the areas shaded darker' + (zero.length ? ', and nothing in ' + (zero.length === new Set(I.areas.map(a => a[4])).size ? 'any of them' :
        (zero.length > 1 ? 'areas ' : 'area ') + runs(zero)) : '') + (zero.length && I.t.skipZero ? ', where it never goes after one' : '') + '.';
    }
    const lost = u.legs.filter(l => !l.path).map(l => 'from ' + l.a + ' to ' + l.b);
    const none = lost.length ? ' On the way ' + lost.join(' and ') + ' the computer\'s search finds no route, and the unit follows whatever route the last search that found one left behind.' : '';
    return '<b>' + nm + '</b> ' + way + '.' + none + ' ' + FLAGS(u) + v + at;
  }
  // 1, 2, 3, 5, 7, 8, 9 as "1–3, 5, 7–9"
  function runs(list) {
    const out = [];
    for (let i = 0; i < list.length; ) {
      let j = i; while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
      out.push(j > i + 1 ? list[i] + '–' + list[j] : j === i + 1 ? list[i] + ', ' + list[j] : String(list[i]));
      i = j + 1;
    }
    return out.join(', ');
  }
  function buttons() {
    box.textContent = '';
    const all = document.createElement('button');
    all.type = 'button'; all.className = 'hw-btn'; all.textContent = 'All';
    all.addEventListener('click', () => choose(-1));
    box.appendChild(all);
    U2.forEach((u, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hw-btn';
      b.textContent = u.label;
      if (!u.alien) b.style.borderLeft = '4px solid ' + HUE[i % HUE.length];
      b.addEventListener('click', () => choose(i));
      box.appendChild(b);
    });
  }
  function choose(i) {
    pick = i;
    [...box.children].forEach((b, k) => b.setAttribute('aria-pressed', String(k === i + 1)));
    draw();
    out.innerHTML = i < 0 ? I.n + ' waypoints, ' + new Set(I.links.map(([a, b]) => Math.min(a, b) + ',' + Math.max(a, b))).size + ' links and ' + new Set(I.areas.map(a => a[4])).size + ' areas, and each unit\'s round in its colour' +
      (I.terminals.length ? '; the seven terminals outlined in magenta' : '') + '. Pick a unit for its orders.' : describe(U2[i]);
  }
  function show() {
    L.load(id);
    I = L.plan();
    // the second side's units that play against the computer at some level (bits 1 to 7 of
    // $B670), each named as the scenario names it, with a number where several share a name
    U2 = I.units.filter(u => M[0xB670 + u.k] & 0xFE);
    const count = {}, seen = {};
    for (const u of U2) { u.name = L.title(L.name(u.code)); count[u.name] = (count[u.name] || 0) + 1; }
    for (const u of U2) u.legs = legs(u);
    for (const u of U2) if (count[u.name] > 1) { seen[u.name] = (seen[u.name] || 0) + 1; u.label = u.name + ' ' + seen[u.name]; } else u.label = u.name;
    buttons();
    choose(-1);
  }
  const point = e => {
    if (!I) return;
    const b = cv.getBoundingClientRect();
    const c = Math.floor((e.clientX - b.left) / b.width * 80), r = Math.floor((e.clientY - b.top) / b.height * 50);
    if (r < 0 || r > 49 || c < 0 || c > 79) return;
    const a = I.areas.find(([r0, r1, c0, c1]) => r >= r0 && r < r1 && c >= c0 && c < c1);
    let best = 0, d = 1e9;
    for (let z = 1; z <= I.n; z++) { const p = I.pts[z], dd = (p[0] - r) ** 2 + (p[1] - c) ** 2; if (dd < d) { d = dd; best = z; } }
    const sel = pick >= 0 ? U2[pick] : null;
    $('mp-plan-at').innerHTML = 'Row ' + r + ', column ' + c + ': ' + (a ? 'area ' + a[4] + (sel && I.t.VALUES !== undefined ? ', worth ' + I.value(sel.values, a[4]) + ' to ' + sel.label : '') : 'in no area, where an enemy scores nothing') +
      '; the nearest waypoint is ' + best + '.';
  };
  cv.addEventListener('pointermove', point);
  cv.addEventListener('pointerdown', point);
  return { show };
})();
let U = [];
function show() {
  U = units();
  draw(U);
  table(U);
  for (const b of box.children) b.setAttribute('aria-pressed', b.dataset.id === id);
  $('mp-title').textContent = L.TITLES[id];
  out.textContent = 'Point at a square.';
  ai.show();
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
