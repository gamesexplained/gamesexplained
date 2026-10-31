#!/usr/bin/env node
// Hold the sums in index.html's wg-rules block to the game's own routines, run on the kit's
// simulator over each part's listing, for every input the page can give them and more:
// - wlGood against wl_multiply ($1DCB) and the 1 that $1910 puts in place of 0, for every
//   window length and factor, 0 to 255 each (weightlifting);
// - bullNext against br_choose_move ($222C), not a ride's first move, for each of the five bulls,
//   each kind of move before it and every pair of the two random numbers br_random ($2351) gives
//   it, with the bull in the middle of the arena ($27 = $20), where the place chooses a run
//   (bull riding);
// - lrPoints against lr_points ($33D0) on a frame it counts, for lumberjack 1, every log speed
//   from -31 to 31 and every lean from -128 to 127, before 0:30 and after it (log rolling);
// - suFinal against su_final_scores ($26DF), up to the scores' text, for 20,000 random totals of
//   both wrestlers, every length from 0 to 254 units, either wrestler losing (sumo);
// - wlPlates against wl_plates ($1985) for every weight byte, and wlStrip against wl_strip
//   ($1C31) for every first line and length (weightlifting);
// - wlDivide against wl_divide ($1DF2) for every divisor, with 400 random dividends each;
// - wlLift against wl_script ($183D) frame by frame, for 2,400 lifts of the eight scripts at
//   random weights, the joystick at random or pushing in the windows;
// - wlJudges against wl_judges ($14ED) frame by frame, for 3,000 holds with random timings,
//   random numbers and a random frame for the weight to come down;
// - wlDrawPlates against wl_draw_plates ($1A14) for 3,000 poses and weights one after another,
//   every byte of the bitmap after each (weightlifting).
// And discoveries.html's wg-disc block, with its copy of wg-rules held to index.html's:
// - slKeeps against sl_keep_result ($F20C) in the final heat, for 20,000 random pairs of times
//   and every pair of seconds, the first heat's result kept as the game keeps it (slalom);
// - lrStep against lr_step ($2183), for every speed's high byte, both ways (log rolling).
// It exits 1 on any difference.
//   node games/c64/world-games/test_widgets.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
g.sameBlock('wg-rules');
const { wlGood, bullNext, lrPoints, suFinal, wlPlates, wlStrip, wlDivide, wlLift, wlJudges, wlDrawPlates } =
  g.run(page, 'wg-rules', 'wlGood', 'bullNext', 'lrPoints', 'suFinal', 'wlPlates', 'wlStrip', 'wlDivide', 'wlLift', 'wlJudges', 'wlDrawPlates');
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const noio = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };

