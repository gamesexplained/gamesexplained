'use strict';
// Holds the ship browser's drawer (sr-ships on Ships and combat) to the engine. For every type with a
// model, the model is loaded as the game loads it (load_model, $1C95, relocating the page's copy
// of the file from sr-models, or the built-in missile and Sunracer in MAIN) and drawn by the
// engine's own draw_model ($7C61) in the kit's 6502 simulator from 400 eyes all round it. The test
// compares the points the engine places with the page's, and the polygons the engine draws, in
// order, with their colour codes, with the page's three passes. Then set_colour ($8F80) is run on
// every code and its patterns and screen matrix nybble compared with the page's colour().
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { CPU } = require(path.resolve(__dirname, '../../../kit/c64/cpu6502.js'));
const g = game(__dirname);
const { SRShips } = g.run('ships.html', 'sr-ships', 'SRShips');
const MODELS = JSON.parse(g.read('ships.html').match(/<script type="application\/json" id="sr-models">([^<]*)<\/script>/)[1]);
const ram = new Uint8Array(g.listing('parts/engine/listing.json').ram);
ram.set(g.listing('parts/flight/listing.json').ram.subarray(0xA500, 0xBD00), 0xA500);   // SEG0's maths

const s8 = v => v << 24 >> 24;
const logAt = (m, a) => { const w = s8(m[a + 1]); if (w < -10) return 0; const v = 2 ** (w + m[a] / 256); return m[a + 2] & 0x80 ? -v : v; };
const word = a => ram[a] | ram[a + 1] << 8;
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
let rnd = 12345;
const rand = () => (rnd = (rnd * 1103515245 + 12345) & 0x7FFFFFFF) / 0x7FFFFFFF;
let eyes = 0;
for (const t of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
  const m = new Uint8Array(ram);
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x34 }, io, strict: true });
  const scale = word(0x0A63 + 2 * t), dd = word(0x0999 + 2 * t), k = ram[0x093E + t];
  let file = null, start;
  if (k !== 0xFF) {
    const name = String.fromCharCode(...ram.subarray(0x0961 + 4 * k, 0x0964 + 4 * k));
    file = Buffer.from(MODELS[name], 'base64');
    m[0x1D80] = 0x00; m[0x1D81] = 0xE4;                       // the model heap from $E400
    for (let u = 0; u < 21; u++) if (ram[0x093E + u] === k) { m[0x08F8 + 2 * u] = 0; m[0x08F9 + 2 * u] = 0; }
    cpu.call(0x1C95, { y: t }, { hooks: { 0x1CBB: c => { m.set(file, m[0x80] | m[0x81] << 8); c.pc = 0x1CBE; } } });
    start = m[0x08F8 + 2 * t] | m[0x08F9 + 2 * t] << 8;
  } else start = word(0x08F8 + 2 * t);
  const model = SRShips.decode(file || ram, file ? 0 : start, scale);
  const front = dd ? Array.from(ram.subarray(dd, dd + model.n.polys)) : null;
  let rec = [];
  const draw = eye => {
    m[0x74] = 0xAB; m[0x75] = 0x0D; m[0x78] = 0xA8; m[0x79] = 0x0D; m[0x76] = dd & 0xFF; m[0x77] = dd >> 8;
    m[0x5F] = scale & 0xFF; m[0x60] = scale >> 8;
    eye.forEach((v, i) => { const n = Math.round(-v * 256) & 0xFFFFFF; m[0x0D5B + 3 * i] = n & 255; m[0x0D5C + 3 * i] = n >> 8 & 255; m[0x0D5D + 3 * i] = n >> 16; });
    rec = [];
    // project_points ($6773) left out; each polygon recorded where draw_polygon hands it to the clipper
    cpu.call(start, {}, { hooks: { 0x6773: c => c.rts(), 0x7F4E: c => { rec.push([m[0x80], c.x]); c.rts(); } } });
  };
  const R = Math.max(...model.points.map(p => Math.hypot(...p)));
  draw([0, 0, -4 * R]);
  let worst = 0;
  model.points.forEach((p, i) => { for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(logAt(m, 0xFB00 + 9 * i + 3 * c) - p[c]) / R); });
  if (worst > 0.01) fail('type', t, 'points off by', (100 * worst).toFixed(2) + '% of the radius');
  for (let e = 0; e < 400; e++) {
    const d = (2 + 6 * rand()) * R, u = [rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1], l = Math.hypot(...u);
    const eye = u.map(v => v / l * d);
    // a face seen nearly edge-on can go either way in the engine's arithmetic: such eyes are left out
    if (model.normals.some((N, i) => { const P = model.points[model.refs[model.normref[i]]], v = [eye[0] - P[0], eye[1] - P[1], eye[2] - P[2]];
      return Math.abs(N[0] * v[0] + N[1] * v[1] + N[2] * v[2]) < 0.03 * Math.hypot(...N) * Math.hypot(...v); })) continue;
    draw(eye); eyes++;
    const page = SRShips.order(model, eye, front).list.map(x => [x.i, x.code]);
    if (JSON.stringify(page) !== JSON.stringify(rec)) fail('type', t, 'eye', eye.map(v => v.toFixed(1)).join(','), 'engine', JSON.stringify(rec), 'page', JSON.stringify(page));
  }
}
// set_colour: the even and odd row patterns ($3D, $3E) and the screen matrix mask and value ($17, $18)
for (let code = 0; code < 0xFF; code++) {
  const m = new Uint8Array(ram), cpu = new CPU(m, { port: { dir: 0x2F, data: 0x34 }, io, strict: true });
  cpu.call(0x8F80, { x: code }, {});
  const c = SRShips.colour(ram, code), want = [m[0x3D], m[0x3E], m[0x17], m[0x18]];
  if (JSON.stringify([c.even, c.odd, c.mask, c.value]) !== JSON.stringify(want)) fail('colour', code, JSON.stringify([c.even, c.odd, c.mask, c.value]), JSON.stringify(want));
}
if (bad) { console.log(bad + ' differ'); process.exit(1); }
console.log(`test_ships: 20 models agree with draw_model from ${eyes} eyes, and 255 colour codes with set_colour`);
