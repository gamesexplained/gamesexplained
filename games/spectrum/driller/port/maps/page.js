// The Maps tab (../../levels.html): every area of the game, read from the memory the page carries
// (scripts/pack-data.js, the code left out) by maps/areas.js. The view from each entrance is the
// port's: new_game run once, then for the area and entrance chosen set_start, draw_view and
// copy_view, the routines the Play tab runs, checked against the game's (port/test). The plan is
// drawn from the objects' records, and the overview joins the areas by the edges their scripts
// lead through.
(function () {
'use strict';
const PAL = ['#000000', '#0000d7', '#d70000', '#d700d7', '#00d700', '#00d7d7', '#d7d700', '#d7d7d7',
  '#000000', '#0000ff', '#ff0000', '#ff00ff', '#00ff00', '#00ffff', '#ffff00', '#ffffff'];
const COLOUR = ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white'];
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const $ = id => document.getElementById(id);

// ---- the game's memory, and a port on it at the start of a game
const data = JSON.parse($('dr-data').textContent);
const M = new Uint8Array(65536);
M.set(b64(data.ram), data.from || 0);
if (data.rom) M.set(b64(data.rom.bytes), data.rom.from);
const P = DRPort.makePort(M, { in: () => 0xFF, out() {}, irqByte: a => M[a] });
P.T = 0;
const D = DRMaps.decode(M);                 // the areas as the tape holds them
P.new_game({});
const M0 = M.slice();
const areas = D.areas, byNumber = new Map(areas.map(a => [a.number, a]));

// The view from entrance e of area n: the view window, 26 bytes by 105 rows from the screen's
// column 3, row 16, with its attributes
function view(n, e) {
  M.set(M0);
  M[0x8862] = n; M[0x8911] = e;
  P.set_start({});
  M[0x8920] |= 4;
  P.draw_view({});
  if (M[0x8910]) P.set_area_colours({});
  P.copy_view({});
  const W = 208, H = 105, img = new ImageData(W, H);
  for (let y = 0; y < H; y++) {
    const sy = 16 + y;
    for (let x = 0; x < W; x++) {
      const sx = 24 + x;
      const a = 0x4000 | ((sy & 0xC0) << 5) | ((sy & 7) << 8) | ((sy & 0x38) << 2) | (sx >> 3);
      const at = M[0x5800 + (sy >> 3) * 32 + (sx >> 3)], bit = (M[a] >> (7 - (sx & 7))) & 1;
      const br = at & 0x40 ? 8 : 0, c = PAL[bit ? (at & 7) + br : ((at >> 3) & 7) + br];
      const i = (y * W + x) * 4;
      img.data[i] = parseInt(c.slice(1, 3), 16); img.data[i + 1] = parseInt(c.slice(3, 5), 16);
      img.data[i + 2] = parseInt(c.slice(5, 7), 16); img.data[i + 3] = 255;
    }
  }
  return img;
}

// ---- what the objects' scripts do, in words
const score = a => a[0] | a[1] << 8 | a[2] << 16;
const signed = v => (v > 127 ? v - 256 : v);
function areaName(n) { const a = byNumber.get(n); return a ? title(a) : 'area ' + n; }
function title(a) { return a.number === 127 ? 'The game over (127)' : cap(a.name) + ' (' + a.number + ')'; }
function cap(s) { return s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, p, c) => p + c.toUpperCase()).replace(/\bK(\d)/i, 'K$1'); }
function words(script) {
  const out = [];
  for (const i of script) {
    const a = i.args;
    let t;
    switch (i.op) {
      case 1: t = 'adds ' + score(a) + ' to the score'; break;
      case 2: t = (signed(a[0]) < 0 ? 'takes ' + -signed(a[0]) + ' of energy' : 'gives ' + a[0] + ' of energy'); break;
      case 0x13: t = (signed(a[0]) < 0 ? 'takes ' + -signed(a[0]) + ' of shield' : 'gives ' + a[0] + ' of shield'); break;
      case 3: t = 'toggles object ' + a[0]; break;
      case 4: t = 'shows object ' + a[0]; break;
      case 5: t = 'hides object ' + a[0]; break;
      case 0x10: t = 'destroys object ' + a[0]; break;
      case 6: t = 'toggles object ' + a[1] + ' of ' + areaName(a[0]); break;
      case 7: t = 'shows object ' + a[1] + ' of ' + areaName(a[0]); break;
      case 8: t = 'hides object ' + a[1] + ' of ' + areaName(a[0]); break;
      case 0x11: t = 'destroys object ' + a[1] + ' of ' + areaName(a[0]); break;
      case 0x12: t = 'goes to ' + areaName(a[0]) + (a[1] ? ', entrance ' + a[1] : ', at the opposite edge'); break;
      case 0x15: t = 'swaps the probe and the jet'; break;
      case 0x0F: case 0x1C: t = 'plays sound ' + a[0]; break;
      case 0x0B: t = 'if variable ' + a[0] + ' is ' + a[1]; break;
      case 0x0E: t = 'if flag ' + a[0] + ' is ' + (a[1] ? 'set' : 'clear'); break;
      case 0x1E: t = 'if object ' + a[0] + ' is shown'; break;
      case 0x1F: t = 'if object ' + a[0] + ' is hidden'; break;
      case 0x20: t = 'if object ' + a[1] + ' of ' + areaName(a[0]) + ' is shown'; break;
      case 0x21: t = 'if object ' + a[1] + ' of ' + areaName(a[0]) + ' is hidden'; break;
      case 0x0C: t = 'sets flag ' + a[0]; break;
      case 0x0D: t = 'clears flag ' + a[0]; break;
      case 0x1D: t = 'toggles flag ' + a[0]; break;
      case 9: t = 'adds 1 to variable ' + a[0]; break;
      case 0x0A: t = 'takes 1 from variable ' + a[0]; break;
      case 0x14: t = 'sets variable ' + a[0] + ' to ' + a[1]; break;
      case 0x19: t = 'changes the colours'; break;
      case 0x1A: t = 'draws the view'; break;
      case 0x1B: t = 'waits ' + a[0] + ' frames'; break;
      default: t = null;
    }
    if (t) out.push({ shot: i.shot, t, test: /^if /.test(t) });
  }
  return out;
}
function sentence(script) {
  const w = words(script);
  // a test that fails ends the script, so what follows a test is done only when it holds
  const join = l => l.map((x, k) => (k && x.test ? 'then ' : '') + x.t).join(', ');
  const shot = join(w.filter(x => x.shot)), touch = join(w.filter(x => !x.shot));
  const s = [];
  if (shot) s.push('<b>Shot</b>: ' + shot);
  if (touch) s.push('<b>Touched</b>: ' + touch);
  return s.join('. ');
}
const KIND = ['entrance', 'cuboid', 'sensor', 'rectangle', 'pyramid', 'pyramid', 'pyramid', 'pyramid', 'pyramid', 'pyramid',
  'line', 'triangle', 'quadrilateral', 'pentagon', 'hexagon', 'shape'];

