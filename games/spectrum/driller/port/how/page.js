// The How it works tab (../../index.html): its widgets run the Play tab's port, checked against the
// game's own code (port/test), on the memory the page carries (scripts/pack-data.js, the code left
// out), started as the game starts a game (new_game). The painter wraps the port's fill_face to
// copy the view to the screen after each face; the sound effects are play_sound's writes to port
// $FE at the T-states its loops take, played by the site's model of the beeper (site/lib/ay.js);
// the gas runs drill's own arithmetic (mul_s8, div_24_16) on the sector's field; the security
// question reads the table at $ABC1 as security does.
(function () {
'use strict';
const PAL = ['#000000', '#0000d7', '#d70000', '#d700d7', '#00d700', '#00d7d7', '#d7d700', '#d7d7d7',
  '#000000', '#0000ff', '#ff0000', '#ff00ff', '#00ff00', '#00ffff', '#ffff00', '#ffffff'];
const RGB = PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const $ = id => document.getElementById(id);
const hex = (v, n) => '$' + v.toString(16).toUpperCase().padStart(n || 2, '0');

// ---- the game's memory, and a port on it at the start of a game
const data = JSON.parse($('dr-data').textContent);
const M = new Uint8Array(65536);
M.set(b64(data.ram), data.from || 0);
if (data.rom) M.set(b64(data.rom.bytes), data.rom.from);
const io = { in: () => 0xFF, out() {}, irqByte: a => M[a] };
const P = DRPort.makePort(M, io);
P.T = 0;
const D = DRMaps.decode(M);
const M00 = M.slice();                       // as the tape leaves it, for the security table
P.new_game({});
const M0 = M.slice();
const byNumber = new Map(D.areas.map(a => [a.number, a]));
const cap = s => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, p, c) => p + c.toUpperCase()).replace(/\bK(\d)/i, 'K$1');
const title = a => (a.number === 127 ? 'The game over' : cap(a.name)) + ' (' + a.number + ')';

