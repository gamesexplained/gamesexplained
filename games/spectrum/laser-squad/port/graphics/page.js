// The Graphics tab (../../graphics.html): every shape the units, the objects and the shots are drawn
// with, from each scenario's own tiles, by the Play tab's port on the memory the page carries
// (page/pages.js). A tile is the port's drawTile ($60AF); a unit's tiles come through setUnitTile's
// two tables ($6D10: the row for its kind and what it holds at ($B71C), 32 bytes a kind, and the
// eight facings of each row at ($B71E)); a square's colours and tile through the table of squares
// ($E65F, and $E79F in fire mode). The animations are the port's own routines (deathShow $83A6,
// blowShow $7F98, hitShow $8371, explode $9696, sparks $9475), run on the scenario as play
// starts, with a picture taken whenever the port's sounds and delays (P.spend) have moved the
// game's clock a frame of the Spectrum's fifty a second on, so each plays at the game's own pace,
// and with its sound: the port's writes to the beeper (LSPages.film and play).
(function () {
'use strict';
const L = LSPages, M = L.M, P = L.P, $ = L.$, hex = L.hex, V = P.V;
const w = a => M[a] | M[a + 1] << 8;
const FACING = ['up', 'up and right', 'right', 'down and right', 'down', 'down and left', 'left', 'up and left'];
const COLOUR = ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white'];
const colours = at => COLOUR[at & 7] + ' on ' + COLOUR[(at >> 3) & 7] + (at & 0x40 ? ', bright' : '');
const nameOf = code => { const n = L.name(code); return n ? L.title(n) : 'no name'; };
const sel = $('gx-scen'), prev = $('gx-prev'), next = $('gx-next');
let id = L.ORDER[0];

function canvasOf(img, scale, label) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  c.getContext('2d').putImageData(img, 0, 0);
  c.className = 'gx-tile';
  c.style.width = img.width * scale + 'px';
  if (label) { c.setAttribute('role', 'img'); c.setAttribute('aria-label', label); c.title = label; }
  return c;
}
// the kinds of object, 20 bytes each from ($B728) up to the scenario's list of objects at ($B72A)
const kindsOfObject = () => (w(0xB72A) - w(0xB728)) / 20;
// the scenario's units by kind ($00): for each, the row of tiles each thing it can hold gives it
// (entry 0 of its 32 at ($B71C) for empty hands, entry n for the kind of object $6D + n)
function unitKinds() {
  const nk = kindsOfObject(), list = [];
  for (let k = 0; k < 20; k++) {
    const kv = M[0xD39F + 40 * k];
    let e = list.find(x => x.kv === kv);
    if (!e) {
      e = { kv, units: [], rows: new Map() };
      const base = w(0xB71C) + ((kv >> 3 | kv << 5) & 255);
      for (let i = 0; i <= nk; i++) { const r = M[base + i]; if (!e.rows.has(r)) e.rows.set(r, []); e.rows.get(r).push(i); }
      list.push(e);
    }
    e.units.push(k);
  }
  return list;
}
const unitColours = k => M[0xE65F + 2 * (0x8C + k)];
const rowTiles = r => [...M.slice(w(0xB71E) + 8 * r, w(0xB71E) + 8 * r + 8)];
const holds = list => list.map(i => (i ? nameOf(0x6D + i) : 'empty hands'));

// ---- 1. The units: every row of tiles each kind is drawn with, in its eight facings
function units() {
  L.load(id);
  const box = $('gx-units');
  box.textContent = '';
  for (const e of unitKinds()) {
    const names = [...new Set(e.units.map(k => nameOf(0x8C + k)))];
    const side = M[0xD39F + 40 * e.units[0] + 0x25] & 1;
    const at = unitColours(e.units[0]);
    const h = document.createElement('h3');
    h.textContent = names.join(', ');
    const sub = document.createElement('span');
    sub.textContent = ' · ' + (side ? 'the second side' : 'the first side') + ', ' + e.units.length + (e.units.length > 1 ? ' units' : ' unit') + ', in ' + colours(at);
    h.appendChild(sub);
    box.appendChild(h);
    const tb = document.createElement('table');
    tb.className = 'gx-rows';
    const head = document.createElement('tr');
    head.innerHTML = '<th>Holding</th>' + FACING.map(f => '<th>' + f + '</th>').join('');
    tb.appendChild(head);
    for (const [r, list] of e.rows) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      const what = holds(list);
      td.innerHTML = '<b>' + what.slice(0, 3).join(', ') + '</b>' + (what.length > 3 ? ' and ' + (what.length - 3) + ' more' : '') + '<span>row ' + r + '</span>';
      td.title = what.join(', ');
      tr.appendChild(td);
      rowTiles(r).forEach((a, f) => {
        const c = document.createElement('td');
        c.appendChild(canvasOf(L.tile(a, at), 2, 'Tile ' + a + ', facing ' + FACING[f]));
        tr.appendChild(c);
      });
      tb.appendChild(tr);
    }
    const wrap = document.createElement('div');
    wrap.className = 'gx-scroll';
    wrap.appendChild(tb);
    box.appendChild(wrap);
  }
}

