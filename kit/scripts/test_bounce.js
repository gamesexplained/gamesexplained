'use strict';
// Test of the bouncing ball a music player can show in place of its piano roll (site/lib/bounce.js,
// C64Sid.mount's bounce option). The ball is only worth watching if it lands on each note as the
// note sounds and shows how the pitch moves between, so the checks are on its path and on the
// notes it takes, without drawing anything:
// - at each note's tick the ball is on that note: on the sheet (height 0), at the note's place
//   across the lane, and the note it last landed on is that one;
// - between two notes a short way apart it is in the air;
// - while a note sounds it rides the voice's line on the sheet, following a bend, however quiet
//   the note and however far the line strays from it; once the sound ends it rises;
// - through a wait long enough to carry a resting ball out of the picture, before the first note
//   and after the last, it floats and keeps pace with the music;
// - a step in the line to a pitch that holds is a note; a pitch held for a tick or two and a
//   slide are not;
// - it never jumps: sampled every tenth of a tick, no step in place, height or time is large;
// - its glow follows the voice's loudness: rising as a voice fades in, held through a short
//   gap, gone in a long rest, and full for a voice with no levels;
// - voices with no notes get no lane;
// - a step in pitch is a note when held for the same time at any rate the voice is read at;
// - NoteBounce.voice, for a chip with no gate, starts a note where the voice comes on, gets
//   louder or is restarted.
//   node kit/scripts/test_bounce.js
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

// create() wants a canvas and makes canvases of its own; none of it is drawn on here
const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : () => ctx, set: (o, k, v) => { o[k] = v; return true; } });
const stub = () => ({ width: 0, height: 0, clientWidth: 0, clientHeight: 0, getContext: () => ctx });
globalThis.document = { createElement: stub };
require(path.join(ROOT, 'site', 'lib', 'bounce.js'));
const { NoteBounce } = globalThis;

let fails = 0;
const check = (ok, what) => { if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + what); };

// 50 ticks a second. Voice 1: notes 6 ticks apart, one 15 apart, a wait of 200 ticks, then 3
// ticks apart. Each sounds until the next, but for note 4, which bends up from tick 48 and is
// silent from tick 60, and the last, silent from tick 280. Note 3 has a vibrato too small to be
// a note of its own.
const RATE = 50, LEN = 400;
const ticks = [10, 16, 22, 37, 43, 243, 246, 249, 252, 258];
const pitches = [40, 47, 43, 52, 40, 45, 59, 38, 44, 50];
const line1 = new Float32Array(LEN).fill(NaN), level1 = new Float32Array(LEN);
ticks.forEach((t, i) => {
  const end = i === 4 ? 60 : i === 9 ? 280 : ticks[i + 1];
  for (let k = t; k < end; k++) {
    let p = pitches[i];
    if (i === 3) p += 0.3 * Math.sin(2 * Math.PI * (k - t) / 6);
    if (i === 4 && k >= 48) p += 3 * (k - 47) / 12;
    line1[k] = p; level1[k] = 0.8;
  }
});
const bend = (k) => k < 48 ? 40 : 40 + 3 * (k - 47) / 12;
// Voice 2: one note at tick 100 on 50, which steps to 55 at tick 120 and holds, with a pitch held
// for one tick at 130 and one held for two at 137, then slides to 58 from tick 140.
const line2 = new Float32Array(LEN).fill(NaN);
for (let k = 100; k < 160; k++) {
  line2[k] = k < 120 ? 50 : k === 130 ? 60 : k === 137 || k === 138 ? 57 : k < 140 ? 55 : Math.min(58, 55 + 0.3 * (k - 139));
}

const view = NoteBounce.create(stub());
view.score({ rate: RATE, voices: [
  { notes: [] },
  { notes: ticks.map((t, i) => ({ t, n: pitches[i] })), line: line1, level: level1 },
  { notes: [{ t: 100, n: 50 }], line: line2 },
  null] });
check(view.ballAt(0, 20) === null && view.ballAt(3, 20) === null && view.ballAt(1, 20) !== null && view.ballAt(2, 120) !== null,
  'a voice with no notes has no lane, and one with notes has its ball');

