'use strict';
// Test of the queues a Play tab's sound goes through: the writes its game makes as it runs, which
// the page sends to the audio thread a frame or so at a time and the sound chip's model plays one
// call (a frame, or a part of one) at a time. site/lib/sid.js keeps them for host({ live: true })
// (createLive, liveMost), and site/lib/ay.js and site/lib/ted-sound.js in live(). A page's frames
// come unevenly and the audio device can ask for 100 ms of sound at once, so a queue that holds
// less than both runs dry and overflows by turns, which is heard as the music skipping. Checks:
// - createLive plays the calls in order, holds the registers when none is waiting, and writes the
//   oldest at once, in order, when more than most are waiting; liveMost is half a second of calls;
// - the worklet's module for host({ live: true }) plays as createLive does in node;
// - a page that sends its calls at 60 frames a second, with one frame in twenty late by 50 ms, to
//   a device that renders 100 ms at a time: after the first two seconds no call is squashed, and
//   fewer than one in 500 of the SID's find the queue empty (each such call holds the registers a
//   call longer, and the queue is a call longer after it), for the SID in twelfths of a frame and
//   in whole frames, the AY and TED; and with the queues the Play tabs had (48 twelfths of a frame,
//   4 frames) the music skips;
// - no Play page keeps a queue of its own.
//   node kit/scripts/test_live_sound.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
for (const f of ['sid.js', 'ay.js', 'ted-sound.js']) require(path.join(ROOT, 'site', 'lib', f));
const { C64Sid, SpectrumAY, TEDSound } = globalThis;
const E = C64Sid.engine(), RATE = 48000;

let fails = 0;
const check = (ok, what) => { if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + what); };

// --- createLive by itself
{
  const d = E.createLive({ most: 3 });
  d.init({ frames: [[4, 0x11], [4, 0x21, 1, 9], [24, 15]] });
  const seen = [];
  for (let k = 0; k < 4; k++) { d.play(); seen.push(d.writes.join() + '/' + d.sid[4]); }
  check(seen.join(' ') === '4,17/17 4,33,1,9/33 24,15/33 /33', 'createLive: a call each, in order, and the registers held with none waiting');
  d.init({ frames: [[4, 1], [4, 2], [4, 3], [4, 4], [4, 5]] });
  check(d.queued() === 3, 'createLive keeps most calls waiting');
  d.play();
  check(d.writes.join() === '4,1,4,2,4,3' && d.sid[4] === 3, 'and writes the older ones at once, in order, with the next');
  check(E.liveMost({}) === 26 && E.liveMost({ period: 19656 / 12 }) === 301 && E.liveMost({ period: 10001 }) === 50 &&
        E.liveMost({ ntsc: true }) === 30, 'liveMost: half a second of calls, PAL or NTSC, a frame or a period');
}

// --- the worklet's module plays as createLive does in node
{
  let Proc = null;
  const scope = { sampleRate: RATE, currentTime: 0, AudioWorkletProcessor: class { constructor() { this.port = { postMessage() {} }; } },
    registerProcessor: (name, cls) => { Proc = cls; } };
  vm.runInNewContext(C64Sid.worklet(C64Sid.live), scope);
  const opts = { period: 1638 }, data = { most: E.liveMost(opts) };
  const p = new Proc({ processorOptions: { data, opts, frames: false } });
  const tune = { frames: [[1, 0x10, 5, 0x09, 6, 0xF0, 24, 15, 4, 0x11]].concat(Array.from({ length: 40 }, (_, k) => [1, 0x10 + k])) };
  p.port.onmessage({ data: { cmd: 'start', tune } });
  const ref = E.createPlayer(E.createLive(data), RATE, opts);
  ref.command({ cmd: 'start', tune: JSON.parse(JSON.stringify(tune)) });
  const got = new Float32Array(4096), want = new Float32Array(4096);
  for (let i = 0; i < got.length; i += 128) p.process([], [[got.subarray(i, i + 128)]]);
  ref.render(want, want.length, 0, null);
  check(Proc && got.some((v) => v !== 0) && got.every((v, i) => v === want[i]), 'the worklet for host({ live: true }) plays as createLive does');
}

