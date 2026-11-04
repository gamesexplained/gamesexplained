'use strict';
// The Graphics tab (graphics.html) held against the game's code. Every picture on the tab was made
// by running the game's own routines on the kit's Z80 (kit/spectrum/z80.js) over listing.json's
// bytes, and this file makes them again the same way and compares them with the page's data:
// - the worm: the game's frame loop, from start_new_game ($757F), a pass at a time, the controls
//   byte set after read_controls; only the worm's four display-list records (type $FA) are drawn,
//   by draw_object ($81DB), into a cleared buffer;
// - Crawlies, the Sputnik and the eruption point: records put in the object pool of a game 26
//   passes old, stepped each pass by walk_objects ($D691), listed by build_display_list ($AAF3)
//   and drawn by draw_object; the worm stays where it is;
// - the sparky's sizes: plot_spark ($B797) for each size;
// - the spindle, the eruption pad and the de-bugger: draw_object at the middle of the view with
//   the frame counter ($8059) stepped;
// - the ending: draw_object for the disk with the counter at $BAAD stepped as $78EF steps it.
// Then it checks what the page's words say: the periods, the pictures and the counts.
// Run: node games/spectrum/fat-worm-blows-a-sparky/test_graphics.js
// The page's data is built from cards() below (require this file and call it).

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../..');
const { CPU } = require(path.join(ROOT, 'kit/spectrum/z80.js'));
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));

const g = game(__dirname);
const L = g.listing();
const S = {};
for (const s of g.json('symbols.json').symbols) S[s.name] = s.address;
const mem = () => L.ram.slice();
const w16 = (M, a, v) => { M[a] = v & 0xFF; M[a + 1] = (v >> 8) & 0xFF; };
const r16 = (M, a) => M[a] | (M[a + 1] << 8);
const s16 = (v) => (v << 16) >> 16;

// Call a routine; it returns to $FFFF, an address in the buffer no code is at.
function call(M, pc, regs = {}) {
  const cpu = new CPU(M);
  cpu.setRegs(Object.assign({ sp: 0xF000 - 2 }, regs, { pc }));
  w16(M, cpu.sp, 0xFFFF);
  for (let n = 0; cpu.pc !== 0xFFFF; n++) { cpu.step(); if (n > 5e6) throw new Error('runaway at $' + cpu.pc.toString(16)); }
  return cpu;
}

// The display list from its head at $EB7E: 15-byte records (facts.md, "The display list").
function list(M) {
  const out = [];
  for (let e = r16(M, 0xEB7E); e >> 8; e = r16(M, e)) {
    out.push({ x1: r16(M, e + 2), y1: r16(M, e + 4), x2: r16(M, e + 6), y2: r16(M, e + 8), src: r16(M, e + 10), top: M[e + 12], bottom: M[e + 13], type: M[e + 14] });
  }
  return out;
}

// The buffer at $F000 cleared as $EAA9 clears it (every pixel ink), then one record drawn as $B2F4
// draws it, from a display-list record of our own at $EC80, in the free space after the list.
const REC = 0xEC80;
const clear = (M) => M.fill(0xFF, 0xF000, 0x10000);
function drawRec(M, r) {
  w16(M, REC + 2, r.x1); w16(M, REC + 4, r.y1); w16(M, REC + 6, r.x2); w16(M, REC + 8, r.y2);
  w16(M, REC + 0x0A, r.src); M[REC + 0x0C] = r.top; M[REC + 0x0D] = r.bottom; M[REC + 0x0E] = r.type;
  w16(M, S.draw_entry, REC);
  w16(M, S.extent_x1, r.x1); w16(M, S.extent_x2, r.x2); w16(M, S.extent_y1, r.y1); w16(M, S.extent_y2, r.y2);
  call(M, S.draw_object, { a: r.type, b: r.bottom, c: r.top });
}
const buf = (M) => M.slice(0xF000, 0x10000);
const ink = (b, x, y) => (x < 0 || y < 0 || x > 255 || y > 127) ? 1 : (b[y * 32 + (x >> 3)] >> (7 - (x & 7))) & 1;

