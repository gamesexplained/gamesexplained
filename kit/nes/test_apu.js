#!/usr/bin/env node
'use strict';
// Checks site/lib/apu.js, the site's model of the NES's APU: a pulse at a known period sounds at
// the frequency the wiki's formula gives, the triangle at half of it, a length counter stops a
// note when it runs out, the sweep moves a pitch, the frame counter's mode is restarted by every
// write, the noise channel makes something, pack() and unpack() round-trip a log, and record()
// stops a driver's log where the driver ends, and live() keeps half a second of frames waiting and
// makes an older frame's writes when more come rather than losing them. Run as a script; exits
// non-zero on failure.
const path = require('path');
const assert = require('assert');
require(path.resolve(__dirname, '../../site/lib/apu.js'));
const A = globalThis.NESApu;

// The frequency of a rendered waveform, from its rising zero crossings over the middle of it.
function frequency(samples, rate) {
  let crossings = 0, first = -1, last = -1;
  const from = Math.floor(samples.length * 0.2), to = Math.floor(samples.length * 0.8);
  for (let i = from + 1; i < to; i++) {
    if (samples[i - 1] <= 0 && samples[i] > 0) { if (first < 0) first = i; last = i; crossings++; }
  }
  return crossings > 1 ? (crossings - 1) * rate / (last - first) : 0;
}
const log = (writes, seconds) => ({ clock: A.CLOCK, start: 0, end: Math.round(seconds * A.CLOCK), writes: writes.map(([c, a, v]) => [c, a, v]) });
const rate = 44100;
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('ok   ' + name); }

