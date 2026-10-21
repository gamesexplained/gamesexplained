#!/usr/bin/env node
// Hold reference/tex.js, the engine index.html, discoveries.html and levels.html run, to the game's
// own code in the committed listing and to what the game did in plus4emu (facts.md, "Live tests").
// The engine runs the game's routines on the kit's 6502; what it adds is how it calls them and how
// it draws, and that is what this checks.
// - The frame: index.html's embedded copy of the memory of level 10 in plus4emu (#tex-frame), drawn
//   band by band with Tex.picture, against plus4emu's screenshot reference/level10-frame.png: every
//   pixel the same. Drawn with one set of TED's registers instead, 20,797 differ, so the bands are
//   what makes it right.
// - The sound: the sixgun and the hit as Tex.sound makes them write what the game wrote in
//   plus4emu, register by register and frame by frame (29 writes over 25 frames, 44 over 22,
//   held here as digests of the live logs, which stay in work/); the pressure counted writes the
//   live run's 208 pitch values and lasts its 246 frames, give or take 2 %.
// - Tex.startLevel: the level, the scene and Tex's cell; Tex.nextLevel: facts.md's table of
//   enemies, delays, thresholds and breaks, levels 1 to 99 and 00.
// - Tex.jumps: no break cleared at speed 1, one middle at speed 2, one or two at speed 3, all from
//   speed 4, as plus4emu gave at speeds 1 to 3 (discoveries.html, "jump").
// - lose_pressure, check_hiscore and fire_bullet as discoveries.html calls them: a bomb's cost by
//   the part cell, the high score that loses its first digit, the bullet's highest row.
// (work/trace/test_trace.js holds Tex.Run to traces of the game in plus4emu, frame by frame,
// running, jumping, firing and falling; the traces are game memory and stay in work/.) It exits 1
// on any difference.
//   node games/c16/tycoon-tex/test_tex.js
const path = require('path'), fs = require('fs'), zlib = require('zlib'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c16'); g.lib('cpu6502');
const { Tex } = g.run('reference/tex.js', 'tex.js', 'Tex');
const L = g.listing();
let bad = 0;
const fail = (...w) => { bad++; console.log('DIFFERS', ...w); };
const seeded = s => () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return s & 255; };
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

// The frame
function png(file) {
  const d = fs.readFileSync(file), idat = [];
  let at = 8, w, h, type, depth;
  while (at < d.length) {
    const n = d.readUInt32BE(at), k = d.toString('ascii', at + 4, at + 8), b = d.subarray(at + 8, at + 8 + n);
    if (k === 'IHDR') { w = b.readUInt32BE(0); h = b.readUInt32BE(4); depth = b[8]; type = b[9]; }
    if (k === 'IDAT') idat.push(b);
    at += 12 + n;
  }
  if (depth !== 8 || type !== 2) throw new Error(`${file}: not 8-bit RGB`);
  const raw = zlib.inflateSync(Buffer.concat(idat)), st = w * 3 + 1;
  for (let y = 0; y < h; y++) if (raw[y * st] !== 0) throw new Error(`${file}: row ${y} is filtered`);
  return (x, y) => [raw[y * st + 1 + 3 * x], raw[y * st + 2 + 3 * x], raw[y * st + 3 + 3 * x]];
}
{
  const page = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const D = JSON.parse(page.match(/<script type="application\/json" id="tex-frame">([^<]*)<\/script>/)[1]);
  const A = L.ram.slice(), byte = (s, i) => parseInt(s.substr(2 * i, 2), 16);
  for (let i = 0; i < 1000; i++) { A[0x0800 + i] = byte(D.screen, i); A[0x0C00 + i] = byte(D.screen, 1000 + i); }
  for (const ch in D.chars) for (let i = 0; i < 8; i++) A[0x3C00 + parseInt(ch, 16) * 8 + i] = byte(D.chars[ch], i);
  for (const a in D.zp) A[parseInt(a, 16)] = D.zp[a];
  // at the frame's end the twinkling star in the message row's characters has moved on
  const B = A.slice();
  for (let i = 0; i < 8; i++) B[0x3D50 + i] = byte(D.star, i);
  const shot = png(path.join(__dirname, 'reference/level10-frame.png'));
  const differ = pic => {
    let n = 0;
    for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) {
      const a = C16.rgb(pic.px[y * 320 + x]), b = shot(x + 32, y + 47);
      if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) n++;
    }
    return n;
  };
  const bands = differ(Tex.picture(A, B)), one = differ(Tex.picture(A, B, { one: true }));
  if (bands !== 0) fail(`the frame drawn in bands: ${bands} pixels differ from plus4emu's`);
  if (one !== 20797) fail(`the frame drawn with one set of registers: ${one} pixels differ, not 20,797`);
}