// The game's frame loop from start_new_game. controls(pass) sets the controls byte after
// read_controls ($768B); before(pass, M) runs before move_worm; onPass(pass, M, list) runs once the
// pass is drawn.
function run(passes, { controls, before, onPass } = {}) {
  const M = mem();
  const cpu = new CPU(M, { io: { in: () => 0xFF, out: () => {} } });
  cpu.setRegs({ pc: S.start_new_game, sp: 0xF000 });
  let pass = 0, lst = null;
  for (let n = 0; pass < passes; n++) {
    const pc = cpu.pc;
    if (pc === 0x765C && before) before(pass, M);
    else if (pc === 0x7668) lst = list(M);
    else if (pc === 0x766B && onPass) onPass(pass, M, lst);
    else if (pc === 0x768E && controls) M[S.controls] = controls(pass, M);
    else if (pc === 0x779D) pass++;
    else if (pc === 0x783B || pc === S.menu) throw new Error('the game ended at pass ' + pass);
    cpu.step();
    if (n > 4e8) throw new Error('runaway');
  }
  return M;
}

// frames [{ buf, cx, cy }] -> a card: every frame cut to the smallest box that holds every frame's
// paper pixels, placed by the frame's centre cx, cy; equal neighbours merged into runs of passes.
function card(frames, o = {}) {
  let Lf = 0, T = 0, R = 0, B = 0;
  for (const f of frames) for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) if (!ink(f.buf, x, y)) {
    Lf = Math.min(Lf, x - f.cx); R = Math.max(R, x - f.cx); T = Math.min(T, y - f.cy); B = Math.max(B, y - f.cy);
  }
  const m = o.margin === undefined ? 3 : o.margin;
  Lf -= m; T -= m; R += m; B += m;
  const w = R - Lf + 1, h = B - T + 1;
  let pics = frames.map((f) => {
    const bytes = Buffer.alloc(Math.ceil(w * h / 8));
    let k = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++, k++) if (ink(f.buf, f.cx + Lf + x, f.cy + T + y)) bytes[k >> 3] |= 0x80 >> (k & 7);
    return bytes.toString('base64');
  });
  if (o.fold) { // the shortest period the second half repeats with
    const n = pics.length, half = n >> 1;
    for (let p = 1; p <= half; p++) {
      let ok = true;
      for (let i = half; i + p < n; i++) if (pics[i] !== pics[i + p]) { ok = false; break; }
      if (ok) { pics = pics.slice(half, half + p); break; }
    }
  }
  const uniq = [], seq = [];
  for (const s of pics) {
    let i = uniq.indexOf(s); if (i < 0) { uniq.push(s); i = uniq.length - 1; }
    if (seq.length && seq[seq.length - 1][0] === i) seq[seq.length - 1][1]++; else seq.push([i, 1]);
  }
  if (o.fold && seq.length > 1 && seq[0][0] === seq[seq.length - 1][0]) seq[0][1] += seq.pop()[1];
  if (o.rest) seq.push([-1, o.rest]);
  return { w, h, pics: uniq, seq };
}

// The worm's four records, drawn alone, each pass of a run; the head is the middle of the view.
function wormRun(passes, controls, before) {
  const out = [];
  run(passes, { controls, before, onPass(p, M, lst) {
    const W = M.slice(); clear(W);
    for (const r of lst.filter((r) => r.type === 0xFA)) drawRec(W, r);
    out.push({ buf: buf(W), cx: 128, cy: 64 });
  } });
  return out;
}

// The object pool: 30-byte records from $7C74, the end at object_list_end, the count plus one.
let BASE = null;
function world(records) {
  if (!BASE) run(26, { onPass(p, M) { if (p === 25) BASE = M.slice(); } });
  const M = BASE.slice();
  let a = 0x7C74;
  for (const r of records) { M.fill(0, a, a + 30); for (const [k, v] of Object.entries(r)) M[a + +k] = v & 0xFF; a += 30; }
  w16(M, S.object_list_end, a); M[S.object_count_plus_one] = 1 + records.length;
  return M;
}
const centre = (r) => [128 + (s16(r.x1) + s16(r.x2) >> 1), 64 + (s16(r.y1) + s16(r.y2) >> 1)];
// Each pass: the frame counter up, walk_objects, build_display_list, and the pool's records drawn.
// pick chooses which; held puts the first record of that type in the middle of the card.
function poolRun(records, passes, { pick, edit, held } = {}) {
  const M = world(records), out = [];
  for (let p = 0; p < passes; p++) {
    if (edit) edit(p, M);
    w16(M, S.frame_counter, r16(M, S.frame_counter) + 1);
    call(M, S.walk_objects);
    call(M, S.build_display_list);
    const mine = list(M).filter((r) => r.src >= 0x7C74 && r.src < 0x7F54 && (!pick || pick(r)));
    const W = M.slice(); clear(W);
    for (const r of mine) drawRec(W, r);
    const f = { buf: buf(W), cx: 128, cy: 64, pool: [...M.subarray(0x7C74, r16(M, S.object_list_end))], types: mine.map((r) => r.type) };
    const c = held && (mine.find((r) => r.type === held) || mine[0]);
    if (c) [f.cx, f.cy] = centre(c);
    out.push(f);
  }
  return out;
}
// A Crawly as $BE40 lays one out on a pad: speed 5, turn $0F; its legs' bytes from the random
// generator there, fixed here.
const crawlyRec = (M0, w, dx) => ({ 0: 0xF3, 2: 2, 3: 2, 5: M0[0x7FF5] + dx, 7: M0[0x7FF7], 8: w, 9: w, 0x0B: 1, 0x0D: 0x13, 0x0E: 0x40, 0x0F: 0x13, 0x10: 0x5A, 0x11: 0xC7, 0x12: 5, 0x13: 0x0F, 0x14: 0x28, 0x15: 1, 0x16: 7, 0x18: 2 });