// ---- the edges: a rectangle along the area's side whose script leads on
function side(o) {
  if (o.type !== 3) return null;
  if (o.x === 0 && o.sx === 0 && o.sz === 127) return 'west';
  if (o.x === 127 && o.sx === 0 && o.sz === 127) return 'east';
  if (o.z === 0 && o.sz === 0 && o.sx === 127) return 'south';
  if (o.z === 127 && o.sz === 0 && o.sx === 127) return 'north';
  return null;
}
function edges(a) {
  const e = {};
  for (const o of a.objects) {
    const s = side(o);
    if (!s || !o.script) continue;
    const go = o.script.find(i => i.op === 0x12);
    e[s] = go ? go.args[0] : o.script.some(i => i.op === 0x0C && i.args[0] === 21) ? 'off' : null;
  }
  return e;
}
// the sectors laid out by their edges, from Amethyst
function layout() {
  const pos = new Map([[1, [0, 0]]]), todo = [1];
  const step = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
  while (todo.length) {
    const n = todo.shift(), a = byNumber.get(n), [x, y] = pos.get(n);
    for (const [s, to] of Object.entries(edges(a))) {
      if (typeof to !== 'number' || pos.has(to)) continue;
      const at = [x + step[s][0], y + step[s][1]];
      // the moon is round and the grid is flat: Diamond is south of Niccolite and of Opal, so an area
      // goes where it is first met, and a place another area has taken is left to the next way in
      if ([...pos.values()].some(p => p[0] === at[0] && p[1] === at[1])) continue;
      pos.set(to, at);
      todo.push(to);
    }
  }
  return pos;
}

