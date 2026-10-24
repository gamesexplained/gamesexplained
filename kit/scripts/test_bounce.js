'use strict';
// Test of the bouncing ball a music player can show in place of its piano roll (site/lib/bounce.js,
// C64Sid.mount's bounce option). The ball is only worth watching if it lands on each note as the
// note sounds, so the checks are on its path, without drawing it:
// - at each note's tick the ball is on that note: on the sheet (height 0), at the note's place
//   across the lane, and the note it last landed on is that one;
// - between two notes a short way apart it is in the air;
// - through a wait long enough to carry a resting ball out of the picture, before the first note
//   and after the last, it floats and keeps pace with the music;
// - it never jumps: sampled every tenth of a tick, no step in place, height or time is large;
// - voices with no notes get no lane.
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

// 50 ticks a second: notes 6 ticks apart, one 15 apart, a wait of 200 ticks, then 3 ticks apart
const RATE = 50;
const ticks = [10, 16, 22, 37, 43, 243, 246, 249, 252, 258];
const pitches = [40, 47, 43, 52, 40, 45, 59, 38, 44, 50];
const view = NoteBounce.create(stub());
view.score({ rate: RATE, voices: [{ notes: [] }, { notes: ticks.map((t, i) => ({ t, n: pitches[i] })) }, null] });
check(view.ballAt(0, 20) === null && view.ballAt(2, 20) === null && view.ballAt(1, 20) !== null,
  'a voice with no notes has no lane, and one with notes has its ball');

const lo = Math.min(...pitches) - 1, hi = Math.max(...pitches) + 1;
let landed = true;
ticks.forEach((t, i) => {
  const b = view.ballAt(1, t);
  const ok = b.i === i && Math.abs(b.y) < 1e-9 && Math.abs(b.lat - ((pitches[i] - lo) / (hi - lo) - 0.5)) < 1e-9 && Math.abs(b.at - t) < 1e-6;
  if (!ok) console.log(`  note ${i} at tick ${t}: ${JSON.stringify(b)}`);
  landed = landed && ok;
});
check(landed, 'the ball is on each note, at its place across the lane, at the tick it starts');

check([[10, 16], [16, 22], [22, 37], [246, 249], [249, 252]].every(([a, b]) => view.ballAt(1, (a + b) / 2).y > 0.02),
  'between notes a short way apart it is in the air');

const mid = view.ballAt(1, 140), lateMid = view.ballAt(1, 160);
check(mid.y > 0.3 && Math.abs(mid.at - 140) < 1e-6 && Math.abs(lateMid.at - 160) < 1e-6 && mid.i === 4,
  'through the wait of 200 ticks it floats, keeping pace with the music');
check(view.ballAt(1, 0).y > 0.1 && view.ballAt(1, 0).i === -1 && view.ballAt(1, 400).y > 0.3 && view.ballAt(1, 400).i === 9,
  'before the first note and long after the last it floats');

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

view.score(null);
check(view.ballAt(1, 20) === null, 'score(null) clears the view');

if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('all passed');