// A board piece at the middle of the view, the frame counter stepped as the loop steps it.
function still(type, w, d, bottom, top, passes) {
  const M = mem(), fr = [];
  for (let p = 0; p < passes; p++) {
    w16(M, S.frame_counter, p + 1);
    clear(M); drawRec(M, { x1: -(w >> 1), y1: -(d >> 1), x2: w - (w >> 1), y2: d - (d >> 1), bottom, top, type, src: 0x6FF3 });
    fr.push({ buf: buf(M), cx: 128, cy: 64 });
  }
  return fr;
}

// The ending: the disk 8 units below the middle of the view, where the slide at $78C9 leaves the
// board item at $6FF3 (y 9) with the worm's y at 1, and centred across; 8 passes of the disk alone,
// then the counter at $BAAD up by 1 a pass, and down by 3 once draw_floppy_disk ($BB06) sets bit 7.
function endingRun(log) {
  const M = mem(), fr = [];
  M[S.disk_lift_counter] = 0;
  for (let p = 1; ; p++) {
    if (p > 8) {
      let c = M[S.disk_lift_counter];
      if (c & 0x80) { c -= 3; if (c < 0x80) break; } else { c += 1; if (c & 0x80) break; }
      M[S.disk_lift_counter] = c;
    }
    w16(M, S.frame_counter, p);
    clear(M); drawRec(M, { x1: -34, y1: 8, x2: 34, y2: 93, bottom: 0, top: 3, type: 0xF6, src: 0x6FF3 });
    if (log) log.push(M[S.disk_lift_counter]);
    fr.push({ buf: buf(M), cx: 128, cy: 64 });
  }
  return fr;
}

function cards() {
  const C = {};
  C['worm-straight'] = card(wormRun(48, () => 0).slice(24), { fold: true });
  C['worm-turn'] = card(wormRun(88, (p) => (p >= 20 ? 1 : 0)).slice(24));
  C['worm-bug'] = card(wormRun(40, () => 0, (p, M) => { if (p === 24) M[0x7F5A] = 1; }).slice(23, 34));
  const M0 = (world([]), BASE), wx = M0[0x7FF5], wy = M0[0x7FF7];
  const isCrawly = (r) => r.type === 0xF3;
  C['crawly'] = card(poolRun([crawlyRec(M0, 10, 120)], 40, { pick: isCrawly, held: 0xF3 }));
  C['crawly-big'] = card(poolRun([crawlyRec(M0, 14, 120)], 40, { pick: isCrawly, held: 0xF3 }));
  const fb = { 0: 0xFB, 1: 0x14, 2: 2, 3: 2, 5: wx, 7: wy, 8: 0x10, 9: 0x10, 0x0B: 0, 0x0D: 1 };
  C['crawly-small'] = card(poolRun([fb], 60, { pick: isCrawly, held: 0xF3 }).slice(20));
  // hit by a sparky: +$12 set to $FF as $D89A sets it
  C['crawly-hit'] = card(poolRun([crawlyRec(M0, 10, 120)], 11, { held: 0xF3, edit: (p, M) => { if (p === 4) M[0x7C74 + 0x12] = 0xFF; } }), { rest: 4 });
  const sp = { 0: 0xE5, 2: 2, 3: 2, 5: wx + 12, 7: wy + 12, 8: 10, 9: 10, 0x0B: 0xCF, 0x0D: 0xD9, 0x0E: 0x40, 0x0F: 0x13, 0x10: 0x5A, 0x11: 0xC7, 0x12: 5, 0x13: 0x0F, 0x1C: 0x63 };
  C['sputnik'] = card(poolRun([sp], 48), { rest: 4 });
  {
    const M = mem(); clear(M);
    let x = 4, y = 30;
    for (let n = 1; n <= 20; n++) {
      if (n === 13) { x = 4; y = 70; }
      call(M, S.plot_spark, { b: n, h: 0, l: y - (n >> 1), d: 0, e: x });
      x += Math.max(n, 6) + 4 + (n > 16 ? 8 : 0);
    }
    C['sparky-sizes'] = card([{ buf: buf(M), cx: 0, cy: 0 }], { margin: 2 });
  }
  C['eruption'] = card(poolRun([fb], 32, { held: 0xFB }));
  C['spindle-odd'] = card(still(0xF7, 12, 12, 0, 1, 8), { fold: true });
  C['spindle-even'] = card(still(0xF7, 12, 12, 1, 2, 8), { fold: true });
  C['pad'] = card(still(0xF4, 40, 40, 0, 48, 64), { fold: true });
  C['debugger'] = card(still(0xE3, 54, 64, 32, 112, 32), { fold: true });
  C['ending'] = card(endingRun(), { margin: 0, rest: 6 });
  return C;
}