// The sound: writes from the effect's first, as frame:register=value, frames counted from that write's
const F = Tex.FRAME;
function norm(log, first, n) {
  const w = log.writes, i = w.findIndex(first), f0 = Math.floor(w[i][0] / F);
  return w.slice(i).map(([c, a, v]) => `${Math.floor(c / F) - f0}:${(a & 255).toString(16)}=${v.toString(16)}`)
    .filter(s => +s.split(':')[0] < n);
}
for (const [name, first, n, count, digest] of [
  ['shot', ([, a, v]) => a === 0xFF12 && (v & 3) === 3, 25, 29, '82cd13a80452258f'],
  ['hit', ([, a, v]) => a === 0xFF10 && v === 3, 22, 44, '1d1e613ead151078']]) {
  const w = norm(Tex.sound(L, name, {}, () => 0), first, n);
  if (w.length !== count || sha(w.join(' ')) !== digest) fail(`${name}: ${w.length} writes, digest ${sha(w.join(' '))}; plus4emu ${count}, ${digest}`);
}
{
  const log = Tex.sound(L, 'count', {}, () => 0), tones = log.writes.filter(([, a]) => a === 0xFF0F);
  const v = tones.map(t => t[2]);
  if (v.length !== 208 || sha(v.join(',')) !== '127b06c0999856b3') fail(`count: ${v.length} pitch values, digest ${sha(v.join(','))}`);
  const span = (tones[tones.length - 1][0] - log.writes[0][0]) / F;
  if (Math.abs(span - 246.12) > 246.12 * 0.02) fail(`count: lasts ${span.toFixed(1)} frames, plus4emu 246.1`);
  const meant = Tex.sound(L, 'shot', { meant: true }, () => 0).writes;
  if (!meant.some(([, a, v]) => a === 0xFF12 && (v & 3) === 2) || meant.some(([, a, v]) => a === 0xFF10 && (v & 3) !== 0))
    fail('the sixgun as meant: its high bits are not in $FF12 alone');
}

// startLevel and nextLevel
const base = Tex.fresh(L, seeded(1));
for (const k of [1, 2, 3, 4, 37, 99, 100]) {
  const m = Tex.startLevel(base.slice(), k, {}, seeded(k));
  if (m[0x62] !== Tex.bcd(k % 100)) fail(`startLevel ${k}: level byte ${m[0x62].toString(16)}`);
  if (m[0x1826] !== (k - 1) % 3) fail(`startLevel ${k}: scene ${m[0x1826]}`);
  if (m[0x15] !== 0xA9 || m[0x16] !== 0x0E) fail(`startLevel ${k}: Tex not at column 1 of row 17`);
  if (m[0xA6] !== 0 || Tex.startLevel(base.slice(), k, { enemies: true }, seeded(k))[0xA6] === 0) fail(`startLevel ${k}: enemy_mask`);
}
const bits = m => [1, 2, 4, 8].filter(b => m & b).length;
for (let k = 1; k <= 100; k++) {
  const delay = k === 100 || k < 20 || k >= 80 ? 128 : k < 40 ? 100 : k < 60 ? 58 : 1;
  for (let p = 0; p < 6; p++) {
    const r = Tex.nextLevel(base.slice(), k, p);
    const [mask, threshold, parts, jetBreaks] =
      k === 1 ? [4, 0xB0, 2, 0] : k === 2 ? [2, 0xB0, 2, 0] : k === 3 ? [8, 0xB0, 2, 0] :
      k === 100 ? [null, 0x80, 2, 0] : k <= 6 ? [null, 0x80, 3, 0] : k <= 9 ? [null, 0x40, 3, 16] : [15, 1, 3, 16];
    const kinds = k === 100 || (k >= 4 && k <= 6) ? 2 : k <= 9 && k >= 7 ? 3 : null;
    if (r.level !== Tex.bcd(k % 100)) fail(`nextLevel ${k}: level ${r.level.toString(16)}`);
    if (r.scene !== (k - 1) % 3) fail(`nextLevel ${k}: scene ${r.scene}`);
    if (mask !== null && (r.mask & 15) !== mask) fail(`nextLevel ${k}: enemies ${r.mask & 15}, facts ${mask}`);
    if (kinds !== null && bits(r.mask & 15) !== kinds) fail(`nextLevel ${k}, pick ${p}: ${bits(r.mask & 15)} kinds, facts ${kinds}`);
    if ((r.mask & 16) !== jetBreaks) fail(`nextLevel ${k}: the jet's bombs ${r.mask & 16 ? 'do' : 'do not'} break the pipe`);
    if (r.threshold !== threshold || r.breakParts !== parts || r.delay !== delay)
      fail(`nextLevel ${k}: threshold ${r.threshold}, break_parts ${r.breakParts}, delay ${r.delay}; facts ${threshold}, ${parts}, ${delay}`);
  }
}
// level 00 as live: the arrow and the crash explosive are one of its pairs
if (![0, 1, 2, 3, 4, 5].some(p => (Tex.nextLevel(base.slice(), 100, p).mask & 15) === 9)) fail('level 00: no pick gives mask $09');