// --- a page's uneven frames and a device that takes 100 ms at a time
// The page shows a frame every 1/60 s, one in twenty 50 ms late, and sends each frame of the game
// finished by then (a frame is 19,656 cycles of 985,248 a second, in `per` calls); the device
// renders 4,800 samples at once every 100 ms. q(n) queues n calls; render(n) plays n samples.
function scenario(chip, frameSec, per, seconds) {
  const sends = [];
  for (let t = 0, k = 0; t < seconds; k++) { t += k % 20 === 19 ? 1 / 60 + 0.05 : 1 / 60; sends.push(t); }
  let done = 0, si = 0;
  for (let b = 0.1; b <= seconds; b += 0.1) {
    for (; si < sends.length && sends[si] <= b; si++) {
      const due = Math.floor(sends[si] / frameSec);
      if (due > done) { chip.q((due - done) * per, sends[si] >= 2); done = due; }
    }
    chip.render(4800, b > 2);
  }
  return chip;
}
function sidChip(most, period) {
  const d = E.createLive({ most }), p = E.createPlayer(d, RATE, { period });
  const c = { empty: 0, squashed: 0, out: new Float32Array(4800) };
  const play = d.play.bind(d);
  let counting = false;
  d.play = () => { if (counting && !d.queued()) c.empty++; play(); };
  p.command({ cmd: 'start', tune: { frames: [[24, 15]] } });
  c.q = (n, count) => {
    const before = d.queued();
    p.command({ cmd: 'start', tune: { frames: Array.from({ length: n }, (_, k) => [1, k & 0xFF]) } });
    if (count) c.squashed += before + n - d.queued();
  };
  c.render = (n, count) => { counting = count; p.render(c.out, n, 0, null); };
  return c;
}
function frameChip(lib, most) {   // the AY's or TED's live(): a call a frame, writes [t, register, value]
  const l = lib.live(RATE), c = { squashed: 0, out: new Float32Array(4800) };
  c.q = (n, count) => {
    const before = l.queued, frames = Array.from({ length: n }, () => [0, 8, 15]);
    if (most) l.push(frames, most); else l.push(frames);
    if (count) c.squashed += before + n - l.queued;
  };
  c.render = (n) => l.render(c.out, n);
  return c;
}
const FRAME_S = 19656 / 985248, PERIOD = 19656 / 12;
const runs = [
  ['the SID, in twelfths of a frame', sidChip(E.liveMost({ period: PERIOD }), PERIOD), 12],
  ['the SID, a call a frame', sidChip(E.liveMost({}), 19656), 1],
];
for (const [what, chip, per] of runs) {
  scenario(chip, FRAME_S, per, 20);
  const calls = 18 * per / FRAME_S;
  check(!chip.squashed && chip.empty < calls / 500,
    `${what}: after two seconds ${chip.squashed} calls squashed, ${chip.empty} of ${Math.round(calls)} found the queue empty`);
}
{
  const old = scenario(sidChip(48, PERIOD), FRAME_S, 12, 20);
  check(old.squashed > 100 && old.empty > 100, `with a queue of 48 twelfths the music skips: ${old.squashed} calls squashed, ${old.empty} found it empty`);
}
// a frame: the 128K's 70,908 T-states of 3,546,900 a second (the AY's CLOCK is half that), TED's
// 35,568 cycles of its CLOCK
for (const [what, lib, sec] of [['the AY', SpectrumAY, 70908 / 3546900], ['TED', TEDSound, TEDSound.FRAME / TEDSound.CLOCK]]) {
  const chip = scenario(frameChip(lib), sec, 1, 20);
  check(!chip.squashed, `${what}: after two seconds ${chip.squashed} frames squashed`);
  const old = scenario(frameChip(lib, 4), sec, 1, 20);
  check(old.squashed > 100, `${what} with a queue of 4 frames: ${old.squashed} frames squashed`);
}

// --- no Play page keeps a queue of its own
const games = path.join(ROOT, 'games');
let own = [];
for (const platform of fs.readdirSync(games)) {
  const dir = path.join(games, platform);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const slug of fs.readdirSync(dir)) {
    for (const file of ['play.html', path.join('port', 'play.template.html')]) {
      const p = path.join(dir, slug, file);
      if (fs.existsSync(p) && /new Uint8Array\(25\), queue = \[\]/.test(fs.readFileSync(p, 'utf8'))) own.push(`games/${platform}/${slug}/${file}`);
    }
  }
}
check(!own.length, 'every Play page sends its SID writes through C64Sid.host({ live: true })' + (own.length ? ': not ' + own.join(', ') : ''));

console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);
