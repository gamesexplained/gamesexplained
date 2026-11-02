// The Discoveries tab (../../discoveries.html): each picture is the Play tab's port drawing the view
// (set_start, draw_view, copy_view) on the memory the page carries, after the game's own scripts
// have run through the port's run_scripts, as the game runs them after a pass: a shot sets $8BF1
// and names the object in $8A69, and the number of safe sectors is $889E.
(function () {
'use strict';
const PAL = ['#000000', '#0000d7', '#d70000', '#d700d7', '#00d700', '#00d7d7', '#d7d700', '#d7d7d7',
  '#000000', '#0000ff', '#ff0000', '#ff00ff', '#00ff00', '#00ffff', '#ffff00', '#ffffff'];
const RGB = PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const $ = id => document.getElementById(id);
const data = JSON.parse($('dr-data').textContent);
const M = new Uint8Array(65536);
M.set(b64(data.ram), data.from || 0);
if (data.rom) M.set(b64(data.rom.bytes), data.rom.from);
const P = DRPort.makePort(M, { in: () => 0xFF, out() {}, irqByte: a => M[a] });
P.T = 0;
P.new_game({});
const M0 = M.slice();

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
// a generator run to its end, the interrupt's countdowns served at each wait
function run(g) { let r, n = 0; do { M[0x8FC2] = 0; M[0x8A21] &= ~1; r = g.next(); } while (!r.done && ++n < 1e5); }
// one pass's scripts: the object shot (0 for none), then the shared scripts and the area's
function pass(shot) {
  M[0x8A64] = 1; M[0x8A69] = shot || 0; M[0x8BF1] = shot ? 1 : 0; M[0x8A1E] = 0;
  run(P.run_scripts({}));
}
function enter(n, e, at) {
  M.set(M0);
  M[0x8862] = n; M[0x8911] = e;
  P.set_start({});
  if (at) for (const [k, v] of Object.entries(at)) M[+k] = v;
}
function draw(cv) {
  if (M[0x8910]) P.set_area_colours({});
  M[0x8920] |= 4; M[0x8A1F] = 0;
  P.draw_view({});
  P.copy_view({});
  cv.getContext('2d').putImageData(screenImage(), 0, 0);
}
const shown = id => { M[0x8916] = id; const f = P.find_object({ a: 0 }); return !(f.a & 255) && !(M[f.ix & 0xFFFF] & 0x60); };
const score = () => M[0x8872] | M[0x8873] << 8 | M[0x8874] << 16;
// the probe walked north from Trachyte's entrance to this cell along, nearer the frame, and looking up
// by four 72nds of a turn (the pitch, $876C), so the whole frame is in view
const ALONG = 20, PITCH = 68;

// ---- Trachyte's puzzle: shoot the shapes in the frame
(function () {
  const cv = $('ds-trachyte'), btns = $('ds-shots'), log = $('ds-log'), out = $('ds-score');
  const TARGETS = [[18, 'the lower pyramid'], [16, 'the upper pyramid'], [15, 'the left pyramid'], [17, 'the right pyramid'], [19, 'the shape in the middle'], [1, 'the floor']];
  let shots = [];
  function replay() {
    enter(18, 20);
    M[0x88B7] = ALONG; const f = (ALONG << 6) + 0x20; M[0x8766] = f & 255; M[0x8767] = f >> 8; M[0x876C] = PITCH;
    for (const s of shots) pass(s);
    draw(cv);
    btns.textContent = '';
    for (const [id, name] of TARGETS) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hw-btn'; b.textContent = 'Shoot ' + name;
      b.disabled = !shown(id) || score() >= 1000000;
      b.addEventListener('click', () => { shots.push(id); replay(); });
      btns.appendChild(b);
    }
    log.textContent = shots.length ? 'Shots: ' + shots.map(id => TARGETS.find(t => t[0] === id)[1]).join(', ') : 'No shots yet.';
    out.textContent = score() ? 'Score: ' + score().toLocaleString('en-GB') : '';
  }
  $('ds-reset').addEventListener('click', () => { shots = []; replay(); });
  $('ds-solve').addEventListener('click', () => { shots = []; replay(); [18, 19, 17, 1].forEach((id, k) => setTimeout(() => { shots.push(id); replay(); }, 700 * (k + 1))); });
  replay();
})();

// ---- Obsidian's wall at 16 and at 17 safe sectors
(function () {
  for (const [id, safe] of [['ds-obs16', 16], ['ds-obs17', 17]]) {
    enter(14, 22);
    M[0x889E] = safe;
    pass(0);
    draw($(id));
  }
})();

// ---- Mitral, off the edge of the moon
(function () {
  enter(32, 7);
  draw($('ds-mitral'));
})();
})();