const lo = Math.min(...pitches) - 1, hi = Math.max(...pitches) + 1;
const place = (n) => (n - lo) / (hi - lo) - 0.5;
let landed = true;
ticks.forEach((t, i) => {
  const b = view.ballAt(1, t);
  const ok = b.i === i && Math.abs(b.y) < 1e-9 && Math.abs(b.lat - place(pitches[i])) < 1e-9 && Math.abs(b.at - t) < 1e-6;
  if (!ok) console.log(`  note ${i} at tick ${t}: ${JSON.stringify(b)}`);
  landed = landed && ok;
});
check(landed, 'the ball is on each note, at its place across the lane, at the tick it starts');

check([[10, 16], [16, 22], [22, 37], [246, 249], [249, 252]].every(([a, b]) => view.ballAt(1, (a + b) / 2).y > 0.02),
  'between notes a short way apart it is in the air');

// riding: the average of the line over the last 0.12 s, which on a straight bend is its middle
const r47 = view.ballAt(1, 47), r58 = view.ballAt(1, 58);
check(r47.y === 0 && r58.y === 0 && Math.abs(r47.lat - place(40)) < 1e-6 && Math.abs(r58.lat - place(bend(55))) < 0.005 &&
  r58.i === 4 && Math.abs(r58.at - 58) < 1e-6,
  `while the note sounds it rides the line, following the bend (at tick 58 ${r58.lat.toFixed(4)} across, the bend ${place(bend(55)).toFixed(4)})`);
const up = view.ballAt(1, 75);
check(up.y > 0.2 && Math.abs(up.lat - view.ballAt(1, 60).lat) < 1e-6, 'once the sound ends it rises, where the line left it');

const mid = view.ballAt(1, 140), lateMid = view.ballAt(1, 160);
check(mid.y > 0.3 && Math.abs(mid.at - 140) < 1e-6 && Math.abs(lateMid.at - 160) < 1e-6 && mid.i === 4,
  'through the wait of 200 ticks it floats, keeping pace with the music');
check(view.ballAt(1, 0).y > 0.1 && view.ballAt(1, 0).i === -1 && view.ballAt(1, 400).y > 0.3 && view.ballAt(1, 400).i === 9,
  'before the first note and long after the last it floats');

const found = JSON.stringify(view.notesOf(2));
check(found === JSON.stringify([{ t: 100, n: 50 }, { t: 120, n: 55 }]),
  `a step to a pitch that holds is a note, and pitches held one or two ticks and a slide are not: ${found}`);
const s120 = view.ballAt(2, 120);
check(s120.i === 1 && s120.y === 0, 'the ball lands on the note the step makes');

let worst = { lat: 0, y: 0, at: 0 }, prev = null;
for (let t = 0; t <= 300; t += 0.1) {
  const b = view.ballAt(1, t);
  if (prev) {
    worst.lat = Math.max(worst.lat, Math.abs(b.lat - prev.lat));
    worst.y = Math.max(worst.y, Math.abs(b.y - prev.y));
    worst.at = Math.max(worst.at, Math.abs(b.at - prev.at - 0.1));
  }
  prev = b;
}
check(worst.lat < 0.1 && worst.y < 0.1 && worst.at < 0.5,
  `it never jumps: largest steps in a tenth of a tick ${worst.lat.toFixed(3)} across, ${worst.y.toFixed(3)} up, ${worst.at.toFixed(2)} ticks along`);

// One note whose sound fades in from almost nothing and sweeps up again and again over far more
// than the note's own range, as a siren does: the ball rides it all the way, across the lane.
// It is silent for its first 10 ticks, as under a slow attack.
const sweep = new Float32Array(300).fill(NaN), fade = new Float32Array(300);
for (let k = 11; k < 300; k++) { sweep[k] = 40 + (k * 0.8) % 50; fade[k] = k / 300; }
const siren = NoteBounce.create(stub());
siren.score({ rate: RATE, voices: [{ notes: [{ t: 1, n: 40.8 }], line: sweep, level: fade }] });
const ridden = [];
for (let t = 20; t < 290; t++) ridden.push(siren.ballAt(0, t));
const across = Math.max(...ridden.map((b) => b.lat)) - Math.min(...ridden.map((b) => b.lat));
check(ridden.every((b) => b.y === 0) && across > 0.75,
  `a slow, quiet start and a sweep far beyond the note keep the ball on the sheet, riding across the lane (${across.toFixed(2)} of it)`);

