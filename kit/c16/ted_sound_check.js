'use strict';
// How the kit holds site/lib/ted-sound.js to plus4emu's own output: the model's rendering of a log
// of TED's sound writes against what plus4emu played for the same writes, sample by sample.
// Used by kit/c16/sound.py (against the running server) and kit/c16/test_ted_sound.js (against
// kit/c16/fixtures/ted-sound.json, which sound.py records).
//
//   check(TEDSound, log, from, to)   (from and to in seconds; log.audio.first as compare's first)
//     compare() of the model's rendering of a log with its audio, plus4emu's, with the model's
//     converter started at each fifth of a tick through its first sample: plus4emu's samples fall
//     at some fraction of a tick from the log's start (4.6 ticks a sample at 48,000), which
//     plus4emu's converter carries over from whatever it played before. The best is kept, with
//     that start in ticks as `phase`.
//   compare(ours, theirs, rate, from, to)
//     ours and theirs are the two outputs at `rate` samples a second, ours on the model's scale
//     (1.0 for plus4emu's 32,768) and theirs plus4emu's 16-bit samples. plus4emu's start is moved
//     by up to 64 samples either way to line the two up (its converter holds 16 samples back, and
//     the server's capture starts at a stop, not at a sample). Over from to to (seconds), returns
//     { lag, error, rms }: the lag in samples, the root of the mean square difference as a
//     fraction of plus4emu's own root mean square, and that root mean square on the model's scale.
//     The first 0.3 s is best left out: the two DC filters start from different states. theirs may
//     begin `first` samples into the log (a fixture keeps only a window of plus4emu's output).
function compare(ours, theirs, rate, from = 0.3, to = Infinity, first = 0) {
  const a0 = Math.floor(from * rate), a1 = Math.min(Math.floor(to * rate), ours.length);
  const t = Float64Array.from(theirs, x => x / 32768);
  let best = null;
  for (let lag = -64; lag <= 64; lag++) {
    let e = 0, p = 0, n = 0;
    for (let i = a0; i < a1; i++) {
      const j = i + lag - first;
      if (j < 0 || j >= t.length) continue;
      const d = ours[i] - t[j];
      e += d * d; p += t[j] * t[j]; n++;
    }
    if (!n) continue;
    const r = { lag, error: Math.sqrt(e / Math.max(p, 1e-12)), rms: Math.sqrt(p / n) };
    if (!best || r.error < best.error) best = r;
  }
  return best;
}

function check(T, log, from, to) {
  const theirs = samples(log.audio), rate = log.audio.rate, ticks = T.RATE / rate;
  let best = null;
  for (let phase = 0; phase < ticks; phase += 0.2) {
    const r = compare(T.render(log, rate, phase), theirs, rate, from, to, log.audio.first || 0);
    if (r && (!best || r.error < best.error)) best = Object.assign(r, { phase: Math.round(phase * 10) / 10 });
  }
  return best;
}

// A log's audio, as the server returns it: base64 of 16-bit little-endian samples
function samples(audio) {
  const b = Buffer.from(audio.samples, 'base64');
  const out = new Int16Array(b.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = b.readInt16LE(2 * i);
  return out;
}

module.exports = { check, compare, samples };