// ---- the plan, x to the right and z up, 128 cells a side
function plan(cv, a, entrance) {
  const g = cv.getContext('2d'), S = cv.width / 128;
  const X = x => x * S, Z = z => cv.height - z * S;
  g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#e2dfd6'; g.lineWidth = 1;
  for (let k = 0; k <= 128; k += 16) { g.beginPath(); g.moveTo(X(k), 0); g.lineTo(X(k), cv.height); g.moveTo(0, Z(k)); g.lineTo(cv.width, Z(k)); g.stroke(); }
  // the gas field: a strike inside the outer diamond, a safe sector inside the inner
  if (a.gas.size) {
    for (const [r, f] of [[a.gas.size, 'rgba(194,90,0,.10)'], [a.gas.size / 2, 'rgba(194,90,0,.22)']]) {
      g.beginPath(); g.moveTo(X(a.gas.x - r), Z(a.gas.z)); g.lineTo(X(a.gas.x), Z(a.gas.z + r)); g.lineTo(X(a.gas.x + r), Z(a.gas.z)); g.lineTo(X(a.gas.x), Z(a.gas.z - r)); g.closePath();
      g.fillStyle = f; g.fill();
    }
  }
  const objs = a.objects.filter(o => o.type && !side(o) && !(o.type === 1 && o.sx >= 120 && o.sz >= 120));
  objs.sort((p, q) => p.y + p.sy - (q.y + q.sy));
  for (const o of objs) {
    const hidden = o.startsHidden, go = o.script && o.script.some(i => i.op === 0x12);
    g.setLineDash(hidden ? [4, 3] : []);
    if (o.type === 2) {
      g.fillStyle = '#d04a3a'; g.beginPath(); g.arc(X(o.x), Z(o.z), Math.max(3, S * 1.2), 0, 7); g.fill();
      continue;
    }
    const w = Math.max(o.sx, 0.6), d = Math.max(o.sz, 0.6);
    const top = Math.min(1, (o.y + o.sy) / 48);
    g.fillStyle = go ? 'rgba(31,95,168,.55)' : 'rgba(47,49,54,' + (0.18 + 0.5 * top).toFixed(2) + ')';
    if (o.type >= 10 || o.type === 3) g.fillStyle = go ? 'rgba(31,95,168,.55)' : 'rgba(47,49,54,.25)';
    g.fillRect(X(o.x), Z(o.z + d), w * S, d * S);
    g.strokeStyle = go ? '#1f5fa8' : '#2f3136'; g.lineWidth = hidden ? 1 : 1.2;
    g.strokeRect(X(o.x), Z(o.z + d), w * S, d * S);
  }
  g.setLineDash([]);
  // the entrances, each an arrow along its heading (72nds of a turn, 0 along z)
  for (const o of a.objects.filter(o => o.type === 0)) {
    const h = o.sy * Math.PI * 2 / 72, cx = X(o.x + 0.5), cz = Z(o.z + 0.5), L = 12;
    const on = o.id === entrance;
    g.strokeStyle = g.fillStyle = on ? '#2a8a4a' : '#7a9a80'; g.lineWidth = on ? 2.5 : 1.5;
    g.beginPath(); g.arc(cx, cz, on ? 4.5 : 3, 0, 7); g.fill();
    g.beginPath(); g.moveTo(cx, cz); g.lineTo(cx + Math.sin(h) * L, cz - Math.cos(h) * L); g.stroke();
  }
}

