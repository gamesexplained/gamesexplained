#!/usr/bin/env node
// The site's model of the Apple II's speaker, site/lib/apple2-speaker.js, against the speaker's rule
// in kit/skills/apple2/apple2-reference, "The speaker": every access moves the cone to its other
// side, so two accesses make one cycle of a square wave, and a tone of f Hz is an access every
// 1,020,484 / (2f) cycles. It exits 1 on any difference.
//   node kit/apple2/test_speaker.js
'use strict';
const path = require('path');
require(path.join(__dirname, '../../site/lib/apple2-speaker.js'));
const S = globalThis.Apple2Speaker;
let bad = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };
const RATE = 44100;
const tone = (every, count, start = 1000) => {
  const speaker = [];
  for (let k = 1; k <= count; k++) speaker.push(start + k * every);
  return { format: 'kit-apple2-sound', clock: S.CLOCK, start, end: start + (count + 1) * every, speaker };
};

// The clock the reference gives
if (S.CLOCK !== 1020484) fail('clock', S.CLOCK);

// pack and unpack give the log back
{
  const log = tone(731, 50);
  const back = S.unpack(S.pack(log));
  if (JSON.stringify(back.speaker) !== JSON.stringify(log.speaker) || back.start !== log.start || back.end !== log.end)
    fail('pack and unpack do not give the log back');
}

// A tone: clicks every 500 cycles are a square wave of 1,020,484 / 1,000 = 1,020.5 Hz. Count the
// output's rising zero crossings over the last half second of a second's tone.
for (const every of [500, 1305, 270, 3000]) {
  const want = S.CLOCK / (2 * every);
  const count = Math.floor(S.CLOCK / every);
  const out = S.render(tone(every, count), RATE);
  let ups = 0, first = -1, last = -1;
  for (let i = Math.floor(RATE / 2); i < RATE; i++) {
    if (out[i - 1] < 0 && out[i] >= 0) { ups++; if (first < 0) first = i; last = i; }
  }
  const got = (ups - 1) / ((last - first) / RATE);
  if (Math.abs(got - want) / want > 0.01) fail(`clicks every ${every} cycles played ${got.toFixed(1)} Hz, the rule gives ${want.toFixed(1)}`);
  const ns = S.notes(tone(every, count));
  if (ns.length !== 1 || Math.abs(ns[0].hz - want) > 0.01 || ns[0].clicks !== count)
    fail(`notes() for clicks every ${every} cycles:`, JSON.stringify(ns.slice(0, 2)));
  // the square wave's swing is the cone's two sides, 2 x LEVEL, once the filter has settled; the
  // filter tilts each half of a low note, which adds up to a fifth at 170 Hz
  let lo = 0, hi = 0;
  for (let i = Math.floor(RATE / 2); i < RATE; i++) { lo = Math.min(lo, out[i]); hi = Math.max(hi, out[i]); }
  if (want < 2000 && Math.abs((hi - lo) - 2 * S.LEVEL) > 0.4 * S.LEVEL)
    fail(`clicks every ${every} cycles swing ${(hi - lo).toFixed(3)}, the two sides are ${2 * S.LEVEL}`);
}

// No clicks: silence
{
  const out = S.render({ clock: S.CLOCK, start: 0, end: S.CLOCK / 10, speaker: [] }, RATE);
  if (out.some(v => v !== 0)) fail('no clicks is not silence');
}

// One click: the cone moves once and stays, which is heard as one tick. The output jumps, then the
// steady level fades: under 1 % of the jump 0.2 s later.
{
  const out = S.render({ clock: S.CLOCK, start: 0, end: S.CLOCK / 2, speaker: [S.CLOCK / 10] }, RATE);
  const at = Math.round(RATE / 10);
  const jump = Math.max(...out.slice(at - 2, at + 3).map(Math.abs));
  if (Math.abs(jump - 2 * S.LEVEL) > 0.05 * S.LEVEL) fail(`one click jumped ${jump.toFixed(3)}, not ${2 * S.LEVEL}`);
  if (Math.abs(out[at + Math.round(RATE / 5)]) > jump / 100) fail('a cone held still is still heard 0.2 s on');
}

// A click partway through a sample counts for the part of the sample after it: two clicks a quarter
// of a sample apart leave the sample three quarters on its side
{
  const per = S.CLOCK / RATE;
  const start = 0, c = Math.round(per * 1000);
  const out = S.render({ clock: S.CLOCK, start, end: c + per * 10, speaker: [c + per * 0.25, c + per * 0.5] }, RATE);
  const ref = S.render({ clock: S.CLOCK, start, end: c + per * 10, speaker: [] }, RATE);
  const d = out[1000] - ref[1000];
  if (Math.abs(d - 0.25 * 2 * S.LEVEL) > 0.02) fail(`two clicks inside a sample moved it ${d.toFixed(3)}, not ${(0.5 * S.LEVEL).toFixed(3)}`);
}

// hz() and notes() over a falling tone: each spacing's pitch, and a new note once the spacing has
// grown by more than a quarter
{
  const speaker = [];
  let at = 0;
  for (let k = 0; k < 40; k++) { at += 300 + 10 * k; speaker.push(at); }
  const ns = S.notes({ clock: S.CLOCK, start: 0, end: at + 100, speaker });
  if (ns.length < 2 || !(ns[0].hz > ns[ns.length - 1].hz)) fail('a falling tone is not falling notes', JSON.stringify(ns));
  if (Math.abs(S.hz(500) - 1020.484) > 1e-9) fail('hz(500)', S.hz(500));
}

// notes(log, 2) over two voices at one pitch, the second a little slower, so that they drift apart:
// each voice clicks once a period, and the spacings alternate. Two notes, then a rest, then the
// two voices held a fixed distance apart: three notes, each at clock / the first voice's period.
{
  const speaker = [], want = [];
  let at = 1000;
  for (const [period, lead, count, drift] of [[6440, 39, 60, 36], [5139, 39, 60, 30], [3862, 49, 80, 0]]) {
    want.push(S.CLOCK / period);
    for (let k = 0; k < count; k++) { speaker.push(at, at + lead + k * drift); at += period; }
    at += 20000;
  }
  speaker.sort((a, b) => a - b);
  const ns = S.notes({ clock: S.CLOCK, start: 0, end: at, speaker }, 2);
  if (ns.length !== 3 || ns.some((n, k) => Math.abs(n.hz - want[k]) / want[k] > 0.01))
    fail('notes(log, 2) for two voices:', JSON.stringify(ns.map(n => [n.t.toFixed(3), n.hz.toFixed(1), n.clicks])), 'want', want.map(h => h.toFixed(1)).join(', '));
}

if (bad) { console.log(bad + ' failed'); process.exit(1); }
console.log('apple2-speaker: the model follows the speaker\'s rule');
