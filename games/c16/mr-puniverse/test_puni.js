#!/usr/bin/env node
// Hold reference/puni.js, the engine index.html, discoveries.html and levels.html run, to the game's
// own code in the committed listing and to what the game did in plus4emu (facts.md, "Live tests").
// The engine runs the game's routines on the kit's 6502; what it adds is how it calls them and how
// it draws, and that is what this checks.
// - The frame: room 0 at the first pass of a game started with F1 (Puni.start), drawn band by band
//   with Puni.picture, against plus4emu's screenshot of the same moment, reference/room0-frame.png:
//   every pixel the same. Drawn with one set of TED's colours instead, 38,408 differ.
// - The title: Puni.fresh's screen against plus4emu's, reference/title.png, on the rows the dots
//   have not reached and the panel but the flashing TIME labels: the same, the green of the
//   colours the tape leaves at $0339 included (Puni.KERNAL_RAM, which must match the port's).
// - The tune: Puni.tune writes what plus4emu's sound log of the title wrote in its first 774 frames,
//   register, value and frame (2,238 writes, held here as a digest of the live log, which stays in
//   work/).
// - The effects: index.html's #puni-sounds is what port/scripts/sounds.js makes from the listing,
//   and each effect writes the values plus4emu wrote, in order, each within a fifth of a frame of
//   it (the live logs' values held as digests and their times as offsets from the first write).
// - Puni.record: facts.md's counts of objects, drains and record lengths, and the five exits that
//   lead off the map (discoveries.html, "offmap"); Puni.solid: is_solid's groups.
// - What discoveries.html runs: the WIMPO path's 220 dots, the refill that stops short of cell 33,
//   and the notes the tune reads past its tables.
// It exits 1 on any difference.
//   node games/c16/mr-puniverse/test_puni.js
const path = require('path'), fs = require('fs'), zlib = require('zlib'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c16'); g.lib('cpu6502');
const { Puni } = g.run('reference/puni.js', 'puni.js', 'Puni');
require(path.join(ROOT, 'site/lib/ted-sound.js'));
const L = g.listing();
let bad = 0;
const fail = (...w) => { bad++; console.log('DIFFERS', ...w); };
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const F = Puni.FRAME;
const LIVE = {"refill":{"n":141,"values":"7dd81b05a3acddc7","at":"0 v 1j 1v blp up3 18ig 1p1l 25i1 2j8m 32uz 3eih 3x20 4bi5 4rei 58xt 5llj 657z 6hhz 6zeo 7ehn 7trk 8bv8 8ny7 97ky 9kdi a1rl ahch aw4h beuv bqdf c9xm cnd3 d4ai dkbz dyh5 ehsf etcx fcaj fqbt g6nf gnbh h0u7 hkgk hwcf ienl it7f j903 jqpt k374 kmth kz79 lh0n lw6x mbd5 mtoj n5k6 np6j o26r ojj1 oz6f pdq2 pwk5 q86z qrjl r56k rlw3 s219 sg34 szjn tb27 ttw4 u81v uo90 v50r vifn w22h we1p ww96 xb0w xqm2 y8f3 yksp z4f2 zh1m zym3 10dy9 10syl 11bel 11n5r 126s4 12jw1 13150 13gvp 13vbn 14edo 14pwr 15951 15mvy 163hj 16jvj 16xop 17h8x 17svt 18bi3 18pvh 195ul 19n8t 1a01m 1ajnz 1avr3 1bdul 1bsqn 1c87m 1cq8n 1d2e9 1dm10 1dyqv 1eg7n 1evpr 1fakj 1ft62 1g4r6 1godj 1h1qd 1hiqj 1hyp9 1icx7 1iw3f 1j7q7 1jqql 1k4l7 1kl3h 1l1kv 1lfa4 1lywh 1malt 1mt3n 1n7kp 1nng5 1nnhl"},"fall":{"n":4,"values":"c8c9f1545a9d45eb","at":"0 c i u"},"jump":{"n":44,"values":"a041ebb24814247d","at":"0 1u 22 2m 29vc 4hk4 6dyf 87gu a58j bwee dwkg fngm hkv4 jfbx l9uz n5yk p09k qxbv soso uomo wfln yd2k 107fn 122g4 13yfd 15t1s 17pon 19hvm 1bhn1 1d896 1f72c 1gzz7 1ivzw 1iw30 1ohqn 1qafm 1s9kj 1u07b 1vyn0 1xrtc 1zngu 21ime 23d3q 259jd"},"death":{"n":130,"values":"a35c76b5672d6bfc","at":"0 29mu 29nq 29o2 2w5v 3fr6 3ts2 4d03 4uux 597c 5u1i 69vo 6qdo 7atl 7omw 8781 8q8q 93d6 9o3m a4xq akiy b4yq bk7w c1kl clp7 cyxq dim0 e0bg eetv ez9n ffgw fvty gghj gu8u hcve hw1e i9rc itj1 japw jq36 kaqw kpk5 l74m lrcg m52e mny8 n6jw nkcg o504 oksz p1du pm04 q0d6 qi7h r1uq rfdu rz9c sg1t svn2 tgaz tvr2 uci9 ux8m vary vtq5 wbyi wpzc xakc xr24 y6rm yrk8 z60m zns7 106xk 10kyi 114mf 11lwz 120to 12lnu 13122 13i1k 1428m 14gc2 14z32 15hti 15v4g 16fym 16wfs 17ccc 17ws9 18bn1 18tcf 19d4k 19qdc 1aa7z 1arr0 1b6lo 1br1l 1c6yg 1cnn8 1d8ay 1dlqu 1e4on 1enn8 1f196 1flcd 1g2bw 1ghwj 1h2k9 1hh20 1hyxz 1iiyn 1iwka 1iy78 1j83s 1uc2a 25krl 2gu38 2rxxn 335hs 3efde 3pjsy 40q84 4c03l 4n5sn 4yayb 59kts 5krny 5vw1a 675jd"},"tune":{"n":2238,"digest":"8c3f939830843230"}};

function png(file) {
  const d = fs.readFileSync(file), idat = [];
  let at = 8, w, h, type, depth;
  while (at < d.length) {
    const n = d.readUInt32BE(at), k = d.toString('ascii', at + 4, at + 8), b = d.subarray(at + 8, at + 8 + n);
    if (k === 'IHDR') { w = b.readUInt32BE(0); h = b.readUInt32BE(4); depth = b[8]; type = b[9]; }
    if (k === 'IDAT') idat.push(b);
    at += 12 + n;
  }
  if (depth !== 8 || (type !== 2 && type !== 6)) throw new Error(`${file}: not 8-bit RGB`);
  const bpp = type === 6 ? 4 : 3, st = w * bpp + 1, raw = zlib.inflateSync(Buffer.concat(idat));
  // undo the rows' filters
  const out = Buffer.alloc(w * h * bpp);
  for (let y = 0; y < h; y++) {
    const f = raw[y * st], row = raw.subarray(y * st + 1, y * st + st), o = y * w * bpp;
    for (let i = 0; i < w * bpp; i++) {
      const a = i >= bpp ? out[o + i - bpp] : 0, b = y ? out[o - w * bpp + i] : 0, c = i >= bpp && y ? out[o - w * bpp + i - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      out[o + i] = (row[i] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
  }
  return (x, y) => [out[(y * w + x) * bpp], out[(y * w + x) * bpp + 1], out[(y * w + x) * bpp + 2]];
}
const differ = (pic, shot, keep = () => true) => {
  let n = 0;
  for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) {
    if (!keep(x, y)) continue;
    const a = C16.rgb(pic.px[y * 320 + x]), b = shot(x + 32, y + 47);
    if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) n++;
  }
  return n;
};

// The frame
const base = Puni.fresh(L), first = Puni.start(base.slice());
{
  const shot = png(path.join(__dirname, 'reference/room0-frame.png'));
  const n = differ(Puni.picture(first), shot), one = differ(Puni.picture(first, { one: true }), shot);
  if (n !== 0) fail('the frame:', n, 'pixels differ from plus4emu');
  if (one !== 38408) fail('the frame in one set of colours:', one, 'pixels differ, not 38,408');
  console.log(`frame: ${n} of 64,000 pixels differ; ${one} with one set of colours`);
}
// The title
{
  const shot = png(path.join(__dirname, 'reference/title.png'));
  // rows 0-3 (the text above the dots) and the panel, but the TIME labels, which flash
  const keep = (x, y) => (y < 32 && x >= 8 && x < 312) || (y >= 152 && !((y >> 3) === 19 || (y >> 3) === 21) || (y >= 152 && x >= 48));
  const n = differ(Puni.picture(base), shot, keep);
  if (n !== 0) fail('the title:', n, 'pixels differ from plus4emu');
  require('./port/src/core.js'); const { PuniPort } = globalThis;
  if (JSON.stringify(PuniPort.KERNAL_RAM) !== JSON.stringify(Puni.KERNAL_RAM)) fail('Puni.KERNAL_RAM is not the port\'s');
  console.log(`title: ${n} pixels differ outside the dots and the TIME labels`);
}
// The tune
{
  const t = Puni.tune(L);
  const seq = t.writes.map(([c, a, v]) => Math.floor(c / F) + ':' + (a & 255).toString(16) + '=' + v.toString(16)).filter(s => +s.split(':')[0] < 774);
  if (seq.length !== LIVE.tune.n || sha(seq.join(' ')) !== LIVE.tune.digest) fail('the tune:', seq.length, 'writes, not the', LIVE.tune.n, 'plus4emu wrote');
  console.log(`tune: ${seq.length} writes, as plus4emu's`);
  const old = Puni.tune(L, { old: true });
  if (!old.writes.length) fail('old_music_tick wrote nothing');
}
// The effects
{
  const page = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const S = JSON.parse(page.match(/<script type="application\/json" id="puni-sounds">([^<]*)<\/script>/)[1]);
  const lib = require('./port/test/lib.js');
  const made = require('./port/scripts/sounds.js').make(lib.boot());
  for (const k of ['refill', 'fall', 'jump', 'death']) {
    if (JSON.stringify(S[k]) !== JSON.stringify(TEDSound.pack(made[k]))) fail(k + ': the page\'s copy is not what sounds.js makes');
    const w = TEDSound.unpack(S[k]).writes, live = LIVE[k], at = live.at.split(' ').map(s => parseInt(s, 36));
    if (w.length !== live.n || sha(w.map(x => (x[1] & 255).toString(16) + '=' + x[2].toString(16)).join(' ')) !== live.values) fail(k + ': the values are not plus4emu\'s');
    let most = 0;
    w.forEach((x, i) => { most = Math.max(most, Math.abs(x[0] - w[0][0] - at[i])); });
    if (most > F / 5) fail(k + ': a write', (most / F).toFixed(2), 'frames from plus4emu\'s');
    console.log(`${k}: ${w.length} writes, the values plus4emu wrote, the furthest ${(most / F).toFixed(2)} frames from its`);
  }
}
// The records
{
  const R = Array.from({ length: 25 }, (_, r) => Puni.record(L.ram, r));
  const count = {};
  for (const o of R) for (const ob of o.objects) count[ob.name] = (count[ob.name] || 0) + 1;
  const want = { crusher: 38, cannon: 20, 'random cannon': 5, 'force field': 7, switch: 7, bridge: 1, scenery: 18 };
  for (const k in want) if (count[k] !== want[k]) fail('records:', count[k], k, 'not', want[k]);
  if (R.filter(o => o.drains).length !== 14) fail('records: not 14 rooms that drain');
  const lens = R.map(o => o.length);
  if (Math.min(...lens) !== 62 || Math.max(...lens) !== 128) fail('records: lengths', Math.min(...lens), 'to', Math.max(...lens));
  // the exits that lead somewhere other than next door, where the room has a gap on that edge
  const off = [];
  for (let r = 0; r < 25; r++) {
    const m = Puni.room(base.slice(), r);
    [r - 5, r + 5, r - 1, r + 1].forEach((nd, e) => {
      let gap = false;
      for (let a = 0; a < 720; a++) if (m[0x0C00 + a] === 0xC1 + e) gap = true;
      if (gap && R[r].exits[e] !== nd) off.push(`${r}${'^v<>'[e]}${R[r].exits[e]}`);
    });
  }
  if (off.join(' ') !== '2v0 18v0 19v0 24^14 24<0') fail('exits off the map:', off.join(' '));
  const solid = Puni.solid(first), want2 = c => c < 0x7E || (c >= 0x88 && c <= 0x9F) || (c >= 0xA8 && c <= 0xB7) || c === 0xBA || c === 0xBB || c === 0xCA || c === 0xCB;
  for (let c = 0; c < 256; c++) if (!!solid[c] !== want2(c)) fail('is_solid', c.toString(16));
  console.log(`records: ${JSON.stringify(count)}; off the map ${off.join(' ')}`);
}
// What discoveries.html runs
{
  const dots = p => {
    const m = base.slice();
    for (const a of [0x1C64, 0x1C6C, 0x1C72, 0x1C91]) { m[a] = p & 0xFF; m[a + 1] = p >> 8; }
    m[0x2111] = 0x60;
    const c = Puni.cpuFor(m), col = m[0x4E];
    let n = 0;
    while (n < 1000) { m[0x4D] = 1; c.call(0x1C46, {}, { maxSteps: 1e5 }); if (m[0x4E] !== col) break; n++; }
    return n;
  };
  if (dots(0x340D) !== 233 || dots(0x1B77) !== 220) fail('dot paths:', dots(0x340D), dots(0x1B77));
  const m = base.slice(), c = Puni.cpuFor(m);
  for (let i = 0; i < 34; i++) m[0x0FC4 + i] = 0x6D;
  m[0x034C] = 33; m[0x0352] = 1; m[0x0351] = 1; m[0x035F] = 1;
  for (let k = 0; k < 6; k++) c.call(0x33AB);
  m[0x035F] = 0;
  for (let k = 0; k < 100; k++) c.call(0x33AB);
  let held = 0; for (let i = 0; i < 34; i++) held += 0x71 - m[0x0FC4 + i];
  if (held !== 132 || m[0x034C] !== 33) fail('the refill: back to', held, 'with bar_pos', m[0x034C]);
  const v2 = [...L.ram.subarray(0x1A27, 0x1A27 + 128)];
  if (![84, 85, 87].every(n => v2.includes(n)) || v2.some(n => n > 27 && n < 128 && ![84, 85, 87].includes(n))) fail('the tune\'s notes past the table');
  console.log(`discoveries: dot paths 233 and 220, the refill back to ${held}, notes 84, 85 and 87`);
}
console.log(bad ? `${bad} difference(s)` : 'ok');
process.exit(bad ? 1 : 0);
