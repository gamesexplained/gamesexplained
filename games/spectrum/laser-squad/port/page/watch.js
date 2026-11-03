// The Play tab's whole map (play.template.html, its "Whole map" switch): the map as the port's
// memory holds it, every unit on it, the ones hidden from the player too, and in a game against the
// computer ($B706) what each of the computer's units is doing: its round of waypoints from its
// orders (ORDERS + 10 x its $1A, g-ai.js), and as it moves ($5D36 set, its code at $5D26), the
// route it walks ($5CF0: the next waypoint ZONE, the rest from STACK), the waypoint it makes for
// (GOAL), the enemy it is after (TARGET, or CHARGE where it runs at one), and the squares it has
// stood on in the computer's half-turn ($5DF7 set).
// The computer's turn runs ahead of the screen: the program does not wait for the player, so the
// clock finishes frames faster than the page shows them. So each frame's units and plan are kept
// as the clock finishes it (rt.onFrame), and the map shows the frame on screen (rt.shown).
// It only reads the game's memory. The units' names come from a second port on a copy of it, which
// printMessage writes to.
//   const w = LSWatch.create({ rt: () => rt, canvas, list, out })
//   w.reset()   a new machine: its frames followed from now
//   w.draw()    the map and the plans for the frame on screen
(function (root) {
'use strict';
const PAL = ['#000000', '#0000d7', '#d70000', '#d700d7', '#00d700', '#00d7d7', '#d7d700', '#d7d7d7',
  '#000000', '#0000ff', '#ff0000', '#ff00ff', '#00ff00', '#00ffff', '#ffff00', '#ffffff'];
const RGB = PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
const HUE = ['#ffff00', '#ff8040', '#ff40ff', '#40ff80', '#40c0ff', '#ffffff', '#ffa0a0', '#a0ffa0', '#a0a0ff', '#ffd040', '#40ffff', '#ff4080'];
const ROWS = 50, COLS = 80, MAP = 0xD6BF, SQUARES = 0xE65F, TILES = 0xE8DF, TABLE = 0x5C50;
const KEEP = 4000;                                // frames kept: the runtime keeps as many ahead
const title = s => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, p, c) => p + c.toUpperCase());