check('a pulse at period 253 sounds at 440 Hz', () => {
  // $4000: duty 2, constant volume 15; $4003: length index 1 (254 half frames), period high 0
  const l = log([[0, 0x4015, 0x0f], [0, 0x4000, 0xbf], [0, 0x4001, 0x08], [0, 0x4002, 253], [0, 0x4003, 0x08]], 0.5);
  const hz = frequency(A.render(l, rate), rate);
  assert.ok(Math.abs(hz - A.hzOfPulse(253)) < 3, 'measured ' + hz + ' Hz, expected ' + A.hzOfPulse(253));
});
check('the triangle at the same period sounds an octave lower', () => {
  const l = log([[0, 0x4015, 0x0f], [0, 0x4008, 0xff], [0, 0x400a, 253], [0, 0x400b, 0x08]], 0.5);
  const hz = frequency(A.render(l, rate), rate);
  assert.ok(Math.abs(hz - A.hzOfTri(253)) < 3, 'measured ' + hz + ' Hz, expected ' + A.hzOfTri(253));
});
check('a length counter of 10 half frames stops the note', () => {
  // $4000 with halt clear; $4003 length index 0 (10); 4-step mode: 2 half frames a frame, so about 5 frames of sound
  const l = log([[0, 0x4017, 0x00], [0, 0x4015, 0x0f], [0, 0x4000, 0x9f], [0, 0x4002, 100], [0, 0x4003, 0x00]], 0.5);
  const s = A.render(l, rate);
  const loud = (from, to) => { let m = 0; for (let i = from; i < to; i++) m = Math.max(m, Math.abs(s[i])); return m; };
  assert.ok(loud(0, rate * 0.05) > 0.02, 'silent at the start');
  assert.ok(loud(rate * 0.4, rate * 0.5) < 0.002, 'still sounding after the length ran out');
});
check('the sweep lowers a pitch over time', () => {
  // sweep on, period 1, negate, shift 1: the period halves each clock until it mutes
  const l = log([[0, 0x4015, 0x0f], [0, 0x4000, 0xbf], [0, 0x4001, 0x99], [0, 0x4002, 0x00], [0, 0x4003, 0x0b]], 0.2);
  const trace = A.decode(l);
  const periods = trace.map(s => s.p1[0]);
  assert.ok(periods[0] > periods[Math.floor(periods.length / 4)], 'the period did not fall: ' + periods.slice(0, 5));
});
check('a write to $4017 with bit 7 set clocks the length counters at once', () => {
  const chip = new A.Chip();
  chip.write(0x4015, 0x0f); chip.write(0x4000, 0x9f); chip.write(0x4003, 0x00);   // length 10
  assert.strictEqual(chip.p[0].length, 10);
  chip.write(0x4017, 0xc0);
  assert.strictEqual(chip.p[0].length, 9, 'the half-frame clock did not run on the write');
  chip.write(0x4017, 0x00);
  assert.strictEqual(chip.p[0].length, 9, 'a 4-step write must not clock');
});
check('the noise channel makes a signal', () => {
  const l = log([[0, 0x4015, 0x0f], [0, 0x400c, 0x3f], [0, 0x400e, 0x04], [0, 0x400f, 0x08]], 0.2);
  const s = A.render(l, rate);
  let m = 0; for (let i = 0; i < s.length / 2; i++) m = Math.max(m, Math.abs(s[i]));
  assert.ok(m > 0.02, 'silent');
  const n = A.notes(l).filter(x => x.ch === 3);
  assert.ok(n.length >= 1 && n[0].hz === A.NOISE_PERIOD[4], 'no noise note, or the wrong period: ' + JSON.stringify(n[0]));
});
check('notes() finds a note with its pitch and length', () => {
  const l = log([[0, 0x4015, 0x0f], [0, 0x4000, 0xbf], [0, 0x4002, 253], [0, 0x4003, 0x08], [Math.round(A.CLOCK * 0.25), 0x4000, 0x30]], 0.5);
  const n = A.notes(l).filter(x => x.ch === 0);
  assert.strictEqual(n.length, 1, JSON.stringify(n));
  assert.ok(Math.abs(n[0].hz - 440) < 2 && Math.abs(n[0].dur - 0.25) < 0.01, JSON.stringify(n[0]));
});
check('pack() and unpack() round-trip a log', () => {
  const l = log([[5, 0x4000, 0x12], [70000, 0x4017, 0xc0], [70001, 0x400c, 0x3f]], 0.1);
  const p = A.pack(l), u = A.unpack(p);
  assert.deepStrictEqual(u.writes, l.writes);
  assert.strictEqual(p.w.length, 9);
});
check('record() stops a driver that has ended, after the tail', () => {
  let frames = 0;
  const driver = { play(f) { frames++; return f < 3 ? [[0x4000, 0x9f, 10], [0x4017, 0xc0, 20]] : [[0x4017, 0xc0, 20]]; }, playing() { return frames <= 3; } };
  const l = A.record(driver, 1000, { tail: 10 });
  assert.ok(frames < 20, 'ran ' + frames + ' frames');
  assert.strictEqual(l.writes[0][0], 10);
  assert.strictEqual(l.writes[2][0], Math.round(A.FRAME_CYCLES) + 10);
});
check('live() keeps half a second of frames, and plays an older frame\'s writes rather than losing them', () => {
  assert.strictEqual(A.LIVE_FRAMES, 31);
  // 40 frames, each setting the first pulse's volume to its own number; then enough sound for all
  const l = A.live(rate, {}), frames = [];
  for (let f = 0; f < 40; f++) frames.push([[100, 0x4000, 0x30 | (f & 15)]]);
  frames[0].unshift([0, 0x4015, 0x01]);
  l.command({ cmd: 'frames', frames });
  const seen = [], chip = A.Chip.prototype, write = chip.write;
  chip.write = function (a, v) { if (a === 0x4000) seen.push(v & 15); return write.call(this, a, v); };
  try { l.render(new Float32Array(rate), rate); } finally { chip.write = write; }
  assert.deepStrictEqual(seen, Array.from({ length: 40 }, (_, f) => f & 15));
});
console.log(passed + ' passed');