// ---- 2. What moves on the view: a death, a blow, a hit, the sparks of a shot and of a blast,
// each played from the port's own routine at the game's pace
const film = (function () {
  const cv = $('gx-film'), g = cv.getContext('2d'), out = $('gx-film-out'), box = $('gx-acts');
  let centre = null;
  // the scenario as play starts, the view on the first side's squares for placing (where the game
  // shows them first), and the square at its middle
  function scene() {
    L.load(id);
    const code = M[0xB65E];
    let at = 0;
    for (let a = 0; a < 4000; a++) if (M[0xD6BF + a] === code) { at = a; break; }
    L.inPlay();
    const vr = Math.max(0, Math.min(39, Math.floor(at / 80) - 5)), vc = Math.max(0, Math.min(69, at % 80 - 5));
    M[V.VIEW_ROW] = vr; M[V.VIEW_COL] = vc;
    P.drawView();
    centre = [vr + 5, vc + 5];
    M[0x5D3A] = centre[0]; M[0x5D3B] = centre[1];
    P.setw(0x5D3E, 0xD6BF + 80 * centre[0] + centre[1]);
  }
  // run(): the routine, filmed (LSPages.film): a picture each time the clock has moved a frame on,
  // and its sound
  const shoot = run => L.film(run);
  // loud: the reader pressed the button (the first film plays by itself, silent)
  let stop = () => {}, last = null, loud = false;
  function show(f) {
    stop();
    stop = L.play(f, img => g.putImageData(img, 0, 0), null, !loud);
  }
  function play(f, text) {
    last = f;
    out.innerHTML = text + ' It lasts ' + (f.T / 3500000).toFixed(2) + ' seconds of the game\'s time.';
    show(f);
  }
  const acts = [];
  function death(e) {
    scene();
    const k = e.units[0], ix = 0xD39F + 40 * k;
    M[0x5D39] = 0x8C + k; P.setw(0x5D3C, ix);
    M[ix + 0x21] = 0;
    const body = w(0xB720) + 4 * e.kv;
    return play(shoot(() => P.deathShow()), '<b>' + nameOf(0x8C + k) + ' dies</b>: sound effect 12 as the unit turns on the spot a facing at a time, round to face down and round once more, then sound effect 10 and the three tiles of its fall (' +
      [1, 2, 3].map(i => M[body + i]).join(', ') + ', in ' + colours(M[body]) + ', from the scenario\'s table at <code>' + hex(w(0xB720), 4) + '</code>).');
  }
  function blow() {
    scene();
    const list = []; for (let a = 0xB64E; M[a] !== 0xFF; a++) list.push(M[a]);
    return play(shoot(() => P.blowShow()), '<b>A blow</b> in close combat: tiles ' + list.join(', ') + ' (the scenario\'s list at <code>$B64E</code>) over the square in front, in white on black, each held for sound effect 9.');
  }
  function hit() {
    scene();
    M[0x5D98] = 8;
    return play(shoot(() => P.hitShow()), '<b>A hit</b> of 8 points: tiles ' + M[0xB653] + ' and ' + M[0xB654] + ' (<code>$B653</code>) in yellow, then the square again, once for every 4 points of damage.');
  }
  function shotSparks() {
    scene();
    M[0x5DDA] = 0x10; M[0x5DDD] = 1; M[0x5DDE] = 0x15; M[0x5DDB] = 88; M[0x5DDC] = 88;
    return play(shoot(() => P.sparks()), '<b>A shot\'s sparks</b> where it stopped: 16 crosses of five dots, each moving 21 times by its step in the table at <code>$954E</code>, as <code>shotPath</code> (<code>$90E4</code>) sets them.');
  }
  function blastSparks() {
    scene();
    // a grenade's blast, as How it works sets one off: its strength, and the square at the middle
    M[0x968E] = 100; M[0x9694] = centre[0]; M[0x9695] = centre[1];
    M[0x5DF7] = 0;
    const keepEnd = P.checkEnd;
    P.checkEnd = function* () { return {}; };
    try {
      P.clearFires();
      return play(shoot(() => P.explode({})), '<b>A blast</b> of strength 100: the view flashes white and blue three times with sound effect 9, then ' +
        ((100 >> 3) + 0x31) + ' sparks fly 26 times from the middle while the view\'s colours fade, and the view is drawn again with what broke.');
    } finally { P.checkEnd = keepEnd; }
  }
  function buttons() {
    box.textContent = '';
    L.load(id);
    acts.length = 0;
    for (const e of unitKinds()) {
      const names = [...new Set(e.units.map(k => nameOf(0x8C + k)))];
      acts.push([names[0] + ' dies', () => death(e)]);
    }
    acts.push(['A blow', blow], ['A hit', hit], ['A shot\'s sparks', shotSparks], ['A blast', blastSparks]);
    for (const [label, f] of acts) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hw-btn'; b.textContent = label;
      b.addEventListener('click', e => { loud = e.isTrusted; for (const x of box.children) x.setAttribute('aria-pressed', x === b); f(); });
      box.appendChild(b);
    }
    box.firstChild.click();
  }
  $('gx-again').addEventListener('click', e => { loud = e.isTrusted; if (last) show(last); });
  return { buttons };
})();