function create(o) {
  const cv = o.canvas, g = cv.getContext('2d');
  const K = cv.width / COLS;
  const base = document.createElement('canvas');
  base.width = COLS * 16; base.height = ROWS * 16;
  const bg = base.getContext('2d');
  const img = bg.createImageData(COLS * 16, ROWS * 16);
  const keys = new Int32Array(ROWS * COLS).fill(-1);
  const one = document.createElement('canvas');
  one.width = one.height = 16;
  const og = one.getContext('2d'), oimg = og.createImageData(16, 16);
  let id = null, T = null, names = [], frames = [], listed = '', followed = null;

  // tile `t` in the colours `at`, 16 x 16 pixels from (x0, y0) of `im`, as drawTile lays out its
  // 32 bytes (top left, top right, bottom left, bottom right, eight rows each)
  function tile(M, im, x0, y0, t, at) {
    const br = at & 0x40 ? 8 : 0, ink = RGB[(at & 7) + br], paper = RGB[(at >> 3 & 7) + br];
    const gfx = TILES + 32 * t & 0xFFFF;
    for (let c = 0; c < 4; c++) {
      const cx = x0 + (c & 1) * 8, cy = y0 + (c >> 1) * 8;
      for (let j = 0; j < 8; j++) {
        const byte = M[gfx + 8 * c + j & 0xFFFF];
        for (let i = 0; i < 8; i++) {
          const col = byte >> (7 - i) & 1 ? ink : paper, k = ((cy + j) * im.width + cx + i) * 4;
          im.data[k] = col[0]; im.data[k + 1] = col[1]; im.data[k + 2] = col[2]; im.data[k + 3] = 255;
        }
      }
    }
  }
  // the map with no unit on it: a unit's square drawn as the floor under it (the fourth byte of
  // its entry in the table of units), each square through the table of squares at $E65F, its
  // colours and its tile; only the squares that changed since the last look
  function terrain(M) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      let sq = M[MAP + COLS * r + c];
      if (sq >= 0x8C && sq < 0xA0) sq = M[TABLE + 4 * (sq - 0x8C) + 3];
      const at = M[SQUARES + 2 * sq], t = M[SQUARES + 2 * sq + 1 & 0xFFFF], key = at << 8 | t, n = COLS * r + c;
      if (keys[n] === key) continue;
      keys[n] = key;
      tile(M, img, c * 16, r * 16, t, at);
      bg.putImageData(img, 0, 0, c * 16, r * 16, 16, 16);
    }
  }
  // the units' names, as the scenario's messages print them: printMessage on a copy of the memory
  function nameAll(M) {
    const M2 = new Uint8Array(M);
    const P2 = root.LSPort.makePort(M2, { in: () => 0xFF, out() {}, r: () => 0, irqByte: a => M2[a], tape: null });
    P2.useScenario(id);
    const out = [];
    for (let k = 0; k < 20; k++) {
      const s = [];
      P2.setw(0x5D1F, P2.w(0xB722)); P2.setw(0x5D07, P2.w(0xB724)); M2[0x5D09] = 0;
      P2.putChar = r => { s.push(String.fromCharCode(r.a)); return {}; };
      P2.advance = () => { s.push(' '); return {}; };
      P2.newLine = () => { s.push('\n'); return {}; };
      try { P2.printMessage({ a: 0x8D + k & 255 }); } catch (e) { s.length = 0; }
      out.push(title(s.join('').replace(/\s+/g, ' ').replace(/- /g, '-').trim()) || 'Unit ' + (k + 1));
    }
    return out;
  }
  const point = (M, z) => (z && T && z <= M[T.NPOINTS] ? [M[T.POINTS + 2 * (z - 1)], M[T.POINTS + 2 * (z - 1) + 1]] : null);
  const centre = p => [(p[1] + .5) * K, (p[0] + .5) * K];

  // a frame as the clock finishes it: the table of units, the view, whether the computer is
  // playing its half-turn, and the plan of the unit it is moving
  function sample(n) {
    const rt = o.rt();
    if (!rt) return;
    const M = rt.M, sid = rt.P.scenarioId();
    if (sid !== id) { id = sid; T = sid ? root.LSGroups.ai.TABLES[sid] : null; names = sid ? nameAll(M) : []; frames = []; keys.fill(-1); }
    if (!T) return;
    const f = { n, units: M.slice(TABLE, TABLE + 80), view: [M[0x5CFC], M[0x5CFD]], ai: !!(M[0xB706] && M[0x5DF7]), turn: M[0xB711], plan: null };
    if (f.ai && M[0x5D36]) {
      const k = M[0x5D26] - 0x8C;
      if (k >= 0 && k < 20) {
        const stack = M[T.STACK] | M[T.STACK + 1] << 8, route = [];
        for (let a = stack; a >= 0x5CF0 && a < 0x5CFA && M[a] && M[a] !== 0xFF; a++) route.push(M[a]);
        f.plan = { k, zone: M[T.ZONE], route, goal: M[T.GOAL], target: M[T.TARGET], charge: T.charge ? M[T.CHARGE] : 0 };
      }
    }
    frames.push(f);
    if (frames.length > KEEP) frames.splice(0, frames.length - KEEP);
  }

  function round(M, k) {
    const u = 0xD39F + 40 * k, way = [];
    if (T.aliens && k >= 16) return { alien: true, terminal: M[u + 0x1A], way };
    const ord = T.ORDERS + 10 * M[u + 0x1A];
    for (let i = 1; i < 8 && M[ord + i]; i++) way.push(M[ord + i]);
    return { way, next: M[ord + M[ord]] || way[0] };
  }
  function line(pts, colour, width, dash) {
    if (pts.length < 2) return;
    g.strokeStyle = colour; g.lineWidth = width; g.setLineDash(dash || []);
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = centre(p); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.stroke(); g.setLineDash([]);
  }
  function ring(p, colour, r) {
    const [x, y] = centre(p);
    g.strokeStyle = colour; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  }

  function draw() {
    const rt = o.rt();
    if (!rt || !id || !frames.length) {
      g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
      if (o.out) o.out.textContent = 'The map appears once a scenario has loaded.';
      return;
    }
    const M = rt.M;
    // the frame on screen, and the computer's half-turn it is in or follows
    let i = frames.length - 1;
    while (i > 0 && frames[i].n > rt.shown) i--;
    const now = frames[i];
    let end = i;
    while (end >= 0 && !frames[end].ai) end--;
    let start = end;
    while (start > 0 && frames[start - 1].ai && frames[start - 1].turn === frames[end].turn) start--;
    const trails = {}, plans = {};
    if (end >= 0) for (let j = start; j <= end; j++) {
      const f = frames[j];
      for (let k = 0; k < 20; k++) {
        if (f.units[4 * k] !== 1) continue;
        const p = [f.units[4 * k + 1], f.units[4 * k + 2]], tr = trails[k] || (trails[k] = []), l = tr[tr.length - 1];
        if (!l || l[0] !== p[0] || l[1] !== p[1]) tr.push(p);
      }
      if (f.plan) plans[f.plan.k] = f.plan;
    }
    const at = k => [now.units[4 * k + 1], now.units[4 * k + 2]];
    terrain(M);
    g.imageSmoothingEnabled = false;
    g.drawImage(base, 0, 0, cv.width, cv.height);
    const vs = !!M[0xB706];
    if (vs) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, cv.width, cv.height); }
    // the player's view: 11 squares by 11
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([6, 4]);
    g.strokeRect(now.view[1] * K, now.view[0] * K, 11 * K, 11 * K); g.setLineDash([]);
    const lines = [];
    if (vs) {
      // each of the computer's units: its round, thin; its trail in the half-turn; and, for the
      // ones it has moved, the route, the goal and the enemy
      for (let k = 0; k < 20; k++) {
        if (now.units[4 * k] !== 1) continue;
        const hue = HUE[k % HUE.length], rd = round(M, k), pl = plans[k];
        if (!rd.alien) {
          const pts = rd.way.map(z => point(M, z)).filter(Boolean);
          if (pts.length > 2) pts.push(pts[0]);
          g.globalAlpha = .55; line(pts, hue, 1.5, [3, 4]); g.globalAlpha = 1;
          for (const p of pts) { const [x, y] = centre(p); g.fillStyle = hue; g.fillRect(x - 2, y - 2, 4, 4); }
        }
        if (trails[k]) line(trails[k], hue, 3);
        const foe = pl && (pl.charge || pl.target);
        if (pl) {
          const rest = [];
          for (const z of [pl.zone].concat(pl.route)) { const p = point(M, z); if (p && (!rest.length || rest[rest.length - 1] !== p)) rest.push(p); if (z === pl.goal) break; }
          if (!pl.charge) line([at(k)].concat(rest), hue, 2, [8, 5]);
          const goal = point(M, pl.goal);
          if (goal && !pl.charge) ring(goal, hue, 7);
          if (foe >= 0x8C && foe < 0xA0) { line([at(k), at(foe - 0x8C)], '#ff3030', 2.5, [4, 3]); ring(at(foe - 0x8C), '#ff3030', 10); }
        }
        // what it is doing, in words
        let doing;
        if (rd.alien && T.TERMINALS) doing = rd.terminal === 0xFF ? 'choosing a terminal' : 'making for terminal ' + (rd.terminal + 1);
        else if (foe >= 0x8C && foe < 0xA0) doing = (pl.charge ? 'running at ' : 'going after ') + (names[foe - 0x8C] || 'an enemy');
        else if (pl) doing = 'walking its round, to waypoint ' + pl.goal;
        else doing = 'not moved; next on its round, waypoint ' + rd.next;
        lines.push('<li><i style="background:' + hue + '"></i><b>' + (names[k] || 'Unit ' + (k + 1)) + '</b> ' + doing + '</li>');
      }
    }
    // every unit on the map, the hidden ones too: its tile from the table of squares (setUnitTile
    // keeps it there), ringed in its side's colour, dashed when the player cannot see it
    for (let k = 0; k < 20; k++) {
      const s = now.units[4 * k];
      if (s > 1) continue;
      const [r, c] = at(k), code = 0x8C + k;
      tile(M, oimg, 0, 0, M[SQUARES + 2 * code + 1 & 0xFFFF], M[SQUARES + 2 * code]);
      og.putImageData(oimg, 0, 0);
      g.drawImage(one, c * K, r * K, K, K);
      g.strokeStyle = s ? '#ff5050' : '#40c0ff'; g.lineWidth = 2;
      g.setLineDash(M[MAP + COLS * r + c] === code ? [] : [3, 3]);
      g.strokeRect(c * K + 1, r * K + 1, K - 2, K - 2); g.setLineDash([]);
    }
    if (o.list) {
      const html = lines.join('');
      if (html !== listed) { listed = html; o.list.innerHTML = html; }
    }
    if (o.out) o.out.textContent = !vs ? 'In a game against the computer, its units\' plans appear here as it moves them.' :
      'Turn ' + now.turn + (now.ai ? ', the computer\'s half-turn' : end >= 0 ? ': the computer\'s last half-turn' : '');
  }
  function reset() {
    id = null; T = null; frames = []; keys.fill(-1); listed = '';
    const rt = o.rt();
    if (rt && rt !== followed) { followed = rt; rt.onFrame(n => { if (o.rt() === rt) sample(n); }); }
  }
  return { draw, reset };
}
root.LSWatch = { create };
})(window);