// weightlifting
{
  const m = g.listing('parts/weightlifting/listing.json').ram.slice(), cpu = new CPU(m, { port: 0x35, io: noio });
  for (let len = 0; len < 256; len++) for (let f = 0; f < 256; f++) {
    m[0x24] = len;
    cpu.call(0x1DCB, { a: f, x: 0, y: 0 });
    const want = cpu.a || 1;
    cases++;
    if (wlGood(len, f) !== want) fail('wlGood', len, f, wlGood(len, f), want);
  }
}
// bull riding
{
  const L = g.listing('parts/bull-riding/listing.json'), base = L.ram;
  for (let bull = 0; bull < 5; bull++) {
    const o = Array.from(base.slice(0x2332 + 5 * bull, 0x2337 + 5 * bull));
    for (let kind = 0; kind < 3; kind++) for (let r1 = 0; r1 < 256; r1++) for (let r2 = 0; r2 < 256; r2++) {
      const m = base.slice(), q = [r1, r2];
      m[0x45] = 1; m[0x24] = bull; m[0x3D] = kind; m[0x43] = 0; m[0x3F] = 0; m[0x27] = 0x20; m[0x40] = 0;
      const cpu = new CPU(m, { port: 0x35, io: noio });
      cpu.call(0x222C, { a: 0, x: 0, y: 0 }, { hooks: { 0x2351: (c) => { c.a = q.shift(); c.z = c.a === 0 ? 1 : 0; c.n = c.a >> 7; c.rts(); } } });
      const p = bullNext(o, kind, r1, r2), next = p.next === 'place' ? 1 : p.next;
      cases++;
      if (p.pts !== m[0x43] || next !== m[0x3D] || p.turn !== (m[0x3F] === 1)) { fail('bullNext', bull, kind, r1, r2, JSON.stringify(p), m[0x43], m[0x3D], m[0x3F]); }
      if (kind !== 2 && !(kind === 1 && r1 >= o[0] && r1 < o[1]) && !(kind === 0 && r1 < o[2])) break;   // r2 is read only for a spin
    }
  }
}
// log rolling
{
  const base = g.listing('parts/log-rolling/listing.json').ram;
  for (const [mins, secs, late] of [[0, 0x00, false], [0, 0x29, false], [0, 0x30, true], [1, 0x00, true]])
    for (let log = -31; log <= 31; log++) for (let lean = -128; lean < 128; lean++) {
      const m = base.slice();
      m[0x0F3E] = 1; m[0x0A] = 0x20; m[0x0F70] = lean & 0xFF; m[0x0F3A] = log & 0xFF; m[0x0F4F] = mins; m[0x0F50] = secs;
      m[0x0F56] = 0x40; m[0x0F58] = 0x01;
      const cpu = new CPU(m, { port: 0x35, io: noio });
      cpu.call(0x33D0, { a: 0, x: 0, y: 0 });
      const got = (m[0x0F56] | m[0x0F58] << 8) - 0x0140;
      cases++;
      if (lrPoints(base, log, lean, late) !== got) fail('lrPoints', log, lean, late, lrPoints(base, log, lean, late), got);
    }
}
// sumo
{
  const base = g.listing('parts/sumo/listing.json').ram;
  let seed = 0x1234567;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
  for (let k = 0; k < 20000; k++) {
    const tl = rnd() & 0x7FFFFF, tr = rnd() & 0x7FFFFF, units = k % 255, leftLost = k & 1;
    const m = base.slice(), out = {};
    m[0x50] = tl & 0xFF; m[0x51] = tl >> 8 & 0xFF; m[0x52] = tl >> 16; m[0x7B] = tr & 0xFF; m[0x7C] = tr >> 8 & 0xFF; m[0x7D] = tr >> 16;
    m[0x95] = units; m[0x26] = leftLost ? 0 : 1;
    const cpu = new CPU(m, { port: 0x35, io: noio });
    cpu.call(0x26DF, { a: 0, x: 0, y: 0 }, { hooks: { 0x2721: (c) => { out.l = m[0x50] | m[0x51] << 8; out.r = m[0x7B] | m[0x7C] << 8; return true; } } });
    cases++;
    const l = suFinal(tl, units, !!leftLost), r = suFinal(tr, units, !leftLost);
    if (l !== out.l || r !== out.r) fail('suFinal', tl, tr, units, leftLost, l, r, out.l, out.r);
  }
}
// slalom: the final heat
{
  const { slKeeps } = g.run('discoveries.html', 'wg-disc', 'slKeeps');
  const base = g.listing('parts/slalom/listing.json').ram, bcd = (n) => (n / 10 | 0) << 4 | n % 10;
  let seed = 0x2468ACE;
  const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
  const pairs = [];
  for (let k = 0; k < 20000; k++) pairs.push([[rnd(10), rnd(60), rnd(100)], [rnd(10), rnd(60), rnd(100)]]);
  for (let a = 0; a < 60; a++) for (let b = 0; b < 60; b++) pairs.push([[0, a, 50], [0, b, 49]]);
  const seen = { true: 0, false: 0, null: 0 };
  for (const [old, neu] of pairs) {
    const m = base.slice();
    m[0x0F] = 0; m[0x081D] = 0; m[0x081E] = 2; m[0x0E] = 0; m[0x4864] = 0x20;
    m[0x0816] = bcd(99 - old[2]); m[0x0817] = bcd(99 - old[1]); m[0x0818] = bcd(99 - old[0]);
    m[0x96] = bcd(neu[2]); m[0x97] = bcd(neu[1]); m[0x98] = bcd(neu[0]);
    let got = null;
    const cpu = new CPU(m, { port: 0x35, io: noio });
    cpu.call(0xF20C, { a: 0, x: 0, y: 0 }, { hooks: { 0xF290: () => { got = true; return true; }, 0xF2BF: () => { got = false; return true; } } });
    cases++; seen[got]++;
    if (slKeeps(old, neu) !== got) fail('slKeeps', old, neu, slKeeps(old, neu), got);
  }
  if (!seen.true || !seen.false) fail('slKeeps: the game took one way only', JSON.stringify(seen));
  else console.log(`slalom: the game kept the new time ${seen.true} times and the old ${seen.false}`);
}
// log rolling: a step
{
  const { lrStep } = g.run('discoveries.html', 'wg-disc', 'lrStep');
  const base = g.listing('parts/log-rolling/listing.json').ram;
  for (const back of [false, true]) for (let hi = 0; hi < 256; hi++) for (const lo of [0x00, 0x80, 0xFF]) {
    const m = base.slice();
    m[0x0F68] = back ? 0x80 : 0x00; m[0x0F6A] = lo; m[0x0F6C] = hi;
    const cpu = new CPU(m, { port: 0x35, io: noio });
    cpu.call(0x2183, { a: 0, x: 0, y: 0 });
    const [h, l] = lrStep(hi, lo, back);
    cases++;
    if (h !== m[0x0F6C] || l !== m[0x0F6A]) fail('lrStep', back, hi, lo, h, l, m[0x0F6C], m[0x0F6A]);
  }
}
// weightlifting: the plates
{
  const base = g.listing('parts/weightlifting/listing.json').ram;
  for (let w = 0; w < 256; w++) {
    const m = base.slice();
    m[0x38] = w;
    new CPU(m, { port: 0x35, io: noio }).call(0x1985, { a: 0, x: 0, y: 0 });
    const want = Array.from(m.slice(0xE0, 0xE7)), got = wlPlates(base, w).e;
    cases++;
    if (want.join() !== got.join()) fail('wlPlates', w, got, want);
  }
  for (let line = 0; line < 256; line++) for (let len = 0; len < 256; len++) {
    const m = base.slice();
    m[0x30] = line; m[0x31] = len;
    new CPU(m, { port: 0x35, io: noio }).call(0x1C31, { a: 0, x: 0, y: 0 });
    const S = wlStrip(line, len), entry = m[0x18] | m[0x19] << 8;
    cases++;
    if (S.entry !== entry || S.rts !== m[0x32] || m[(entry + m[0x32]) & 0xFFFF] !== 0x60) fail('wlStrip', line, len, S, entry, m[0x32]);
  }
  const P = wlPlates(base, 173), S = wlStrip(P.e[1] + 0x31 & 0xFF, P.e[2]);
  if (S.entry !== 0x1C63 || base[S.entry] !== 0xF2) fail('wlStrip: 865 kg enters at $' + S.entry.toString(16) + ', on $' + base[S.entry].toString(16));
}
// weightlifting: the divide
{
  const base = g.listing('parts/weightlifting/listing.json').ram;
  let seed = 0x5EED123;
  const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
  for (let a = 1; a < 256; a++) for (let k = 0; k < 400; k++) {
    const lo = k < 4 ? [0, 0xFF, 0, 0xFF][k] : rnd(256), hi = k < 4 ? [0, 0, 0xFF, 0xFF][k] : rnd(256), m = base.slice();
    m[0x1E] = lo; m[0x1F] = hi;
    const cpu = new CPU(m, { port: 0x35, io: noio });
    cpu.call(0x1DF2, { a, x: 0, y: 0 });
    const D = wlDivide(lo, hi, a);
    cases++;
    if (D.q !== (m[0x22] | m[0x23] << 8) || D.a !== cpu.a) fail('wlDivide', lo, hi, a, JSON.stringify(D), m[0x22] | m[0x23] << 8, cpu.a);
  }
  let threw = false;
  try { wlDivide(1, 1, 0); } catch (e) { threw = true; }
  if (!threw) fail('wlDivide: no error for a divisor of 0');
}
// weightlifting: the lift's scripts, a frame at a time
{
  const base = g.listing('parts/weightlifting/listing.json').ram;
  let seed = 0x13579BD;
  const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
  const seen = {};
  for (let run = 0; run < 2400; run++) {
    const script = run % 8, factor = base[0x1493 + rnd(32)], how = rnd(3);
    const m = base.slice(), S = wlLift(base, script, factor), cpu = new CPU(m, { port: 0x35, io: noio });
    for (const a of [0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x26, 0x27, 0x2A, 0x2B, 0x2C, 0x2D, 0x3A, 0x3D, 0x40, 0x42, 0xF0]) m[a] = 0;
    m[0x4B] = factor; m[0x38] = m[0x2E] = 0x1E;
    cpu.call(0x1969, { a: script, x: 0, y: 0 });
    const hooks = { 0x1E3A: (c) => { c.rts(); }, 0x1E8B: (c) => { c.rts(); }, 0x1A14: (c) => { c.rts(); },
      0x2800: (c) => { c.rts(); }, 0x2803: (c) => { c.rts(); }, 0x1966: () => true };
    const w = (a) => m[a] | m[a + 1] << 8;
    for (let f = 0; f < 4000 && !S.ended; f++) {
      let stick = 0;
      if (how === 0) { if (!rnd(40)) stick = [1, 2, 3, 4, 8, 16, 5, 10][rnd(8)]; }
      else if (S.win && (S.win - 1 < S.good ? !rnd(how === 1 ? 2 : 6) : !rnd(how === 1 ? 400 : 60))) stick = S.mask | (rnd(2) ? 16 : 0);
      m[0x43] = ~stick & 0xFF;
      cpu.call(0x183D, { a: 0, x: 0, y: 0 }, { hooks });
      S.frame(stick);
      cases++;
      const got = [w(0x10), m[0x2A], m[0x2B], m[0x2C], m[0x2D], w(0x12), w(0x14), w(0x16), w(0x26), m[0x40], !!(m[0x3A] & 0x40)];
      const want = [S.pc, S.frames, S.win, S.mask, S.good, S.goodAt, S.early, S.ret, S.timing, S.pushes, S.ended];
      if (S.pose >= 0) { got.push(m[0xF0]); want.push(S.pose); }
      if (S.ended) { got.push(m[0x3D]); want.push(S.result); }
      if (got.join() !== want.join()) { fail('wlLift', script, factor, run, f, stick, got.join(), want.join()); break; }
    }
    if (S.ended) seen[script + ':' + S.result] = (seen[script + ':' + S.result] || 0) + 1;
  }
  for (const k of ['2:1', '2:2', '3:1', '3:2', '0:5']) if (!seen[k]) fail('wlLift: no run of script ' + k.replace(':', ' ended with ')); 
  console.log('weightlifting: lifts ended ' + Object.keys(seen).sort().map((k) => k + ' x' + seen[k]).join(', '));
}
// weightlifting: the judges, a frame at a time
{
  const base = g.listing('parts/weightlifting/listing.json').ram;
  let seed = 0x2B3C4D5;
  const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
  const ends = {};
  for (let run = 0; run < 3000; run++) {
    const m = base.slice(), R = Array.from({ length: 4096 }, () => rnd(256)), down = rnd(3) ? rnd(300) : 999;
    const timing = run & 1 ? rnd(0x10000) : rnd(128 * 4), pushes = run & 1 ? 1 + rnd(255) : 2 + rnd(3);
    const sticks = Array.from({ length: 300 }, (v, k) => (k >= down ? 2 : 0) | [0, 1, 4, 8, 16][rnd(5)]);
    let pi = 0, gi = 0, skin = -1, k = 0, first = true, voted = false, stop = '', res = '';
    const col = new Uint8Array(1024);
    for (const o of [0, 16, 31]) col[0x2D3 + o] = col[0x2D5 + o] = 12;
    const io = { read(a) { if (a >= 0xD800 && a < 0xDC00) return col[a - 0xD800] | 0xF0; throw new Error('read $' + a.toString(16)); },
      write(a, v) { if (a >= 0xD800 && a < 0xDC00) col[a - 0xD800] = v & 15; else if (a === 0xD028) skin = v; else throw new Error('write $' + a.toString(16)); } };
    const J = wlJudges(base, timing, pushes), prnd = () => R[pi++];
    m[0x26] = timing & 0xFF; m[0x27] = timing >> 8; m[0x40] = pushes; m[0x46] = 0; m[0x43] = ~sticks[0] & 0xFF;
    res = J.look(sticks[0], prnd);
    const lamps = () => [0, 16, 31].map((o) => col[0x2D3 + o] === 1 ? 1 : col[0x2D5 + o] === 2 ? 2 : 0);
    const cpu = new CPU(m, { port: 0x35, io });
    const check = (where) => {
      cases++;
      const got = [lamps().join(''), m[0x46], m[0x45], skin], want = [J.lamps.join(''), J.whites, J.next, J.skin];
      if (got.join() !== want.join()) { fail('wlJudges', run, where, k, got.join(), want.join()); return false; }
      return true;
    };
    const hooks = {
      0x1502: (c) => {
        if (first) { first = false; return; }
        if (voted) { voted = false; return; }
        if (!check('frame') || res) return true;
        k++; m[0x3B] = (m[0x3B] + 1) & 0xFF; m[0x43] = ~sticks[Math.min(k, 299)] & 0xFF;
        J.hold++; res = J.look(sticks[Math.min(k, 299)], prnd);
      },
      0x1525: () => { voted = true; },
      0x1539: () => { stop = 'down'; return true; },
      0x155B: () => { stop = 'long 6'; return true; },
      0x1568: () => { stop = 'long 5'; return true; },
      0x197D: (c) => { c.a = R[gi++]; c.z = c.a === 0 ? 1 : 0; c.n = c.a >> 7; c.rts(); },
    };
    cpu.call(0x14ED, { a: 0, x: 0, y: 0 }, { hooks, maxSteps: 1e7 });
    const port = res === 'long' ? 'long ' + J.end : res;
    cases++;
    if (stop !== port || pi !== gi || lamps().join('') !== J.lamps.join('')) fail('wlJudges: the end', run, k, stop, port, pi, gi, lamps().join(''), J.lamps.join(''));
    ends[stop] = (ends[stop] || 0) + 1;
  }
  if (!ends.down || !ends['long 5'] || !ends['long 6']) fail('wlJudges: an ending never came', JSON.stringify(ends));
  console.log('weightlifting: the judges ended ' + JSON.stringify(ends));
}
// weightlifting: the plates drawn, one pose after another
{
  const base = g.listing('parts/weightlifting/listing.json').ram;
  let seed = 0x7A7A7A7;
  const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
  const m = base.slice(), bm = base.slice(), st = { f2: 0, top: 0, ptr: 0 };
  for (const a of [0x28, 0x29, 0x2F, 0xF2]) m[a] = bm[a] = 0;
  let sy = 0;
  const io = { read(a) { if (a === 0xD001) return sy; throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
  const cpu = new CPU(m, { port: 0x35, io });
  for (let k = 0; k < 3000; k++) {
    const w = 15 + (k % 7 ? rnd(31) : rnd(46)), pose = rnd(97), pa = base[0x8100 + 2 * pose] | base[0x8101 + 2 * pose] << 8;
    sy = (base[pa + 2] + 0x68) & 0xFF;
    m[0x38] = w; m[0xF0] = pose;
    cpu.call(0x1985, { a: 0, x: 0, y: 0 });
    cpu.call(0x1A14, { a: 0, x: 0, y: 0 });
    wlDrawPlates(base, bm, st, pose, sy, w, wlPlates(base, w).e);
    cases++;
    let diff = -1;
    for (let a = 0x6000; a < 0x7F40 && diff < 0; a++) if (m[a] !== bm[a]) diff = a;
    const got = [m[0xF2], m[0x2F], m[0x28] | m[0x29] << 8, m[0x2E]], want = [st.f2, st.top, st.ptr, w];
    if (diff >= 0 || got.join() !== want.join()) { fail('wlDrawPlates', k, w, pose, diff >= 0 ? '$' + diff.toString(16) + ' ' + m[diff] + ' ' + bm[diff] : '', got.join(), want.join()); break; }
  }
}
console.log(`${cases} cases: ` + (bad ? bad + ' differences' : 'the page\'s sums match the game\'s routines'));
process.exit(bad ? 1 : 0);