// The view window as the screen shows it: 208 pixels from column 3, 105 rows from row 16
function screenImage() {
  const W = 208, H = 105, img = new ImageData(W, H);
  for (let y = 0; y < H; y++) {
    const sy = 16 + y;
    for (let x = 0; x < W; x++) {
      const sx = 24 + x;
      const a = 0x4000 | ((sy & 0xC0) << 5) | ((sy & 7) << 8) | ((sy & 0x38) << 2) | (sx >> 3);
      const at = M[0x5800 + (sy >> 3) * 32 + (sx >> 3)], bit = (M[a] >> (7 - (sx & 7))) & 1;
      const br = at & 0x40 ? 8 : 0, c = RGB[bit ? (at & 7) + br : ((at >> 3) & 7) + br];
      const i = (y * W + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
  }
  return img;
}

// ---- 1. The painter: the view from an entrance, a picture after each face the game fills
const painter = (function () {
  const cv = $('hw-view'), g = cv.getContext('2d');
  const sel = $('hw-area'), ents = $('hw-ents'), turn = $('hw-turn'), turnOut = $('hw-turn-out');
  const step = $('hw-face'), stepOut = $('hw-face-out'), play = $('hw-play');
  let frames = [], area = null, ent = 0, timer = null;
  const areas = D.areas.filter(a => a.objects.some(o => o.type === 0)).sort((p, q) => p.number - q.number);
  for (const a of areas) { const o = document.createElement('option'); o.value = a.number; o.textContent = title(a); sel.appendChild(o); }
  function paint(heading) {
    M.set(M0);
    M[0x8862] = area.number; M[0x8911] = ent;
    P.set_start({});
    if (heading != null) M[0x876D] = heading;
    if (M[0x8910]) P.set_area_colours({});
    M[0x8920] |= 4; M[0x8A1F] = 0;
    frames = [];
    const fill = P.fill_face;
    const shot = () => { M[0x8A1F] = 0; P.copy_view({}); frames.push(screenImage()); };
    P.fill_face = function (r) { if (!frames.length) shot(); const x = fill(r); shot(); return x; };
    try { P.draw_view({}); } finally { P.fill_face = fill; }
    if (!frames.length) { P.copy_view({}); frames.push(screenImage()); }
    turn.value = M[0x876D]; turnOut.textContent = M[0x876D] * 5 + '°';
    step.max = frames.length - 1; step.value = frames.length - 1;
    show();
  }
  function show() {
    const k = +step.value;
    g.putImageData(frames[k], 0, 0);
    stepOut.textContent = k ? 'face ' + k + ' of ' + (frames.length - 1) : 'the cleared view, before the first face';
  }
  function pick(n) {
    stop();
    area = byNumber.get(n); sel.value = n;
    const es = area.objects.filter(o => o.type === 0);
    ents.textContent = '';
    for (const o of es) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hw-btn'; b.textContent = 'Entrance ' + o.id;
      b.addEventListener('click', () => { stop(); ent = o.id; mark(); paint(); });
      ents.appendChild(b);
    }
    ent = es.length ? es[0].id : 0;
    mark(); paint();
  }
  function mark() { for (const b of ents.children) b.setAttribute('aria-pressed', b.textContent === 'Entrance ' + ent); }
  function stop() { if (timer) clearInterval(timer); timer = null; play.textContent = '▶ Paint it'; }
  sel.addEventListener('change', () => pick(+sel.value));
  turn.addEventListener('input', () => { stop(); paint(+turn.value); });
  step.addEventListener('input', () => { stop(); show(); });
  play.addEventListener('click', () => {
    if (timer) return stop();
    step.value = 0; show();
    play.textContent = '■ Stop';
    timer = setInterval(() => {
      if (+step.value >= frames.length - 1) return stop();
      step.value = +step.value + 1; show();
    }, Math.max(40, Math.min(250, 6000 / frames.length)));
  });
  pick(1);
})();

// ---- 2. The sound effects: play_sound's writes to the beeper, each at its own T-state
(function () {
  const box = $('hw-fx'), cv = $('hw-wave'), g = cv.getContext('2d'), out = $('hw-fx-out');
  const FRAME = 69888;                       // a 48K's frame, in T-states
  const USE = {
    1: 'the laser, between the lines of each shot', 2: 'a sensor\'s shot landing, played by the interrupt',
    3: 'a fall', 4: 'a climb up a step', 5: 'the rig put down or taken up; also scripts',
    6: 'a key in the menus, the security question', 10: 'going to another area',
    17: 'a wrong answer to the security question', 19: 'SPACE, and shooting an object with no script',
    20: 'the game over, but for a win'
  };
  // what the areas' scripts play, read from the scripts themselves
  const scripted = new Map();
  const note = (n, where) => { if (!scripted.has(n)) scripted.set(n, new Set()); scripted.get(n).add(where); };
  for (const a of D.areas) {
    for (const s of a.scripts) for (const i of s) if (i.op === 0x0F || i.op === 0x1C) note(i.args[0], cap(a.name));
    for (const o of a.objects) if (o.script) for (const i of o.script) if (i.op === 0x0F || i.op === 0x1C) note(i.args[0], cap(a.name));
  }
  for (const s of D.shared) for (const i of s) if (i.op === 0x0F || i.op === 0x1C) note(i.args[0], 'every area');
  function record(n) {
    M.set(M0);
    const edges = [], keep = P.io.out;
    P.io.out = (port, v, t) => { if ((port & 255) === 0xFE) edges.push([t, (v >> 4) & 1, v & 7]); };
    P.T = 0;
    try { P.play_sound({ a: n }); } finally { P.io.out = keep; }
    return { edges, T: P.T };
  }
  const fx = [];
  for (let n = 1; n <= 21; n++) {
    const r = record(n);
    const where = [USE[n], scripted.has(n) ? 'scripts in ' + [...scripted.get(n)].slice(0, 4).join(', ') + (scripted.get(n).size > 4 ? ' and more' : '') : null].filter(Boolean);
    fx.push(Object.assign(r, { n, where: where.join('; ') || 'nothing calls it' }));
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.n = n;
    const short = USE[n] ? USE[n].split(',')[0].split(';')[0] : scripted.has(n) ? 'scripts in ' + [...scripted.get(n)][0] + (scripted.get(n).size > 1 ? ' and others' : '') : 'nothing';
    b.innerHTML = '<span>' + n + ' · ' + (r.edges.length ? (r.T / 3500).toFixed(0) + ' ms' : 'silent') + '</span>' + short.replace(/^./, c => c.toUpperCase());
    if (!r.edges.length) b.disabled = true;
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
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const f = fx[+b.dataset.n - 1];
    for (const x of box.children) x.setAttribute('aria-pressed', x === b);
    draw(f);
    out.innerHTML = '<b>Effect ' + f.n + '</b>: ' + f.edges.length + ' writes to the beeper in ' + f.T.toLocaleString('en-GB') +
      ' T-states, ' + (f.T / 3500).toFixed(0) + ' ms with the interrupts off. Used by ' + f.where + '.';
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

// ---- 3. The gas: drill's sum on a sector's field, and the amounts by the frame of the first strike
(function () {
  const cv = $('hw-gas'), g = cv.getContext('2d'), sel = $('hw-sector'), out = $('hw-gas-out');
  const rot = $('hw-rot'), rotOut = $('hw-rot-out'), amts = $('hw-amts');
  const S = cv.width / 128;
  const sectors = D.areas.filter(a => a.number >= 1 && a.number <= 18).sort((p, q) => p.number - q.number);
  for (const a of sectors) { const o = document.createElement('option'); o.value = a.number; o.textContent = title(a); sel.appendChild(o); }
  let area = sectors[0], rig = null;
  // drill's strike for a rig whose centre is at cell (bx, bz): 100 less (|dx| + |dz|) x 100 over the
  // field's size, by the game's own multiply and divide; 0 or less strikes nothing
  function strike(bx, bz) {
    const gx = area.gas.x, gz = area.gas.z, size = area.gas.size;
    let dx = (gx - bx) & 255; if (dx & 128) dx = (-dx) & 255;
    let dz = (gz - bz) & 255; if (dz & 128) dz = (-dz) & 255;
    const d = P.mul_s8({ h: (dx + dz) & 255, l: 100 }).hl;
    const q = P.div_24_16({ a: 0, hl: d, de: size });
    const left = (100 - (q.hl & 0xFFFF)) & 0xFFFF;
    return { dx, dz, pct: left & 0x8000 || !left ? 0 : left };
  }
  function draw() {
    const W = cv.width;
    g.fillStyle = '#f1efea'; g.fillRect(0, 0, W, W);
    // the strike: every cell where a rig's centre would find gas, shaded by the percentage
    for (let z = 0; z < 128; z++) for (let x = 0; x < 128; x++) {
      const p = strike(x, z).pct;
      if (!p) continue;
      g.fillStyle = p >= 50 ? 'rgba(194,90,0,' + (0.25 + p / 250) + ')' : 'rgba(194,90,0,' + (0.06 + p / 400) + ')';
      g.fillRect(x * S, (127 - z) * S, S, S);
    }
    for (const o of area.objects) {
      if (o.type === 0 || o.type === 2 || o.id >= 51 && o.id <= 54 && o.type === 3) continue;
      if (o.sx >= 120 && o.sz >= 120) continue;          // the floor
      g.fillStyle = 'rgba(47,49,54,' + (o.startsHidden ? 0.12 : 0.35) + ')';
      g.fillRect(o.x * S, (127 - o.z - Math.max(o.sz, 1)) * S, Math.max(o.sx, 1) * S, Math.max(o.sz, 1) * S);
    }
    if (rig) {
      g.strokeStyle = '#2f3136'; g.lineWidth = 2;
      g.strokeRect((rig.x - 6) * S, (127 - rig.z - 6) * S, 12 * S, 12 * S);
      g.beginPath(); g.moveTo(rig.x * S, (127 - rig.z) * S); g.lineTo(area.gas.x * S, (127 - rig.z) * S);
      g.lineTo(area.gas.x * S, (127 - area.gas.z) * S); g.setLineDash([4, 3]); g.stroke(); g.setLineDash([]);
    }
    g.fillStyle = '#c25a00'; g.beginPath(); g.arc(area.gas.x * S, (127 - area.gas.z) * S, 4, 0, 7); g.fill();
  }
  function report() {
    const r = +rot.value, n = area.number, gas = M0[0x88EB + r + n - 1];
    rotOut.textContent = r;
    let cells = '';
    for (let k = 1; k <= 18; k++) cells += '<span' + (k === n ? ' class="on"' : '') + '>sector ' + k + '<b>' + M0[0x88EB + r + k - 1] + '</b></span>';
    amts.innerHTML = cells;
    const f = area.gas;
    let t = '<b>' + title(area) + '</b>: the field\'s centre is at x ' + f.x + ', z ' + f.z + ', its size ' + f.size + '. ';
    if (!rig) t += 'Click the plan to put a rig there.';
    else {
      const s = strike(rig.x, rig.z);
      t += 'The rig\'s centre at x ' + rig.x + ', z ' + rig.z + ' is ' + s.dx + ' + ' + s.dz + ' = ' + (s.dx + s.dz) + ' cells away. ';
      if (!s.pct) t += 'It strikes nothing.';
      else t += 'It taps <b>' + s.pct + ' %</b> of ' + gas + ' units, ' + (s.pct >= 50 ? '<b>making the sector safe</b>' : 'not enough to make the sector safe') +
        ', and the score goes up by ' + s.pct + ' × ' + gas + ' × 10 = ' + (s.pct * gas * 10).toLocaleString('en-GB') + '.';
    }
    out.innerHTML = t;
  }
  function place(e) {
    const r = cv.getBoundingClientRect();
    const x = Math.max(6, Math.min(121, Math.floor((e.clientX - r.left) / r.width * 128)));
    const z = Math.max(6, Math.min(121, 127 - Math.floor((e.clientY - r.top) / r.height * 128)));
    rig = { x, z }; draw(); report();
  }
  cv.addEventListener('pointerdown', e => { place(e); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (e.buttons) place(e); });
  sel.addEventListener('change', () => { area = byNumber.get(+sel.value); rig = null; draw(); report(); });
  rot.addEventListener('input', report);
  draw(); report();
})();

// ---- 4. The security question: record n of the table at $ABC1, n the frame counter's low 7 bits
(function () {
  const r = $('hw-sec'), rOut = $('hw-sec-out'), q = $('hw-sec-q'), bytes = $('hw-sec-bytes');
  const recs = [];
  for (let n = 0, iy = 0xABC1; n < 128; n++) {
    const len = M00[iy];
    recs.push({ at: iy, len, page: M00[iy + 1] - 0x40, line: M00[iy + 2], word: M00[iy + 3] - 0x20,
      raw: Array.from(M00.subarray(iy + 4, iy + 4 + len)) });
    iy += len + 4;
  }
  const letter = b => String.fromCharCode((((b & 0xBF) | 0x80) >> 1));
  function show() {
    const k = +r.value, x = recs[k];
    rOut.textContent = k;
    q.textContent = 'Page ' + x.page + ', line ' + x.line + ', word ' + x.word + ': ' + x.raw.map(letter).join('');
    let h = '<span>' + hex(x.len) + '<i>' + x.len + '</i></span><span>' + hex(x.page + 0x40) + '<i>p' + x.page + '</i></span>' +
      '<span>' + hex(x.line) + '<i>l' + x.line + '</i></span><span>' + hex(x.word + 0x20) + '<i>w' + x.word + '</i></span>';
    for (const b of x.raw) h += '<span>' + hex(b) + '<i>' + letter(b) + '</i></span>';
    bytes.innerHTML = h;
    $('hw-sec-at').textContent = hex(x.at, 4);
  }
  r.addEventListener('input', show);
  show();
})();
})();