// Jumping a break
for (let s = 1; s <= 7; s++) for (let n = 1; n <= 3; n++) {
  const r = Tex.jumps(Tex.startLevel(base.slice(), 1, {}, seeded(7)), s, n, seeded(9));
  const want = s >= 4 || (s === 3 && n <= 2) || (s === 2 && n === 1);
  const ok = r.tries.filter(t => t.cleared).length;
  if (r.tries.length < 10) fail(`jumps: speed ${s}, ${n} middle(s): only ${r.tries.length} tries`);
  if (!!ok !== want) fail(`jumps: speed ${s}, ${n} middle(s): ${ok} of ${r.tries.length} clear it; plus4emu ${want ? 'some' : 'none'}`);
  if (s === 2 && n === 1 && ok !== 5) fail(`jumps: speed 2, one middle: a window of ${ok} frames, the page says five`);
  if (s <= 2) {
    const t = r.tries.find(x => x.cleared) || r.tries[0];
    if (Tex.tryJump(r.start, t.at).cleared !== t.cleared) fail(`tryJump: speed ${s}, ${n} middle(s), frame ${t.at} differs from jumps`);
  }
}

// A bomb's cost by the part cell (discoveries.html, "bomb"), as plus4emu ran lose_pressure
{
  const m = base.slice(), cpu = Tex.cpuFor(m);
  const lose = (fine, a) => { m[0x29] = 10; m[0x28] = fine; m[0x6F] = 0; cpu.call(0x21B1, { a }); return 80 + fine - (m[0x29] * 8 + m[0x28]); };
  const four = [0, 1, 2, 3, 4, 5, 6, 7].map(f => lose(f, 4)).join(), two = [0, 1, 2, 3, 4, 5, 6, 7].map(f => lose(f, 2)).join();
  if (four !== '1,2,3,4,4,4,4,4' || two !== '1,2,2,2,2,2,2,2') fail(`lose_pressure: ${four} and ${two}`);
}

// The high score that loses its first digit (discoveries.html, "hiscore"), as live
{
  const m = base.slice();
  for (let k = 0; k < 6; k++) { m[0x1A4D + k] = '150000'.charCodeAt(k); m[0x261F + k] = '200000'.charCodeAt(k); }
  Tex.cpuFor(m).call(0x2625, {}, { maxSteps: 1e5, hooks: { 0x269C: () => true } });
  const entry = i => String.fromCharCode(...m.subarray(0x1A4D + 14 * i, 0x1A4D + 14 * i + 6));
  const name = String.fromCharCode(...m.subarray(0x1A4D + 14 + 6, 0x1A4D + 14 + 13));
  if (m[0x82] !== 0 || entry(0) !== '200000' || entry(1) !== '050000' || name !== 'GREMLIN' || entry(2) !== '004000')
    fail(`check_hiscore: ${entry(0)}, ${entry(1)} ${name}, ${entry(2)}`);
}

// The sixgun's highest row and the jet's (discoveries.html, "jet")
{
  const rnd = seeded(3), m = Tex.startLevel(Tex.fresh(L, rnd), 1, { enemies: true }, rnd), run = Tex.Run(m, rnd);
  const jetRows = new Set(), rows = new Set();
  const jet = () => { for (let r = 8; r < 22; r++) for (let c = 0; c < 40; c++) { const ch = m[0x0C00 + r * 40 + c]; if (ch >= 0x63 && ch <= 0x6C) jetRows.add(r); } };
  for (let f = 0; f < 3000 && !jetRows.size; f++) { run.step({}); jet(); }
  for (let k = 0; k < 60; k++) {
    run.step({ up: k === 0, fire: k === 9 }); jet();
    if (m[0x22]) rows.add((m[0x26] + (m[0x27] << 8) - 0x0C00) / 40 | 0);
  }
  if ([...jetRows].join() !== '8,9') fail(`the jet on rows ${[...jetRows]}`);
  if ([...rows].join() !== '14') fail(`a bullet fired at the top of a jump on rows ${[...rows]}`);
}

console.log(bad ? `${bad} difference(s)` : 'OK - the frame, the sound, the levels, the jumps, the bomb, the high score and the jet');
process.exit(bad ? 1 : 0);