// The glow: the siren fades in, so its loudness rises with it; voice 1's note 4 falls silent at
// tick 60, two ticks of quiet keep most of its glow and the long rest after puts it out; voice 2
// gives no levels, so it glows in full.
const f100 = siren.ballAt(0, 100).loud, f250 = siren.ballAt(0, 250).loud;
check(Math.abs(f100 - 100 / 300) < 0.01 && Math.abs(f250 - 250 / 300) < 0.01,
  `the glow rises as the voice fades in (${f100.toFixed(2)} at tick 100, ${f250.toFixed(2)} at tick 250)`);
const g62 = view.ballAt(1, 62).loud, g140 = view.ballAt(1, 140).loud;
check(g62 > 0.5 && g62 < 0.8 && g140 < 0.01 && view.ballAt(2, 120).loud === 1,
  `the glow holds through a short gap (${g62.toFixed(2)}), is gone in a long rest (${g140.toFixed(3)}), and is full with no levels`);

view.score(null);
check(view.ballAt(1, 20) === null, 'score(null) clears the view');

// The same line read 50 and 100 times a second gives the same notes: a step to a pitch held for
// 0.2 s is a note, one held for 0.04 s is not (at 100 a second, four ticks).
function stepsAt(rate) {
  const n = Math.round(1.2 * rate), line = new Float32Array(n).fill(NaN);
  const at = (s) => Math.round(s * rate);
  for (let k = at(0.1); k < n; k++) line[k] = 40;
  for (let k = at(0.4); k < at(0.6); k++) line[k] = 45;
  for (let k = at(0.8); k < at(0.84); k++) line[k] = 47;
  const v = NoteBounce.create(stub());
  v.score({ rate, voices: [{ notes: [{ t: at(0.1), n: 40 }], line }] });
  return v.notesOf(0).map((e) => `${(e.t / rate).toFixed(2)}:${e.n}`).join(' ');
}
const s50 = stepsAt(50), s100 = stepsAt(100);
check(s50 === s100 && s50 === '0.10:40 0.40:45 0.60:40 0.84:40',
  `a pitch held long enough to be a note is held for the same time at any rate (50 a second: ${s50}; 100: ${s100})`);

// NoteBounce.voice, for a chip with no gate: a note where the voice comes on, gets louder by a
// fifth of full or more, or the chip restarts it; none for a smaller rise or a noise, which has
// no pitch and no line.
{
  const N = 24, hz = new Float32Array(N), lv = new Float32Array(N), start = new Uint8Array(N);
  for (let k = 2; k < N; k++) { hz[k] = 440; lv[k] = 1; }
  lv[5] = 0.5; lv[6] = 0.6; lv[7] = 0.6;              // a fall, and a rise of a tenth: no note
  lv[8] = 1;                                          // a rise of 0.4: a note
  start[12] = 1;                                      // restarted at the same loudness: a note
  hz[15] = hz[16] = NaN;                              // a noise, loud but with no pitch
  hz[18] = 880;                                       // a step in pitch, left to score()
  const v = NoteBounce.voice({ hz, level: lv, start });
  check(v.notes.map((e) => e.t).join() === '2,8,12,17' && Math.abs(v.notes[0].n - 57) < 1e-4,
    `voice(): notes where the voice comes on, gets louder, restarts and comes back after a noise (${v.notes.map((e) => e.t).join()}); 440 Hz is note 57`);
  check(Number.isNaN(v.line[1]) && Number.isNaN(v.line[15]) && Math.abs(v.line[18] - 69) < 1e-4 && v.level[5] === 0.5,
    'voice(): no line where it is silent or a noise, the line in notes, the level as given');
}

if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('all passed');