// The page's data: the cards without their pictures, and every picture in card order, one after
// another, deflated and in base64.
function pack(C) {
  const meta = {}, parts = [];
  for (const [id, c] of Object.entries(C)) { meta[id] = { w: c.w, h: c.h, n: c.pics.length, seq: c.seq }; for (const p of c.pics) parts.push(Buffer.from(p, 'base64')); }
  return { meta, data: zlib.deflateRawSync(Buffer.concat(parts), { level: 9 }).toString('base64') };
}

module.exports = { cards, pack, call, mem, S, L, run, poolRun, still, world, endingRun, list, card };

if (require.main === module) {
  let bad = 0, checks = 0;
  const ok = (cond, msg) => { checks++; if (!cond) { bad++; console.log('FAIL:', msg); } };
  const page = fs.readFileSync(path.join(__dirname, 'graphics.html'), 'utf8');
  const metaM = page.match(/<script type="application\/json" id="fw-gfx-meta">([\s\S]*?)<\/script>/);
  const dataM = page.match(/<script type="text\/plain" id="fw-gfx-data">([\s\S]*?)<\/script>/);
  ok(metaM && dataM, 'graphics.html carries fw-gfx-meta and fw-gfx-data');
  const C = cards();
  const want = pack(C);
  if (metaM && dataM) {
    const meta = JSON.parse(metaM[1]);
    ok(JSON.stringify(meta) === JSON.stringify(want.meta), 'the page\'s card list, sizes and timings are the ones the game\'s code gives');
    const got = zlib.inflateRawSync(Buffer.from(dataM[1].trim(), 'base64'));
    const exp = zlib.inflateRawSync(Buffer.from(want.data, 'base64'));
    ok(got.equals(exp), 'every picture on the page is the one the game\'s code draws');
    for (const id of Object.keys(want.meta)) ok(page.includes(`data-card="${id}"`), `the page has a place for the card ${id}`);
  }

  // What the words say.
  const passes = (c) => c.seq.reduce((a, [i, n]) => a + (i < 0 ? 0 : n), 0);
  const pictures = (c) => c.seq.filter(([i]) => i >= 0).map(([i]) => i);
  ok(passes(C['worm-straight']) === 4 && C['worm-straight'].pics.length === 4, 'the worm going straight repeats every 4 passes, a different picture each pass');
  ok(C['spindle-odd'].pics.length === 4 && passes(C['spindle-odd']) === 4, 'a spindle has four pictures, one a pass');
  {
    // the two directions: the even spindle's pictures are the odd one's, in the other order
    const odd = C['spindle-odd'].pics, even = C['spindle-even'].pics;
    // the same four pictures; each step of the even one goes to the picture before in the odd one's cycle
    const prev = (pic) => odd[(odd.indexOf(pic) + 3) % 4];
    ok(even.every((p) => odd.includes(p)) && even.every((p, i) => even[(i + 1) % 4] === prev(p)), 'a spindle with an even top turns the other way');
  }
  ok(passes(C['pad']) === 32, 'the pad pulses over 32 passes');
  ok(passes(C['debugger']) === 16, 'the de-bugger\'s stripes repeat every 16 passes');
  // the board: 27 spindles with an odd top, 31 with an even one
  {
    const M = L.ram; let a = 0x6464, odd = 0, even = 0;
    while (!(M[a] === 0 && M[a + 1] === 0xFF)) { a += 8; while (M[a] !== 0) { if (M[a + 6] === 0xF7 && M[a + 5] === 0x0C) (M[a] & 1 ? odd++ : even++); a += 7; } a++; }
    ok(odd === 27 && even === 31, `spindles with an odd top ${odd}, even ${even}`);
  }
  // the explosion: picture 1 for three passes, 2 and 3 for one each, then gone
  {
    const fr = poolRun([crawlyRec((world([]), BASE), 10, 120)], 11, { held: 0xF3, edit: (p, M) => { if (p === 4) M[0x7C74 + 0x12] = 0xFF; } });
    const t = fr.map((f) => f.types.map((x) => x.toString(16)).join('+'));
    ok(t.join(' ') === 'f3 f3 f3 f3 f3 e6 e6 e6 e6 e6 ', 'a Crawly hit on pass 4 is drawn once more, then 5 passes of explosion: ' + t.join(' '));
    const ptr = fr.slice(5, 10).map((f) => ((f.pool[0x10] << 8) | f.pool[0x0F]).toString(16));
    ok(ptr.join(' ') === 'c5b3 c5b3 c5b3 c5ef c62b', 'the explosion\'s pictures: ' + ptr.join(' '));
  }
  // the Sputnik: down 5 a pass while over the worm, then a Crawly
  {
    const fr = poolRun([{ 0: 0xE5, 2: 2, 3: 2, 5: BASE[0x7FF5] + 12, 7: BASE[0x7FF7] + 12, 8: 10, 9: 10, 0x0B: 0xCF, 0x0D: 0xD9, 0x1C: 0x63 }], 48);
    const kinds = fr.map((f) => f.pool[0]), bottoms = fr.map((f) => f.pool[0x0B]);
    const first = kinds.indexOf(0xF3);
    ok(first === 41 && bottoms[0] === 0xCF - 5 && bottoms[40] === 2, `the Sputnik lands on pass ${first + 1} after coming down 5 a pass`);
    // its picture only ever shrinks: the four sizes, largest first
    const sizes = new Set(), order = [];
    for (const f of fr.slice(0, 41)) { const w = f.pool[0x1C]; if (!sizes.has(w)) { sizes.add(w); order.push(w); } }
    ok(order.every((w, i) => i === 0 || w <= order[i - 1]), 'the Sputnik\'s width on screen never grows');
  }
  // the eruption point: unseen while its count is 9 or more, 8 passes of the first picture, then the second, with a small Crawly
  {
    const fr = poolRun([{ 0: 0xFB, 1: 0x14, 2: 2, 3: 2, 5: BASE[0x7FF5], 7: BASE[0x7FF7], 8: 0x10, 9: 0x10, 0x0B: 0, 0x0D: 1 }], 32, { held: 0xFB });
    const count = fr.map((f) => f.pool[1]);
    ok(count.slice(0, 20).join(',') === [19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].join(','), 'the eruption point counts down a pass at a time from $14');
    ok(fr[19].types.includes(0xF3) && !fr[18].types.includes(0xF3), 'it lets out a Crawly on the pass its count reaches 0');
    ok(fr[31].pool[1] === 0 && fr[31].types.includes(0xFB), 'and stays, at 0, drawn with its second picture');
    const blank = fr.slice(0, 11).every((f) => f.buf.every((b) => b === 0xFF));
    ok(blank, 'nothing is drawn while its count is 9 or more');
  }
  // the ending's counter
  {
    const log = []; endingRun(log);
    const up = log.slice(8), top = up.findIndex((c) => c & 0x80);
    ok(up[0] === 1 && up[top - 1] === top && (up[top] & 0x80), `the hand comes down a row a pass for ${top} passes`);
    ok(up.slice(top).every((c, i) => i === 0 || c === up[top + i - 1] - 3), 'then the counter falls by 3 a pass');
    ok(up.length === C['ending'].seq.reduce((a, [i, n]) => a + (i < 0 ? 0 : n), 0) - 8, 'the ending card holds every pass');
  }
  // every size of sparky is in the strip: 20 pictures from spark_picture_table
  {
    const M = mem(); let n = 0;
    for (let s = 1; s <= 20; s++) if (r16(M, 0xBF27 + 2 * s)) n++;
    ok(n === 20, 'spark_picture_table has a picture for each size 1 to 20');
  }
  console.log(bad ? `FAILED: ${bad} of ${checks} checks` : `ok: ${checks} checks`);
  process.exit(bad ? 1 : 0);
}