// ---- 3. The objects: each kind's colours and tile in the table of squares
function objects() {
  L.load(id);
  const box = $('gx-objects');
  box.textContent = '';
  for (let n = 0; n < kindsOfObject(); n++) {
    const code = 0x6E + n, a = 0xE65F + 2 * code;
    const d = document.createElement('div');
    d.className = 'gx-card';
    d.appendChild(canvasOf(L.tile(M[a + 1], M[a]), 2, nameOf(code) + ', tile ' + M[a + 1]));
    const p = document.createElement('p');
    p.innerHTML = '<b>' + nameOf(code) + '</b><span>map byte ' + hex(code) + ', tile ' + M[a + 1] + '</span>';
    d.appendChild(p);
    box.appendChild(d);
  }
}

// ---- 4. Fire mode: the units' blobs, and the crosshair the game plots dot by dot
function fireMode() {
  L.load(id);
  const box = $('gx-fire');
  box.textContent = '';
  const seen = new Map();
  for (let k = 0; k < 20; k++) {
    const b = 0xE79F + 2 * (0x8C + k), key = M[b] + ',' + M[b + 1];
    if (!seen.has(key)) seen.set(key, { at: M[b], a: M[b + 1], names: new Set() });
    seen.get(key).names.add(nameOf(0x8C + k));
  }
  for (const s of seen.values()) {
    const d = document.createElement('div');
    d.className = 'gx-card';
    d.appendChild(canvasOf(L.tile(s.a, s.at), 2, 'Tile ' + s.a));
    const p = document.createElement('p');
    const names = [...s.names];
    p.innerHTML = '<b>' + names.slice(0, 2).join(', ') + (names.length > 2 ? ' and ' + (names.length - 2) + ' more' : '') + '</b><span>tile ' + s.a + ' in ' + colours(s.at) + '</span>';
    d.appendChild(p);
    box.appendChild(d);
  }
  // the crosshair: drawCrosshair's 21 dots from the table at $8B50, round the cursor's pixel, on a
  // clear view
  for (let y = 0; y < 22; y++) { M.fill(0x47, 0x5821 + 32 * y, 0x5821 + 32 * y + 22); }
  for (let y = 8; y < 184; y++) for (let x = 1; x < 23; x++) M[0x4000 | (y & 0xC0) << 5 | (y & 7) << 8 | (y & 0x38) << 2 | x] = 0;
  M[0x5D11] = 80; M[0x5D12] = 80;
  P.drawCrosshair();
  const d = document.createElement('div');
  d.className = 'gx-card';
  d.appendChild(canvasOf(L.image(72, 72, 32, 32), 2, 'The crosshair'));
  const p = document.createElement('p');
  p.innerHTML = '<b>The crosshair</b><span>21 dots, flipped on and off, from the table at $8B50</span>';
  d.appendChild(p);
  box.appendChild(d);
}