// ---- the page
const order = areas.slice().sort((p, q) => p.number - q.number);
const sel = $('mp-area'), ents = $('mp-ents'), cvv = $('mp-view'), cvp = $('mp-plan');
for (const a of order) { const o = document.createElement('option'); o.value = a.number; o.textContent = title(a); sel.appendChild(o); }
let cur = null, curEnt = null;
function entrances(a) { return a.objects.filter(o => o.type === 0 && !side(o)).sort((p, q) => p.id - q.id); }
function show(n, e) {
  const a = byNumber.get(n);
  if (!a) return;
  cur = a; sel.value = n;
  const es = entrances(a);
  curEnt = e !== undefined && es.some(o => o.id === e) ? e : es.length ? es[0].id : null;
  ents.textContent = '';
  for (const o of es) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = 'Entrance ' + o.id;
    b.setAttribute('aria-pressed', o.id === curEnt ? 'true' : 'false');
    b.addEventListener('click', () => show(a.number, o.id));
    ents.appendChild(b);
  }
  const g = cvv.getContext('2d');
  if (curEnt !== null) { g.putImageData(view(a.number, curEnt), 0, 0); cvv.parentNode.hidden = false; }
  else cvv.parentNode.hidden = true;
  plan(cvp, a, curEnt);
  info(a);
  for (const c of document.querySelectorAll('.mp-cell[data-n]')) c.classList.toggle('on', +c.dataset.n === a.number);
  if (history.replaceState) history.replaceState(null, '', '#area-' + a.number);
}
function info(a) {
  const t = $('mp-info'), types = {};
  for (const o of a.objects) if (o.type && !side(o)) { const k = KIND[o.type]; types[k] = (types[k] || 0) + 1; }
  const e = edges(a), sides = Object.entries(e).map(([s, to]) => s + ': ' + (to === 'off' ? 'off the moon (to Mitral)' : to === null ? 'closed' : areaName(to)));
  const rows = [
    ['Record', '<code>$' + a.at.toString(16).toUpperCase() + '</code>, ' + a.objects.length + ' objects'],
    ['Scale', a.scale + (a.scale === 1 ? '' : ': the probe stands, steps and climbs ' + a.scale + ' times as many cells as at scale 1, so the place is built ' + a.scale + ' times finer')],
    ['Colours', 'border ' + COLOUR[a.colours[0] & 7] + ', flash ' + COLOUR[a.colours[1] & 7] + ', paper ' + COLOUR[a.colours[2] & 7] + ', ink ' + COLOUR[a.colours[3] & 7]],
    ['Gas', a.gas.size ? 'centred at x ' + a.gas.x + ', z ' + a.gas.z + ', size ' + a.gas.size : a.number < 19 ? 'none' : 'none (no rig can be placed here)'],
    ['Shapes', Object.entries(types).map(([k, v]) => v + ' ' + k + (v > 1 ? 's' : '')).join(', ')],
    ['Edges', sides.length ? sides.join('; ') : 'none'],
  ];
  t.innerHTML = rows.map(([k, v]) => '<tr><th>' + k + '</th><td>' + v + '</td></tr>').join('');
  const list = $('mp-do'), items = [];
  a.scripts.forEach((s, i) => { const w = words(s); if (w.length) items.push('<li><b>The area, after each pass that moved</b>: ' + w.map((x, k) => (k && x.test ? 'then ' : '') + x.t).join(', ') + '</li>'); });
  for (const o of a.objects) {
    if (!o.script || side(o)) continue;
    const s = sentence(o.script);
    if (s) items.push('<li>' + 'Object ' + o.id + ' (' + KIND[o.type] + (o.startsHidden ? ', hidden at the start' : '') + '). ' + s + '</li>');
  }
  list.innerHTML = items.length ? items.join('') : '<li>Nothing here has a script.</li>';
}
sel.addEventListener('change', () => show(+sel.value));
$('mp-prev').addEventListener('click', () => { const i = order.indexOf(cur); if (i > 0) show(order[i - 1].number); });
$('mp-next').addEventListener('click', () => { const i = order.indexOf(cur); if (i < order.length - 1) show(order[i + 1].number); });

// the overview: the sectors where their edges put them, the rest below
(function grid() {
  const pos = layout(), box = $('mp-grid');
  const xs = [...pos.values()].map(p => p[0]), ys = [...pos.values()].map(p => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 + 1, h = Math.max(...ys) - y0 + 1;
  box.style.gridTemplateColumns = 'repeat(' + w + ', minmax(76px, 1fr))';
  const cells = Array.from({ length: w * h }, () => null);
  for (const [n, [x, y]] of pos) cells[(y - y0) * w + (x - x0)] = n;
  for (const n of cells) {
    const d = document.createElement(n ? 'button' : 'div');
    if (n) {
      const a = byNumber.get(n);
      d.type = 'button'; d.dataset.n = n; d.className = 'mp-cell';
      d.innerHTML = '<span>' + n + '</span>' + cap(a.name);
      d.addEventListener('click', () => { show(n); $('mp-viewer').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    } else d.className = 'mp-cell mp-none';
    box.appendChild(d);
  }
  const rest = $('mp-rest');
  for (const a of order) {
    if (pos.has(a.number)) continue;
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.n = a.number; b.className = 'mp-cell';
    b.innerHTML = '<span>' + a.number + '</span>' + (a.number === 127 ? 'The game over' : cap(a.name));
    b.addEventListener('click', () => { show(a.number); $('mp-viewer').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    rest.appendChild(b);
  }
})();

const m = /#area-(\d+)/.exec(location.hash);
show(m ? +m[1] : 1);
window.addEventListener('hashchange', () => { const k = /#area-(\d+)/.exec(location.hash); if (k && cur && +k[1] !== cur.number) show(+k[1]); });
})();