// ---- 5. Every tile of the scenario, and what draws it
function tiles() {
  L.load(id);
  const use = new Map();
  const add = (a, what, at) => { if (!use.has(a)) use.set(a, { what: [], at }); use.get(a).what.push(what); };
  for (const e of unitKinds()) {
    const at = unitColours(e.units[0]), nm = nameOf(0x8C + e.units[0]);
    for (const r of e.rows.keys()) rowTiles(r).forEach((a, f) => add(a, nm + ', facing ' + FACING[f] + ' (row ' + r + ')', at));
    const body = w(0xB720) + 4 * e.kv;
    for (let i = 1; i <= 3; i++) add(M[body + i], nm + ' falling', M[body]);
  }
  for (let a = 0xB64E; M[a] !== 0xFF; a++) add(M[a], 'a blow', 0x47);
  add(M[0xB653], 'a hit', 0x46); add(M[0xB654], 'a hit', 0x46);
  for (let code = 0; code < 0x8C; code++) {
    const a = 0xE65F + 2 * code, b = 0xE79F + 2 * code;
    const nm = nameOf(code) + ' (map byte ' + hex(code) + ')';
    if (code < 0x6E + kindsOfObject()) { add(M[a + 1], nm, M[a]); add(M[b + 1], nm + ' in fire mode', M[b]); }
  }
  for (let k = 0; k < 20; k++) { const b = 0xE79F + 2 * (0x8C + k); add(M[b + 1], nameOf(0x8C + k) + ' in fire mode', M[b]); }
  const top = Math.max(...use.keys());
  const cv = $('gx-sheet'), g = cv.getContext('2d'), PITCH = 18, PER = 16;
  cv.width = PER * PITCH; cv.height = Math.ceil((top + 1) / PER) * PITCH;
  g.fillStyle = '#23262d'; g.fillRect(0, 0, cv.width, cv.height);
  let unused = 0;
  for (let a = 0; a <= top; a++) {
    const u = use.get(a);
    const x = (a % PER) * PITCH + 1, y = Math.floor(a / PER) * PITCH + 1;
    g.putImageData(L.tile(a, u ? u.at : 0x47), x, y);
    if (!u) { unused++; g.strokeStyle = '#ff5050'; g.lineWidth = 1; g.strokeRect(x - .5, y - .5, 17, 17); }
  }
  $('gx-sheet-sum').textContent = (top + 1) + ' tiles, 0 to ' + top + ', at ' + hex(0xE8DF, 4) + ' to ' + hex(0xE8DF + 32 * top + 31, 4) + '; ' +
    (unused ? unused + ' that no table of the scenario names, outlined in red.' : 'every one named by a table of the scenario.');
  const out = $('gx-sheet-out');
  const point = e => {
    const b = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - b.left) / b.width * cv.width / PITCH), y = Math.floor((e.clientY - b.top) / b.height * cv.height / PITCH);
    const a = y * PER + x;
    if (x < 0 || x >= PER || a > top || a < 0) return;
    const u = use.get(a);
    out.innerHTML = '<b>Tile ' + a + '</b>, its 32 bytes at <code>' + hex(0xE8DF + 32 * a, 4) + '</code>: ' +
      (u ? [...new Set(u.what)].slice(0, 6).join('; ') + (new Set(u.what).size > 6 ? '; and more' : '') + '.' : 'no table of the scenario names it.');
  };
  cv.onpointermove = point; cv.onpointerdown = point;
  out.textContent = 'Point at a tile.';
}

function show() {
  sel.value = id;
  const i = L.ORDER.indexOf(id);
  prev.classList.toggle('off', i === 0); next.classList.toggle('off', i === L.ORDER.length - 1);
  units(); film.buttons(); objects(); fireMode(); tiles();
}
for (const s of L.ORDER) { const o = document.createElement('option'); o.value = s; o.textContent = L.TITLES[s]; sel.appendChild(o); }
sel.addEventListener('change', () => { id = sel.value; show(); });
prev.addEventListener('click', () => { const i = L.ORDER.indexOf(id); if (i > 0) { id = L.ORDER[i - 1]; show(); } });
next.addEventListener('click', () => { const i = L.ORDER.indexOf(id); if (i < L.ORDER.length - 1) { id = L.ORDER[i + 1]; show(); } });
show();
})();
